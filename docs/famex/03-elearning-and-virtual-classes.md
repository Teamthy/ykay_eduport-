# 03 — E-learning and live virtual classes

The school asked for "a full e-learning space for students to have virtual
classes with an assigned URL link". This is that space: courses, lessons,
assignments and quizzes, plus **live classes joined from a link the school
assigns** — with the joining mechanism designed for the reality of Nigerian
bandwidth and for the safety of minors.

Catalogue: module 2 (AI Learning Hub, 10 features, F2-01…F2-10). Workstream W9.

---

## §1 — Data model

```prisma
model Course {
  id          String   @id @default(cuid())
  schoolId    String
  title       String
  description String?
  subjectId   String?
  classLevel  String?          // e.g. "SS2"
  teacherId   String
  status      CourseStatus     // DRAFT | PUBLISHED | ARCHIVED
  modules     CourseModule[]
  enrolments  Enrolment[]
  liveClasses LiveClass[]
}

model CourseModule {           // a unit inside a course
  id       String @id @default(cuid())
  courseId String
  title    String
  order    Int
  lessons  Lesson[]
}

model Lesson {
  id          String   @id @default(cuid())
  moduleId    String
  title       String
  order       Int
  videoUrl    String?
  notesHtml   String?
  transcript  String?
  durationMin Int?
  resources   LessonResource[]
  progress    LessonProgress[]
  releaseAt   DateTime?         // scheduled drip
}

model LessonResource {
  id       String @id @default(cuid())
  lessonId String
  label    String
  fileUrl  String
  bytes    Int
  mimeType String
}

model Enrolment {
  id        String @id @default(cuid())
  courseId  String
  studentId String
  enrolledAt DateTime @default(now())
  status    EnrolmentStatus     // ACTIVE | COMPLETED | WITHDRAWN
  @@unique([courseId, studentId])
}

model LessonProgress {
  id          String   @id @default(cuid())
  lessonId    String
  studentId   String
  positionSec Int      @default(0)   // resumable playback
  completedAt DateTime?
  secondsWatched Int   @default(0)
  @@unique([lessonId, studentId])
}

model Assignment {
  id          String   @id @default(cuid())
  courseId    String
  lessonId    String?
  title       String
  instructions String
  dueAt       DateTime?
  maxScore    Int      @default(100)
  allowFiles  Boolean  @default(true)
  postToGradebook Boolean @default(false)   // see §6
  submissions Submission[]
}

model Submission {
  id           String   @id @default(cuid())
  assignmentId String
  studentId    String
  submittedAt  DateTime @default(now())
  textAnswer   String?
  files        Json?                 // [{ label, url, bytes }]
  score        Int?
  feedback     String?
  markedBy     String?
  markedAt     DateTime?
  @@unique([assignmentId, studentId])
}

model LiveClass {
  id            String   @id @default(cuid())
  courseId      String
  title         String
  scheduledFor  DateTime
  durationMin   Int      @default(45)
  provider      String                    // "zoom" | "meet" | "teams" | ...
  joinUrl       String                    // assigned by the school — students get this
  hostUrlEnc    String?                   // encrypted; NEVER sent to students
  passcodeEnc   String?
  lobbyEnabled  Boolean  @default(true)
  recordingUrl  String?
  status        LiveClassStatus           // SCHEDULED | LIVE | ENDED | CANCELLED
  createdBy     String
  attendance    LiveClassAttendance[]
}

model LiveClassAttendance {
  id          String   @id @default(cuid())
  liveClassId String
  studentId   String
  joinedAt    DateTime
  leftAt      DateTime?
  minutes     Int      @default(0)
  source      AttendanceSource            // PORTAL_JOIN | TEACHER_MARKED | IMPORTED
  @@unique([liveClassId, studentId])
}
```

Deliberate choices:

- **Two URLs, not one.** `joinUrl` is what a student receives. `hostUrlEnc` is
  stored encrypted and readable only by the assigned teacher and admins.
- **Attendance is a first-class table**, not a counter, because it feeds
  attendance records and parent alerts (F10-11).
- **`postToGradebook` is opt-in per assignment** so a quiz never silently
  becomes a CA score (§6).
- **`releaseAt`** allows drip-feeding lessons, which is how a school paces a
  term without republishing a course.

---

## §2 — How the assigned URL works

The school assigns a link per class. The portal never invents one, and never
exposes more of it than a student needs.

```
Teacher creates LiveClass
  └─ pastes the meeting join link  → joinUrl   (students will click this)
  └─ pastes the host link          → hostUrlEnc (encrypted at rest)

Student opens the Live class card (F1-06)
  └─ server checks: enrolled? class live? inside the window? consented?
       └─ yes → 302 to a short-lived signed redirect  /api/live/{id}/join
                   └─ redirect target = joinUrl  (the raw link is never
                      embedded in student-facing HTML/JS)
                   └─ records LiveClassAttendance.joinedAt
```

Why the redirect instead of just printing the link:

1. **Attendance is captured by the join itself**, not by asking the teacher to
   mark a register.
2. **The window is enforced server-side** — a link shared on WhatsApp cannot be
   used at 11pm to walk into a class.
3. **A leaked link can be rotated** (below) without republishing the course.
4. **Nothing about the host link is ever sent to a student**, not even in an
   error message or a page source comment.

---

## §3 — Link safety for minors

| Risk | Control |
|---|---|
| A student shares the link outside the school | join window (±15 min), lobby/waiting room, teacher admits; rotate `joinUrl` if it leaks |
| An adult joins a children's class | lobby admittance by name; provider waiting room; no link published on the public website |
| Student-to-student private chat during lessons | disabled at the provider where the setting exists; otherwise explicitly accepted by the school in writing |
| Recording of children | only with guardian consent captured in F12-09; consent status shown to the teacher before recording is enabled |
| Teacher's host link leaking through the UI | `hostUrlEnc` is decrypted only for the assigned teacher and admins, and the decryption is audited |
| A class joined from outside the country or at odd hours | join events are logged with actor, time and IP and are visible to the school |

---

## §4 — Offline, bandwidth and power

The school's reality, designed for rather than apologised about:

- **Low-bandwidth by default:** lesson video is a link to a hosted stream with
  an audio-only fallback; text, notes and transcripts load first, and the page
  is useful before the video arrives.
- **Download for offline study (F2-09):** resources and transcripts download
  to the PWA; progress is recorded locally and synced (the existing
  `lib/offline/*` queue, which already handles marks and attendance).
- **Resumable playback:** `LessonProgress.positionSec` means a learner who
  loses power resumes where they stopped.
- **No autoplay, no autoloading players** on the class list, so a 3G phone does
  not burn its bundle opening a page.
- **Live classes degrade honestly:** if the provider drops, the portal shows the
  recording as soon as it is available rather than an empty player.

---

## §5 — Assessment and the CA posting path

Quiz results may reach the gradebook, but only along a deliberate path:

```
Lesson quiz (auto-marked)
   └─ teacher reviews the class result
        └─ "Post to CA" → gradebook entry for that subject/term
             └─ written once (idempotent), audited, and visible in the
                gradebook history with its source
```

Rails:

1. Posting is **opt-in per assessment** (`postToGradebook`) and reversible by a
   mark-correction request (F6-08), never by deletion.
2. Posting is **idempotent** — re-clicking cannot double-count a score.
3. The weight is the school's configured CA weight, not the quiz's points.
4. A teacher always sees the score before it becomes a mark.

---

## §6 — Attendance, alerts and the parent view

- Joining a live class writes `LiveClassAttendance`; leaving updates `minutes`.
- A student who does not join a scheduled class is **absent for that class**,
  and the existing absence-alert path (F10-11) can tell the parent — over the
  cheapest channel that works, with the cost visible (F14-16).
- Parents see: courses, upcoming live classes, quiz results *after* teacher
  release, and their child's attendance — never the host link, never a draft
  mark.

---

## §7 — Build order

| Step | Deliverable | Feature IDs |
|---|---|---|
| 1 | Course/module/lesson model + teacher builder | F2-10, F2-01 |
| 2 | Lesson player with resumable progress and low-bandwidth mode | F2-02, F2-09 |
| 3 | Enrolment + student/parent views | F2-01 |
| 4 | Assignments and submissions with marking | F2-03 |
| 5 | **LiveClass + assigned-URL join + attendance** | F2-05, F1-06, F21-09 |
| 6 | Recordings and replay | F2-06 |
| 7 | Lesson quizzes + the CA posting path | F2-04, §5 |
| 8 | AI tutor grounded in lesson material (behind consent) | F2-07 |
| 9 | Study plan and revision reminders | F2-08 |

Step 5 is the one the school specifically asked for; steps 1–4 are what make it
worth joining.
