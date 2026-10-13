# 03 — GPS clock in / clock out

Goal: a staff member's arrival and departure are recorded with a
location-stamped, auditable punch — not a self-reported one.

---

## 1. What exists today (measured)

- **QR badge attendance**: `components/StaffQrScanner` (html5-qrcode) renders at
  `/admin/staff-attendance`; `app/api/teacher/attendance/register/route.ts`
  writes events; `lib/staff-attendance.ts` owns timezone logic.
- `StaffAttendanceEvent`: `eventType`, `scannedAt`, `isLate`, `lateMinutes`,
  `source` (default `"QR"`), `scannerUserId`, `workDate` — indexed by
  `(schoolId, workDate)` and `(teacherProfileId, workDate)`.
- Lateness is computed server-side against `SCHOOL_LATE_CUTOFF` (`08:00`) in
  `SCHOOL_TIMEZONE` / `SCHOOL_TZ` (`Africa/Lagos`) — **keep this**, it is the
  right pattern.
- Corrections flow exists: `AttendanceCorrectionRequest` with approval status.
- Mobile: `expo-camera` present; offline SQLite cache + write-queue present.
- **Blockers, all deliberate:**
  - `next.config.ts:22` — global `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - `next.config.ts:49` — attendance route re-grants camera only; the comment
    states "microphone and geolocation stay denied".
  - `tests/lib/security-hardening.test.ts:209,219` and
    `tests/e2e/02-attendance-camera.spec.ts:42` **assert** geolocation stays
    denied. Any GPS work must update these in the same commit, with the reason
    written down — that is the repo's convention and it is a good one.
- No `latitude`/`longitude`/geofence columns anywhere in `prisma/schema.prisma`.

---

## 2. Policy change (do this before code)

GPS clock-in is a **workplace monitoring decision**, not a technical one. Handle
it in this order:

1. **Written staff notice + consent**, covering: what is collected (a coordinate
   and accuracy at the moment of punch — *not* continuous tracking), why
   (payroll/lateness fairness), retention (default 12 months), who can see it
   (admin + the staff member themselves), and the appeal route.
2. **NDPA 2023 basis.** Location is personal data; if a selfie is added,
   biometric-adjacent processing needs explicit consent. Document the lawful
   basis (legitimate interest / contract performance) and put it in the privacy
   policy the school publishes.
3. **Union/staff-council sign-off** where one exists. A GPS system imposed
   without it produces a dispute in week two, and the dispute lands on whoever
   built the system.
4. **Pilot in dual mode for two weeks** (QR *and* GPS recorded side by side),
   publish the comparison to staff, then cut over.

**Design principle, stated plainly:** GPS is *evidence*, not proof. A motivated
person can spoof location (mock-location apps, rooted devices, GPS drift
indoors). The system's job is to make honest clock-in frictionless and
dishonest clock-in **visible and auditable** — never to claim certainty it
cannot deliver. Say this to the school before they expect spy-movie accuracy.

---

## 3. Data model

```prisma
enum AttendancePunchMethod { QR_GPS  QR_ONLY  GPS_ONLY  MANUAL  SUPERVISOR }

model AttendanceGeofence {
  id             String   @id @default(cuid())
  schoolId       String
  name           String                       // "Main campus", "Annex", "Hostel"
  latitude       Float
  longitude      Float
  radiusMeters   Int      @default(150)       // see §4 — do NOT default to 20m
  maxAccuracyM   Int      @default(120)       // reject punches vaguer than this
  appliesToRoles Json?                        // null = all staff
  activeFrom     DateTime?
  activeTo       DateTime?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  @@index([schoolId, isActive])
}

// Added to StaffAttendanceEvent (keep every existing column — QR path unchanged)
//   latitude        Float?
//   longitude       Float?
//   accuracyMeters  Float?
//   distanceMeters  Float?     // computed vs the matched geofence, server-side
//   geofenceId      String?
//   method          AttendancePunchMethod @default(QR_ONLY)
//   trustFlags      Json?      // ["MOCK_LOCATION","LOW_ACCURACY","OFF_SITE","STALE","CLOCK_SKEW"]
//   deviceId        String?    // device-binding, from DeviceToken or a punch-scoped id
//   capturedAtClient DateTime? // device clock at punch time
//   serverReceivedAt DateTime  // server clock — the authoritative one for offline punches
//   ipHash          String?    // hashed, for anomaly review (never raw IP in reports)
//   mockLocation    Boolean @default(false)
//   @@index([schoolId, method, scannedAt])
```

Also on `School` (or a small `AttendancePolicy` row): `punchWindowBeforeMins`,
`lateCutoff` (already env-driven — move to DB so each school sets its own),
`offlinePunchMaxAgeMins`, `requireSelfieOnFlag`, `supervisorOverrideRoles`.

Migration is additive; every existing QR row stays valid with
`method = QR_ONLY`.

---

## 4. Server-side decision logic (never trust the client)

Pure functions in `lib/geo.ts` (added with this doc set — haversine, accuracy
gating, mock-location heuristics, velocity check, punch-window evaluation,
trust-flag → decision mapping), called from the punch route. The client sends
raw evidence; only the server decides.

| Check | Rule | On failure |
|---|---|---|
| Accuracy | `accuracyMeters <= geofence.maxAccuracyM` | flag `LOW_ACCURACY`; if worse than 3×, `REJECT` with "step outside and retry" |
| Distance | `haversine(punch, geofence) <= radiusMeters` | `OFF_SITE` flag → `ACCEPT_FLAGGED` or `REJECT` per school policy |
| Mock location | client reports mock provider / impossible-accuracy (accuracy 0m with jump) | flag `MOCK_LOCATION`, require supervisor confirmation that day |
| Velocity | distance/time from the staff member's last punch implies > ~120 km/h | flag `IMPOSSIBLE_TRAVEL`, hold for review |
| Clock skew | `abs(capturedAtClient − serverReceivedAt) > 5 min` | use server time, flag `CLOCK_SKEW` (offline punches legitimately look like this) |
| Staleness | offline punch older than `offlinePunchMaxAgeMins` | `REJECT` to the exceptions queue, never silently post |
| Window | punch before `punchWindowBeforeMins` or after closing | flag, but **always record** — never drop a punch |

Decisions: `ACCEPT` · `ACCEPT_FLAGGED` (posts, appears in the daily exception
list) · `REJECT` (staff sees an actionable reason immediately) ·
`REQUIRE_SUPERVISOR` (posts as pending until an approver signs, reusing the
existing `AttendanceCorrectionRequest`-style approval pattern).

**Radius reality for Nigeria:** indoor GPS accuracy in a concrete classroom
block is routinely 20–80m, and under a metal roof can be worse. A 20m geofence
will reject correct punches. Default **150m** for a compound, provide multiple
named geofences for multi-site schools, and let the school see a map when
configuring. Precision is not the goal; "was this punch plausibly at school" is.

---

## 5. Client behaviour (web + mobile)

- **Punch-only location.** No background tracking. This keeps the app store
  review simple, the battery drain nil, and the privacy story clean. The user
  taps Clock in / Clock out, the app requests a single position with a timeout,
  submits it, and forgets it.
- **CSP/Middleware change.** Add a route-scoped `Permissions-Policy:
  geolocation=(self)` exactly mirroring the existing camera scoping in
  `next.config.ts`, targeting the punch page and the mobile web view. Update
  `tests/lib/csp.test.ts` / `tests/lib/security-hardening.test.ts` /
  `tests/e2e/02-attendance-camera.spec.ts` in the same commit, asserting the
  *new* intended policy (camera + geolocation granted on the punch route only,
  microphone still denied everywhere).
- **Offline-first punch (mandatory).** Staff arrive, network is down or the
  school has no data plan that morning. The punch is captured on-device
  (coordinate, accuracy, device time, mock flag), written to the existing
  offline queue (`mobile/lib`, `lib/offline`, `app/offline`), and synced later.
  The server records both clocks and flags staleness. A punch must **never** be
  lost because of connectivity — that is the single most common way attendance
  systems lose staff trust.
- **Mobile permissions copy** must state exactly what and when: "Ykay's app —
  we record your location only when you tap Clock in or Clock out." Written for
  the staff member, not the lawyer, and in the app's permission string so app
  review and staff both see it.
- **Fallback when GPS fails:** QR scan (already built) → supervisor mark with
  reason → correction request. Publish the order of fallbacks so staff know the
  system cannot trap them.

---

## 6. Exceptions review (where the system actually earns its keep)

A daily list for the admin/bursar, at the top of `/admin/staff-attendance`:

- on-site but late · flagged (low accuracy / off-site / mock / impossible travel)
- missing clock-out · pending supervisor confirmations · manual overrides
- weekly trend per staff member and per department

Then the tie-in that makes it money rather than admin: **lateness → payroll
deduction → ledger entry** (`05-financial-system.md`). A punch policy nobody
reconciles to pay is theatre; a punch policy that produces an auditable
deduction line is a financial control. Get the school to agree the deduction
rules in writing first.

---

## 7. Definition of done

- [ ] `lib/geo.ts` unit tests cover: inside/outside/edge radius, accuracy gate, mock-location, velocity, skew, stale offline punches, and decision mapping (`tests/lib/geo.test.ts`).
- [ ] Route-scoped geolocation granted; the three CSP/permission tests updated with a written rationale; microphone still denied.
- [ ] Web + Android punch flows work **with the network off**, then sync correctly.
- [ ] Geofence admin UI: create/edit multiple sites, see a map, set radius and accuracy ceiling, per-role applicability.
- [ ] Exception list live; a supervisor can confirm/deny a flagged punch with a reason; every decision is in the audit log.
- [ ] Two-week dual-run (QR vs GPS) completed, discrepancies published to staff, then policy cut over.
- [ ] Staff notice + NDPA basis + retention job (12 months default) in place.
- [ ] Lateness feeds payroll/deduction rules with a signed-off rule sheet.
