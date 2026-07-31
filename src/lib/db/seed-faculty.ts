/**
 * The rest of Dr. Carter's teaching load.
 *
 * CH504 is seeded in full elsewhere — segments, transcript, interactive moments, the
 * whole vertical slice. These seven courses exist so the dashboards have a realistic
 * faculty to summarise: eight courses and around 130 students rather than one course
 * and twelve.
 *
 * They are lighter, but they are not fake. Each has real objectives, real lectures
 * with real comprehension questions, and students whose recorded answers, confidence
 * ratings and markers are what the readiness engine actually reads. Every figure on
 * the dashboard is computed from these rows — the health wheels have no hardcoded
 * numbers behind them.
 *
 * The per-course mixes below are chosen so the faculty view shows a spread worth
 * exploring, not so that any particular course reports a flattering result.
 */
import type { Db } from "./client";
import { newId } from "./ids";

type Band = "on_track" | "needs_review" | "needs_support" | "no_data";

type CourseSpec = {
  code: string;
  title: string;
  description: string;
  term: string;
  meetingDays: string;
  meetingTime: string;
  location: string;
  format: string;
  theme: string;
  modules: string[];
  objectives: string[];
  lectures: { title: string; description: string; segments: [number, string][] }[];
  /** Comprehension questions: prompt, correct answer, two distractors. */
  questions: [string, string, string, string][];
  /** How many students land in each band, in order: on track, review, support, no data. */
  mix: [number, number, number, number];
};

const COURSES: CourseSpec[] = [
  {
    code: "BT501",
    title: "Biblical Theology: Themes Across the Canon",
    description:
      "How the major themes of scripture develop across both testaments, read as a single narrative without flattening the differences between its books.",
    term: "Summer 2026",
    meetingDays: "Monday, Wednesday",
    meetingTime: "8:00–9:50 a.m.",
    location: "Payton Hall 203",
    format: "in_person",
    theme: "parchment",
    modules: ["Creation and Covenant", "Exile and Return", "Fulfilment"],
    objectives: [
      "Trace a biblical theme across both testaments without collapsing its development",
      "Distinguish biblical theology from systematic theology in method and aim",
      "Read a text in its canonical context as well as its historical one",
      "Assess where typological readings are warranted and where they overreach",
    ],
    lectures: [
      {
        title: "What Biblical Theology Is, and Is Not",
        description:
          "Method before content: what the discipline claims to do, and what it deliberately leaves to others.",
        segments: [
          [0, "Description before synthesis"],
          [540, "Whose categories are we using?"],
          [1200, "The danger of the tidy theme"],
        ],
      },
      {
        title: "Covenant as a Developing Theme",
        description:
          "Noah to the new covenant, following the shape of the idea rather than a list of verses.",
        segments: [
          [0, "Noah, Abraham, Sinai"],
          [660, "Davidic covenant and its afterlife"],
          [1380, "Jeremiah 31 and its reception"],
        ],
      },
    ],
    questions: [
      [
        "Biblical theology is best distinguished from systematic theology by its:",
        "Attention to the historical development of an idea across the canon",
        "Rejection of doctrinal categories altogether",
        "Exclusive focus on the New Testament",
      ],
      [
        "A typological reading overreaches when it:",
        "Requires a connection the text itself does not make",
        "Notices a pattern repeated across testaments",
        "Draws on the canonical placement of a book",
      ],
      [
        "The Davidic covenant is chiefly concerned with:",
        "A lasting dynasty and its relationship to God's rule",
        "Dietary law",
        "The boundaries of the promised land",
      ],
      [
        "Jeremiah 31's \"new covenant\" is described as differing from Sinai principally in:",
        "Where the law is written",
        "Which people it addresses",
        "How many commandments it contains",
      ],
    ],
    mix: [13, 3, 0, 1],
  },
  {
    code: "NT520",
    title: "Romans",
    description:
      "A close reading of Paul's letter to the Romans, attending to its argument as an argument rather than a quarry for proof texts.",
    term: "Summer 2026",
    meetingDays: "Tuesday, Thursday",
    meetingTime: "1:00–2:50 p.m.",
    location: "Travis Auditorium",
    format: "hybrid",
    theme: "teal",
    modules: ["Romans 1–4", "Romans 5–8", "Romans 9–11", "Romans 12–16"],
    objectives: [
      "Follow the argument of Romans as a sustained whole",
      "Situate the letter in its Roman and Jewish context",
      "Weigh the major interpretive traditions on Romans 9–11",
      "Read Paul's ethical section as continuous with his theology",
    ],
    lectures: [
      {
        title: "The Occasion and Argument of the Letter",
        description:
          "Who Paul was writing to, why, and what difference that makes to how the letter is read.",
        segments: [
          [0, "A congregation Paul had not founded"],
          [600, "The Spanish mission and the collection"],
          [1260, "Reading 1:16–17 as a thesis"],
        ],
      },
      {
        title: "Romans 9–11 and the Question of Israel",
        description:
          "The chapters most often skipped, and the ones the letter arguably turns on.",
        segments: [
          [0, "Why these chapters are not a digression"],
          [720, "Election language in context"],
          [1500, "The olive tree and its warning"],
        ],
      },
    ],
    questions: [
      [
        "Romans differs from Paul's other letters chiefly in that:",
        "He is writing to a congregation he did not found and has not visited",
        "It is the only letter written from prison",
        "It contains no ethical instruction",
      ],
      [
        "The olive tree image in Romans 11 functions primarily as:",
        "A warning against Gentile presumption",
        "An allegory of the sacraments",
        "A prediction of the fall of Jerusalem",
      ],
      [
        "Reading Romans 12–15 as continuous with chapters 1–11 means treating ethics as:",
        "The outworking of the argument rather than an appendix to it",
        "A separate letter joined later",
        "Advice for Gentiles only",
      ],
      [
        "Romans 1:16–17 is best read as:",
        "A thesis statement the rest of the letter unfolds",
        "A conventional greeting",
        "A quotation from a Roman creed",
      ],
    ],
    mix: [9, 6, 2, 1],
  },
  {
    code: "LG511",
    title: "Hebrew I",
    description:
      "Introductory biblical Hebrew: the alphabet, the noun and verb systems, and enough syntax to read narrative prose with a lexicon.",
    term: "Summer 2026",
    meetingDays: "Monday, Wednesday, Friday",
    meetingTime: "10:00–10:50 a.m.",
    location: "Payton Hall 101",
    format: "in_person",
    theme: "olive",
    modules: ["Script and Sound", "The Noun System", "The Verb System"],
    objectives: [
      "Read and transliterate the Hebrew consonantal text with pointing",
      "Parse strong verbs in the qal stem",
      "Recognise the construct chain and render it in English",
      "Use a lexicon to work through narrative prose",
    ],
    lectures: [
      {
        title: "The Consonants and the Pointing System",
        description: "The script, and why the vowels arrived when they did.",
        segments: [
          [0, "Consonants and final forms"],
          [480, "The Masoretic pointing"],
          [1080, "Syllables and stress"],
        ],
      },
      {
        title: "The Construct Chain",
        description:
          "Hebrew's way of joining nouns, and the commonest place beginners go wrong.",
        segments: [
          [0, "Bound and free forms"],
          [560, "Definiteness in a chain"],
          [1140, "Chains of three and more"],
        ],
      },
    ],
    questions: [
      [
        "In a construct chain, definiteness is marked:",
        "On the final absolute noun, governing the whole chain",
        "On the first noun in the chain",
        "On every noun in the chain independently",
      ],
      [
        "The Masoretic pointing was added:",
        "Centuries after the consonantal text was fixed",
        "At the same time as the consonants",
        "By the translators of the Septuagint",
      ],
      [
        "A qal perfect 3ms strong verb is recognised by:",
        "Its stem vowel pattern and the absence of an added prefix",
        "A prefixed mem",
        "A doubled middle radical",
      ],
      [
        "Hebrew narrative prose typically advances by means of:",
        "The wayyiqtol form",
        "The infinitive absolute",
        "The participle",
      ],
    ],
    mix: [11, 5, 1, 1],
  },
  {
    code: "ET530",
    title: "Christian Ethics",
    description:
      "Major approaches to Christian moral reasoning, tested against cases where they genuinely disagree.",
    term: "Summer 2026",
    meetingDays: "Tuesday",
    meetingTime: "6:00–8:50 p.m.",
    location: "Online",
    format: "online",
    theme: "slate",
    modules: ["Sources and Method", "Virtue and Character", "Contested Cases"],
    objectives: [
      "Distinguish deontological, teleological and virtue approaches in practice",
      "Trace how scripture functions differently in each approach",
      "Argue a contested case from more than one framework",
      "Identify where a disagreement is about facts rather than principles",
    ],
    lectures: [
      {
        title: "Three Ways of Reasoning About What to Do",
        description: "The frameworks, stated as their proponents would state them.",
        segments: [
          [0, "Rules, ends, and character"],
          [620, "Where each is strongest"],
          [1320, "Where each struggles"],
        ],
      },
      {
        title: "How Scripture Functions in Moral Argument",
        description:
          "Four different jobs the Bible is asked to do in ethical reasoning, often at once.",
        segments: [
          [0, "Command, principle, paradigm, worldview"],
          [700, "The problem of selective citation"],
          [1440, "Reading a case study together"],
        ],
      },
    ],
    questions: [
      [
        "A virtue approach differs from a deontological one chiefly by asking:",
        "What kind of person this action forms me into",
        "Which rule applies",
        "What outcome maximises welfare",
      ],
      [
        "Treating a biblical text as a \"paradigm\" means:",
        "Reading it as a pattern to be reasoned from, not a rule to be applied directly",
        "Treating it as a direct command",
        "Setting it aside as culturally bound",
      ],
      [
        "A disagreement is factual rather than principled when the parties:",
        "Share a moral framework but read the situation differently",
        "Appeal to different scriptures",
        "Belong to different traditions",
      ],
      [
        "The chief risk in selective citation is that it:",
        "Lets a conclusion reached elsewhere appear to be scripturally derived",
        "Uses too few translations",
        "Ignores the original languages",
      ],
    ],
    mix: [13, 3, 0, 1],
  },
  {
    code: "LG522",
    title: "Greek II",
    description:
      "Second-semester Koine: participles, subjunctives, conditional sentences, and sustained reading in the Gospels and Paul.",
    term: "Summer 2026",
    meetingDays: "Monday, Wednesday, Friday",
    meetingTime: "11:00–11:50 a.m.",
    location: "Payton Hall 104",
    format: "in_person",
    theme: "parchment",
    modules: ["Participles", "Moods Beyond the Indicative", "Sustained Reading"],
    objectives: [
      "Parse and translate participles in their common syntactic roles",
      "Recognise the force of the subjunctive in its major constructions",
      "Classify conditional sentences and render them accurately",
      "Read a paragraph of Koine prose without a running translation",
    ],
    lectures: [
      {
        title: "The Participle and Its Jobs",
        description:
          "Adverbial, adjectival, substantival — and how to tell which one you are looking at.",
        segments: [
          [0, "Form before function"],
          [600, "Adverbial participles and their range"],
          [1260, "The genitive absolute"],
        ],
      },
      {
        title: "Conditional Sentences",
        description: "The classes, and what each does and does not assert.",
        segments: [
          [0, "First class: assumed for argument"],
          [540, "Third class: genuine contingency"],
          [1140, "Reading conditionals in Paul"],
        ],
      },
    ],
    questions: [
      [
        "A first-class condition in Greek presents the protasis as:",
        "Assumed true for the sake of the argument",
        "Contrary to fact",
        "A remote future possibility",
      ],
      [
        "The genitive absolute is recognised by:",
        "A participle and its subject both in the genitive, grammatically detached from the main clause",
        "A participle agreeing with the main subject",
        "An articular infinitive",
      ],
      [
        "An adverbial participle is best translated by first asking:",
        "What relationship it bears to the main verb",
        "Which noun it modifies",
        "Whether it is articular",
      ],
      [
        "The subjunctive in a purpose clause is usually introduced by:",
        "ἵνα or ὅπως",
        "εἰ",
        "ὅτι",
      ],
    ],
    mix: [11, 4, 1, 1],
  },
  {
    code: "TH515",
    title: "Hermeneutics",
    description:
      "How texts mean, how readers read, and what responsibility an interpreter carries in a community.",
    term: "Summer 2026",
    meetingDays: "Thursday",
    meetingTime: "9:00–11:50 a.m.",
    location: "Payton Hall 301",
    format: "seminar",
    theme: "teal",
    modules: ["Author, Text, Reader", "Historical Distance", "Community and Authority"],
    objectives: [
      "Distinguish authorial, textual and reader-centred accounts of meaning",
      "Describe the hermeneutical circle without caricaturing it",
      "Account for historical distance in a specific reading",
      "Assess the role of a reading community in constraining interpretation",
    ],
    lectures: [
      {
        title: "Where Does Meaning Live?",
        description:
          "Three answers, each with real explanatory power and real costs.",
        segments: [
          [0, "Authorial intention and its limits"],
          [680, "The text as an object"],
          [1440, "Reader-response, fairly stated"],
        ],
      },
      {
        title: "The Hermeneutical Circle",
        description:
          "Why understanding the whole requires the parts, and vice versa — and why that is not vicious.",
        segments: [
          [0, "Part and whole"],
          [600, "Prejudice in Gadamer's sense"],
          [1320, "Fusion of horizons"],
        ],
      },
    ],
    questions: [
      [
        "The hermeneutical circle is not viciously circular because:",
        "Understanding is revised as the reading proceeds, not assumed complete at the start",
        "The whole is always read before the parts",
        "Interpreters agree on the whole in advance",
      ],
      [
        "\"Prejudice\" in Gadamer's usage means:",
        "The prior understanding that makes interpretation possible at all",
        "An unjustified bias to be eliminated",
        "A denominational commitment",
      ],
      [
        "A strictly authorial account of meaning struggles most with:",
        "Texts whose author is unknown or composite",
        "Texts with a clear historical setting",
        "Texts in translation",
      ],
      [
        "Accounting for historical distance requires the interpreter to:",
        "Notice what the text assumed its readers already knew",
        "Set aside the text's original setting",
        "Prefer the earliest manuscript",
      ],
    ],
    mix: [6, 8, 2, 1],
  },
  {
    code: "PM540",
    title: "Pastoral Care and Counselling",
    description:
      "The practice of pastoral care: listening, presence, referral, and the limits of the pastoral role.",
    term: "Summer 2026",
    meetingDays: "Wednesday",
    meetingTime: "2:00–4:50 p.m.",
    location: "Payton Hall 205",
    format: "practicum",
    theme: "olive",
    modules: ["Listening and Presence", "Grief and Crisis", "Limits and Referral"],
    objectives: [
      "Practise reflective listening without moving prematurely to advice",
      "Recognise the markers of a situation requiring referral",
      "Describe healthy boundaries in a pastoral relationship",
      "Attend to grief without imposing a stage model on it",
    ],
    lectures: [
      {
        title: "Listening Before Answering",
        description:
          "The discipline of staying with a person's account before reaching for a response.",
        segments: [
          [0, "What advice costs"],
          [560, "Reflective listening in practice"],
          [1200, "Silence as a pastoral act"],
        ],
      },
      {
        title: "Knowing the Edge of Your Competence",
        description:
          "Where pastoral care ends and clinical care begins, and how to make a referral well.",
        segments: [
          [0, "Markers requiring referral"],
          [640, "Making a referral without abandoning"],
          [1320, "Boundaries and self-care"],
        ],
      },
    ],
    questions: [
      [
        "Reflective listening is chiefly aimed at:",
        "Helping the person hear their own account more clearly",
        "Establishing the facts of the case",
        "Delaying advice until the end of the session",
      ],
      [
        "The clearest indication that a referral is needed is:",
        "A situation requiring competence the pastoral role does not carry",
        "A conversation lasting longer than an hour",
        "A person expressing strong emotion",
      ],
      [
        "Applying a stage model of grief risks:",
        "Telling a grieving person what they ought to be feeling",
        "Underestimating the length of grief",
        "Overlooking practical needs",
      ],
      [
        "A healthy pastoral boundary primarily protects:",
        "Both people in the relationship",
        "The minister's schedule",
        "The institution from liability",
      ],
    ],
    mix: [7, 7, 3, 1],
  },
];

// Name pools. Fictional, deliberately varied, and combined deterministically so a
// re-seed produces exactly the same roster.
const FIRST = [
  "Adaeze", "Mateo", "Ingrid", "Rashid", "Beatriz", "Kwame", "Sunniva", "Tarek",
  "Marisol", "Bo", "Annika", "Yusuf", "Delphine", "Hiroshi", "Rosalind", "Ezekiel",
  "Nadia", "Sung-Min", "Clara", "Ibrahim", "Wren", "Paolo", "Amara", "Lukas",
  "Freya", "Devraj", "Ingeborg", "Samuel", "Thandiwe", "Oscar", "Leila", "Hugo",
  "Mireille", "Kofi", "Astrid", "Rafael", "Zainab", "Nils", "Perpetua", "Idris",
  "Saoirse", "Emeka", "Margit", "Cyrus", "Johanna", "Tomas", "Aisha", "Bartholomew",
  "Elke", "Ravi", "Constance", "Jae-Won", "Ottilie", "Amos", "Signe", "Nkechi",
];

const LAST = [
  "Okonkwo", "Alvarez", "Lindholm", "Haddad", "Ferreira", "Mensah", "Dahl", "Nasser",
  "Iglesias", "Chen", "Virtanen", "Osei", "Rousseau", "Tanaka", "Ashworth", "Mbeki",
  "Rahman", "Park", "Bianchi", "Sowande", "Calloway", "Moretti", "Adeyemi", "Weiss",
  "Sørensen", "Bhattacharya", "Kaufmann", "Ngata", "Duarte", "Lindqvist",
];

/** Deterministic pseudo-random, so a re-seed is byte-identical. */
function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

/**
 * Students who appear in more than one course.
 *
 * A seminary student takes three or four courses at once, and the student portal's
 * "My courses" is meaningless if everyone is enrolled in exactly one thing. These
 * names are dealt across the faculty so each turns up in two or three courses.
 *
 * Two of them — Noor Haddad and Emmanuel Osei — are also on the CH504 roster seeded
 * elsewhere, so the fully-built course appears alongside the lighter ones when you
 * open the student portal as either of them.
 */
const SHARED_ROSTER = [
  "Noor Haddad",
  "Emmanuel Osei",
  "Camila Duarte",
  "Adaeze Okonkwo",
  "Mateo Alvarez",
  "Ingrid Lindholm",
  "Rashid Nasser",
  "Beatriz Ferreira",
  "Kwame Mensah",
  "Sunniva Dahl",
  "Tarek Rahman",
  "Marisol Iglesias",
];

/** How many students at the head of each course come from the shared roster. */
const SHARED_PER_COURSE = 4;

const BAND_ORDER: Band[] = ["on_track", "needs_review", "needs_support", "no_data"];

/**
 * How each band answers. Index into the four comprehension questions; `null` means
 * unanswered. Confidence is 1–5, markers are how many clear vs confusing.
 */
const BEHAVIOUR: Record<
  Band,
  {
    answers: (boolean | null)[];
    confidence: number[];
    clear: number;
    confusing: number;
  }
> = {
  on_track: {
    answers: [true, true, true, false],
    confidence: [5, 4],
    clear: 3,
    confusing: 0,
  },
  needs_review: {
    answers: [true, false, true, null],
    confidence: [3, 3],
    clear: 1,
    confusing: 2,
  },
  needs_support: {
    answers: [false, false, null, null],
    confidence: [2, 1],
    clear: 0,
    confusing: 3,
  },
  no_data: { answers: [null, null, null, null], confidence: [], clear: 0, confusing: 0 },
};

export function seedFacultyLoad(db: Db) {
  const professor = db
    .prepare<[], { id: string }>(
      "SELECT id FROM professors ORDER BY created_at LIMIT 1",
    )
    .get();
  if (!professor) return;

  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  const at = (dayOffset: number, hour = 16) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  let nameSeed = 0;
  let codeSeed = 7;

  db.transaction(() => {
    COURSES.forEach((spec, courseIndex) => {
      const courseId = newId("crs");
      const created = at(-62 + courseIndex);

      db.prepare(
        `INSERT INTO courses (
           id, professor_id, title, code, description, term, meeting_days,
           meeting_time, location, format, image_theme, estimated_enrollment,
           start_date, end_date, is_demo, created_at, updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      ).run(
        courseId,
        professor.id,
        spec.title,
        spec.code,
        spec.description,
        spec.term,
        spec.meetingDays,
        spec.meetingTime,
        spec.location,
        spec.format,
        spec.theme,
        spec.mix.reduce((a, b) => a + b, 0) + 2,
        at(-40).slice(0, 10),
        at(30).slice(0, 10),
        created,
        created,
      );

      // A readable, collision-free access code derived from the course code.
      const access = `${spec.code}${String.fromCharCode(65 + (codeSeed % 26))}`;
      codeSeed += 5;
      db.prepare(
        `INSERT INTO course_codes (id, course_id, code, active, created_at)
         VALUES (?,?,?,1,?)`,
      ).run(newId("cc"), courseId, access, created);

      const moduleIds = spec.modules.map((title, index) => {
        const id = newId("mod");
        db.prepare(
          `INSERT INTO modules (id, course_id, position, title, week_label, created_at)
           VALUES (?,?,?,?,?,?)`,
        ).run(id, courseId, index + 1, title, `Weeks ${index * 3 + 1}–${index * 3 + 3}`, created);
        return id;
      });

      const objectiveIds = spec.objectives.map((text, index) => {
        const id = newId("obj");
        db.prepare(
          `INSERT INTO learning_objectives
             (id, course_id, module_id, code, text, position, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        ).run(
          id,
          courseId,
          moduleIds[index % moduleIds.length],
          `LO${index + 1}`,
          text,
          index + 1,
          created,
        );
        return id;
      });

      // Lectures, with segments students can anchor markers to.
      const segmentIds: string[] = [];
      const lectureIds = spec.lectures.map((lecture, lectureIndex) => {
        const lectureId = newId("lec");
        const scheduled = at(-30 + lectureIndex * 7);
        db.prepare(
          `INSERT INTO lectures (
             id, course_id, module_id, title, description, scheduled_at,
             duration_minutes, delivery_mode, status, position, is_demo,
             created_at, updated_at
           ) VALUES (?,?,?,?,?,?,?,'recorded','published',?,1,?,?)`,
        ).run(
          lectureId,
          courseId,
          moduleIds[lectureIndex % moduleIds.length],
          lecture.title,
          lecture.description,
          scheduled,
          75,
          lectureIndex + 1,
          created,
          scheduled,
        );

        for (const objectiveId of objectiveIds.slice(
          lectureIndex * 2,
          lectureIndex * 2 + 2,
        )) {
          db.prepare(
            `INSERT OR IGNORE INTO lecture_objectives (lecture_id, objective_id)
             VALUES (?,?)`,
          ).run(lectureId, objectiveId);
        }

        lecture.segments.forEach(([startSeconds, heading], index) => {
          const id = newId("seg");
          segmentIds.push(id);
          db.prepare(
            `INSERT INTO lecture_segments
               (id, lecture_id, position, start_seconds, heading, created_at)
             VALUES (?,?,?,?,?,?)`,
          ).run(id, lectureId, index + 1, startSeconds, heading, created);
        });

        return lectureId;
      });

      // Four comprehension questions, two per lecture, each tied to an objective.
      const questionIds = spec.questions.map((question, index) => {
        const [prompt, correct, wrongA, wrongB] = question;
        const interactionId = newId("int");
        const lectureId = lectureIds[Math.floor(index / 2)];
        db.prepare(
          `INSERT INTO interactions (
             id, lecture_id, type, prompt, at_seconds, segment_id, objective_id,
             position, published, published_at, ai_generated, created_at
           ) VALUES (?,?,'comprehension_question',?,?,?,?,?,1,?,0,?)`,
        ).run(
          interactionId,
          lectureId,
          prompt,
          300 + index * 120,
          segmentIds[index % segmentIds.length],
          objectiveIds[index % objectiveIds.length],
          index + 1,
          created,
          created,
        );

        [
          [correct, 1],
          [wrongA, 0],
          [wrongB, 0],
        ].forEach(([text, isCorrect], optionIndex) => {
          db.prepare(
            `INSERT INTO interaction_options
               (id, interaction_id, position, text, is_correct)
             VALUES (?,?,?,?,?)`,
          ).run(newId("opt"), interactionId, optionIndex + 1, text, isCorrect);
        });

        return interactionId;
      });

      // Students.
      spec.mix.forEach((count, bandIndex) => {
        const band = BAND_ORDER[bandIndex];
        const behaviour = BEHAVIOUR[band];

        for (let n = 0; n < count; n += 1) {
          // The first few of each course's "on track" and "developing" students are
          // drawn from the shared roster, so the same people recur across the faculty.
          const sharedSlot =
            bandIndex < 2 && n < SHARED_PER_COURSE
              ? courseIndex * SHARED_PER_COURSE + bandIndex * 2 + n
              : null;
          const name =
            sharedSlot !== null
              ? SHARED_ROSTER[sharedSlot % SHARED_ROSTER.length]
              : `${pick(FIRST, nameSeed * 7 + 3)} ${pick(LAST, nameSeed * 11 + 5)}`;
          nameSeed += 1;

          const studentId = newId("stu");
          const joined = at(-38 + (nameSeed % 5));

          db.prepare(
            `INSERT INTO students (id, name, email, is_demo, created_at)
             VALUES (?,?,?,1,?)`,
          ).run(
            studentId,
            name,
            `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.edu`,
            joined,
          );

          db.prepare(
            `INSERT INTO course_entries
               (id, course_id, student_id, source, consent_at, joined_at)
             VALUES (?,?,?,'link',?,?)`,
          ).run(newId("ent"), courseId, studentId, joined, joined);

          db.prepare(
            `INSERT INTO activity_events
               (id, course_id, student_id, actor_role, type, summary, created_at)
             VALUES (?,?,?,'student','joined_course',?,?)`,
          ).run(newId("act"), courseId, studentId, `${name} joined the course`, joined);

          // Comprehension answers.
          behaviour.answers.forEach((correct, index) => {
            if (correct === null) return;
            const interactionId = questionIds[index];
            const options = db
              .prepare<[string], { id: string; is_correct: number }>(
                "SELECT id, is_correct FROM interaction_options WHERE interaction_id = ? ORDER BY position",
              )
              .all(interactionId);
            const chosen = correct
              ? options.find((o) => o.is_correct === 1)
              : options.find((o) => o.is_correct === 0);
            if (!chosen) return;

            db.prepare(
              `INSERT INTO interaction_responses
                 (id, interaction_id, student_id, option_id, is_correct, created_at)
               VALUES (?,?,?,?,?,?)`,
            ).run(
              newId("ires"),
              interactionId,
              studentId,
              chosen.id,
              correct ? 1 : 0,
              at(-20 + index, 18),
            );
          });

          // Confidence ratings, tied to the objectives the answers bear on.
          behaviour.confidence.forEach((level, index) => {
            db.prepare(
              `INSERT INTO confidence_responses
                 (id, student_id, course_id, lecture_id, objective_id, level, context, created_at)
               VALUES (?,?,?,?,?,?,?,?)`,
            ).run(
              newId("cnf"),
              studentId,
              courseId,
              lectureIds[index % lectureIds.length],
              objectiveIds[index % objectiveIds.length],
              level,
              "Self-reported during lecture review",
              at(-14 + index, 19),
            );
          });

          // Markers.
          const marks: [string, number][] = [
            ["clear", behaviour.clear],
            ["confusing", behaviour.confusing],
          ];
          let markIndex = 0;
          for (const [marker, howMany] of marks) {
            for (let m = 0; m < howMany; m += 1) {
              const segmentId = segmentIds[markIndex % segmentIds.length];
              const lectureId =
                lectureIds[Math.floor((markIndex % segmentIds.length) / 3)] ??
                lectureIds[0];
              db.prepare(
                `INSERT INTO comprehension_markers (
                   id, student_id, course_id, lecture_id, segment_id, objective_id,
                   marker, at_seconds, created_at
                 ) VALUES (?,?,?,?,?,?,?,?,?)`,
              ).run(
                newId("mrk"),
                studentId,
                courseId,
                lectureId,
                segmentId,
                objectiveIds[markIndex % objectiveIds.length],
                marker,
                240 + markIndex * 90,
                at(-12 + markIndex, 20),
              );
              markIndex += 1;
            }
          }

          if (band === "needs_support") {
            db.prepare(
              `INSERT INTO questions (
                 id, student_id, course_id, lecture_id, segment_id, objective_id,
                 kind, body, status, anonymous, is_demo, created_at
               ) VALUES (?,?,?,?,?,?,'request_simpler',?,'open',0,1,?)`,
            ).run(
              newId("qst"),
              studentId,
              courseId,
              lectureIds[0],
              segmentIds[0],
              objectiveIds[0],
              "Could we go over this again more slowly? I can follow the words but not the argument.",
              at(-6, 17),
            );
          }
        }
      });
    });
  })();
}
