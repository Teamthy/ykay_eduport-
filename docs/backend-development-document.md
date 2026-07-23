# Backend Development Document

## 1. Technical Specification Overview

This document defines the backend direction for the Ykay College digital education platform. The backend must support more than a school website; it must power a full school operations system, a role-based portal, an IT education offering, and a future-ready CBT and exam-preparation experience.

The current backend has a strong architectural foundation, but it is still not yet fully production-ready. The work ahead is to turn the current structure into a durable, secure, and scalable platform for real school operations.

---

## 2. Scope

### In Scope
- Public-facing website support through API endpoints
- Admissions application submission and status tracking
- Authentication and role-based portal access
- Student, parent, teacher, staff, and class management
- Fee invoice, payment, and receipt workflows
- Attendance, report-card, and academic record handling
- IT education content and course-related data support
- CBT exam, question bank, attempt, and result management
- Audit logging, notifications, and secure record access

### Out of Scope for the Initial Production Release
- Full mobile application support
- Advanced analytics beyond core reporting
- Complex enterprise integrations outside payments, email, and storage
- Multi-campus administration beyond the core school setup

---

## 3. Requirements

### Functional Requirements
- Users must be able to sign in and access the correct portal based on role.
- Prospective parents must be able to submit admissions applications and view status.
- Administrators must be able to review applications and manage school records.
- Teachers must be able to access class-related workflows and academic data.
- Students and parents must be able to view academic, fee, and school communication data.
- The system must support IT education-related content and course tracking.
- The system must support CBT-style exam workflows, including question delivery, attempt recording, and result generation.
- The backend must persist school data in a reliable and queryable manner.
- Student academic records, results, transcripts, and payment receipts must remain accessible for at least 4–5 years after leaving the school.
- Each student record must be retained for a minimum lifecycle of 7–10 years, including historical academic and financial data.
- The system must support long-term archival and retrieval of student records without data loss or corruption.
- Payment processing must be idempotent, meaning repeated submissions for the same payment request must not create duplicate charges or duplicate records.
- Financial operations must follow ACID principles to preserve consistency, integrity, and recoverability.

### Non-Functional Requirements
- Secure authentication and authorization
- Consistent API response structure and validation
- Reliable database access and transaction handling
- Clear error handling and logging
- Scalable architecture for future growth
- Support for environment-based configuration and deployment
- Durable storage with backup, restore, and disaster-recovery capability
- Auditability for all academic, financial, and exam-related transactions
- Retention policies that support long-term historical access and compliance expectations

---

## 4. Current State Assessment (Updated 2026-07-23)

### Implemented Now
- A full Next.js App Router project with many route-based API handlers under the app API layer.
- A Prisma-backed data model for school, users, admissions, attendance, fees, report cards, IT enrollments, gradebooks, exams, notifications, and audit logs.
- A real authentication flow with password hashing, HTTP-only session cookies, role-aware middleware, and login/logout/me/password-reset endpoints.
- An admissions workflow with draft sessions, signed document upload support, Paystack-backed payment start/submit/webhook handling, status lookup, and audit logging.
- Admin, teacher, student, parent, and IT portal dashboards and sidebar-based navigation shells.
- IT education content pages and backend support for course surfacing and enrollment progress.
- Teacher and student exam-related APIs for CBT-style exam creation, attempts, results, and gradebook workflows.

### Partially Implemented
- Admin review and approval workflows for admissions are present at the route level, but the full business process still needs operational hardening and UI polish.
- Role-based routing is enforced in middleware, but some portal areas still rely on UI shells or seed/mock data for a complete experience.
- Notifications and audit trails exist in the backend structure, but delivery automation, retry handling, and preference management are not yet fully production-grade.
- The IT education experience is visually strong and data-backed at the content/API layer, but certification tracking and portal integration remain incomplete.

### Missing or Not Yet Production-Ready
- A first-time school setup wizard for school profile, session, term, grading scale, and CA configuration.
- Full end-to-end enrollment and staff onboarding workflows for student/parent account creation and role assignment.
- A complete admission review workflow with document review, approval/decline/waitlist actions, and handoff to student records.
- Production-grade fee and payment operations beyond the current API scaffolding, including receipt reconciliation, invoice lifecycle management, and strong reporting.
- Full archival and retention policy automation for historical student records and financial documents.
- Deployment hardening, monitoring, and disaster-recovery procedures, including backup/restore and environment validation.
- A fully mature CBT experience with complete proctoring, question moderation, and report delivery beyond the current draft/published structures.

---

## 5. Technical Approach

### Architecture
- Next.js App Router for API routes and server-side logic
- Prisma ORM for data modeling and query access
- PostgreSQL as the primary database platform
- Role-based access control for admin, teacher, student, and parent users
- Centralized validation, error handling, and response formatting

### Data Model Direction
Core entities should include:
- school
- users
- roles
- students
- parents
- teachers
- classes
- subjects
- admissions
- payments
- receipts
- attendance
- academic records
- IT education programmes
- CBT subjects, questions, exam attempts, and results
- notifications and audit logs

### Security Direction
- Password hashing and secure credential handling
- Session or token-based authentication
- Protected routes and permission checks at the backend layer
- Logging of privileged actions for audit purposes

### Data Durability and Financial Integrity
- All student records, academic results, payment receipts, and exam attempts must be stored with durable persistence and backup strategy.
- Payment workflows must use idempotency keys to prevent duplicate processing from network retries or user resubmission.
- Database transactions must enforce ACID behavior for fee posting, invoice generation, receipts, and payment state changes.
- The platform must preserve historical records in a way that supports future retrieval, audit, and dispute handling.
- A formal retention and archival policy should be implemented for records spanning 7–10 years of student lifecycle history.

---

## 6. Risks

- Database integration may be delayed if environment setup is not completed early.
- Authentication and authorization may become a major implementation bottleneck if not prioritized.
- The current schema may evolve as new modules are added, creating migration overhead.
- Demo-style persistence may make it harder to transition to production-ready behavior later.
- Weak payment handling could create duplicate charges, inconsistent receipts, or audit issues if idempotency and ACID controls are not enforced.
- Failure to implement retention policies may cause loss of historical records or poor long-term access for former students.
- External service integration for payments, email, storage, and notifications may introduce operational complexity.

---

## 7. Dependencies

- PostgreSQL database service
- Prisma client and migration tooling
- Next.js runtime and environment configuration
- Authentication library or custom session/token implementation
- Payment provider integration for admissions and fees
- Email and SMS delivery services for notifications
- File storage for documents and student records
- Deployment platform and CI/CD pipeline

---

## 8. Delivery Phases

### Phase 1 — Foundation
- Configure the real database connection
- Run Prisma migrations
- Replace local file-based persistence with database-backed services

### Phase 2 — Identity and Access
- Implement secure login and logout
- Add role-based authorization
- Protect routes and actions by permission

### Phase 3 — Core School and Finance Services
- Complete admissions lifecycle management
- Build student, parent, and staff management
- Add fee and payment workflows
- Support academic record and transcript workflows

### Phase 4 — IT Education and CBT Services
- Add content support for IT education programmes
- Implement CBT subject, question, attempt, and result structures
- Prepare student-facing exam and learning experiences

### Phase 5 — Operational Readiness
- Add validation, logging, monitoring, and backups
- Implement audit trails and notifications
- Harden APIs for production deployment

---

## 9. Executive Summary

The backend has a solid architectural foundation and a clear product direction. The next step is not to expand randomly, but to build the system in a way that supports the full school platform: admissions, portals, academic records, payments, IT education, and CBT. The most important engineering priorities are secure authentication, real database-backed persistence, durable record retention, and reliable financial processing. These foundations will make the platform usable, trustworthy, and scalable for real deployment.
