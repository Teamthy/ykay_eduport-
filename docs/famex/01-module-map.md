# 01 — Module map

Every module in the Famex OS surface, classified as **reuse**, **extend** or
**new**, with the data-model work it needs and the effort it carries. Feature
IDs refer to `08-feature-catalogue.md`; workstreams to `07-master-build-prompt.md §5`.

---

## §0 — Scope boundary

| Layer | In Famex OS? | Treatment |
|---|---|---|
| Ykay College school OS (auth, roles, attendance, gradebook, report cards, fees, CBT, messaging, mobile) | **Yes** | Reuse, extend, rebrand |
| EDUos platform (platform landing, super-admin console, tenant resolution by host, `Plan`/`PlanTier`/`Subscription`, RLS policy work, self-serve signup) | **No** | Strip or freeze — see `07-master-build-prompt.md §2` |
| Ykay IT academy (`/it-portal`, `/it-education`, `lib/it-education.ts`) | **No** | Retired; the AI Learning Hub replaces it |
| Ykay Virtual (`/virtual`, `VirtualBridge`) | **No** | Retired; in-portal live classes replace it |
| `Subscriptions` nav | **Yes, repurposed** | Becomes **Licence & Usage** (module 20) |

One school, one campus, one licence (**FP-1**). `schoolId` stays on business
tables and the route-coverage guard stays in CI, so a second campus is a
configuration change rather than a migration — but no tenancy work is done.

---

## §1 — Module table

Effort is in developer-weeks and the column sums to **67**, the planning number
in `07-master-build-prompt.md §5`.

| # | Module | Classification | Data-model delta | Weeks |
|---|---|---|---|---:|
| 0 | Foundations | 🔧 extend | Module registry drives nav/entitlement; settings framework; brand tokens; provisioning records; EDUos tables dropped or frozen | 3.5 |
| 1 | Home | 🔧 extend | Widget config per role; no new tables | 0.5 |
| 2 | AI Learning Hub | 🆕 new | `Course`, `CourseModule`, `Lesson`, `LessonResource`, `Enrolment`, `LessonProgress`, `Assignment`, `Submission`, `LiveClass`, `LiveClassAttendance` | 5 |
| 3 | AI Studio | 🆕 new | `PromptTemplate`, `PromptVersion`, `AiJob`, `AiUsage`, `AiDraft`, `AiApproval` | 5 |
| 4 | AI CBT | 🆕 + ✅ | `ExamBlueprint`, `BlueprintRule`, `QuestionReview`, `ItemAnalysis`, `ExamCandidatePaper`, `ExamLabDevice`; `schoolId` added to CBT tables | 7 |
| 5 | Fees & Billing | 🔧 extend | `LedgerAccount`, `JournalEntry`, `JournalLine`, `PaymentPlan`, `DiscountPolicy`, `Refund`, `CashbookEntry`, `BankReconciliation` | 6.5 |
| 6 | Marks Entry | 🔧 extend | `MarkCorrectionRequest`, `CompetencyScore`; weights made configurable | 2.5 |
| 7 | Result Generation | 🔧 extend | `ReportCardTemplate`, `PromotionRecord`, `Transcript`, `ResultAmendment`, `VerificationToken` | 3.5 |
| 8 | Admissions | 🔧 extend | `EntranceTest`, `EntranceTestScore`, `Offer`, `WaitlistEntry`, `SeatCapacity` | 1.5 |
| 9 | Front Desk | 🆕 new | `Visitor`, `VisitorLog`, `Appointment`, `GatePass`, `CallLog`, `Parcel`, `LostItem` | 1.5 |
| 10 | Attendance | 🔧 extend | `ClockEvent` with geolocation + accuracy, `Geofence`, `LeaveRequest`, `SubstituteCover`; CSP change for geolocation | 2 |
| 11 | HR Management | 🆕 new | `StaffContract`, `LeaveEntitlement`, `PayrollRun`, `Payslip`, `PayrollItem`, `Appraisal`, `TrainingRecord`, `DisciplinaryRecord`, `Vacancy`, `Applicant`, `ExitRecord` | 6 |
| 12 | Parent PRM | 🆕 new | `Household`, `GuardianLink`, `CommPreference`, `EngagementScore`, `MeetingSlot`, `ParentConsent`, `SurveyResponse` | 2 |
| 13 | Users | 🔧 extend | `ImportBatch`, `DuplicateCandidate`, `AlumniRecord`; class/stream normalisation | 1.5 |
| 14 | Communication | 🔧 + 🆕 | `MessageTemplate`, `MessageDispatch`, `DeliveryReceipt`, `WhatsAppSession`, `BroadcastSegment`, `MessageCost` | 3 |
| 15 | Documents | 🆕 new | `DocumentVault`, `DocumentTemplate`, `GeneratedDocument`, `SignatureRequest`, `RetentionPolicy`, `AccessLog` | 1.5 |
| 16 | Timetable | 🔧 extend | `TimetableConstraint`, `RoomAllocation`, `Substitution`, `ExamTimetable` | 1 |
| 17 | Help Desk | 🆕 new | `Ticket`, `TicketMessage`, `SlaPolicy`, `KnowledgeArticle`, `SatisfactionSurvey`, `MaintenanceRequest` | 2 |
| 18 | School Website | 🔧 extend | `SitePage` (CMS), `MediaAsset`, `EventRegistration`, `SiteTheme`; markdown content migrated | 2.5 |
| 19 | Settings | 🔧 extend | `SchoolSetting` (typed), `IntegrationConfig`, `ApiKey`, `ExportJob` | 1.5 |
| 20 | Licence & Usage | 🆕 + ✂️ | `Licence`, `UsageCounter`, `SupportAgreement`; `Plan`/`PlanTier`/`Subscription` dropped | 1 |
| 21 | Mobile app (Android) | 🔧 extend | New screens for F21-09…F21-11; parity guard extended | 2 |
| 22 | Cross-cutting | 🔧 + 🆕 | Observability, load test harness, backup automation, design-system components | 2.5 |
| 23 | Operations & compliance | 🆕 new | NDPA pack, DPIA, runbooks, training pack, UAT pack | 1.5 |
| 24 | Cost model & quotation | ✅ + 🆕 | Re-costing tool for a different school profile | 0.5 |
| | **Total** | | | **67** |

---

## §2 — What "reuse" actually means here

A ✅ feature is not automatically free. Three things happen to every reused
surface:

1. **Rebrand.** Brand literals are removed and driven by tokens
   (`audit:brand` baseline re-cut for Famex).
2. **Entitlement.** The screen is registered against a `School.modules` key, so
   nav, route guard and licence agree (F0-17, F0-25).
3. **Review.** It is exercised in the W12 acceptance pass against §6 of the
   master prompt — empty, loading, error and offline states included.

That review is why the ✅ column in the catalogue is not "no work": the
reuse-heavy modules (Marks, Results, Admissions, Users) still carry weeks above.

---

## §3 — The four modules that decide the schedule

| Module | Weeks | Why it is the critical path |
|---|---:|---|
| 4 — AI CBT | 7 | 15,000 items, blueprints, item analysis and an offline exam centre that marks locally and syncs later. The base engine is single-school-scale. |
| 5 — Fees & Billing | 6.5 | A ledger cannot be bolted onto an invoice-shaped `lib/finance.ts` (128 lines). Everything financial is downstream of it. |
| 11 — HR & payroll | 6 | Payroll waits for one settled term of attendance and ledger data — the *code* can be early, the *run* cannot. |
| 2 + 3 — Learning and AI | 10 | Two new product surfaces with their own data model, plus the metering and approval machinery that keeps AI safe and affordable. |

If the schedule slips, it slips here. The ≈5 developer-weeks saved by excluding
the EDUos platform layer are held as contingency against exactly these.

---

## §4 — Single-school decisions worth remembering

- **Module 20 is a licence page, not a billing system.** The school buys once;
  there is no upgrade flow, no plan matrix, no dunning (F20-06, F20-07 stripped).
- **No tenant switching UI anywhere.** No school picker, no hostname routing.
- **RLS is frozen, not deleted.** `schoolId` filtering stays in application code
  and the coverage check stays in CI, because that is what keeps the data
  separable if the school ever opens a second campus.
- **The word "tenant" does not appear in user-facing copy.** It is a school.
