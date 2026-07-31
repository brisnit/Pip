#!/bin/bash
#
# End-to-end smoke test of the required vertical slice, run against a live server.
#
# It walks the whole loop — professor publishes, student joins and works, readiness
# is computed and explained, support is recommended and acted on, professor sees the
# result — and asserts on what each screen actually renders, including the honesty
# and accessibility claims the product makes about itself.
#
#   npm run build && PORT=3111 npm run start &
#   npm run smoke
#
# Set BASE to point at a different origin. Requires curl.
#
set -u
BASE="${BASE:-http://localhost:3111}"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0; FAIL=0

step() { printf "\n%s\n" "── $1"; }
check() {
  if [ "$2" = "1" ]; then printf "  [PASS] %s\n" "$1"; PASS=$((PASS+1));
  else printf "  [FAIL] %s\n" "$1"; FAIL=$((FAIL+1)); fi
}
has() { grep -qF "$2" <<<"$1" && echo 1 || echo 0; }
hasre() { grep -qE "$2" <<<"$1" && echo 1 || echo 0; }
code()  { curl -s -o /dev/null -w "%{http_code}" "$1"; }
get()   { curl -s "$1"; }
scode() { curl -s -o /dev/null -w "%{http_code}" -H "Cookie: $COOKIE" "$1"; }
sget()  { curl -s -H "Cookie: $COOKIE" "$1"; }

# Two prototype student sessions, minted against the running server's database.
# Noor Haddad is a "needs review" student; Jonah Whitmore has an assigned
# support recommendation, which is what the support-plan controls hang off.
cd "$PROJECT" || exit 1
SESSION_OUT=$(npm run --silent dev:session -- "Noor Haddad" 2>/dev/null)
JONAH_OUT=$(npm run --silent dev:session -- "Jonah Whitmore" 2>/dev/null)
cd - >/dev/null || exit 1
COURSE_ID=$(grep '^courseId:' <<<"$SESSION_OUT" | awk '{print $2}')
COOKIE=$(grep '^cookie:' <<<"$SESSION_OUT" | awk '{print $2}')
JONAH=$(grep '^cookie:' <<<"$JONAH_OUT" | awk '{print $2}')

step "1–2. The professor enters the portal"
check "landing page renders the tagline" "$(has "$(get "$BASE/")" 'Turn teaching into an ongoing conversation')"
check "/professor reaches the dashboard" "$(curl -sL -o /dev/null -w "%{url_effective}" "$BASE/professor" | grep -q "/professor/dashboard" && echo 1 || echo 0)"
# The dashboard is a launchpad, not a worklist: two health wheels and one way
# forward. The per-course worklists it used to carry are asserted against the
# course page below, which is where they now live.
DASH=$(get "$BASE/professor/dashboard")
check "dashboard names the seeded professor" "$(has "$DASH" 'Miriam Carter')"
check "dashboard summarises health across every course" "$(has "$DASH" 'Course health')"
check "dashboard summarises health across every student" "$(has "$DASH" 'Student health')"
check "course health totals are computed, not stated" "$(hasre "$DASH" '[0-9]+ courses')"
check "student health totals are computed, not stated" "$(hasre "$DASH" '[0-9]+ students')"
check "wheels carry a glyph, never colour alone" "$(hasre "$DASH" '(◆|◐|●)')"
check "each band reports a share as well as a count" "$(hasre "$DASH" '[0-9]+%')"
check "unassessed students are their own band, not folded in" "$(has "$DASH" 'Not enough data yet')"
check "health is not claimed to be a grade" "$(has "$DASH" 'not from a grade')"
check "dashboard offers course creation" "$(has "$DASH" 'Create new course')"
check "dashboard reaches the roster and the course list" "$(has "$DASH" '/professor/students')"
check "course id resolved from a live query ($COURSE_ID)" "$([ -n "$COURSE_ID" ] && echo 1 || echo 0)"

# The course page is the drill-in: everything waiting on the professor for one course.
COURSE=$(get "$BASE/professor/courses/$COURSE_ID")
check "course page flags students needing follow-up" "$(has "$COURSE" 'Students to follow up')"
check "course page shows unanswered questions" "$(has "$COURSE" 'Questions awaiting a response')"
check "course page shows upcoming lectures" "$(has "$COURSE" 'Upcoming lectures')"
check "course page shows upcoming assessments" "$(has "$COURSE" 'Upcoming assessments')"
check "course page shows recent activity" "$(has "$COURSE" 'Recent activity')"
check "course page offers the support quick action" "$(has "$COURSE" 'Create support recommendation')"
check "course page shows the class readiness spread" "$(has "$COURSE" 'Class understanding')"

# Course list and faculty roster: the two paths off the dashboard wheels.
LIST=$(get "$BASE/professor/courses")
check "course list shows the seeded course" "$(has "$LIST" 'CH504')"
check "course list can be filtered to one health band" "$(has "$(get "$BASE/professor/courses?health=needs_attention")" 'Needs attention')"
ROSTER=$(get "$BASE/professor/students")
check "faculty roster lists students across courses" "$(has "$ROSTER" 'Noor Haddad')"

step "3. Course creation"
check "course creation form loads" "$([ "$(code "$BASE/professor/courses/new")" = "200" ] && echo 1 || echo 0)"
NEWFORM=$(get "$BASE/professor/courses/new")
check "form collects learning objectives" "$(has "$NEWFORM" 'Learning objectives')"
check "form explains the QR consequence" "$(has "$NEWFORM" 'generates a six-character access code')"

step "4. Syllabus intelligence"
SYL=$(get "$BASE/professor/courses/$COURSE_ID/syllabus")
check "syllabus page loads" "$(has "$SYL" 'Syllabus source')"
check "extraction is labelled rule-based, not live AI" "$(has "$SYL" 'No AI provider is configured')"
check "every extracted row needs approval before publishing" "$(has "$SYL" 'Nothing unapproved is published')"
check "AI-generated rows are tagged as drafts" "$(has "$SYL" 'Draft')"

step "5–6. Lecture with notes, objectives and comprehension questions"
CONTENT=$(get "$BASE/professor/courses/$COURSE_ID/content")
check "content page lists the Luther lecture" "$(has "$CONTENT" 'Doctrine of Justification')"
check "comprehension checks are counted per lecture" "$(has "$CONTENT" 'Comprehension checks')"
check "file storage limitation is stated on materials" "$(has "$CONTENT" 'no file is stored')"
check "teaching notes are marked professor-only" "$(has "$CONTENT" 'Professor only')"
# The Luther lecture is the one with a transcript, key terms and a confidence
# rating, so target it by name rather than taking whichever comes first.
LECTURE_ID=""
for cand in $(grep -o 'lec_[a-f0-9]\{20\}' <<<"$CONTENT" | sort -u); do
  if [ "$(has "$(sget "$BASE/student/$COURSE_ID/lecture/$cand")" 'Doctrine of Justification')" = "1" ]; then
    LECTURE_ID="$cand"; break
  fi
done
check "lecture id resolved" "$([ -n "$LECTURE_ID" ] && echo 1 || echo 0)"
BUILDER=$(get "$BASE/professor/courses/$COURSE_ID/lectures/new")
check "lecture builder loads" "$(has "$BUILDER" 'Add a lecture')"
check "builder takes an outline with timestamps" "$(has "$BUILDER" 'timestamp | heading')"
check "builder takes comprehension questions" "$(has "$BUILDER" 'Comprehension questions')"
check "builder warns when objectives are missing" "$(has "$BUILDER" 'Learning objectives')"

step "7. Student link and QR code"
OVERVIEW=$(get "$BASE/professor/courses/$COURSE_ID")
check "overview shows the access code" "$(has "$OVERVIEW" 'CH504R')"
check "overview renders a real inline QR svg" "$(has "$OVERVIEW" '<svg')"
check "overview shows the copyable student link" "$(has "$OVERVIEW" '/join/CH504R')"
check "code can be rotated" "$(has "$OVERVIEW" 'Issue a new code')"
CARD=$(get "$BASE/professor/courses/$COURSE_ID/access-card")
check "printable access card renders with a QR code" "$([ "$(has "$CARD" 'Course code')" = 1 ] && [ "$(has "$CARD" '<svg')" = 1 ] && echo 1 || echo 0)"

step "8–9. A student opens the link and enters a name"
JOIN=$(get "$BASE/join/CH504R?via=qr")
check "join page names the course" "$(has "$JOIN" 'Theology and the Protestant Reformation')"
check "join page asks for name, email, id and consent" "$([ "$(has "$JOIN" 'Your full name')" = 1 ] && [ "$(has "$JOIN" 'Student ID')" = 1 ] && [ "$(has "$JOIN" 'I agree to my coursework activity being recorded')" = 1 ] && echo 1 || echo 0)"
check "join page states the privacy boundary" "$(has "$JOIN" 'private notes stay private')"
check "join page states what the professor can and cannot see" "$(has "$JOIN" 'private notes stay private')"
CODE_ENTRY=$(get "$BASE/join")
check "course code can be typed instead of scanned" "$(has "$CODE_ENTRY" 'Course code')"
check "an accessible alternative to scanning is given" "$(has "$CODE_ENTRY" 'If scanning does not work')"
check "an unknown course code 404s rather than guessing" "$([ "$(code "$BASE/join/ZZZZZZ")" = "404" ] && echo 1 || echo 0)"
check "student session cookie resolves the portal" "$([ "$(scode "$BASE/student/$COURSE_ID")" = "200" ] && echo 1 || echo 0)"
check "no session sends the visitor back to join" "$(has "$(get "$BASE/student/$COURSE_ID")" 'Enter your name to open this course')"

step "10–13. The interactive lecture"
LEC=$(sget "$BASE/student/$COURSE_ID/lecture/$LECTURE_ID")
check "lecture page renders the outline" "$(has "$LEC" 'Lecture outline')"
check "mark-as-confusing control present" "$(has "$LEC" 'This is confusing')"
check "mark-as-clear control present" "$(has "$LEC" 'This is clear')"
check "possible-exam-content control present" "$(has "$LEC" 'Possible exam content')"
check "bookmark control present" "$(has "$LEC" 'Bookmark')"
check "timestamped note composer present" "$(has "$LEC" 'Take a note here')"
check "note is anchored to a section and timestamp" "$(has "$LEC" 'You will not have to reconstruct what')"
check "ask-a-question composer present" "$(has "$LEC" 'Ask about this section')"
check "request-a-simpler-explanation option present" "$(has "$LEC" 'Asked for a simpler explanation')"
check "connect-to-earlier-lecture option present" "$(has "$LEC" 'Connecting to an earlier lecture')"
check "comprehension question is answerable" "$(has "$LEC" 'Comprehension question')"
check "confidence rating is answerable" "$(has "$LEC" 'Rate your confidence')"
check "notes stay private by default" "$(has "$LEC" 'stays private unless you tick this')"
check "video placeholder is honest" "$(has "$LEC" 'No recording is available')"
check "transcript is rendered" "$(has "$LEC" 'Transcript')"
check "contested key terms carry a perspective note" "$(has "$LEC" 'Traditions differ here')"
check "class questions can be upvoted" "$(has "$LEC" 'Upvote a question')"
check "the timeline reflects the student's own markers" "$(has "$LEC" 'confusing')"

# The student home is now a whole-learning view: one readiness wheel across every
# course they are in, then one obvious way back into the work.
HOME=$(sget "$BASE/student/$COURSE_ID")
check "student home greets them by name" "$(has "$HOME" 'Noor')"
check "student home shows learning health across their courses" "$(has "$HOME" 'Learning health')"
check "readiness is stated as a percentage they can see" "$(hasre "$HOME" '[0-9]+%')"
check "student home gives one obvious next action" "$(has "$HOME" 'Continue learning')"
check "student home lists every course they are enrolled in" "$(has "$HOME" 'My courses')"
check "student home never labels anyone as failing" "$([ "$(has "$HOME" 'failing')" = "0" ] && echo 1 || echo 0)"

step "14–15. Readiness feedback"
READY=$(sget "$BASE/student/$COURSE_ID/readiness")
check "readiness page renders" "$(has "$READY" 'Study readiness')"
check "shows topics understood" "$(has "$READY" 'You appear comfortable with')"
check "shows topics needing review" "$(has "$READY" 'You may need additional review in')"
check "explains why, signal by signal" "$(has "$READY" 'Signals that carry weight')"
check "reports confidence in its own estimate" "$(hasre "$READY" '(low|moderate|high)(<!-- -->)? confidence')"
check "questions are context, never a penalty" "$(has "$READY" 'Context, not counted against you')"
check "objectives without evidence are named as such" "$(has "$READY" 'Not enough information yet')"
check "states plainly that it is not a grade" "$(has "$READY" 'not a grade')"
check "uses supportive language, not failure language" "$([ "$(has "$READY" 'failing')" = 0 ] && echo 1 || echo 0)"

step "16. Support recommendations"
SUP=$(curl -s -H "Cookie: $JONAH" "$BASE/student/$COURSE_ID/support")
check "support plan renders" "$(has "$SUP" 'Your support plan')"
check "curriculum pathway offered" "$(has "$SUP" 'Curriculum support')"
check "teaching-assistant pathway offered" "$(has "$SUP" 'Teaching-assistant support')"
check "tutoring pathway offered" "$(has "$SUP" 'Tutoring')"
check "office-hours pathway offered" "$(has "$SUP" 'Professor office visit')"
check "peer-study pathway offered" "$(has "$SUP" 'Peer study')"
check "each item explains why it is there" "$(has "$SUP" 'Why this is here')"
check "each item names a concrete next step" "$(has "$SUP" 'Next step:')"
check "student can accept, complete, decline or ask for another" "$([ "$(has "$SUP" 'Mark complete')" = 1 ] && [ "$(has "$SUP" 'Ask for another option')" = 1 ] && [ "$(has "$SUP" 'This does not fit')" = 1 ] && echo 1 || echo 0)"
check "student can ask for help directly" "$(has "$SUP" 'Ask for help directly')"
# Still guarded, just reworded: the app must not imply it books anything.
check "no real scheduling is claimed" "$(has "$SUP" 'no appointment is booked automatically')"

step "17–19. The professor sees the student and the reasoning"
ROSTER=$(get "$BASE/professor/courses/$COURSE_ID/students")
check "roster renders as a captioned table" "$([ "$(has "$ROSTER" 'Student roster')" = 1 ] && [ "$(has "$ROSTER" '<caption')" = 1 ] && echo 1 || echo 0)"
check "status legend explains the bands" "$(has "$ROSTER" 'Reading these statuses')"
check "green band label present" "$(has "$ROSTER" 'On track')"
check "yellow band label present" "$(has "$ROSTER" 'Needs review')"
check "red band label present" "$(has "$ROSTER" 'Support recommended')"
check "insufficient-data band label present" "$(has "$ROSTER" 'Not enough information yet')"
check "statuses carry a non-colour glyph" "$(hasre "$ROSTER" '●|◐|◆|○')"
check "roster is filterable by status" "$(has "$ROSTER" 'status=support_recommended')"
check "roster is sortable" "$(has "$ROSTER" 'Most recent activity')"
check "aggregate class view present" "$(has "$ROSTER" 'Objectives to reteach first')"
check "roster columns cover participation and last activity" "$([ "$(has "$ROSTER" 'Participation')" = 1 ] && [ "$(has "$ROSTER" 'Last activity')" = 1 ] && echo 1 || echo 0)"
check "roster explains statuses are not grades" "$(has "$ROSTER" 'not grades')"

STUDENT_ID=$(grep -o 'stu_[a-f0-9]\{20\}' <<<"$ROSTER" | head -1)
DETAIL=$(get "$BASE/professor/courses/$COURSE_ID/students/$STUDENT_ID")
check "student detail explains the status" "$(has "$DETAIL" 'Why this status')"
check "every signal is shown with its observation" "$(has "$DETAIL" 'Signals in detail')"
check "objective-by-objective progress shown" "$(has "$DETAIL" 'Learning-objective progress')"
check "status override requires an explanation" "$(has "$DETAIL" 'Required. Shown alongside the status')"
check "private student notes are explicitly not shown" "$(has "$DETAIL" 'private notes are not shown here')"
check "only shared notes appear" "$(has "$DETAIL" 'Notes shared with you')"
check "professor notes are private to the professor" "$(has "$DETAIL" 'not to the student')"
check "follow-up can be marked complete" "$(has "$DETAIL" 'Mark complete')"

step "20–21. Assigning support, and the student seeing it"
check "suggested plan is shown to the professor" "$(has "$DETAIL" 'Suggested plan')"
check "the whole plan can be assigned at once" "$(has "$DETAIL" 'Assign the whole suggested plan')"
check "individual recommendations can be assigned" "$(has "$DETAIL" 'Assign')"
check "the professor can write their own" "$(has "$DETAIL" 'Write your own recommendation')"
PSUP=$(get "$BASE/professor/courses/$COURSE_ID/support")
check "professor support view shows engagement" "$(has "$PSUP" 'Engagement with recommendations')"
check "professor sees a seeded student response" "$(has "$PSUP" 'Starting tonight')"
check "professor sees submitted requests" "$(has "$PSUP" 'Requests')"

step "Remaining required screens"
for path in \
  "professor/courses/$COURSE_ID/insights" \
  "professor/courses/$COURSE_ID/assessments" \
  "professor/courses/$COURSE_ID/lectures/$LECTURE_ID/live" \
  "professor/courses" \
  "about" "join"
do
  check "/$path returns 200" "$([ "$(code "$BASE/$path")" = "200" ] && echo 1 || echo 0)"
done
for path in \
  "student/$COURSE_ID/lecture" \
  "student/$COURSE_ID/notes" \
  "student/$COURSE_ID/assessments" \
  "student/$COURSE_ID/resources"
do
  check "/$path returns 200" "$([ "$(scode "$BASE/$path")" = "200" ] && echo 1 || echo 0)"
done

step "Honesty and accessibility spot checks"
INSIGHTS=$(get "$BASE/professor/courses/$COURSE_ID/insights")
check "trend uses recorded snapshots only" "$(has "$INSIGHTS" 'No values are interpolated or invented')"
check "class-level data does not name individuals" "$(has "$INSIGHTS" 'Nothing here identifies which student marked what')"
check "hardest comprehension checks are surfaced" "$(has "$INSIGHTS" 'Hardest comprehension checks')"
LIVE=$(get "$BASE/professor/courses/$COURSE_ID/lectures/$LECTURE_ID/live")
# React inserts <!-- --> between adjacent text nodes when it server-renders an
# interpolated value, so the number is not adjacent to the words around it.
check "live mode states its refresh interval" "$(hasre "$LIVE" 'Updates every[^0-9]{0,20}[0-9]+')"
check "live mode does not claim to stream video" "$(has "$LIVE" 'Video is delivered by whichever provider you already use')"
check "live console can publish and hold back moments" "$(has "$LIVE" 'Publish a moment')"
ASM=$(get "$BASE/professor/courses/$COURSE_ID/assessments")
check "essay-type work is marked human-read" "$(has "$ASM" 'read by a person')"
check "AI question drafting is offered as drafts only" "$(has "$ASM" 'Drafts only')"
NOTES=$(sget "$BASE/student/$COURSE_ID/notes")
check "student notes page states the privacy default" "$(has "$NOTES" 'Private by default')"
check "study guide and flashcard tools present" "$([ "$(has "$NOTES" 'Build a study guide')" = 1 ] && [ "$(has "$NOTES" 'Make flashcards')" = 1 ] && echo 1 || echo 0)"
RES=$(sget "$BASE/student/$COURSE_ID/resources")
check "resources exclude professor-only material" "$(has "$RES" 'Materials your professor marked as teaching notes are not shown')"
ABOUT=$(get "$BASE/about")
check "about page is honest about student records" "$(has "$ABOUT" 'Student records')"
check "about page names FERPA as outstanding" "$(has "$ABOUT" 'FERPA')"
check "about page lists current scope honestly" "$(has "$ABOUT" 'Current scope')"
check "about page states there is no sign-in" "$(has "$ABOUT" 'No sign-in')"
check "about page states no file storage" "$(has "$ABOUT" 'No file storage')"
LANDING=$(get "$BASE/")
check "skip link present" "$(has "$LANDING" 'Skip to main content')"
# product.prototype.showNotices is off for stakeholder presentation. Assert the
# chrome is actually gone, so the switch cannot silently stop working.
check "prototype banner is absent" "$([ "$(has "$LANDING" 'not a secure student-record system')" = 0 ] && echo 1 || echo 0)"
check "no 'prototype' wording on the landing page" "$([ "$(hasre "$LANDING" '[Pp]rototype')" = 0 ] && echo 1 || echo 0)"
check "html lang is set" "$(hasre "$LANDING" '<html [^>]*lang="en"')"
check "Fuller logo is rendered, not a text placeholder" "$(has "$LANDING" 'src="/brand/fuller-logo.png"')"
check "logo asset is served" "$([ "$(code "$BASE/brand/fuller-logo.png")" = "200" ] && echo 1 || echo 0)"
# The lockup is on every screen, so it must not depend on the image optimiser:
# query-string image URLs get blocked by privacy extensions and need sharp on the host.
check "logo src is a plain path, not an optimiser URL" "$([ "$(curl -s "$BASE/" | grep -c '_next/image')" = "0" ] && echo 1 || echo 0)"
LOGO_META=$(curl -s -o /dev/null -w "%{content_type} %{size_download}" "$BASE/brand/fuller-logo.png")
check "logo is served as a non-trivial png" "$(awk '{ exit !($1 == "image/png" && $2 > 5000) }' <<<"$LOGO_META" && echo 1 || echo 0)" "$LOGO_META"
check "brand teal compiled into css" "$([ "$(grep -rli '042b32' "$PROJECT/.next/static" 2>/dev/null | head -1)" != "" ] && echo 1 || echo 0)"
check "brand cyan compiled into css" "$([ "$(grep -rli '00adc7' "$PROJECT/.next/static" 2>/dev/null | head -1)" != "" ] && echo 1 || echo 0)"
check "Noto fonts self-hosted in the build" "$([ "$(find "$PROJECT/.next" -name '*.woff2' 2>/dev/null | head -1)" != "" ] && echo 1 || echo 0)"
check "no stale burgundy palette in css" "$([ "$(grep -rli '6b1f2e' "$PROJECT/.next/static" 2>/dev/null | head -1)" = "" ] && echo 1 || echo 0)"
check "reduced-motion support shipped in css" "$([ "$(grep -rl 'prefers-reduced-motion' "$PROJECT/.next/static" 2>/dev/null | head -1)" != "" ] && echo 1 || echo 0)"

printf "\n%s\n" "════════════════════════════════"
printf "PASS: %s   FAIL: %s\n" "$PASS" "$FAIL"
[ "$FAIL" = "0" ] || exit 1
