# Student readiness model

Implementation: `src/lib/domain/readiness.ts`. Pure functions, no I/O. Read this
document before changing any weight or threshold.

## What this is, and is not

It **is** a prompt: a way of noticing, from coursework activity a student has
already recorded, that a particular topic may be worth another pass — early enough
to do something about it.

It **is not** a grade. It carries no academic weight, is not reported to any
registrar, and does not feed any grading system. It is not a measure of ability,
effort or worth. It is a reading of recorded activity, and recorded activity is a
thin proxy for understanding.

Two rules are load-bearing and should not be quietly relaxed:

1. **Readiness is never computed from attendance or presence alone.** Participation
   breadth contributes 8% of the composite, and only alongside signals that
   actually reflect understanding. A student who attends everything and answers
   nothing does not read as on track; a student who attends nothing and answers
   everything correctly is not marked down for absence.
2. **Asking questions is never scored against a student.** Clarification requests
   are recorded, surfaced to the professor as context, and given weight **zero**.
   A model that penalises curiosity teaches students to hide confusion, which
   defeats the product's purpose. The student-facing readiness page states this
   explicitly under the heading "Context, not counted against you".

## Signals

| Signal | Weight | Reading | Evidence unit |
| --- | --- | --- | --- |
| Comprehension checks | 0.30 | correct ÷ answered, in-lecture | each answer |
| Practice and assessment questions | 0.25 | correct ÷ answered, auto-scored only | each answer |
| Self-reported confidence | 0.15 | (mean − 1) ÷ 4, from 1–5 ratings | each rating |
| Clear vs. confusing markers | 0.15 | clear ÷ (clear + confusing) | each marker |
| Lecture participation breadth | 0.08 | lectures engaged ÷ lectures published | each engaged lecture |
| Outstanding course activity | 0.07 | checks answered ÷ checks published | 1 if any published |
| Questions and clarification requests | **0.00** | — context only | — |
| Student request for support | **0.00** | — escalation rule, not a score | — |

"Engaged with a lecture" means the student left a trace in it: a note, a marker, a
question, or an answer. Opening a page is not engagement.

### Why these weights

Direct evidence of understanding (55% combined) outweighs self-report (15%),
subjective markers (15%) and coverage (15%). That ordering is the defensible part.
The specific numbers are a considered starting point, not a validated
instrument — nobody has calibrated them against outcomes, because there are no
outcomes yet. They should be revisited against real data before anyone treats a
status as meaningful.

### Renormalisation

Weights are renormalised across only those signals that actually have evidence:

```
score = Σ(weight × value) / Σ(weight)     over signals with value ≠ null
```

So a student who has not reached any assessment yet is not penalised for the
missing 0.25 — the comprehension, confidence and marker signals simply carry
proportionally more. Without this, "hasn't happened yet" and "did badly" would
score identically, which is the most common way this kind of model becomes unfair.

## Thresholds

```
score ≥ 0.75  →  On track                    (green)
score ≥ 0.50  →  Needs review                (yellow)
score <  0.50  →  Support recommended        (red)
insufficient evidence → Not enough information yet   (grey)
```

### Insufficient evidence

A status is withheld unless **all three** hold:

- total evidence ≥ 3 units, **and**
- at least one scored response or confidence rating exists (markers and
  participation alone are not enough), **and**
- at least one weighted signal has a value

Otherwise the status is `insufficient_data`, the score is `null`, and the interface
says *"There isn't enough activity yet to say anything useful about your
readiness"* — framed as a gap in the data, never as a finding about the student.

This is the band most systems of this kind omit, and its absence is what produces
confidently wrong judgements about students who simply have not done anything
measurable yet. Two of the twelve seeded students sit here on purpose.

### Escalation on a direct request

A student who submits a support request is never left on "on track":

```
helpRequests > 0 and score ≥ 0.85  →  Needs review
helpRequests > 0 and status was On track  →  Support recommended
```

A person saying "I need help" outranks a number saying they are fine. The score
retains no veto over their own account of their situation.

## Confidence in the estimate

Reported alongside every status, because a status derived from three data points
and one derived from thirty should not look alike.

| Evidence units | Confidence | Copy shown |
| --- | --- | --- |
| ≥ 18 | high | "based on several independent signals across the course" |
| ≥ 6 | moderate | "based on a partial picture of this student's activity" |
| < 6 | low | "based on very little activity. Treat as a prompt to look closer, not a conclusion." |

Evidence units = scored responses + confidence ratings + markers + engaged
lectures.

## Per-objective standing

Separately from the composite, each learning objective gets its own reading from
the evidence tagged to it — answers, markers and confidence ratings.

Needs ≥ 2 evidence points, otherwise `unknown`. Then:

| Standing | Condition |
| --- | --- |
| Comfortable | accuracy ≥ 0.75, confusion not dominant, confidence not low |
| Developing | accuracy ≥ 0.75 but confidence low; or accuracy between 0.50 and 0.75 with no dominant confusion |
| Needs review | accuracy < 0.50; **or** confusing markers outnumber clear ones; **or** mean confidence ≤ 2.5 |
| Not enough information yet | fewer than 2 evidence points |

An objective in the `unknown` band is excluded from the strengths and gaps lists
and shown in its own section. It is not treated as a weakness.

## Explaining a status

Every status renders with its reasoning. The reasons are assembled from the
observations themselves, not from templates about the student:

```
Needs review

You appear comfortable with:
- Situate the Reformation within late medieval religious life
- Place the major figures and chronology of sixteenth-century reform

You may need additional review in:
- Explain Luther's doctrine of justification
  Specifically: Imputed and infused righteousness; Simul iustus et peccator

Why:
- 3 of 6 in-lecture comprehension questions answered correctly.
- 2 of 4 assessment questions answered correctly.
- Average confidence 2.3 out of 5 across 3 ratings, including 2 low ratings.
- 1 moment marked clear, 3 marked confusing.
- 5 of 7 published comprehension checks completed.
- Objectives with the weakest evidence: Explain Luther's doctrine of justification.
- Composite readiness reading 55% against a 75% "on track" threshold.
  This is a prototype signal, not a grade.
```

The professor's student detail view additionally renders every signal — including
those with no data, and including the zero-weight context signals — with the
observation behind it.

## Professor override

A professor can set any status manually. The explanation is **required** (minimum
10 characters, validated server-side) and is shown wherever the status appears,
including to the student.

The computed status is retained alongside the override, not discarded, and is
displayed to the professor so the disagreement stays visible. Clearing an override
sets `cleared_at`; nothing is deleted, and `listOverrideHistory()` shows the full
sequence.

The design assumption: a professor who has spoken to a student knows more than
this model does. The model's job is to raise the question, not to settle it.

## Handling missing data

| Situation | Behaviour |
| --- | --- |
| No activity at all | `insufficient_data`, no score, framed as a data gap |
| Some markers, no answers | `insufficient_data` — markers alone cannot carry a status |
| No assessments published | That signal is dropped from renormalisation, not scored as zero |
| No objectives defined | Composite still computes; per-objective breakdown is empty and says so |
| Objective with no tagged evidence | `unknown`, excluded from strengths and gaps |
| Short answer submitted | Recorded, never scored, never contributes accuracy |

## Language

Enforced in `vocabulary.ts` so it cannot drift between screens.

| Never | Instead |
| --- | --- |
| failing, at risk, behind | needs review, support recommended |
| poor performance | topics worth another pass |
| low engagement | not enough information yet |
| flagged, red-flagged | worth following up |

`READINESS_PRESENTATION` holds two sentences per status — one addressed to the
student about themselves, one addressed to the professor about the student —
because the same status warrants different framing depending on who is reading it.
The smoke test asserts the word "failing" appears nowhere in the student-facing
readiness page.

## Risks and limitations

**It measures recorded activity, not understanding.** A student who understands
the material deeply but works offline will read as having insufficient data. The
model says so honestly rather than guessing, but a professor who reads
"insufficient data" as "disengaged" will draw exactly the wrong conclusion.

**Self-reported confidence is culturally uneven.** Willingness to report low
confidence varies by background, by prior educational experience, and by how safe a
student feels. At 15% weight this is contained, but it is not neutral.

**Marker behaviour varies enormously.** Some students mark everything; some never
touch the controls. The clear/confusing ratio partly corrects for this, but a
student who only ever marks confusion looks worse than one who marks nothing.

**Auto-scored questions measure recall better than understanding.** They are the
strongest signals in the model precisely because they are cheap to collect, which
is a bias toward what is easy to measure. This is the model's most serious
structural weakness.

**Thresholds are uncalibrated.** 0.75 and 0.50 are round numbers, not findings.

**Automated classification carries real risks** even with supportive language.
Students may be treated differently on the basis of a status. Statuses may become
self-fulfilling. A status may follow a student into contexts it was never meant
for. Aggregate patterns may correlate with protected characteristics in ways nobody
inspected. `privacy-and-student-data-considerations.md` covers the governance this
demands.

**It cannot see the reasons that matter most.** Illness, caring
responsibilities, financial pressure, bereavement, a language barrier, a
disability, a bad week. A professor's ten-minute conversation will nearly always
be worth more than this model. It exists to prompt that conversation sooner, and
it should be read that way.

## Why this must not be treated as a grade

- It is computed from formative activity, much of it explicitly practice, some of
  it self-reported. Grades require assessment designed for the purpose.
- Its inputs are partly voluntary. A student choosing not to use the marker
  controls changes their reading without changing their understanding.
- It is uncalibrated and unvalidated against any outcome.
- It moves with participation, and participation moves with circumstance.
- Students would answer differently if it counted — which would destroy the
  honest self-report the model depends on. The practice sets say "not graded"
  precisely so the answers are worth having.

The application therefore states on the student readiness page, on the roster, in
the status legend, and in the reasoning text itself that this is a prototype
signal and not a grade.
