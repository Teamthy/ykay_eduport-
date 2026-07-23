# Prioritized Implementation Backlog

This backlog converts the current project gaps into a practical delivery plan for the next implementation cycle. It is organized by priority, with separate workstreams for backend, frontend, and QA.

## Priority Legend
- P0: Must ship first for a usable and secure MVP
- P1: High-value operational features
- P2: Important product expansion and reliability work
- P3: Hardening, scale, and long-term readiness

---

## P0 — Secure Foundation and Admissions Readiness

### Objective
Stabilize the platform around authentication, admissions, and safe production behavior.

### Backend Tasks
- Implement or finalize a first-time school setup API and database-backed configuration flow.
- Harden authentication lifecycle: account activation, password-change enforcement, role assignment, and suspension handling.
- Complete admissions review APIs: approve, decline, waitlist, document-request, and enrolment handoff.
- Ensure audit logging is written for login, admissions review, role changes, and sensitive operations.
- Validate and harden input schemas, server-side validation, and permission checks for all protected routes.
- Confirm environment validation for database, auth, Paystack, storage, and notification services.

### Frontend Tasks
- Build the admin-facing school setup wizard and configuration screens.
- Finalize the login and password-reset experience with strong error and loading states.
- Deliver the admissions review UI for admin operations and application status feedback for parents.
- Improve portal navigation and permission-aware routing so users only see what they are allowed to access.
- Replace remaining placeholder or demo-like screens with live data states and clear empty states.

### QA Tasks
- Test authentication flows end to end: login, logout, access denial, role redirects, password reset, and session expiry.
- Test admissions lifecycle end to end: draft creation, document upload, payment flow, submission, admin review, and status updates.
- Perform security checks for route protection, role escalation, and unauthorized access.
- Verify form validation, error handling, and consistent API response behavior.

---

## P1 — Student, Parent, and Staff Operations

### Objective
Turn the portal into a usable school operations system for core user groups.

### Backend Tasks
- Build full student profile and enrollment workflows with parent linkage and account creation.
- Add staff onboarding and role provisioning flows for admin, teacher, bursar, and coordinator accounts.
- Implement class and subject management APIs with teacher assignment support.
- Expand attendance APIs to support complete session recording, correction workflows, and parent-alert generation.
- Create fee invoice and payment reconciliation workflows with stronger financial state handling.
- Add report-card generation and release workflows tied to gradebook and attendance data.

### Frontend Tasks
- Build student and parent profile and enrollment management screens.
- Create staff management screens and assignment views for admins and coordinators.
- Deliver attendance and class-management interfaces for teachers and admins.
- Implement fee overview and payment history screens for parents and bursars.
- Improve report-card and dashboard views so they are backed by live data rather than static or placeholder content.

### QA Tasks
- Validate student and parent record creation, editing, and linkage.
- Test attendance entry, correction requests, and alert delivery scenarios.
- Test fee invoice generation, payment status updates, and receipt visibility.
- Verify the correct display of academic and finance data for student, parent, and admin roles.

---

## P2 — Academic Delivery and Communication

### Objective
Make the platform useful for everyday teaching, learning, and school communication.

### Backend Tasks
- Complete gradebook entry, submission, and locking workflows.
- Implement exam creation, question management, attempt handling, and result calculations.
- Add notification dispatch services for attendance, fees, exams, and admissions updates.
- Build job-based or scheduled notification delivery with status tracking and retries.
- Create a retention-aware record model for academic and financial history.

### Frontend Tasks
- Build or refine teacher gradebook and exam management screens.
- Implement student exam-taking and result-review experiences.
- Add student and parent notification centers with real message states.
- Improve IT portal personalization so students can see courses, progress, and certification-related information.

### QA Tasks
- Test full gradebook and exam workflows from draft to published to results release.
- Validate notification creation, delivery, and status updates.
- Verify accessibility, responsive behavior, and empty/error states for academic modules.
- Test cross-role access to exams, grades, and results.

---

## P3 — Reliability, Scale, and Production Hardening

### Objective
Prepare the system for real deployment, long-term records, and stable operations.

### Backend Tasks
- Implement backup and restore procedures and document disaster-recovery expectations.
- Add archival and retention policies for historical student records, payments, and report cards.
- Introduce monitoring, logging, and alerting for critical failures and suspicious activity.
- Complete performance tuning for heavy queries and high-traffic routes.
- Review and harden third-party integrations for storage, email, SMS, and payments.

### Frontend Tasks
- Optimize loading performance and reduce fragile UI states.
- Improve accessibility, keyboard navigation, and screen-reader support.
- Add stronger offline/error handling and resilience for slower networks.
- Polish the CBT and IT education experience for a more complete end-user journey.

### QA Tasks
- Run regression suites for major user journeys after each release.
- Perform load, resilience, and recovery testing where possible.
- Validate backup/restore readiness and audit trail completeness.
- Review accessibility and performance against agreed acceptance criteria.

---

## Suggested Sprint Order

1. P0: auth, setup, and admissions completion
2. P1: student/parent/staff operations
3. P2: academic delivery and notifications
4. P3: production hardening and long-term readiness

---

## Definition of Done for Each Priority
Each backlog item should only be considered complete when:
- the backend flow works end to end with real data and validation,
- the relevant frontend screens are connected to live data and handle success/error states,
- QA has tested the flow and confirmed core acceptance criteria,
- and the feature is documented for future maintenance.
