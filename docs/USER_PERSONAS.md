# AgeCare — User Personas

> **Version:** 1.0
> **Date:** March 29, 2026
> **Purpose:** Define the four primary user archetypes that guide all product, design, and engineering decisions.

---

## Table of Contents

1. [Margaret Chen — Elderly Individual](#1-margaret-chen--elderly-individual)
2. [David Chen — Family Caregiver](#2-david-chen--family-caregiver)
3. [Rosa Morales — Professional Caregiver](#3-rosa-morales--professional-caregiver)
4. [Dr. Linda Park — Healthcare Provider](#4-dr-linda-park--healthcare-provider)

---

## Overview

Each persona represents a composite of real user needs, behaviors, goals, and frustrations derived from elder care research. These are not fictional characters — they are design tools. Every feature decision should be validated against at least one of these four personas.

---

## 1. Margaret Chen — Elderly Individual

> ### 🏷️ Primary User
> **Age:** 74 | **Location:** San Jose, CA | **Role:** Elder living independently at home

---

### Background

| Attribute | Detail |
|-----------|--------|
| **Age & Location** | 74 years old, lives alone in San Jose, CA (widowed 3 years ago) |
| **Occupation** | Retired school librarian |
| **Living Situation** | Single-story home; daughter lives 45 minutes away |
| **Health Status** | Managed hypertension, mild arthritis in hands, slight hearing loss |
| **Tech Comfort** | Low–Medium: uses iPhone for calls and photos, struggles with complex apps |

---

### Voice of the User

> *"I fell in the bathroom last year and lay there for two hours. That scared me more than the fall itself. But I don't want my daughter hovering over me either."*

---

### Goals vs. Frustrations

| ✅ What Margaret Wants | ❌ Frustrations / Pain Points |
|------------------------|-------------------------------|
| Maintain her independence and routine | Forgets medication timing, especially the evening dose |
| Feel safe at home without constant check-in calls | Doesn't want a bulky medical device on her wrist |
| Remember her medications without family nagging | Gets confused by too many notifications or alerts |
| Stay connected with her daughter and grandchildren | Worried about her privacy if devices "watch" her |
| Not feel like a burden or "monitored" | Phone apps with small text or complex menus |

---

### Behaviors & Patterns

- Wakes at 7am; makes coffee, reads, does a short walk in the yard each morning.
- Takes 3 medications: morning, noon, and evening.
- Video calls with her daughter Elena twice a week and grandson on weekends.
- Rarely asks for help even when struggling; values self-sufficiency.
- Is open to technology if it's simple and doesn't feel "clinical."

---

### AgeCare Usage Scenarios

- Wears the band daily — appreciates that it looks like a nice watch, not a medical device.
- Responds to voice reminders from the smart speaker in the kitchen.
- Can initiate a call to Elena by saying *"Hey AgeCare, call my daughter."*
- If she falls, SOS activates automatically — Elena is alerted in seconds.

---

### Design Implications

- **UI must use large text (min 18pt)** and high-contrast colors.
- **Wearable must feel like a lifestyle product**, not a hospital device.
- **Voice interaction should be the primary UI** for reminders and calls — not app taps.
- Privacy controls must be prominent and understandable.

---

## 2. David Chen — Family Caregiver

> ### 🏷️ Remote Family Monitor
> **Age:** 48 | **Location:** San Jose, CA | **Role:** Margaret's primary family contact

---

### Background

| Attribute | Detail |
|-----------|--------|
| **Age & Location** | 48 years old, lives 45 minutes from his mother in San Jose, CA |
| **Occupation** | Software engineering manager; works long hours, frequent meetings |
| **Family** | Married with two teenagers; primary point of contact for Margaret |
| **Relationship** | Close but strained by distance and worry; guilt about not being closer |
| **Tech Comfort** | High: uses smartphone daily, productivity apps, health wearables himself |

---

### Voice of the User

> *"I got a call from a neighbor that Mom had fallen. I was in a meeting. I should have known sooner. That's why I wanted something like this."*

---

### Goals vs. Frustrations

| ✅ What David Wants | ❌ Frustrations / Pain Points |
|---------------------|-------------------------------|
| Peace of mind knowing Margaret is safe daily | Gets too many false alarms that cause panic |
| Instant alerts if anything goes wrong | Doesn't know if Mom actually took her medications |
| See health trends without asking Mom directly | No way to know if she slept well or ate properly |
| Coordinate with the home aide easily | Home aide has no structured way to report concerns |
| Quick, actionable summaries — not data overload | Feels helpless when he gets a vague "I'm fine" response |

---

### Behaviors & Patterns

- Checks the app first thing in the morning and last thing before bed.
- Sets up weekly digests to review Margaret's activity and vitals trends.
- Prefers push notifications with clear context — not just "alert triggered."
- Coordinates with the home aide Rosa twice a week via text.
- Very willing to customize alert thresholds to reduce noise.

---

### AgeCare Usage Scenarios

- Opens the family dashboard each morning to review overnight activity and vitals.
- Gets a smart notification: *"Margaret missed her 8pm medication — tap to send reminder."*
- Reviews the weekly health summary PDF before her doctor appointment.
- Receives an alert with location when fall detection triggers.

---

### Design Implications

- **Dashboard must prioritize signal over noise** — anomaly flags, not raw data dumps.
- **Alert customization is a power-user need** — let David fine-tune thresholds.
- **Coordination tools** (notes, nudges to elder, shared logs with Rosa) are critical.

---

## 3. Rosa Morales — Professional Caregiver

> ### 🏷️ Home Health Aide
> **Age:** 35 | **Location:** San Jose, CA | **Role:** Certified home health aide serving Margaret 3x/week

---

### Background

| Attribute | Detail |
|-----------|--------|
| **Age & Location** | 35 years old, San Jose, CA |
| **Occupation** | Certified home health aide; works for a home care agency |
| **Experience** | 8 years in elder care; serves 4 regular clients including Margaret |
| **Workday** | Visits Margaret Mon/Wed/Fri for 3-hour shifts; handles meals, hygiene, exercises |
| **Tech Comfort** | Medium: comfortable with smartphones, uses agency scheduling app |

---

### Voice of the User

> *"I noticed Margaret seemed a little 'off' last Tuesday but I didn't know how to document it properly or who to tell. I wish I had a simple way to flag things."*

---

### Goals vs. Frustrations

| ✅ What Rosa Wants | ❌ Frustrations / Pain Points |
|--------------------|-------------------------------|
| Simple, quick tools to log care activities during shifts | Paper-based shift notes are lost or ignored |
| See Margaret's overnight data before arriving for context | No visibility into what happened before her shift |
| Easy way to flag concerns to the family or doctor | Unclear escalation path when she notices something wrong |
| Medication verification so she knows if doses were taken | Clients sometimes don't remember if they took medications |
| Reduce paperwork and end-of-shift reporting time | Agency systems don't talk to family communication tools |

---

### Behaviors & Patterns

- Arrives, quickly reviews overnight alerts on the AgeCare caregiver portal.
- Checks medication log to confirm morning doses; prompts if missed.
- Logs care activities (meal intake, exercises, mood, incidents) in under 5 minutes.
- Sends a brief note to David if she notices anything concerning.
- Values the medication history because it helps her advise Margaret confidently.

---

### AgeCare Usage Scenarios

- Logs into caregiver web portal; sees overnight vitals summary and motion activity.
- Marks morning medication as verified after watching Margaret take it.
- Creates an incident note: *"Client reported dizziness after standing up quickly — monitoring."*
- Reviews the week's activity trend and adds a note to share with the doctor.

---

### Design Implications

- **Caregiver portal must be fast** — Rosa has 3 hours per visit and can't spend 20 minutes on admin.
- **Shift log input must be mobile-friendly** — she's often standing or moving while logging.
- **Incident flagging must have a clear escalation path** — who gets notified and how.

---

## 4. Dr. Linda Park — Healthcare Provider

> ### 🏷️ Primary Care Physician
> **Age:** 52 | **Location:** San Jose, CA | **Role:** Margaret's PCP for 11 years

---

### Background

| Attribute | Detail |
|-----------|--------|
| **Age & Location** | 52 years old, San Jose, CA |
| **Occupation** | Primary care physician; panel of ~800 patients, 120+ are 65+ |
| **Practice** | Private practice, partnered with a regional health system |
| **Margaret's Doctor** | Has been Margaret's PCP for 11 years; sees her every 3–4 months |
| **Tech Comfort** | High: uses Epic EHR daily; open to digital health integrations |

---

### Voice of the User

> *"My elderly patients only see me a few times a year, but they're living with their conditions every day. I need real-world data, not just what they remember to tell me."*

---

### Goals vs. Frustrations

| ✅ What Dr. Park Wants | ❌ Frustrations / Pain Points |
|------------------------|-------------------------------|
| 30-day health trend reports before appointments | Patients describe symptoms inaccurately or forget events |
| Alerts for clinically significant anomalies between visits | No visibility into daily activity or vitals between visits |
| Medication adherence data to inform prescribing decisions | Medication non-adherence discovered only after complications |
| HIPAA-compliant, secure access to patient data | Family members call to report issues she hasn't been informed of |
| Minimal workflow disruption — works alongside EHR | New tools that require extensive training or create legal risk |

---

### Behaviors & Patterns

- Reviews AgeCare health report 24 hours before a scheduled appointment.
- Accesses via a secure web link — no separate app install required.
- Wants data in familiar clinical formats (vitals tables, trend graphs).
- Expects HIPAA BAA to be in place before accessing any patient data.
- Occasionally receives critical alerts (e.g., persistent elevated heart rate over 48h).

---

### AgeCare Usage Scenarios

- Receives an automated pre-appointment email with Margaret's 30-day health summary PDF.
- Logs into the secure provider portal to review detailed vitals trends and medication adherence.
- Receives an alert: *"Patient heart rate elevated (avg 102 bpm) for 3 consecutive days — review recommended."*
- Exports data in FHIR format for integration with Epic EHR.

---

### Design Implications

- **Provider onboarding must be near-zero friction** — a secure web link, not a new app download.
- **Reports must look clinical** — structured tables, trend lines, adherence percentages.
- **All access must be consent-gated and HIPAA-auditable** — Dr. Park will not adopt without legal clarity.
- **FHIR R4 API** is a requirement for long-term EHR workflow integration.

---

*Document End — AgeCare User Personas v1.0 | March 2026*
