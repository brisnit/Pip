/**
 * Demonstration data for the prototype.
 *
 * Everything here is fictional. The professor, the students, the questions and the
 * recorded activity are invented for the purpose of showing the workflow, and are
 * flagged `is_demo = 1` so the interface can label them as demonstration data.
 *
 * The twelve students are shaped to produce a realistic spread across the
 * readiness bands — including two with genuinely insufficient data, because a
 * roster where every row has a confident status would misrepresent the model.
 */
import type { Db } from "./client";
import { newId } from "./ids";
import type { Marker, NoteKind, QuestionKind } from "@/lib/domain/vocabulary";

/**
 * Day zero for the demonstration timeline, anchored to when the seed runs.
 *
 * Offsets are relative and fixed — `at(-19)` is always the justification lecture,
 * `at(11)` is always the midterm — so the shape of the data is deterministic while
 * the timeline stays current. A seed pinned to a literal calendar date reads as
 * months stale within a term, which undercuts the whole premise of noticing a
 * struggling student early.
 *
 * Truncated to the hour so every timestamp within one seed run is consistent.
 */
const DEMO_START = (() => {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
})();

function at(dayOffset: number, hour = 17, minute = 0): string {
  const d = new Date(DEMO_START);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function seedDemonstrationData(db: Db) {
  const seed = db.transaction(() => {
    // ---------------------------------------------------------------- professor
    const professorId = newId("prf");
    db.prepare(
      `INSERT INTO professors (id, name, title, email, bio, is_demo, created_at)
       VALUES (?,?,?,?,?,1,?)`,
    ).run(
      professorId,
      "Dr. Miriam Carter",
      "Associate Professor of Historical Theology",
      "m.carter@example.edu",
      "Historical theologian working on sixteenth-century reform movements and their reception in contemporary ministry. Demonstration profile.",
      at(-40),
    );

    // ------------------------------------------------------------------- course
    const courseId = newId("crs");
    db.prepare(
      `INSERT INTO courses (
         id, professor_id, title, code, description, term, meeting_days, meeting_time,
         location, format, image_theme, estimated_enrollment, start_date, end_date,
         is_demo, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,'hybrid','burgundy',?,?,?,1,?,?)`,
    ).run(
      courseId,
      professorId,
      "Theology and the Protestant Reformation",
      "CH504",
      "A graduate survey of sixteenth-century reform movements, read with attention to their theological arguments, their institutional settings, and their legacies for contemporary ministry. We work primarily from primary sources in translation, and we take each tradition's own account of itself seriously before assessing it.",
      `${
        ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Fall", "Fall", "Fall", "Winter"][
          DEMO_START.getUTCMonth()
        ]
      } ${DEMO_START.getUTCFullYear()}`,
      "Tuesday, Thursday",
      "9:00–11:20 a.m.",
      "Payton Hall 101 and online",
      24,
      at(-40).slice(0, 10),
      at(30).slice(0, 10),
      at(-40),
      at(-40),
    );

    db.prepare(
      `INSERT INTO course_codes (id, course_id, code, active, created_at)
       VALUES (?,?,?,1,?)`,
    ).run(newId("cc"), courseId, "CH504R", at(-40));

    // ------------------------------------------------------------------ modules
    const moduleTitles: [string, string, string][] = [
      [
        "Late Medieval Context",
        "Piety, penance, conciliarism and reform movements before 1517. What the reformers inherited, and what they were arguing with.",
        "Weeks 1–2",
      ],
      [
        "Martin Luther and Justification",
        "Luther's exegetical development, the doctrine of justification, and the theology of the cross.",
        "Weeks 3–4",
      ],
      [
        "Reformed Theology",
        "Zwingli, Bucer and Calvin. Covenant, sacrament, worship and civic reform in the Swiss and Rhineland cities.",
        "Weeks 5–6",
      ],
      [
        "Radical Reformation",
        "Anabaptist ecclesiology, believers' baptism, discipleship and the critique of magisterial reform.",
        "Week 7",
      ],
      [
        "Catholic Reformation",
        "Trent, the new religious orders, and Catholic reform read on its own terms rather than only as reaction.",
        "Week 8",
      ],
      [
        "Reformation Legacies",
        "Confessional identity, ministry practice, and the uses and misuses of Reformation history today.",
        "Weeks 9–10",
      ],
    ];

    const moduleIds = moduleTitles.map(([title, description, week], index) => {
      const id = newId("mod");
      db.prepare(
        `INSERT INTO modules (id, course_id, position, title, description, week_label, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      ).run(id, courseId, index + 1, title, description, week, at(-40));
      return id;
    });

    // --------------------------------------------------------------- objectives
    const objectiveSpecs: [string, number][] = [
      [
        "Situate the Reformation within late medieval religious life and institutional reform movements",
        0,
      ],
      [
        "Explain Luther's doctrine of justification and the exegetical arguments behind it",
        1,
      ],
      [
        "Distinguish Lutheran and Reformed accounts of sacrament, law and covenant",
        2,
      ],
      [
        "Describe Radical Reformation ecclesiology and its critique of magisterial reform",
        3,
      ],
      [
        "Assess the Catholic Reformation on its own terms, including the work of Trent",
        4,
      ],
      [
        "Trace Reformation legacies in contemporary ministry and denominational identity",
        5,
      ],
      [
        "Read primary sources with attention to genre, audience and polemical context",
        1,
      ],
      [
        "Place the major figures and chronology of sixteenth-century reform accurately",
        0,
      ],
    ];

    const objectiveIds = objectiveSpecs.map(([text, moduleIndex], index) => {
      const id = newId("obj");
      db.prepare(
        `INSERT INTO learning_objectives
           (id, course_id, module_id, code, text, position, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      ).run(
        id,
        courseId,
        moduleIds[moduleIndex],
        `LO${index + 1}`,
        text,
        index + 1,
        at(-40),
      );
      return id;
    });

    const LO = (n: number) => objectiveIds[n - 1];

    // ----------------------------------------------------------------- concepts
    const conceptSpecs: [string, string, string | null][] = [
      [
        "Justification",
        "God's declaration that a sinner stands in the right before him. In Luther's mature account this is a forensic declaration grounded in Christ's righteousness rather than a process of moral improvement.",
        "Lutheran, Reformed, Catholic and more recent readings of Paul differ substantially here. This course teaches Luther's position as Luther held it, then compares it with others — it does not treat any one account as settled.",
      ],
      [
        "Sola fide",
        "The claim that a person is justified by faith alone, apart from works of the law — where faith is trust in a promise rather than an achievement.",
        "What this formula excludes, and how it relates to sanctification, is read differently across traditions.",
      ],
      [
        "Simul iustus et peccator",
        "\"At the same time righteous and a sinner.\" Luther's formula for the justified Christian, who is wholly righteous in Christ and still wholly a sinner in themselves.",
        null,
      ],
      [
        "Imputed righteousness",
        "Righteousness reckoned to the believer's account rather than produced in them — Christ's righteousness remaining Christ's, and counted as theirs.",
        "The Council of Trent's account of infused righteousness is a deliberate alternative, not a misunderstanding.",
      ],
      [
        "Theology of the cross",
        "Luther's claim, sharpened at Heidelberg in 1518, that God is known where he has chosen to be revealed — in suffering and the cross — rather than inferred from visible power or glory.",
        null,
      ],
      [
        "Penitential system",
        "The late medieval structure of contrition, confession, satisfaction and absolution through which forgiveness was ordinarily sought and mediated.",
        null,
      ],
      [
        "Indulgence",
        "A remission of temporal penalty for sin, drawn from the treasury of merit and granted under specified conditions.",
        null,
      ],
      [
        "Covenant",
        "In Reformed theology, the framework of God's dealings with humanity across the testaments, structuring the relation of law to gospel and of the sacraments to promise.",
        "Lutheran law/gospel distinction and Reformed covenantal framing are not interchangeable; the difference shapes sacramental theology downstream.",
      ],
    ];

    const conceptIds = conceptSpecs.map(([name, definition, perspective]) => {
      const id = newId("cpt");
      db.prepare(
        `INSERT INTO concepts (id, course_id, name, definition, perspective, created_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(id, courseId, name, definition, perspective, at(-40));
      return id;
    });

    const CPT = (name: string) => {
      const index = conceptSpecs.findIndex((c) => c[0] === name);
      return index >= 0 ? conceptIds[index] : null;
    };

    // ----------------------------------------------------------------- syllabus
    const syllabusId = newId("syl");
    db.prepare(
      `INSERT INTO syllabi
         (id, course_id, source_type, file_name, raw_text, extraction_state,
          extraction_note, provider_label, reviewed_at, published_at, created_at)
       VALUES (?,?,'pasted_text',?,?,'published',?,?,?,?,?)`,
    ).run(
      syllabusId,
      courseId,
      "CH504-syllabus-summer-2026.pdf",
      SYLLABUS_TEXT,
      "Recognised 21 items by pattern-matching common syllabus headings. Reviewed and edited by Dr. Carter before publishing.",
      "Prototype sample output (no AI provider configured)",
      at(-38),
      at(-38),
      at(-39),
    );

    const syllabusItems: [string, string, string | null, string | null, number][] = [
      [
        "description",
        "A graduate survey of sixteenth-century reform movements read from primary sources.",
        "Approved with edits by Dr. Carter.",
        null,
        1,
      ],
      ["weekly_topic", "Late medieval piety and the penitential system", null, "Week 1", 1],
      ["weekly_topic", "Indulgences and the 1517 controversy", null, "Week 2", 2],
      ["weekly_topic", "Luther on justification", null, "Week 3", 3],
      ["weekly_topic", "The theology of the cross", null, "Week 4", 4],
      ["weekly_topic", "Zwingli and the Swiss reform", null, "Week 5", 5],
      ["weekly_topic", "Calvin, covenant and worship", null, "Week 6", 6],
      ["weekly_topic", "The Radical Reformation", null, "Week 7", 7],
      ["weekly_topic", "Trent and Catholic reform", null, "Week 8", 8],
      [
        "reading",
        "Luther, \"The Freedom of a Christian\" (1520), complete",
        "Read alongside the 1535 Galatians preface.",
        "Week 3",
        1,
      ],
      [
        "reading",
        "Luther, Heidelberg Disputation (1518), theses 19–24",
        null,
        "Week 4",
        2,
      ],
      [
        "reading",
        "Calvin, Institutes III.i–ii (1559 edition)",
        null,
        "Week 6",
        3,
      ],
      [
        "reading",
        "Schleitheim Articles (1527), complete",
        null,
        "Week 7",
        4,
      ],
      [
        "reading",
        "Council of Trent, Decree on Justification (1547), chapters 7–8 and canons 9–12",
        "Read as a considered position, not a caricature.",
        "Week 8",
        5,
      ],
      [
        "assignment",
        "Primary source analysis (1,500 words)",
        "One text, close reading, attention to genre and audience. Due week 5.",
        null,
        1,
      ],
      [
        "assignment",
        "Final research essay (4,000 words)",
        "Topic approved in advance. Due week 10.",
        null,
        2,
      ],
      ["exam", "Midterm Examination", "Covers modules 1–2.", "July 9", 1],
      ["exam", "Final Examination", "Cumulative, weighted toward modules 3–6.", "August 13", 2],
      ["grading_category", "Participation and comprehension activity — 15%", null, null, 1],
      ["grading_category", "Primary source analysis — 20%", null, null, 2],
      ["grading_category", "Midterm — 25%", null, null, 3],
      ["grading_category", "Final essay and examination — 40%", null, null, 4],
      [
        "study_schedule",
        "Suggested review rhythm",
        "Review each week's material within 48 hours, then again in the week before each exam.",
        null,
        1,
      ],
    ];

    for (const [kind, title, detail, weekLabel, position] of syllabusItems) {
      db.prepare(
        `INSERT INTO syllabus_items
           (id, syllabus_id, kind, title, detail, week_label, date_label, position,
            ai_generated, approved, created_at)
         VALUES (?,?,?,?,?,?,?,?,1,1,?)`,
      ).run(
        newId("syi"),
        syllabusId,
        kind,
        title,
        detail,
        weekLabel,
        kind === "exam" ? weekLabel : null,
        position,
        at(-38),
      );
    }

    // ---------------------------------------------------------------- materials
    type MaterialSpec = {
      title: string;
      description: string;
      contentType: string;
      moduleIndex: number | null;
      url?: string;
      fileName?: string;
      visibility?: string;
      professorNotes?: string;
      studentInstructions?: string;
      objectives?: number[];
      concepts?: string[];
      dateLabel?: string;
    };

    const materialSpecs: MaterialSpec[] = [
      {
        title: "CH504 Syllabus — Summer 2026",
        description:
          "Course description, weekly schedule, readings, assignments and grading. The published version of record.",
        contentType: "syllabus",
        moduleIndex: null,
        fileName: "CH504-syllabus-summer-2026.pdf",
        studentInstructions:
          "Read the whole syllabus in week 1. The weekly topics below are generated from it.",
      },
      {
        title: "Luther, \"The Freedom of a Christian\" (1520)",
        description:
          "Complete treatise in translation. The central text for module 2.",
        contentType: "reading_assignment",
        moduleIndex: 1,
        objectives: [2, 7],
        concepts: ["Justification", "Sola fide"],
        dateLabel: "Week 3",
        studentInstructions:
          "Read the whole treatise before Thursday. Mark every place Luther distinguishes the freedom of faith from freedom to do as one pleases.",
      },
      {
        title: "Heidelberg Disputation (1518), theses 19–24",
        description:
          "The theology-of-the-cross theses, with the 1518 explanations.",
        contentType: "reading_assignment",
        moduleIndex: 1,
        objectives: [2, 7],
        concepts: ["Theology of the cross"],
        dateLabel: "Week 4",
      },
      {
        title: "Lecture notes — Luther and justification",
        description:
          "Student-facing outline of the justification lecture, with the key distinctions set out in order.",
        contentType: "lecture_notes",
        moduleIndex: 1,
        objectives: [2],
        concepts: ["Justification", "Imputed righteousness", "Simul iustus et peccator"],
      },
      {
        title: "Teaching notes — where students usually get stuck",
        description:
          "Running notes on the two points that reliably need a second pass: imputation vs. infusion, and what Luther is not saying about sanctification.",
        contentType: "teaching_notes",
        moduleIndex: 1,
        visibility: "professor_only",
        professorNotes:
          "Every cohort stalls on infusion. Budget ten extra minutes and use the Trent decree side by side rather than paraphrasing it.",
      },
      {
        title: "Slide deck — Justification in Luther",
        description: "Fourteen slides, following the lecture segments.",
        contentType: "slide_deck",
        moduleIndex: 1,
        fileName: "ch504-luther-justification.pdf",
        objectives: [2],
      },
      {
        title: "Study guide — Midterm, modules 1–2",
        description:
          "Objective-by-objective review guide with the distinctions you will be asked to make.",
        contentType: "study_guide",
        moduleIndex: 1,
        objectives: [1, 2, 8],
        concepts: ["Justification", "Penitential system", "Indulgence"],
        studentInstructions:
          "Work through this after you have re-read your own notes, not before.",
      },
      {
        title: "Review sheet — key terms and dates, 1300–1530",
        description: "One page. Terms, figures and dates for module 1.",
        contentType: "review_sheet",
        moduleIndex: 0,
        objectives: [1, 8],
      },
      {
        title: "Trent, Decree on Justification (1547) — chapters 7–8, canons 9–12",
        description:
          "Read as a considered theological position in its own right. We will compare it with Luther directly.",
        contentType: "reading_assignment",
        moduleIndex: 4,
        objectives: [5],
        concepts: ["Imputed righteousness"],
        dateLabel: "Week 8",
      },
      {
        title: "Recorded lecture — Luther and the Doctrine of Justification",
        description:
          "Full recording of the week 3 session, with transcript and interactive moments.",
        contentType: "recorded_lecture",
        moduleIndex: 1,
        url: "https://www.youtube.com/watch?v=DEMO_PLACEHOLDER",
        objectives: [2],
        professorNotes:
          "Placeholder URL. No video is hosted for this prototype — the player shows an honest placeholder.",
      },
      {
        title: "Thursday live session — Reformed turn",
        description: "Live class link for the week 5 session.",
        contentType: "live_lecture_link",
        moduleIndex: 2,
        url: "https://example.edu/live/ch504-week5",
        objectives: [3],
      },
      {
        title: "Discussion prompt — what did Luther not say?",
        description:
          "Post 200 words: name one thing Luther is commonly said to have taught that the primary texts do not support.",
        contentType: "discussion_prompt",
        moduleIndex: 1,
        objectives: [2, 7],
      },
      {
        title: "Galatians 2:15–21 — reading guide",
        description:
          "The passage with Luther's 1535 commentary excerpts alongside, for comparison.",
        contentType: "scripture_reference",
        moduleIndex: 1,
        objectives: [2, 7],
      },
      {
        title: "Oberman, \"Facientibus quod in se est\" — journal article",
        description:
          "On the late medieval axiom Luther was reacting against. Dense but worth the effort.",
        contentType: "journal_article",
        moduleIndex: 0,
        url: "https://example.org/articles/oberman-facientibus",
        objectives: [1],
        concepts: ["Penitential system"],
      },
      {
        title: "Practice: five questions on justification",
        description:
          "Short self-check. Not graded — the results feed your readiness view only.",
        contentType: "assignment_instructions",
        moduleIndex: 1,
        objectives: [2],
      },
    ];

    const materialIds = new Map<string, string>();
    materialSpecs.forEach((spec, index) => {
      const id = newId("mat");
      materialIds.set(spec.title, id);
      db.prepare(
        `INSERT INTO course_materials (
           id, course_id, module_id, title, description, content_type, url, file_name,
           file_size, storage_adapter, date_label, visibility, professor_notes,
           student_instructions, position, is_demo, created_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      ).run(
        id,
        courseId,
        spec.moduleIndex === null ? null : moduleIds[spec.moduleIndex],
        spec.title,
        spec.description,
        spec.contentType,
        spec.url ?? null,
        spec.fileName ?? null,
        spec.fileName ? 248_000 + index * 5_000 : null,
        spec.fileName ? "local-metadata-only" : null,
        spec.dateLabel ?? null,
        spec.visibility ?? "students",
        spec.professorNotes ?? null,
        spec.studentInstructions ?? null,
        index + 1,
        at(-37 + index),
      );

      for (const n of spec.objectives ?? []) {
        db.prepare(
          "INSERT OR IGNORE INTO material_objectives (material_id, objective_id) VALUES (?,?)",
        ).run(id, LO(n));
      }
      for (const name of spec.concepts ?? []) {
        const conceptId = CPT(name);
        if (conceptId) {
          db.prepare(
            "INSERT OR IGNORE INTO material_concepts (material_id, concept_id) VALUES (?,?)",
          ).run(id, conceptId);
        }
      }
    });

    // ----------------------------------------------------------------- lectures
    type LectureSpec = {
      title: string;
      description: string;
      moduleIndex: number;
      status: string;
      deliveryMode: string;
      scheduledDay: number;
      duration: number;
      videoUrl?: string | null;
      liveUrl?: string | null;
      teachingNotes?: string | null;
      studentNotes?: string | null;
      transcript?: string | null;
      objectives: number[];
      segments: [number, string, string][];
      concepts?: string[];
      scripture?: [string, string | null][];
    };

    const lectureSpecs: LectureSpec[] = [
      {
        title: "The Late Medieval Church: Piety, Penance and Reform",
        description:
          "What the reformers inherited: the penitential system, the treasury of merit, and the reform movements already underway.",
        moduleIndex: 0,
        status: "published",
        deliveryMode: "recorded",
        scheduledDay: -33,
        duration: 78,
        videoUrl: "https://www.youtube.com/watch?v=DEMO_PLACEHOLDER_1",
        studentNotes: LECTURE_1_NOTES,
        objectives: [1, 8],
        concepts: ["Penitential system", "Indulgence"],
        segments: [
          [
            0,
            "Why \"late medieval decline\" is the wrong frame",
            "The fifteenth century was not a religious vacuum waiting to be filled. Lay piety was expanding, not contracting: confraternities, endowed masses, pilgrimage, vernacular devotional literature. Any account of 1517 that begins from decline has to explain why reform arguments landed in a church whose people were, by most measures, more religiously active than their grandparents.",
          ],
          [
            420,
            "The penitential system in practice",
            "Contrition, confession, satisfaction, absolution. The system was pastoral in intent and precise in operation, and it is worth understanding on its own terms before asking what Luther objected to. The pressure point was not the structure but the question of assurance: how does a penitent know their contrition was sufficient?",
          ],
          [
            1_140,
            "Facere quod in se est",
            "\"Do what lies within you.\" The axiom that God does not deny grace to the one who does their utmost. Held widely, meant charitably, and — for a certain kind of scrupulous conscience — devastating, because it makes the sufficiency of one's own effort the hinge.",
          ],
          [
            1_860,
            "Reform before the Reformation",
            "Conciliarism, observant movements within the orders, Wycliffe and Hus, Christian humanism and the new philology. Reform was a live and respectable word long before 1517. What changed was not the appetite for reform but the argument about what needed reforming.",
          ],
        ],
        scripture: [["Matthew 3:2", "On the meaning of metanoeite — Luther's first thesis turns on it."]],
      },
      {
        title: "Indulgences, the 95 Theses, and the Making of a Controversy",
        description:
          "How a technical disputation about indulgences became a public controversy about authority.",
        moduleIndex: 0,
        status: "published",
        deliveryMode: "recorded",
        scheduledDay: -26,
        duration: 74,
        videoUrl: "https://www.youtube.com/watch?v=DEMO_PLACEHOLDER_2",
        studentNotes: LECTURE_2_NOTES,
        objectives: [1, 8, 7],
        concepts: ["Indulgence", "Penitential system"],
        segments: [
          [
            0,
            "What the 95 Theses actually argue",
            "Read them. They are a set of academic propositions for disputation, in Latin, largely pastoral in tone, and considerably more moderate than their reputation. Thesis 1 is about the meaning of repentance. The theses do not deny papal authority; several of them defend it against what Luther takes to be the indulgence preachers' overreach.",
          ],
          [
            560,
            "The financial and institutional machinery",
            "The St Peter's campaign, the Albrecht of Brandenburg debt, the Fugger banking arrangements. The money matters, but a purely financial account cannot explain why the theological argument travelled as fast as it did.",
          ],
          [
            1_320,
            "Print, translation and escalation",
            "The theses were written for scholars and read by everyone. Within months, German translations were circulating. The escalation from indulgences to authority happened in the response, not the original document.",
          ],
        ],
      },
      {
        title: "Martin Luther and the Doctrine of Justification",
        description:
          "Luther's exegetical development, the forensic account of justification, and the distinctions that follow from it. The central lecture of module 2.",
        moduleIndex: 1,
        status: "published",
        deliveryMode: "hybrid",
        scheduledDay: -19,
        duration: 82,
        videoUrl: "https://www.youtube.com/watch?v=DEMO_PLACEHOLDER_3",
        liveUrl: "https://example.edu/live/ch504-week3",
        teachingNotes: LECTURE_3_TEACHING_NOTES,
        studentNotes: LECTURE_3_STUDENT_NOTES,
        transcript: LECTURE_3_TRANSCRIPT,
        objectives: [2, 7],
        concepts: [
          "Justification",
          "Sola fide",
          "Simul iustus et peccator",
          "Imputed righteousness",
          "Theology of the cross",
        ],
        segments: [
          [
            0,
            "Where we left off: the penitential system",
            "Recall the pressure point from week 1: not the structure of penance but the question of assurance. Luther's own account of his early years is an account of a conscience that could not find a floor. Hold that in view — the doctrine we are about to read is, among other things, an answer to a pastoral problem.",
          ],
          [
            390,
            "The early lectures on Romans",
            "In the 1515–16 Romans lectures Luther is still working with a largely traditional vocabulary while the substance shifts under it. The phrase iustitia Dei — the righteousness of God — moves from something God demands to something God gives. Watch that movement; it is the whole argument in miniature.",
          ],
          [
            850,
            "The Heidelberg Disputation, 1518",
            "Theses 19 through 24 set out the theology of the cross against a theology of glory. This is not a doctrine of atonement so much as an epistemology: God is known where God has chosen to be revealed, and God has chosen the cross. The theologian of glory reasons from visible strength to divine nature and gets God wrong.",
          ],
          [
            1_365,
            "Simul iustus et peccator",
            "At once righteous and a sinner. Not half-and-half, and not a stage on the way to becoming righteous. Wholly righteous, because the righteousness in question is Christ's and is reckoned to the believer; wholly a sinner, because nothing in the believer has yet been perfected. This is the formula students most often soften. Resist softening it.",
          ],
          [
            1_880,
            "Imputed and infused righteousness",
            "The distinction that will divide the sixteenth century. Imputed: reckoned to the believer's account, remaining Christ's. Infused: given as a habit, genuinely present in and transforming the believer. Trent will affirm infusion deliberately and with arguments. Neither side is confused about the other's position; they disagree.",
          ],
          [
            2_405,
            "What Luther did not say",
            "He did not say works are irrelevant. He did not say the Christian life is static. He did not say the law has no use. Every one of these is attributed to him regularly, and none of them survives contact with the texts. The Freedom of a Christian spends its second half on exactly the works Luther is accused of dismissing.",
          ],
          [
            2_850,
            "Reading Galatians 2 with Luther",
            "Open the 1535 commentary on Galatians 2:15–21 alongside the text. Notice what Luther does with the first person: \"I through the law died to the law.\" His reading is polemical and it is also careful. Both things are true, and separating them is the skill this course is trying to build.",
          ],
        ],
        scripture: [
          ["Romans 1:16–17", "The iustitia Dei passage. Luther returns to it constantly."],
          ["Romans 3:21–28", "The forensic vocabulary of reckoning."],
          ["Galatians 2:15–21", "Read with the 1535 commentary alongside."],
          ["Habakkuk 2:4", "As cited in Romans 1:17 — worth reading in its own context."],
        ],
      },
      {
        title: "Zwingli, Calvin and the Reformed Turn",
        description:
          "Covenant, sacrament and civic reform in Zurich and Geneva. Where the Reformed tradition parts company with Wittenberg.",
        moduleIndex: 2,
        status: "scheduled",
        deliveryMode: "live",
        scheduledDay: 2,
        duration: 80,
        liveUrl: "https://example.edu/live/ch504-week5",
        objectives: [3, 8],
        concepts: ["Covenant"],
        segments: [
          [
            0,
            "Zurich 1523–25: reform by disputation",
            "The Zurich disputations and the role of the city council. Reformed polity begins here, in the working relationship between preacher and magistrate.",
          ],
          [
            600,
            "The Marburg Colloquy and the sacramental parting",
            "1529. Fourteen articles agreed, one not. Why the disagreement over the presence of Christ in the supper could not be papered over.",
          ],
          [
            1_320,
            "Calvin on covenant and the unity of scripture",
            "Institutes II.x–xi. The single covenant differently administered, and what that does to the Lutheran law/gospel distinction.",
          ],
        ],
      },
      {
        title: "The Radical Reformation: Ecclesiology from Below",
        description:
          "Anabaptist ecclesiology, believers' baptism and the critique of magisterial reform. Draft — not yet published to students.",
        moduleIndex: 3,
        status: "draft",
        deliveryMode: "recorded",
        scheduledDay: 9,
        duration: 75,
        objectives: [4],
        segments: [
          [
            0,
            "Schleitheim, 1527",
            "Seven articles. Read them as a church order rather than a systematic theology.",
          ],
        ],
      },
    ];

    const lectureIds: string[] = [];
    const segmentIds: string[][] = [];

    lectureSpecs.forEach((spec, lectureIndex) => {
      const lectureId = newId("lec");
      lectureIds.push(lectureId);

      db.prepare(
        `INSERT INTO lectures (
           id, course_id, module_id, title, description, scheduled_at, duration_minutes,
           delivery_mode, status, video_provider, video_url, live_url, teaching_notes,
           student_notes, transcript_text, position, is_demo, created_at, updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      ).run(
        lectureId,
        courseId,
        moduleIds[spec.moduleIndex],
        spec.title,
        spec.description,
        at(spec.scheduledDay, 16),
        spec.duration,
        spec.deliveryMode,
        spec.status,
        spec.videoUrl ? "youtube" : null,
        spec.videoUrl ?? null,
        spec.liveUrl ?? null,
        spec.teachingNotes ?? null,
        spec.studentNotes ?? null,
        spec.transcript ?? null,
        lectureIndex + 1,
        at(spec.scheduledDay - 2),
        at(spec.scheduledDay),
      );

      for (const n of spec.objectives) {
        db.prepare(
          "INSERT OR IGNORE INTO lecture_objectives (lecture_id, objective_id) VALUES (?,?)",
        ).run(lectureId, LO(n));
      }

      for (const name of spec.concepts ?? []) {
        const conceptId = CPT(name);
        if (!conceptId) continue;
        db.prepare(
          `INSERT OR IGNORE INTO lecture_concepts (lecture_id, concept_id, objective_id)
           VALUES (?,?,?)`,
        ).run(lectureId, conceptId, LO(spec.objectives[0]));
      }

      const ids = spec.segments.map(([startSeconds, heading, body], index) => {
        const id = newId("seg");
        const next = spec.segments[index + 1];
        db.prepare(
          `INSERT INTO lecture_segments
             (id, lecture_id, position, start_seconds, end_seconds, heading, body,
              transcript_excerpt, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
        ).run(
          id,
          lectureId,
          index + 1,
          startSeconds,
          next ? next[0] : spec.duration * 60,
          heading,
          body,
          body.split(/(?<=\.)\s+/).slice(0, 2).join(" "),
          at(spec.scheduledDay - 2),
        );
        return id;
      });
      segmentIds.push(ids);

      for (const [reference, note] of spec.scripture ?? []) {
        db.prepare(
          `INSERT INTO scripture_references
             (id, course_id, lecture_id, segment_id, reference, note, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        ).run(
          newId("scr"),
          courseId,
          lectureId,
          ids[0] ?? null,
          reference,
          note,
          at(spec.scheduledDay - 2),
        );
      }

      if (lectureIndex === 2) {
        SLIDE_TITLES.forEach((title, index) => {
          db.prepare(
            `INSERT INTO slides (id, lecture_id, position, title, notes, created_at)
             VALUES (?,?,?,?,?,?)`,
          ).run(
            newId("sld"),
            lectureId,
            index + 1,
            title,
            null,
            at(spec.scheduledDay - 2),
          );
        });
      }
    });

    const [lecture1, lecture2, lecture3, lecture4] = lectureIds;

    for (const title of [
      "Recorded lecture — Luther and the Doctrine of Justification",
      "Lecture notes — Luther and justification",
      "Slide deck — Justification in Luther",
      "Luther, \"The Freedom of a Christian\" (1520)",
      "Galatians 2:15–21 — reading guide",
      "Heidelberg Disputation (1518), theses 19–24",
    ]) {
      const materialId = materialIds.get(title);
      if (!materialId) continue;
      db.prepare(
        `INSERT OR IGNORE INTO lecture_resources (lecture_id, material_id, relation)
         VALUES (?,?,?)`,
      ).run(lecture3, materialId, title.includes("Recorded") ? "recording" : "supplemental");
    }
    const oberman = materialIds.get(
      "Oberman, \"Facientibus quod in se est\" — journal article",
    );
    if (oberman) {
      db.prepare(
        `INSERT OR IGNORE INTO lecture_resources (lecture_id, material_id, relation)
         VALUES (?,?,'supplemental')`,
      ).run(lecture1, oberman);
    }

    // ------------------------------------------------------- interactive moments
    type InteractionSpec = {
      lectureIndex: number;
      type: string;
      prompt: string;
      body?: string | null;
      explanation?: string | null;
      segmentIndex: number;
      objective?: number | null;
      concept?: string | null;
      options?: [string, boolean][];
    };

    const interactionSpecs: InteractionSpec[] = [
      // Lecture 1 -------------------------------------------------------------
      {
        lectureIndex: 0,
        type: "comprehension_question",
        prompt:
          "The axiom facere quod in se est holds that God will not deny grace to someone who does what?",
        segmentIndex: 2,
        objective: 1,
        concept: "Penitential system",
        explanation:
          "\"Do what lies within you.\" The axiom locates the hinge in the penitent's own utmost effort, which is precisely why it troubled a scrupulous conscience.",
        options: [
          ["Their utmost — whatever lies within their own power", true],
          ["A specified number of penitential works set by a confessor", false],
          ["Purchases an indulgence on behalf of a relative", false],
          ["Completes a pilgrimage to Rome", false],
        ],
      },
      {
        lectureIndex: 0,
        type: "comprehension_question",
        prompt:
          "True or false: on the evidence surveyed in this lecture, lay religious practice in the fifteenth century was in measurable decline.",
        segmentIndex: 0,
        objective: 1,
        explanation:
          "False. Confraternities, endowed masses, pilgrimage and vernacular devotional writing all expanded. \"Decline\" is the wrong frame, and it makes 1517 harder rather than easier to explain.",
        options: [
          ["True", false],
          ["False", true],
        ],
      },
      {
        lectureIndex: 0,
        type: "important_concept",
        prompt: "The pressure point was assurance, not structure",
        body:
          "Hold on to this. The reformers' objection is not primarily that penance was administratively corrupt but that it left the conscience without a floor.",
        segmentIndex: 1,
        objective: 1,
      },
      // Lecture 2 -------------------------------------------------------------
      {
        lectureIndex: 1,
        type: "comprehension_question",
        prompt: "What does the first of the 95 Theses concern?",
        segmentIndex: 0,
        objective: 8,
        explanation:
          "The meaning of repentance — metanoeite in Matthew 3:2 as a whole life of turning rather than the sacrament of penance alone. Thesis 1 is exegetical, not institutional.",
        options: [
          ["The meaning of repentance", true],
          ["The authority of the pope to remit guilt", false],
          ["The financing of St Peter's basilica", false],
          ["The treasury of merit", false],
        ],
      },
      {
        lectureIndex: 1,
        type: "comprehension_question",
        prompt:
          "True or false: the 95 Theses explicitly deny papal authority.",
        segmentIndex: 0,
        objective: 7,
        explanation:
          "False. Several theses defend papal authority against what Luther took to be the indulgence preachers' overreach. The escalation to authority came in the response.",
        options: [
          ["True", false],
          ["False", true],
        ],
      },
      {
        lectureIndex: 1,
        type: "exam_emphasis",
        prompt: "Know what the theses do and do not argue",
        body:
          "The midterm will ask you to distinguish the content of the theses from their later reception. Read the document itself.",
        segmentIndex: 0,
        objective: 7,
      },
      // Lecture 3 -------------------------------------------------------------
      {
        lectureIndex: 2,
        type: "comprehension_question",
        prompt:
          "In Luther's mature account, the righteousness by which a sinner is justified is best described as:",
        segmentIndex: 4,
        objective: 2,
        concept: "Imputed righteousness",
        explanation:
          "Imputed — reckoned to the believer's account while remaining Christ's own. Infusion is Trent's considered alternative, not a misreading of Luther.",
        options: [
          [
            "Imputed to the believer from outside, remaining Christ's own righteousness",
            true,
          ],
          [
            "Infused as a habit that gradually perfects the will",
            false,
          ],
          [
            "A potential the believer actualises through acts of penance",
            false,
          ],
          ["The believer's own faith, counted as a meritorious virtue", false],
        ],
      },
      {
        lectureIndex: 2,
        type: "comprehension_question",
        prompt: "Simul iustus et peccator is best rendered as:",
        segmentIndex: 3,
        objective: 2,
        concept: "Simul iustus et peccator",
        explanation:
          "\"At the same time righteous and a sinner\" — wholly both, simultaneously. Not partly each, and not a stage on the way to becoming righteous.",
        options: [
          ["At the same time righteous and a sinner", true],
          ["Righteous in part and sinful in part", false],
          ["Once a sinner, now righteous", false],
          ["Righteous in intention though sinful in act", false],
        ],
      },
      {
        lectureIndex: 2,
        type: "comprehension_question",
        prompt:
          "Luther's theology of the cross is set primarily against which alternative?",
        segmentIndex: 2,
        objective: 2,
        concept: "Theology of the cross",
        explanation:
          "A theology of glory, which reasons from visible power and majesty to God's nature. Heidelberg theses 19–21 make the contrast explicitly epistemological.",
        options: [
          [
            "A theology of glory that reasons from visible power to God's nature",
            true,
          ],
          ["A theology of the resurrection", false],
          ["Scholastic logic as such", false],
          ["Monastic asceticism", false],
        ],
      },
      {
        lectureIndex: 2,
        type: "definition",
        prompt: "Imputed vs. infused",
        body:
          "Imputed: reckoned to your account, remaining Christ's. Infused: given as a habit, genuinely present in you. Both traditions know what the other means.",
        segmentIndex: 4,
        objective: 2,
        concept: "Imputed righteousness",
      },
      {
        lectureIndex: 2,
        type: "theological_perspective",
        prompt: "Trent is not a caricature of Luther",
        body:
          "When we reach module 5, read the Decree on Justification as a considered position with its own arguments. Nothing in this lecture requires you to conclude that it is wrong — only to see clearly what is at issue.",
        segmentIndex: 4,
        objective: 5,
      },
      {
        lectureIndex: 2,
        type: "scripture_reference",
        prompt: "Romans 1:16–17",
        body:
          "The iustitia Dei passage. Read it before Thursday and note whether \"righteousness of God\" reads more naturally as something demanded or something given.",
        segmentIndex: 1,
        objective: 2,
      },
      {
        lectureIndex: 2,
        type: "reflection_question",
        prompt:
          "Luther describes a conscience that could not find a floor. Where in your own ministry context have you met that, and what was offered?",
        segmentIndex: 0,
        objective: 6,
      },
      {
        lectureIndex: 2,
        type: "confidence_rating",
        prompt:
          "How confident are you that you could explain the difference between imputed and infused righteousness to a first-year student?",
        segmentIndex: 4,
        objective: 2,
      },
      {
        lectureIndex: 2,
        type: "exam_emphasis",
        prompt: "This distinction is on the midterm",
        body:
          "You will be asked to state the imputation/infusion distinction and to say what is theologically at stake in it. Both halves matter.",
        segmentIndex: 4,
        objective: 2,
      },
      {
        lectureIndex: 2,
        type: "pause_and_reflect",
        prompt:
          "Before the next section: write down, without looking, one thing Luther is commonly said to have taught that you now think he did not.",
        segmentIndex: 5,
        objective: 7,
      },
      {
        lectureIndex: 2,
        type: "poll",
        prompt:
          "Which of these did you already assume Luther taught before this week?",
        segmentIndex: 5,
        objective: 7,
        options: [
          ["That works are irrelevant to the Christian life", false],
          ["That the law has no continuing use", false],
          ["That sanctification is automatic", false],
          ["None of these", false],
        ],
      },
      {
        lectureIndex: 2,
        type: "recommended_reading",
        prompt: "The Freedom of a Christian, second half",
        body:
          "If you only read the first half you will come away with exactly the misreading section 6 is warning against.",
        segmentIndex: 5,
        objective: 2,
      },
      {
        lectureIndex: 2,
        type: "application_question",
        prompt:
          "How would you preach Galatians 2:20 to a congregation that hears \"I no longer live\" as self-erasure rather than freedom?",
        segmentIndex: 6,
        objective: 6,
      },
      // Lecture 4 (upcoming) --------------------------------------------------
      {
        lectureIndex: 3,
        type: "comprehension_question",
        prompt:
          "At Marburg in 1529, how many of the fourteen articles were agreed?",
        segmentIndex: 1,
        objective: 3,
        explanation: "Thirteen. The disagreement was over the presence of Christ in the supper.",
        options: [
          ["Thirteen", true],
          ["Seven", false],
          ["All fourteen", false],
          ["None", false],
        ],
      },
      {
        lectureIndex: 3,
        type: "historical_context",
        prompt: "The Zurich disputations and the city council",
        body:
          "Reformed polity begins in the working relationship between preacher and magistrate. Keep the civic setting in view.",
        segmentIndex: 0,
        objective: 3,
      },
    ];

    /** Comprehension checks, in the order students encounter them. */
    const checkIds: string[] = [];
    const interactionIdsByLecture: string[][] = [[], [], [], [], []];

    interactionSpecs.forEach((spec, index) => {
      const interactionId = newId("int");
      const lectureId = lectureIds[spec.lectureIndex];
      const segment = segmentIds[spec.lectureIndex][spec.segmentIndex] ?? null;
      const startSeconds =
        lectureSpecs[spec.lectureIndex].segments[spec.segmentIndex]?.[0] ?? null;

      db.prepare(
        `INSERT INTO interactions (
           id, lecture_id, type, prompt, body, explanation, at_seconds, segment_id,
           slide_id, concept_id, objective_id, position, published, published_at,
           ai_generated, created_at
         ) VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?,1,?,0,?)`,
      ).run(
        interactionId,
        lectureId,
        spec.type,
        spec.prompt,
        spec.body ?? null,
        spec.explanation ?? null,
        startSeconds === null ? null : startSeconds + 120,
        segment,
        spec.concept ? CPT(spec.concept) : null,
        spec.objective ? LO(spec.objective) : null,
        index + 1,
        at(lectureSpecs[spec.lectureIndex].scheduledDay),
        at(lectureSpecs[spec.lectureIndex].scheduledDay - 1),
      );

      interactionIdsByLecture[spec.lectureIndex].push(interactionId);

      (spec.options ?? []).forEach(([text, isCorrect], optionIndex) => {
        db.prepare(
          `INSERT INTO interaction_options
             (id, interaction_id, position, text, is_correct)
           VALUES (?,?,?,?,?)`,
        ).run(newId("opt"), interactionId, optionIndex + 1, text, isCorrect ? 1 : 0);
      });

      // Only checks on published lectures count as "available" activity.
      if (
        spec.type === "comprehension_question" &&
        lectureSpecs[spec.lectureIndex].status !== "draft" &&
        spec.lectureIndex <= 2
      ) {
        checkIds.push(interactionId);
      }
    });

    // -------------------------------------------------------------- assessments
    const practiceId = newId("asm");
    db.prepare(
      `INSERT INTO assessments (
         id, course_id, type, title, description, scheduled_at, weight_label,
         professor_guidance, study_resources, is_practice, published, is_demo, created_at
       ) VALUES (?,?,'practice_test',?,?,NULL,?,?,?,1,1,1,?)`,
    ).run(
      practiceId,
      courseId,
      "Midterm Review: Luther and the Early Reformation",
      "A short self-check covering modules 1 and 2. Not graded. Your answers and confidence ratings feed your readiness view, and I see the class totals rather than individual scores.",
      "Not graded — practice only",
      "Answer without your notes first, then go back with them. The gap between the two attempts is the useful information.",
      "Study guide — Midterm, modules 1–2; Lecture notes — Luther and justification",
      at(-16),
    );

    for (const n of [1, 2, 7, 8]) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_objectives (assessment_id, objective_id) VALUES (?,?)",
      ).run(practiceId, LO(n));
    }
    for (const lectureId of [lecture1, lecture2, lecture3]) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_lectures (assessment_id, lecture_id) VALUES (?,?)",
      ).run(practiceId, lectureId);
    }

    type PracticeQuestion = {
      type: string;
      prompt: string;
      explanation?: string;
      objective: number;
      concept?: string;
      options?: [string, boolean][];
    };

    const practiceQuestions: PracticeQuestion[] = [
      {
        type: "multiple_choice",
        prompt:
          "Trent's Decree on Justification affirms that the righteousness by which we are justified is:",
        explanation:
          "Infused — genuinely given to and present in the believer. Stating this accurately is a prerequisite for assessing the disagreement at all.",
        objective: 2,
        concept: "Imputed righteousness",
        options: [
          ["Infused, and genuinely present in the believer", true],
          ["Imputed, and remaining external to the believer", false],
          ["Both imputed and infused, without distinction", false],
          ["Neither; Trent leaves the question open", false],
        ],
      },
      {
        type: "multiple_choice",
        prompt:
          "Which best states what Luther means by faith in \"justification by faith alone\"?",
        explanation:
          "Trust in a promise. Reading faith as a meritorious act of the will reintroduces exactly what the formula is refusing.",
        objective: 2,
        concept: "Sola fide",
        options: [
          ["Trust in a promise made by God", true],
          ["Intellectual assent to correct doctrine", false],
          ["A meritorious act of the will", false],
          ["Confidence in one's own regeneration", false],
        ],
      },
      {
        type: "true_false",
        prompt:
          "Luther held that the moral law has no continuing use for the justified Christian.",
        explanation:
          "False. This is among the most common misattributions. The Freedom of a Christian devotes its second half to the works of the Christian life.",
        objective: 2,
        options: [
          ["True", false],
          ["False", true],
        ],
      },
      {
        type: "multiple_choice",
        prompt:
          "The Heidelberg Disputation's contrast between a theologian of the cross and a theologian of glory is primarily a claim about:",
        explanation:
          "How God is known. It is epistemological before it is soteriological.",
        objective: 2,
        concept: "Theology of the cross",
        options: [
          ["How God is known", true],
          ["How the atonement functions", false],
          ["The proper form of monastic life", false],
          ["The authority of Aristotle in theology", false],
        ],
      },
      {
        type: "true_false",
        prompt:
          "The 95 Theses were written in Latin as propositions for academic disputation.",
        explanation: "True. Their popular circulation came through later translation.",
        objective: 8,
        options: [
          ["True", true],
          ["False", false],
        ],
      },
      {
        type: "multiple_choice",
        prompt:
          "Which reform impulse was already well established before 1517?",
        explanation:
          "All of these were live. \"Reform\" was a respectable word long before Luther used it.",
        objective: 1,
        options: [
          ["Observant movements within the religious orders", true],
          ["Believers' baptism as a settled practice", false],
          ["Vernacular liturgy as official policy", false],
          ["Rejection of the treasury of merit by the universities", false],
        ],
      },
      {
        type: "short_answer",
        prompt:
          "In two or three sentences, state what is theologically at stake in the difference between imputed and infused righteousness. Read by your professor — not auto-marked.",
        objective: 2,
      },
      {
        type: "confidence_rating",
        prompt:
          "How ready do you feel for the midterm's questions on justification?",
        objective: 2,
      },
    ];

    const practiceQuestionIds: string[] = [];
    practiceQuestions.forEach((question, index) => {
      const questionId = newId("aq");
      practiceQuestionIds.push(questionId);
      db.prepare(
        `INSERT INTO assessment_questions
           (id, assessment_id, position, type, prompt, explanation, objective_id,
            concept_id, ai_generated, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,?)`,
      ).run(
        questionId,
        practiceId,
        index + 1,
        question.type,
        question.prompt,
        question.explanation ?? null,
        LO(question.objective),
        question.concept ? CPT(question.concept) : null,
        at(-16),
      );

      (question.options ?? []).forEach(([text, isCorrect], optionIndex) => {
        db.prepare(
          `INSERT INTO assessment_question_options
             (id, question_id, position, text, is_correct)
           VALUES (?,?,?,?,?)`,
        ).run(newId("aqo"), questionId, optionIndex + 1, text, isCorrect ? 1 : 0);
      });
    });

    /** Auto-scored practice questions, in order — used by the seeded profiles. */
    const scorablePracticeIds = practiceQuestionIds.filter(
      (_, index) =>
        practiceQuestions[index].type === "multiple_choice" ||
        practiceQuestions[index].type === "true_false",
    );

    const midtermId = newId("asm");
    db.prepare(
      `INSERT INTO assessments (
         id, course_id, type, title, description, scheduled_at, weight_label,
         professor_guidance, study_resources, is_practice, published, is_demo, created_at
       ) VALUES (?,?,'midterm',?,?,?,?,?,?,0,1,1,?)`,
    ).run(
      midtermId,
      courseId,
      "Midterm Examination",
      "In-class, closed book. Covers modules 1 and 2. Short identifications, two paragraph-length questions, and one longer comparison.",
      at(11, 16),
      "25% of final grade",
      "The comparison question will ask you to set two positions side by side accurately before evaluating either. Practise stating a position you disagree with in terms its holders would accept.",
      "Study guide — Midterm, modules 1–2; Review sheet — key terms and dates, 1300–1530",
      at(-30),
    );
    for (const n of [1, 2, 7, 8]) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_objectives (assessment_id, objective_id) VALUES (?,?)",
      ).run(midtermId, LO(n));
    }

    const essayId = newId("asm");
    db.prepare(
      `INSERT INTO assessments (
         id, course_id, type, title, description, scheduled_at, weight_label,
         professor_guidance, study_resources, is_practice, published, is_demo, created_at
       ) VALUES (?,?,'essay',?,?,?,?,?,NULL,0,1,1,?)`,
    ).run(
      essayId,
      courseId,
      "Primary Source Analysis (1,500 words)",
      "One text, closely read, with attention to genre, audience and polemical context. Read and marked by your professor — this prototype does not attempt to score theological writing.",
      at(5, 23),
      "20% of final grade",
      "Choose a text you find difficult rather than one you already agree with.",
      at(-30),
    );
    db.prepare(
      "INSERT OR IGNORE INTO assessment_objectives (assessment_id, objective_id) VALUES (?,?)",
    ).run(essayId, LO(7));

    // ------------------------------------------------------------------ students
    type Profile = {
      name: string;
      email: string | null;
      idNumber: string | null;
      joinedDay: number;
      /** One entry per published comprehension check, in order. null = unanswered. */
      checks: (boolean | null)[];
      /** One entry per auto-scored practice question. null = unanswered. */
      practice: (boolean | null)[];
      /** [objective number, level 1–5] */
      confidence: [number, number][];
      /** [lecture index, segment index, marker] */
      markers: [number, number, Marker][];
      questions: { lecture: number; segment: number; kind: QuestionKind; body: string }[];
      notes: {
        lecture: number | null;
        segment: number | null;
        kind: NoteKind;
        title: string | null;
        body: string;
        seconds: number | null;
        shared?: boolean;
      }[];
      helpRequest?: {
        kind: string;
        topics: string;
        message: string;
      };
      lastActivityDay: number;
    };

    const profiles: Profile[] = [
      {
        name: "Anselm Whitfield",
        email: "a.whitfield@example.edu",
        idNumber: "D-100241",
        joinedDay: -33,
        checks: [true, true, true, true, true, false, true],
        practice: [true, true, true, true, true, true],
        confidence: [
          [2, 5],
          [2, 4],
          [1, 5],
        ],
        markers: [
          [2, 4, "clear"],
          [2, 3, "clear"],
          [2, 2, "important"],
          [1, 0, "clear"],
          [0, 2, "clear"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 4,
            kind: "question",
            body: "If imputation is forensic, does Luther have anything to say about ontological change in the believer, or is that simply a different question for him?",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 4,
            kind: "timestamped",
            title: "Imputation is forensic, not fictional",
            body: "Carter's phrasing: reckoned to my account, remaining Christ's. The objection that this makes justification a legal fiction assumes the declaration is separable from the union — which Luther doesn't grant. Check Institutes III.xi for how Calvin handles the same objection.",
            seconds: 1_940,
            shared: true,
          },
          {
            lecture: 2,
            segment: 6,
            kind: "exam_review",
            title: "Galatians 2:20 — first person",
            body: "Luther's reading turns on the 'I'. Worth memorising the sequence: through the law died to the law, so that I might live to God.",
            seconds: 2_910,
          },
        ],
        lastActivityDay: -2,
      },
      {
        name: "Priya Raghunathan",
        email: "p.raghunathan@example.edu",
        idNumber: "D-100258",
        joinedDay: -33,
        checks: [true, true, true, true, true, true, true],
        practice: [true, true, true, false, true, true],
        confidence: [
          [2, 4],
          [1, 4],
        ],
        markers: [
          [2, 4, "clear"],
          [2, 5, "clear"],
          [2, 2, "exam_likely"],
          [1, 0, "clear"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 2,
            kind: "connect_previous",
            body: "The theology of the cross sounds like it's doing the same work as the assurance problem from week 1 — is that the connection you intended?",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 2,
            kind: "key_concept",
            title: "Theology of the cross is epistemology",
            body: "Not a theory of atonement. Heidelberg 19–21: God known where God chose to be revealed. Theologian of glory reasons from visible power and gets God wrong.",
            seconds: 900,
          },
        ],
        lastActivityDay: -1,
      },
      {
        name: "Tobias Lindqvist",
        email: "t.lindqvist@example.edu",
        idNumber: "D-100263",
        joinedDay: -32,
        checks: [true, true, false, true, true, true, null],
        practice: [true, true, true, true, false, true],
        confidence: [
          [2, 4],
          [8, 5],
        ],
        markers: [
          [2, 3, "clear"],
          [1, 0, "clear"],
          [0, 1, "clear"],
        ],
        questions: [],
        notes: [
          {
            lecture: 1,
            segment: 0,
            kind: "quote",
            title: "Thesis 1",
            body: "\"Our Lord and Master Jesus Christ, in saying 'Repent ye' etc., meant that the whole life of the faithful should be penitence.\" — read the theses themselves, they are nothing like the reputation.",
            seconds: 200,
          },
        ],
        lastActivityDay: -3,
      },
      {
        name: "Noor Haddad",
        email: "n.haddad@example.edu",
        idNumber: "D-100271",
        joinedDay: -33,
        checks: [true, true, false, true, false, false, true],
        practice: [false, true, false, true, true],
        confidence: [
          [2, 2],
          [2, 2],
          [1, 3],
        ],
        markers: [
          [2, 4, "confusing"],
          [2, 3, "confusing"],
          [2, 5, "confusing"],
          [2, 2, "clear"],
          [1, 0, "clear"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 4,
            kind: "request_simpler",
            body: "Could you put imputed vs. infused in plainer language? I can repeat the definitions but I don't think I could tell which one a text was assuming.",
          },
          {
            lecture: 2,
            segment: 3,
            kind: "question",
            body: "If simul iustus et peccator means wholly both at once, what changes over a Christian's life? I keep sliding back into reading it as a process.",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 4,
            kind: "question",
            title: "Still stuck here",
            body: "Imputed = outside me, infused = inside me. Fine. But when I read Trent I can't actually tell whether the disagreement is about mechanism or about what justification IS. Ask in office hours.",
            seconds: 1_960,
          },
          {
            lecture: 2,
            segment: 3,
            kind: "reflection",
            title: "Why this is hard",
            body: "I think my problem is that I was taught justification as a process, so 'wholly righteous now' sounds like it's denying anything happens afterwards. Carter said resist softening it — I keep softening it.",
            seconds: 1_400,
            shared: true,
          },
        ],
        lastActivityDay: -2,
      },
      {
        name: "Emmanuel Osei",
        email: "e.osei@example.edu",
        idNumber: "D-100280",
        joinedDay: -31,
        checks: [true, false, true, true, false, true, null],
        practice: [false, true, true, false, true],
        confidence: [
          [2, 3],
          [3, 3],
        ],
        markers: [
          [2, 4, "confusing"],
          [2, 1, "clear"],
          [1, 2, "confusing"],
          [1, 0, "clear"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 1,
            kind: "request_example",
            body: "Could we see a concrete example of the iustitia Dei shift in the Romans lectures? The description makes sense but I can't picture the actual textual change.",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 1,
            kind: "ministry_application",
            title: "Preaching this",
            body: "The 'conscience without a floor' framing is the most useful thing I've heard for the pastoral work I actually do. Most of the people I sit with are not asking about mechanism, they're asking whether it's enough.",
            seconds: 500,
            shared: true,
          },
        ],
        lastActivityDay: -4,
      },
      {
        name: "Rachel Steinberg",
        email: "r.steinberg@example.edu",
        idNumber: "D-100288",
        joinedDay: -30,
        checks: [false, true, true, true, true, false, null],
        practice: [true, false, true, false],
        confidence: [
          [2, 3],
          [1, 2],
        ],
        markers: [
          [2, 5, "confusing"],
          [2, 4, "clear"],
          [0, 2, "confusing"],
        ],
        questions: [
          {
            lecture: 0,
            segment: 2,
            kind: "question",
            body: "Was facere quod in se est actually the official teaching, or a school opinion that happened to be widely held? The distinction seems to matter for how we read Luther's objection.",
          },
        ],
        notes: [
          {
            lecture: 0,
            segment: 2,
            kind: "exam_review",
            title: "Facere quod in se est",
            body: "'Do what lies within you.' Not a doctrine of works-salvation as such — the charity of the position is what makes it dangerous for a scrupulous conscience.",
            seconds: 1_200,
          },
        ],
        lastActivityDay: -5,
      },
      {
        name: "Camila Duarte",
        email: "c.duarte@example.edu",
        idNumber: "D-100294",
        joinedDay: -29,
        checks: [true, true, null, false, true, false, null],
        practice: [true, true, false],
        confidence: [[2, 3]],
        markers: [
          [2, 4, "confusing"],
          [2, 2, "clear"],
          [1, 0, "clear"],
        ],
        questions: [],
        notes: [
          {
            lecture: 2,
            segment: 5,
            kind: "action_item",
            title: "Re-read Freedom of a Christian, second half",
            body: "Carter said the misreading comes from stopping halfway. I stopped halfway.",
            seconds: 2_500,
          },
        ],
        lastActivityDay: -6,
      },
      {
        name: "Jonah Whitmore",
        email: "j.whitmore@example.edu",
        idNumber: "D-100301",
        joinedDay: -28,
        checks: [false, true, null, false, false, false, null],
        practice: [false, false, true],
        confidence: [
          [2, 1],
          [2, 2],
          [1, 2],
        ],
        markers: [
          [2, 4, "confusing"],
          [2, 3, "confusing"],
          [2, 1, "confusing"],
          [2, 5, "confusing"],
          [1, 1, "confusing"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 4,
            kind: "request_simpler",
            body: "I'm lost from about the middle of this lecture. Is there a simpler entry point for the imputed/infused distinction before I try the reading again?",
          },
          {
            lecture: 2,
            segment: 3,
            kind: "request_example",
            body: "An example of simul iustus et peccator in practice would help — something other than the formula itself.",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 4,
            kind: "question",
            title: "Not following",
            body: "Tried this section three times. I can recite the definitions and I still couldn't apply them to a text. Need to talk to someone.",
            seconds: 1_950,
          },
        ],
        helpRequest: {
          kind: "teaching_assistant",
          topics:
            "Imputed vs. infused righteousness; simul iustus et peccator; how to read Trent alongside Luther",
          message:
            "I've re-read the section and the notes and I'm still not able to apply the distinction to an actual text. I'd rather ask now than turn up to the midterm having memorised definitions I can't use.",
        },
        lastActivityDay: -1,
      },
      {
        name: "Grace Nakamura",
        email: "g.nakamura@example.edu",
        idNumber: "D-100309",
        joinedDay: -27,
        checks: [false, false, null, true, false, false, null],
        practice: [false, false],
        confidence: [
          [2, 2],
          [1, 1],
        ],
        markers: [
          [2, 3, "confusing"],
          [2, 4, "confusing"],
          [0, 2, "confusing"],
          [0, 1, "confusing"],
        ],
        questions: [
          {
            lecture: 0,
            segment: 1,
            kind: "request_simpler",
            body: "I don't think I have the medieval background this course assumes. Is there a plainer overview of the penitential system I could read first?",
          },
        ],
        notes: [
          {
            lecture: 0,
            segment: 1,
            kind: "reflection",
            title: "Behind on background",
            body: "Everyone else seems to know the medieval material already. I'm reconstructing it from the lecture while trying to follow the argument.",
            seconds: 700,
          },
        ],
        lastActivityDay: -3,
      },
      {
        name: "Malik Abernathy",
        email: "m.abernathy@example.edu",
        idNumber: "D-100315",
        joinedDay: -26,
        checks: [true, false, null, false, true, false, null],
        practice: [false, true, false],
        confidence: [
          [2, 2],
          [7, 2],
        ],
        markers: [
          [2, 4, "confusing"],
          [2, 6, "confusing"],
          [1, 2, "confusing"],
          [2, 2, "clear"],
        ],
        questions: [
          {
            lecture: 2,
            segment: 6,
            kind: "question",
            body: "How do I tell the difference between a polemical reading and a careless one? You said Luther's Galatians reading is both polemical and careful and I can't see how to hold both.",
          },
        ],
        notes: [
          {
            lecture: 2,
            segment: 6,
            kind: "question",
            title: "Polemical and careful?",
            body: "This is the thing I actually need help with — not the doctrine, the method. How do you read a text that is arguing hard and still take its exegesis seriously?",
            seconds: 2_900,
            shared: true,
          },
        ],
        helpRequest: {
          kind: "office_hours",
          topics: "Reading polemical primary sources; Luther on Galatians 2",
          message:
            "I think my problem is method rather than content. I'd like fifteen minutes on how to read a polemical text carefully.",
        },
        lastActivityDay: -2,
      },
      {
        name: "Sofia Marchetti",
        email: "s.marchetti@example.edu",
        idNumber: null,
        joinedDay: -4,
        checks: [null, null, null, null, null, null, null],
        practice: [],
        confidence: [],
        markers: [[2, 0, "clear"]],
        questions: [],
        notes: [
          {
            lecture: 2,
            segment: 0,
            kind: "free_form",
            title: null,
            body: "Joined late — catching up on modules 1 and 2 this week.",
            seconds: null,
          },
        ],
        lastActivityDay: -4,
      },
      {
        name: "Dae-Hyun Park",
        email: null,
        idNumber: null,
        joinedDay: -2,
        checks: [null, null, null, null, null, null, null],
        practice: [],
        confidence: [],
        markers: [],
        questions: [],
        notes: [],
        lastActivityDay: -2,
      },
    ];

    const studentIds: string[] = [];

    profiles.forEach((profile) => {
      const studentId = newId("stu");
      studentIds.push(studentId);

      db.prepare(
        `INSERT INTO students (id, name, email, student_id_number, is_demo, created_at)
         VALUES (?,?,?,?,1,?)`,
      ).run(
        studentId,
        profile.name,
        profile.email,
        profile.idNumber,
        at(profile.joinedDay),
      );

      db.prepare(
        `INSERT INTO course_entries
           (id, course_id, student_id, source, consent_at, joined_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(
        newId("ent"),
        courseId,
        studentId,
        profile.joinedDay < -20 ? "qr" : "link",
        at(profile.joinedDay),
        at(profile.joinedDay),
      );

      db.prepare(
        `INSERT INTO activity_events
           (id, course_id, student_id, actor_role, type, summary, created_at)
         VALUES (?,?,?,'student','joined_course',?,?)`,
      ).run(
        newId("act"),
        courseId,
        studentId,
        `${profile.name} joined the course`,
        at(profile.joinedDay),
      );

      // Comprehension check responses.
      profile.checks.forEach((correct, index) => {
        const interactionId = checkIds[index];
        if (!interactionId || correct === null) return;

        const options = db
          .prepare<[string], { id: string; is_correct: number }>(
            "SELECT id, is_correct FROM interaction_options WHERE interaction_id = ? ORDER BY position",
          )
          .all(interactionId);
        if (options.length === 0) return;

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
          at(profile.joinedDay + 4 + index),
        );
      });

      // Practice assessment responses.
      profile.practice.forEach((correct, index) => {
        const questionId = scorablePracticeIds[index];
        if (!questionId || correct === null) return;

        const options = db
          .prepare<[string], { id: string; is_correct: number }>(
            "SELECT id, is_correct FROM assessment_question_options WHERE question_id = ? ORDER BY position",
          )
          .all(questionId);
        const chosen = correct
          ? options.find((o) => o.is_correct === 1)
          : options.find((o) => o.is_correct === 0);
        if (!chosen) return;

        db.prepare(
          `INSERT INTO assessment_responses
             (id, assessment_id, question_id, student_id, option_id, is_correct, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        ).run(
          newId("ares"),
          practiceId,
          questionId,
          studentId,
          chosen.id,
          correct ? 1 : 0,
          at(profile.lastActivityDay - 1, 20, index),
        );
      });

      if (profile.practice.length > 0) {
        db.prepare(
          `INSERT INTO activity_events
             (id, course_id, student_id, actor_role, type, summary, created_at)
           VALUES (?,?,?,'student','practice_attempt',?,?)`,
        ).run(
          newId("act"),
          courseId,
          studentId,
          `Answered ${profile.practice.length} question${
            profile.practice.length === 1 ? "" : "s"
          } in Midterm Review`,
          at(profile.lastActivityDay - 1, 20),
        );
      }

      // Confidence ratings.
      profile.confidence.forEach(([objectiveNumber, level], index) => {
        db.prepare(
          `INSERT INTO confidence_responses
             (id, student_id, course_id, lecture_id, objective_id, level, context, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        ).run(
          newId("cnf"),
          studentId,
          courseId,
          lecture3,
          LO(objectiveNumber),
          level,
          "Self-reported during lecture review",
          at(profile.lastActivityDay - index, 19, index * 3),
        );
      });

      // Markers.
      profile.markers.forEach(([lectureIndex, segmentIndex, marker], index) => {
        const lectureId = lectureIds[lectureIndex];
        const segmentId = segmentIds[lectureIndex][segmentIndex];
        if (!segmentId) return;

        const spec = lectureSpecs[lectureIndex];
        const objectiveNumber = spec.objectives[0];

        db.prepare(
          `INSERT INTO comprehension_markers (
             id, student_id, course_id, lecture_id, segment_id, concept_id,
             objective_id, marker, at_seconds, transcript_excerpt, created_at
           ) VALUES (?,?,?,?,?,NULL,?,?,?,?,?)`,
        ).run(
          newId("mrk"),
          studentId,
          courseId,
          lectureId,
          segmentId,
          LO(objectiveNumber),
          marker,
          spec.segments[segmentIndex][0] + 60,
          spec.segments[segmentIndex][2].split(/(?<=\.)\s+/)[0],
          at(profile.lastActivityDay - index, 18, index * 4),
        );

        if (marker === "confusing") {
          db.prepare(
            `INSERT INTO activity_events
               (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
             VALUES (?,?,?,?,'student','marked_confusing',?,?)`,
          ).run(
            newId("act"),
            courseId,
            studentId,
            lectureId,
            `Marked "${spec.segments[segmentIndex][1]}" as confusing`,
            at(profile.lastActivityDay - index, 18, index * 4),
          );
        }
      });

      // Questions.
      profile.questions.forEach((question, index) => {
        const lectureId = lectureIds[question.lecture];
        const segmentId = segmentIds[question.lecture][question.segment] ?? null;
        const spec = lectureSpecs[question.lecture];
        const questionId = newId("qst");

        db.prepare(
          `INSERT INTO questions (
             id, student_id, course_id, lecture_id, segment_id, concept_id, objective_id,
             kind, body, at_seconds, transcript_excerpt, status, anonymous, is_demo, created_at
           ) VALUES (?,?,?,?,?,NULL,?,?,?,?,?,'open',0,1,?)`,
        ).run(
          questionId,
          studentId,
          courseId,
          lectureId,
          segmentId,
          LO(spec.objectives[0]),
          question.kind,
          question.body,
          spec.segments[question.segment][0] + 90,
          spec.segments[question.segment][2].split(/(?<=\.)\s+/)[0],
          at(profile.lastActivityDay - index, 18, 30),
        );

        db.prepare(
          `INSERT INTO activity_events
             (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
           VALUES (?,?,?,?,'student','asked_question',?,?)`,
        ).run(
          newId("act"),
          courseId,
          studentId,
          lectureId,
          `Asked a question on "${spec.segments[question.segment][1]}"`,
          at(profile.lastActivityDay - index, 18, 30),
        );
      });

      // Notes.
      profile.notes.forEach((note, index) => {
        const lectureId = note.lecture === null ? null : lectureIds[note.lecture];
        const segmentId =
          note.lecture === null || note.segment === null
            ? null
            : (segmentIds[note.lecture][note.segment] ?? null);

        db.prepare(
          `INSERT INTO student_notes (
             id, student_id, course_id, lecture_id, module_id, segment_id, concept_id,
             objective_id, kind, title, body, at_seconds, transcript_excerpt,
             shared_with_professor, is_demo, created_at, updated_at
           ) VALUES (?,?,?,?,NULL,?,NULL,?,?,?,?,?,NULL,?,1,?,?)`,
        ).run(
          newId("note"),
          studentId,
          courseId,
          lectureId,
          segmentId,
          note.lecture === null ? null : LO(lectureSpecs[note.lecture].objectives[0]),
          note.kind,
          note.title,
          note.body,
          note.seconds,
          note.shared ? 1 : 0,
          at(profile.lastActivityDay - index, 18, 45),
          at(profile.lastActivityDay - index, 18, 45),
        );

        db.prepare(
          `INSERT INTO activity_events
             (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
           VALUES (?,?,?,?,'student','took_note',?,?)`,
        ).run(
          newId("act"),
          courseId,
          studentId,
          lectureId,
          note.shared
            ? "Shared a note with the professor"
            : "Took a note (private)",
          at(profile.lastActivityDay - index, 18, 45),
        );
      });

      if (profile.helpRequest) {
        db.prepare(
          `INSERT INTO support_requests (
             id, recommendation_id, course_id, student_id, kind, topics, preferred_time,
             message, prep_summary, status, created_at
           ) VALUES (?,NULL,?,?,?,?,?,?,NULL,'submitted',?)`,
        ).run(
          newId("sreq"),
          courseId,
          studentId,
          profile.helpRequest.kind,
          profile.helpRequest.topics,
          "Any afternoon this week",
          profile.helpRequest.message,
          at(profile.lastActivityDay, 15),
        );

        db.prepare(
          `INSERT INTO activity_events
             (id, course_id, student_id, actor_role, type, summary, created_at)
           VALUES (?,?,?,'student','requested_support',?,?)`,
        ).run(
          newId("act"),
          courseId,
          studentId,
          profile.name + " requested support",
          at(profile.lastActivityDay, 15),
        );
      }
    });

    // ------------------------------------------------------------ question votes
    const seededQuestions = db
      .prepare<[string], { id: string; student_id: string }>(
        "SELECT id, student_id FROM questions WHERE course_id = ? ORDER BY created_at",
      )
      .all(courseId);

    seededQuestions.forEach((question, index) => {
      // A deterministic spread of upvotes: the imputation questions attract the most.
      const voterCount = [5, 4, 3, 3, 2, 2, 1, 1, 1, 0][index % 10];
      const voters = studentIds
        .filter((id) => id !== question.student_id)
        .slice(index % 3, (index % 3) + voterCount);
      for (const voterId of voters) {
        db.prepare(
          "INSERT OR IGNORE INTO question_votes (question_id, student_id, created_at) VALUES (?,?,?)",
        ).run(question.id, voterId, at(-2, 19));
      }
    });

    // One answered question, so the professor view has both states.
    const answered = seededQuestions[0];
    if (answered) {
      db.prepare(
        `INSERT INTO professor_answers (id, question_id, professor_id, body, created_at)
         VALUES (?,?,?,?,?)`,
      ).run(
        newId("ans"),
        answered.id,
        professorId,
        "Good question — and the answer is that Luther does have things to say about it, but under the heading of union with Christ rather than justification. Read the 1535 Galatians commentary on 2:20 and notice that he refuses to let the two come apart. We will take this up properly in week 6 when we compare Calvin.",
        at(-1, 9),
      );
      db.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").run(
        answered.id,
      );
    }

    // ------------------------------------------------------------ professor notes
    const noorId = studentIds[3];
    const jonahId = studentIds[7];
    const graceId = studentIds[8];

    db.prepare(
      `INSERT INTO professor_notes
         (id, professor_id, course_id, student_id, body, follow_up_status, created_at)
       VALUES (?,?,?,?,?,'open',?)`,
    ).run(
      newId("pnote"),
      professorId,
      courseId,
      noorId,
      "Spoke briefly after Thursday's class. The issue is a prior framework — justification learned as process — rather than inattention. Suggested reading Trent and Luther side by side rather than sequentially. Check back after the practice review.",
      at(-3, 12),
    );

    db.prepare(
      `INSERT INTO professor_notes
         (id, professor_id, course_id, student_id, body, follow_up_status, created_at)
       VALUES (?,?,?,?,?,'open',?)`,
    ).run(
      newId("pnote"),
      professorId,
      courseId,
      graceId,
      "Came in without the medieval background the course assumes, and is reconstructing it while trying to follow the argument. That is a real gap and not a capacity issue. Sent the Oberman article and the review sheet; considering a short reading list before the midterm.",
      at(-4, 12),
    );

    // -------------------------------------------------- seeded support pathway
    const recommendationId = newId("rec");
    db.prepare(
      `INSERT INTO support_recommendations (
         id, course_id, student_id, objective_id, concept_id, lecture_id, material_id,
         pathway, title, rationale, next_step, priority, source, created_by, status,
         student_response, student_responded_at, position, is_demo, created_at
       ) VALUES (?,?,?,?,?,?,?,'curriculum',?,?,?,'high','professor',?,'accepted',?,?,0,1,?)`,
    ).run(
      recommendationId,
      courseId,
      jonahId,
      LO(2),
      CPT("Imputed righteousness"),
      lecture3,
      materialIds.get("Lecture notes — Luther and justification") ?? null,
      "Review the lecture segment on imputed and infused righteousness",
      "Recommended because of 1 of 4 related questions answered correctly, 4 lecture moments marked confusing, and a direct request for help on this distinction.",
      "Rewatch the justification lecture from 31:20 and re-read the student notes for that section before Thursday.",
      professorId,
      "Starting tonight. I'll bring what I still can't explain to the review session.",
      at(-1, 21),
      at(-1, 10),
    );

    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, actor_role, actor_name, action, note, created_at)
       VALUES (?,?,'professor',?,'recommended',?,?)`,
    ).run(
      newId("sac"),
      recommendationId,
      "Dr. Miriam Carter",
      "Assigned after reviewing the readiness detail and the submitted question.",
      at(-1, 10),
    );

    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, actor_role, actor_name, action, note, created_at)
       VALUES (?,?,'student',?,'accepted',?,?)`,
    ).run(
      newId("sac"),
      recommendationId,
      "Jonah Whitmore",
      "Starting tonight.",
      at(-1, 21),
    );

    // ----------------------------------------------------------- activity spread
    db.prepare(
      `INSERT INTO activity_events
         (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
       VALUES (?,?,NULL,?,'professor','published_lecture',?,?)`,
    ).run(
      newId("act"),
      courseId,
      lecture3,
      "Published \"Martin Luther and the Doctrine of Justification\"",
      at(-19, 15),
    );

    db.prepare(
      `INSERT INTO activity_events
         (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
       VALUES (?,?,NULL,?,'professor','scheduled_lecture',?,?)`,
    ).run(
      newId("act"),
      courseId,
      lecture4,
      "Scheduled \"Zwingli, Calvin and the Reformed Turn\" as a live session",
      at(-5, 11),
    );
  });

  seed();
}

// ---------------------------------------------------------------- prose blocks

const SYLLABUS_TEXT = `CH504: Theology and the Protestant Reformation
Fuller Theological Seminary — Summer 2026
Dr. Miriam Carter

Course Description:
A graduate survey of sixteenth-century reform movements read from primary sources in translation, with attention to theological argument, institutional setting, and legacy for contemporary ministry.

Learning Objectives:
- Situate the Reformation within late medieval religious life and institutional reform movements
- Explain Luther's doctrine of justification and the exegetical arguments behind it
- Distinguish Lutheran and Reformed accounts of sacrament, law and covenant
- Describe Radical Reformation ecclesiology and its critique of magisterial reform
- Assess the Catholic Reformation on its own terms, including the work of Trent
- Trace Reformation legacies in contemporary ministry and denominational identity
- Read primary sources with attention to genre, audience and polemical context
- Place the major figures and chronology of sixteenth-century reform accurately

Weekly Schedule:
Week 1 — Late medieval piety and the penitential system
Week 2 — Indulgences and the 1517 controversy
Week 3 — Luther on justification
Week 4 — The theology of the cross
Week 5 — Zwingli and the Swiss reform
Week 6 — Calvin, covenant and worship
Week 7 — The Radical Reformation
Week 8 — Trent and Catholic reform
Week 9 — Confessionalisation
Week 10 — Legacies and misuses

Required Readings:
- Luther, "The Freedom of a Christian" (1520), complete
- Luther, Heidelberg Disputation (1518), theses 19-24
- Calvin, Institutes III.i-ii (1559 edition)
- Schleitheim Articles (1527), complete
- Council of Trent, Decree on Justification (1547), chapters 7-8 and canons 9-12

Assignments:
- Primary source analysis (1,500 words), due week 5
- Final research essay (4,000 words), topic approved in advance, due week 10

Exams:
- Midterm Examination, July 9, covering modules 1-2
- Final Examination, August 13, cumulative and weighted toward modules 3-6

Grading:
Participation and comprehension activity - 15%
Primary source analysis - 20%
Midterm - 25%
Final essay and examination - 40%
`;

const LECTURE_1_NOTES = `### Where we are starting

The fifteenth century was not a religious vacuum. Any account of 1517 that begins from "decline" has to explain why reform arguments landed in a church whose people were, by most measures, more religiously active than their grandparents had been.

**Hold these four things together:**

1. Expanding lay piety — confraternities, endowed masses, pilgrimage, vernacular devotion.
2. A precise and pastorally intended penitential system.
3. A widely held axiom — *facere quod in se est* — that placed real weight on the penitent's own effort.
4. A vocabulary of "reform" already in respectable use.

### The pressure point

Not corruption. **Assurance.** How does a penitent know their contrition was sufficient?

> Understand the system as its defenders understood it before you ask what Luther objected to. Otherwise you will attribute to him objections he did not make.

### For Thursday

Read Matthew 3:2 and note what *metanoeite* is doing. Thesis 1 of the 95 Theses turns on it.`;

const LECTURE_2_NOTES = `### Read the document

The 95 Theses are academic propositions in Latin, largely pastoral in tone, and considerably more moderate than their reputation. Several of them **defend** papal authority against what Luther took to be the indulgence preachers' overreach.

- **Thesis 1** — the meaning of repentance
- **Theses 5–7** — the limits of what the pope remits
- **Theses 41–52** — pastoral warnings about how indulgences are being preached

### Three explanations, none sufficient alone

1. **Financial** — St Peter's, the Brandenburg debt, the Fugger arrangements.
2. **Institutional** — jurisdictional conflict over who authorises what.
3. **Theological** — the assurance problem from week 1, now with a public target.

The escalation from indulgences to authority happened in **the response**, not the original document.

### Skill to practise

Separating what a text argues from what its reception says it argues. This is examinable, and it is the habit the course is trying to build.`;

const LECTURE_3_STUDENT_NOTES = `### The argument in one move

*Iustitia Dei* — the righteousness of God — moves from something God **demands** to something God **gives**. That movement is the whole doctrine in miniature. Watch it happen across the 1515–16 Romans lectures.

### Four distinctions to hold

**1. Imputed / infused**
- *Imputed*: reckoned to your account, remaining Christ's own.
- *Infused*: given as a habit, genuinely present in and transforming you.

Trent affirms infusion **deliberately and with arguments**. Neither side is confused about the other's position. They disagree.

**2. Simul iustus et peccator**
At once righteous and a sinner. Wholly both, simultaneously. Not half-and-half; not a stage on the way. *This is the formula you will be most tempted to soften.*

**3. Theology of the cross / theology of glory**
Heidelberg 19–24. An **epistemological** claim before a soteriological one: God is known where God has chosen to be revealed.

**4. Faith as trust, not achievement**
Faith is trust in a promise. Reading it as a meritorious act of the will reintroduces exactly what the formula refuses.

### What Luther did not say

- That works are irrelevant.
- That the Christian life is static.
- That the law has no continuing use.

All three are attributed to him regularly. None survives contact with the texts. *The Freedom of a Christian* spends its second half on precisely the works he is accused of dismissing — which is why reading only the first half produces the standard misreading.

### Scripture

Romans 1:16–17 · Romans 3:21–28 · Galatians 2:15–21 · Habakkuk 2:4

> Read Galatians 2:15–21 with the 1535 commentary alongside. Luther's reading is polemical **and** careful. Holding both is the skill this course is building.`;

const LECTURE_3_TEACHING_NOTES = `TEACHING NOTES — not visible to students

Timing: this runs long every term. The Heidelberg section is the one to compress if needed; the imputation/infusion section is not.

Known sticking points:
1. Infusion. Every cohort reads Trent as a misunderstanding of Luther rather than a considered alternative. Budget ten extra minutes and put the decree text on screen rather than paraphrasing it. Paraphrase is where the caricature enters.
2. Simul iustus et peccator. Students who were catechised into justification-as-process will soften "wholly both" into "partly each" without noticing. Say this explicitly and ask them to write the formula down.
3. "What Luther did not say" (section 6). Do not skip this even when short on time. Skipping it is how the cohort arrives at the midterm with a Luther who has no doctrine of sanctification.

Assessment link: the midterm comparison question depends on section 5. If section 5 gets compressed, flag it in the review session.

Watch for: students who can recite the definitions and cannot apply them to a text. The comprehension checks catch some of this, but the practice review catches more — push people toward it.`;

const LECTURE_3_TRANSCRIPT = `[00:00] Let me start where we finished on Tuesday, because the doctrine we are about to read is, among other things, an answer to a pastoral problem, and if you lose the problem you will misread the answer.

[00:34] The pressure point in the late medieval penitential system was not that it was administratively corrupt. Plenty of it worked, and worked pastorally. The pressure point was assurance. How does a penitent know that their contrition was sufficient? And if the answer involves doing what lies within you, then the sufficiency of your own effort becomes the hinge on which everything turns.

[06:30] Now. The 1515 to 1516 Romans lectures. What is remarkable about these is that Luther is still using a largely traditional vocabulary while the substance shifts underneath it. The phrase to watch is iustitia Dei, the righteousness of God. In the tradition he inherited, that phrase names something God demands. By the end of these lectures it names something God gives. That movement is the entire argument in miniature.

[14:10] Heidelberg, 1518. Theses nineteen through twenty-four. And I want to insist on something here that is easy to miss: the theology of the cross is not primarily a doctrine of atonement. It is an epistemology. It is a claim about how God is known. The theologian of glory reasons from visible power and majesty to the divine nature — and gets God wrong. The theologian of the cross says God is known where God has chosen to be revealed, and God has chosen the cross.

[22:45] Simul iustus et peccator. At the same time righteous and a sinner. Now, every year some of you will write this down as "partly righteous and partly a sinner," and every year I will tell you that this is not what it says. Wholly righteous — because the righteousness in question is Christ's, and it is reckoned to you. Wholly a sinner — because nothing in you has yet been perfected. Both, entirely, at once. It is an uncomfortable formula and the discomfort is the point. Resist softening it.

[31:20] Which brings us to the distinction that will divide the century. Imputed righteousness: reckoned to your account, remaining Christ's own. Infused righteousness: given as a habit, genuinely present in you, actually transforming you.

[32:40] And here is what I need you to hear. When we get to Trent in module five, you will find the Council affirming infusion — deliberately, with arguments, and in full knowledge of what Luther said. Trent is not a misunderstanding of Luther. It is a considered alternative. Neither side in this dispute is confused about the other's position. They disagree, which is a different and more interesting thing.

[40:05] Section six. What Luther did not say. He did not say works are irrelevant. He did not say the Christian life is static. He did not say the law has no continuing use for the justified. Every one of these is attributed to him regularly, in print, by people who should know better, and not one of them survives contact with the texts. The Freedom of a Christian spends its entire second half on exactly the works he is accused of dismissing. If you read only the first half, you will arrive at the standard misreading, and you will arrive at it honestly.

[47:30] For the last stretch, open the 1535 Galatians commentary on chapter two, verses fifteen to twenty-one, and put the biblical text beside it. Notice what Luther does with the first person. "I through the law died to the law." His reading is polemical — he is arguing hard, against named opponents, and he wants to win. And it is also careful exegesis. Both of those are true at the same time, and learning to hold them together is most of what this course is trying to teach you.`;

const SLIDE_TITLES = [
  "CH504 · Week 3 — Luther and Justification",
  "Where we left off: assurance, not corruption",
  "Facere quod in se est",
  "The Romans lectures, 1515–16",
  "iustitia Dei: demanded → given",
  "Heidelberg 1518, theses 19–24",
  "Theology of the cross as epistemology",
  "Simul iustus et peccator",
  "Wholly both — not partly each",
  "Imputed righteousness",
  "Infused righteousness (Trent, 1547)",
  "What is actually at issue",
  "What Luther did not say",
  "Galatians 2:15–21 with the 1535 commentary",
];
