# Milestone-Based Execution Plan

## 1. Objective

This document breaks the implementation roadmap into practical milestones so the team can build the Ykay College EduPortal in manageable phases with clear delivery points.

---

## 2. Milestone Structure (Updated 2026-07-23)

## Milestone 1 — Foundation and Product Alignment

### Status
- Mostly complete for the public-facing product experience.
- The site now has a strong visual foundation, public pages, portal shells, and supporting docs.

### Remaining work
- Tighten the content architecture and ensure every page reflects the current product direction.

---

## Milestone 2 — Secure Authentication Layer

### Status
- Implemented at a functional level.
- Login, session cookies, middleware-based route protection, logout, and password reset APIs are present.

### Remaining work
- Add stronger account lifecycle controls, first-login password change enforcement, invitation-driven onboarding, and tighter permission audits.

---

## Milestone 3 — Admissions System MVP

### Status
- Substantially implemented.
- The project now has a database-backed admissions workflow with draft sessions, document upload support, Paystack payment handling, status lookup, and submission audit logs.

### Remaining work
- Complete the full admissions operations workflow for review, approval, waitlist, document requests, and student record handoff.

---

## Milestone 4 — Student and Parent Records

### Status
- Partially implemented.
- Student, parent, and teacher dashboards and related APIs exist, but some record management and enrollment handoff flows are still incomplete.

### Remaining work
- Build the full student and parent lifecycle, including enrollment onboarding, account linking, record maintenance, and richer portal data.

---

## Milestone 5 — Core School Operations

### Status
- Partially implemented.
- Attendance, finance, report-card, gradebook, and school admin APIs exist, but the end-to-end production workflow is still being completed.

### Remaining work
- Finalize class management, attendance operations, fee invoicing/payment reconciliation, and reporting workflows.

---

## Milestone 6 — Teacher and Academic Workflow Support

### Status
- Partially implemented.
- Teacher dashboards, class attendance, exams, gradebooks, and question-bank areas are present.

### Remaining work
- Complete teacher assignment workflow, classroom communications, exam moderation, and result-release operations.

---

## Milestone 7 — Production Hardening

### Status
- Not yet complete.
- The codebase now has a strong foundation, but deployment hardening, monitoring, retention policies, and disaster recovery still need formal implementation.

### Remaining work
- Add monitoring, backups, restore procedures, audit retention, performance checks, and production environment validation.

---

## 3. Delivery Rhythm

Each milestone should follow this simple rhythm:
1. Define the scope clearly.
2. Build the core flow end to end.
3. Test the experience with realistic data.
4. Fix gaps and edge cases.
5. Move to the next milestone.

---

## 4. Recommended Execution Order

1. Authentication
2. Admissions
3. Student and parent records
4. Admin operations
5. Teacher workflows
6. Hardening and launch

---

## 5. Team Focus by Milestone

### Product / Design
- Validate user journeys
- Refine content and screens
- Ensure usability

### Frontend
- Implement and refine UI flows
- Connect screens to real data
- Improve responsiveness and interaction quality

### Backend
- Build APIs and database logic
- Implement role-based access
- Support persistence and business rules

### QA / Validation
- Test each milestone end to end
- Check edge cases and data integrity
- Confirm the experience works beyond mock UI

---

## 6. Definition of Done

A milestone is complete when:
- the flow works end to end,
- the feature is connected to real data or real actions,
- permissions and validation are handled,
- and the experience is stable enough to be demonstrated or used by a real user.

---

## 7. Final Note

The project should not try to complete every feature at once. The best path is to ship the most valuable journeys first: public website, admissions, authentication, and core portal access. Once that foundation works, the rest of the school platform can expand around it.
