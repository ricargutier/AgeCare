# AgeCare — User Stories & Acceptance Criteria

> **Version:** 1.0 — Phase 1 (MVP)
> **Date:** March 29, 2026
> **Format:** Agile user stories with acceptance criteria checklists

---

## Table of Contents

1. [Safety & Emergency Alerts](#1-safety--emergency-alerts)
2. [Health Monitoring & Dashboard](#2-health-monitoring--dashboard)
3. [Medication Management](#3-medication-management)
4. [Video & Voice Communication](#4-video--voice-communication)
5. [Device Setup & Onboarding](#5-device-setup--onboarding)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 Must Have | Required for Phase 1 launch |
| 🟡 Should Have | Important but not launch-blocking |
| 🟢 Nice to Have | Future consideration |
| ⬜ Draft | Story written, not yet reviewed |
| ✅ Accepted | Story reviewed and approved |

**Story ID Convention:**
- `AC-SAF-###` — Safety & Alerts
- `AC-HLT-###` — Health Monitoring
- `AC-MED-###` — Medication
- `AC-COM-###` — Communication
- `AC-ONB-###` — Onboarding

---

## 1. Safety & Emergency Alerts

> **Epic:** Ensure rapid emergency response for elderly individuals living alone

---

### AC-SAF-001 — Automatic Fall Detection ⬜ 🔴

**As an** elderly individual,
**I want** fall detection on my wearable that automatically triggers an alert,
**so that** help arrives quickly even if I cannot call for help myself.

#### Acceptance Criteria

- [ ] Wearable detects a fall using accelerometer data within 3 seconds of impact.
- [ ] A 30-second cancel window is displayed on wearable and voice announced (*"Fall detected — cancel in 30 seconds"*).
- [ ] If not cancelled, alerts are sent to all designated contacts via push notification and SMS simultaneously.
- [ ] Alert message includes timestamp, event type (*"Fall detected"*), and last known location (home or GPS if outdoors).
- [ ] If no contact responds within 5 minutes, system escalates to secondary contacts.
- [ ] Fall detection accuracy must achieve ≥95% sensitivity and ≤10% false positive rate in testing.

---

### AC-SAF-002 — Manual SOS Button ⬜ 🔴

**As an** elderly individual,
**I want** to press a single SOS button on my wearable to call for help,
**so that** I can get assistance quickly even if I haven't fallen but feel unwell.

#### Acceptance Criteria

- [ ] Wearable has a dedicated physical SOS button, distinguishable by touch.
- [ ] Pressing and holding for 3 seconds triggers SOS (to prevent accidental activation).
- [ ] SOS initiates an automated voice call to the first available designated contact.
- [ ] Simultaneously sends push/SMS alerts to all contacts in the care circle.
- [ ] SOS status is visible in real time on all caregiver and family dashboards.
- [ ] Elder can cancel SOS within a 10-second window after confirmation tone.

---

### AC-SAF-003 — Real-time Push & SMS Alerts ⬜ 🔴

**As a** family caregiver,
**I want** to receive real-time push notifications and SMS for emergency events,
**so that** I can respond immediately regardless of whether I have the app open.

#### Acceptance Criteria

- [ ] Notifications are delivered within 10 seconds of event detection under normal network conditions.
- [ ] Notification includes: event type, timestamp, elder's name, and a deep link to the alert detail in app.
- [ ] SMS fallback triggers automatically if push notification is not acknowledged within 60 seconds.
- [ ] Voice call escalation triggers if SMS is not acknowledged within 3 minutes.
- [ ] Alert escalation chain is user-configurable (order of contacts, escalation timing).
- [ ] Notification preferences are configurable per event type (e.g., SMS for falls, push for missed meds).

---

### AC-SAF-004 — Inactivity Alerts ⬜ 🔴

**As a** family caregiver,
**I want** to configure inactivity alerts when there is no motion in the home for an unusual period,
**so that** I know if my parent has not moved and might need a check-in.

#### Acceptance Criteria

- [ ] Family member can set a custom inactivity threshold per time of day (e.g., no motion for 4 hours between 8am–10pm triggers alert).
- [ ] System learns typical daily routines over first 14 days and suggests default thresholds.
- [ ] Inactivity alert is clearly labeled with duration (e.g., *"No motion detected in home for 5 hours"*).
- [ ] Alert does not trigger during expected sleep hours unless motion is zero for the entire configured sleep window.
- [ ] Suppressed automatically when elder's location is marked as "away from home."

---

## 2. Health Monitoring & Dashboard

> **Epic:** Provide continuous, meaningful health visibility to all care roles

---

### AC-HLT-001 — Family Health Dashboard ⬜ 🔴

**As a** family caregiver,
**I want** to view a daily health summary dashboard for my parent,
**so that** I can monitor their wellbeing at a glance without calling them every day.

#### Acceptance Criteria

- [ ] Dashboard loads within 2 seconds and displays current day's data by default.
- [ ] Shows: heart rate (current, daily range, avg), SpO2 (latest), step count, sleep duration, and battery level.
- [ ] Anomaly indicators (red/yellow flags) appear next to metrics outside configured normal ranges.
- [ ] Historical view allows 7-day and 30-day trend charts for all vitals.
- [ ] Dashboard is accessible on both mobile app and web portal.
- [ ] All data is timestamped and shows last sync time.

---

### AC-HLT-002 — Pre-Appointment Health Report ⬜ 🟡

**As a** healthcare provider,
**I want** to receive an automated health summary report before a patient appointment,
**so that** I can review 30 days of real-world data before making clinical decisions.

#### Acceptance Criteria

- [ ] System sends an automated email 24 hours before a scheduled appointment.
- [ ] Report includes: vitals trends (HR, SpO2), activity levels, sleep averages, and medication adherence rate for the prior 30 days.
- [ ] Report is available as a PDF download and as a secure web link requiring provider login.
- [ ] All data transmission to providers is HIPAA-compliant and requires prior patient consent.
- [ ] Report data is available in FHIR R4 format via a secure API endpoint.

---

### AC-HLT-003 — Provider Vitals Anomaly Alerts ⬜ 🟡

**As a** healthcare provider,
**I want** to receive an alert when a patient's vitals show a clinically concerning trend,
**so that** I can intervene proactively rather than waiting for the next appointment.

#### Acceptance Criteria

- [ ] System sends an alert when heart rate exceeds 100 bpm or falls below 50 bpm for more than 30 consecutive minutes.
- [ ] Alert is sent when SpO2 drops below 90% for more than 10 minutes.
- [ ] Alert thresholds are configurable by the provider through the clinical portal.
- [ ] Provider receives alert via secure email and in-app notification; no unsecured SMS for clinical data.
- [ ] Alert includes a summary of preceding 24 hours of data for context.
- [ ] Provider can acknowledge or dismiss the alert with a note, which is logged in the audit trail.

---

### AC-HLT-004 — Elder Self-View ⬜ 🟡

**As an** elderly individual,
**I want** to see a simple view of my own health on my wearable or the app,
**so that** I can feel informed and motivated to stay active and healthy.

#### Acceptance Criteria

- [ ] Wearable displays current time, step count, and a simple wellness indicator (color-coded: green/yellow/red).
- [ ] Elder-facing app uses large text (minimum 18pt), high contrast, and simple iconography.
- [ ] Daily goal progress shown with encouraging messaging.
- [ ] No alarming medical language — uses simple terms like "resting well" instead of clinical labels.
- [ ] Minimum touch target size of 44×44pt; supports system font scaling.

---

## 3. Medication Management

> **Epic:** Improve medication adherence through intelligent, non-intrusive reminders

---

### AC-MED-001 — Multi-Modal Medication Reminders ⬜ 🔴

**As an** elderly individual,
**I want** to receive multi-modal medication reminders at scheduled times,
**so that** I don't miss my doses even if I'm not looking at my phone.

#### Acceptance Criteria

- [ ] Reminders are delivered simultaneously via: wearable vibration + display, voice assistant announcement, and app push notification.
- [ ] Family or caregiver can configure medication name, dosage, and scheduled times during onboarding.
- [ ] Reminders are repeated up to 3 times at 5-minute intervals if not acknowledged.
- [ ] Elder can acknowledge by: tapping wearable button, saying *"I took it"* to voice assistant, or tapping app.
- [ ] Voice assistant confirmation uses simple, friendly language: *"Great! I've marked your 8am medication as taken."*

---

### AC-MED-002 — Medication Adherence Log ⬜ 🔴

**As a** family caregiver,
**I want** to see a real-time medication adherence log for my parent,
**so that** I can know whether medications were taken and intervene if doses are missed.

#### Acceptance Criteria

- [ ] Dashboard shows today's medication schedule with taken/missed/pending status for each dose.
- [ ] Missed dose triggers a soft alert to family (push notification, not emergency-level).
- [ ] Adherence history is available in a 30-day calendar view showing taken/missed per dose.
- [ ] Family can send a gentle reminder message via app if a dose is missed ("nudge" feature).
- [ ] Monthly adherence percentage is calculated and displayed on the dashboard.

---

### AC-MED-003 — Caregiver Medication Verification ⬜ 🔴

**As a** professional caregiver,
**I want** to verify and log medication administration during my care visits,
**so that** there is an accurate record of what was administered and when.

#### Acceptance Criteria

- [ ] Caregiver portal shows the current medication schedule and today's adherence status.
- [ ] Caregiver can mark a dose as "verified administered" with timestamp and optional note.
- [ ] Verification is logged with the caregiver's identity and cannot be deleted (only appended with corrections).
- [ ] If caregiver marks a previously "missed" dose as administered, the system updates and notifies the family.
- [ ] Audit log of all medication interactions (reminders, acknowledgments, verifications) is viewable by healthcare providers.

---

## 4. Video & Voice Communication

> **Epic:** Enable simple, frictionless connection between elder and care circle

---

### AC-COM-001 — Elder-Initiated Voice Call ⬜ 🟡

**As an** elderly individual,
**I want** to make a video call to my daughter by saying her name to the voice assistant,
**so that** I can connect with family without navigating a phone.

#### Acceptance Criteria

- [ ] Voice command *"Hey AgeCare, call [name]"* initiates a video call to the named contact in the care circle.
- [ ] Call connects within 5 seconds if the contact's app is active.
- [ ] If contact does not answer, system offers to leave a voice message.
- [ ] Elder can end call by saying *"Hey AgeCare, hang up"* or pressing the wearable button.
- [ ] Call quality target: HD video (720p) at <500ms latency on standard broadband.
- [ ] Family member can initiate a call to elder from the app; elder's smart speaker rings with the caller's name announced.

---

### AC-COM-002 — Family Video Check-in ⬜ 🟡

**As a** family caregiver,
**I want** to initiate a video check-in call with my parent from the mobile app,
**so that** I can visually assess how they are doing without being physically present.

#### Acceptance Criteria

- [ ] Family member can tap a "Video Call" button on the dashboard to reach the elder.
- [ ] Elder's smart speaker announces the caller by name and auto-answers after 3 rings if auto-answer is enabled.
- [ ] Auto-answer is off by default and configurable by the elder or family during setup.
- [ ] Missed calls are logged with timestamp; elder can see *"Elena called at 3pm"* on the speaker display.
- [ ] All calls are end-to-end encrypted.

---

## 5. Device Setup & Onboarding

> **Epic:** Enable a smooth, low-effort onboarding experience for all users

---

### AC-ONB-001 — Family-Led Hardware Setup ⬜ 🔴

**As a** family caregiver,
**I want** to complete hardware setup and account configuration in under 45 minutes,
**so that** I can get AgeCare running for my parent without technical expertise or professional help.

#### Acceptance Criteria

- [ ] Physical quick-start guide included in hardware box with numbered steps and QR code to video tutorial.
- [ ] Mobile app provides a step-by-step in-app setup wizard for: account creation, device pairing, sensor placement, and contact configuration.
- [ ] Each setup step is validated before advancing (e.g., confirms Bluetooth connection before proceeding).
- [ ] Setup wizard provides clear error messages with resolution steps if a step fails.
- [ ] Onboarding completion rate target: ≥85% of users complete full setup without contacting support.
- [ ] Average setup time target: ≤45 minutes from box open to first alert configured.

---

### AC-ONB-002 — Professional Caregiver Onboarding ⬜ 🟡

**As a** professional caregiver,
**I want** to be added to a client's care circle and access the caregiver portal quickly,
**so that** I can start using AgeCare on my first day with a new client.

#### Acceptance Criteria

- [ ] Family admin can invite a professional caregiver via email from the app.
- [ ] Caregiver receives an invitation email with a secure one-click setup link.
- [ ] Caregiver account creation requires: name, email, phone, and agency name.
- [ ] Role-based access is enforced: caregiver sees care tasks, medication logs, and activity — but not financial or billing information.
- [ ] Caregiver is prompted to complete a brief (3-minute) in-app tutorial on first login.

---

## Story Summary

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| AC-SAF-001 | Automatic fall detection | 🔴 Must Have | ⬜ Draft |
| AC-SAF-002 | Manual SOS button | 🔴 Must Have | ⬜ Draft |
| AC-SAF-003 | Real-time push & SMS alerts | 🔴 Must Have | ⬜ Draft |
| AC-SAF-004 | Inactivity alerts | 🔴 Must Have | ⬜ Draft |
| AC-HLT-001 | Family health dashboard | 🔴 Must Have | ⬜ Draft |
| AC-HLT-002 | Pre-appointment health report | 🟡 Should Have | ⬜ Draft |
| AC-HLT-003 | Provider vitals anomaly alerts | 🟡 Should Have | ⬜ Draft |
| AC-HLT-004 | Elder self-view | 🟡 Should Have | ⬜ Draft |
| AC-MED-001 | Multi-modal medication reminders | 🔴 Must Have | ⬜ Draft |
| AC-MED-002 | Medication adherence log | 🔴 Must Have | ⬜ Draft |
| AC-MED-003 | Caregiver medication verification | 🔴 Must Have | ⬜ Draft |
| AC-COM-001 | Elder-initiated voice call | 🟡 Should Have | ⬜ Draft |
| AC-COM-002 | Family video check-in | 🟡 Should Have | ⬜ Draft |
| AC-ONB-001 | Family-led hardware setup | 🔴 Must Have | ⬜ Draft |
| AC-ONB-002 | Professional caregiver onboarding | 🟡 Should Have | ⬜ Draft |

---

*Document End — AgeCare User Stories v1.0 | March 2026*
