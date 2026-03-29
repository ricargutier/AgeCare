# AgeCare — Technical Architecture Specification

> **Version:** 1.0 — Phase 1 (MVP)
> **Date:** March 29, 2026
> **Audience:** Engineering, DevOps, Security

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Hardware Architecture](#2-hardware-architecture)
3. [Cloud Backend Architecture](#3-cloud-backend-architecture)
4. [Key Data Flows](#4-key-data-flows)
5. [API Specification Overview](#5-api-specification-overview)
6. [Security & HIPAA Compliance](#6-security--hipaa-compliance)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Client Applications](#8-client-applications)

---

## 1. Architecture Overview

AgeCare is built on a layered architecture with four primary tiers: **Hardware/Edge**, **Connectivity/Gateway**, **Cloud Backend**, and **Client Applications**. The design prioritizes real-time responsiveness, offline resilience, HIPAA compliance, and accessibility for low-tech-comfort users.

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4 — Client Apps                                          │
│  iOS App (Elder) │ iOS & Android App (Family) │ Web Portal      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3 — Cloud Backend                                        │
│  API Gateway │ Event Processor │ Alert Engine │ Data Store      │
│  Notification Service │ Auth Service                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2 — Connectivity / Gateway                               │
│  Home Hub (Wi-Fi → Cloud) │ BLE (Wearable → Hub)               │
│  Zigbee/Z-Wave (Sensors → Hub) │ LTE backup (wearable)         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1 — Hardware / Edge                                      │
│  Wearable Smartband │ PIR Motion Sensors │ Door/Window Sensors  │
│  Voice Assistant │ Home Hub Gateway                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Hardware Architecture

### 2.1 Wearable Device Specifications

| Component | Specification | Notes |
|-----------|--------------|-------|
| Processor | ARM Cortex-M33, 64MHz | Low-power; dedicated for sensor fusion |
| Accelerometer/Gyro | 6-axis IMU, 100Hz sampling | Fall detection algorithm runs on-device |
| Heart Rate Sensor | Optical PPG (green LED) | Continuous HR monitoring |
| SpO2 Sensor | Dual-wavelength PPG | Spot-check every 15 min; continuous if anomaly detected |
| Memory | 512KB RAM, 4MB Flash | 30-day local data buffer |
| Connectivity | Bluetooth 5.0 LE + optional LTE CAT-M1 | BLE primary; LTE for SOS when hub unreachable |
| Battery | 250mAh LiPo, wireless Qi charging | 5-day typical; 24h SOS-only mode |
| Display | 0.96" OLED, 128×64px | Time, step count, HR, alerts |
| Water Resistance | IP68 (1.5m, 30 min) | Safe for showering and hand washing |
| SOS Button | Physical capacitive, long-press 3s | Hardware interrupt bypasses OS |

### 2.2 Home Hub Gateway

The hub is the central IoT gateway connecting all local devices to the cloud. It runs a lightweight Linux OS on an ARM Cortex-A processor and provides local processing for offline resilience.

| Component | Specification |
|-----------|--------------|
| Processor | ARM Cortex-A7, 500MHz |
| Memory | 256MB RAM, 8GB eMMC |
| Connectivity | Wi-Fi 802.11 b/g/n/ac, Ethernet RJ-45 |
| IoT Radio | Zigbee 3.0 + Z-Wave Plus V2 (dual-chip) |
| Bluetooth | BT 5.0 for wearable pairing |
| Power | DC adapter + 4h battery backup |
| Local Processing | Edge event processor: fall alerts, inactivity detection, offline buffering |
| Cloud Protocol | MQTT over TLS 1.3 → AWS IoT Core |

### 2.3 Home Sensors

| Sensor Type | Protocol | Placement & Purpose |
|-------------|----------|---------------------|
| PIR Motion Sensor | Zigbee 3.0 | 1 per key room (bedroom, bathroom, kitchen, living room) |
| Door/Window Contact | Z-Wave Plus | Front door, back door, medicine cabinet |
| Temperature/Humidity | Zigbee 3.0 | Living area — environment monitoring |
| Smart Plug (optional) | Z-Wave Plus | Kitchen — appliance activity proxy for meal detection |

---

## 3. Cloud Backend Architecture

AgeCare's cloud backend is deployed on **Amazon Web Services (AWS)** using a microservices architecture. All services run in private VPCs with no direct public internet exposure. The HIPAA-eligible services tier is used throughout.

### 3.1 Core Services

#### API Gateway — AWS API Gateway + Custom REST API
- TLS 1.3 termination; JWT authentication on all endpoints.
- Rate limiting: 1,000 req/min per device, 10,000 req/min per user.
- Versioned API: `/v1/` namespace for all Phase 1 endpoints.
- WebSocket endpoint for real-time dashboard updates.
- AWS WAF for DDoS and injection protection.

#### IoT Data Ingestion — AWS IoT Core + Kinesis Data Streams
- MQTT broker for all device-to-cloud communication (TLS 1.3).
- Device registry: per-device X.509 certificates for mutual TLS authentication.
- IoT Rules Engine routes sensor data to Kinesis or Lambda based on type.
- Kinesis Data Streams: high-throughput ingestion for vitals time series.
- Dead letter queue (SQS) for failed event processing — 3 retry attempts.

#### Event Processing — AWS Lambda + Step Functions
- Fall detection event: Lambda processes accelerometer event, cross-checks IMU patterns, triggers alert workflow.
- Inactivity engine: time-windowed Lambda checks motion events every 15 minutes.
- Vitals anomaly detector: Lambda compares incoming vitals against user-specific thresholds.
- Step Functions orchestrate alert escalation workflows (contact priority chains).
- All Lambda functions run in private VPC subnets with no public IPs.

#### Data Storage

| Store | Technology | Purpose |
|-------|-----------|---------|
| Vitals time series | Amazon Timestream | IoT sensor data (HIPAA-eligible) |
| User & account data | Amazon RDS PostgreSQL (Multi-AZ) | Users, medications, care notes — encrypted AES-256 |
| Event & alert logs | Amazon DynamoDB | Fast lookup for real-time dashboard queries |
| File storage | Amazon S3 (SSE-KMS) | Reports, firmware binaries, assets |

#### Notification Service
- Push notifications: AWS SNS → Firebase Cloud Messaging (Android) + APNs (iOS).
- SMS: Amazon SNS → Twilio (configurable fallback for higher delivery rates).
- Voice call escalation: Twilio Programmable Voice with text-to-speech.
- Email (provider reports): Amazon SES with DKIM/SPF signing.
- Delivery receipts tracked; undelivered notifications trigger escalation.

### 3.2 Authentication & Authorization

All authentication uses **OAuth 2.0 / OpenID Connect** via Amazon Cognito with HIPAA-compliant configuration.

- MFA required for all user accounts (TOTP or SMS OTP).
- JWT access tokens (15-min expiry) + refresh tokens (30-day expiry, rotation on use).
- **RBAC roles:** `Elder` | `FamilyAdmin` | `FamilyViewer` | `Caregiver` | `HealthcareProvider` | `SystemAdmin`
- Device authentication: X.509 certificates per device, issued during manufacturing.
- Provider access: time-limited tokens (24h) generated upon patient consent; access logged in HIPAA audit trail.

---

## 4. Key Data Flows

### 4.1 Fall Detection Flow

```
1. Wearable IMU         → Detects impact pattern; classifies as fall within 100ms (on-device)
2. Wearable             → Starts 30s cancel countdown; vibrates + displays alert
3. Wearable → Hub       → Sends fall event via BLE (or LTE if hub unreachable)
4. Hub → AWS IoT        → Publishes MQTT to: devices/{deviceId}/events/fall
5. IoT Rules → Lambda   → Fall Detection Lambda validates event, retrieves contact list
6. Lambda → Step Fn     → Initiates alert escalation workflow with contact chain
7. Step Fn → SNS        → Sends push + SMS to all tier-1 contacts simultaneously
8. Twilio               → Voice call initiated if push/SMS not acknowledged within 3 min
9. DynamoDB             → Alert event logged (timestamp, device ID, event type, ack status)
10. Dashboard           → Real-time WebSocket update pushed to all authenticated dashboards
```

### 4.2 Vitals Data Flow (Continuous Monitoring)

1. Wearable samples HR every 10 seconds; batches 5-minute summaries to hub via BLE.
2. Hub enriches with device timestamp and patient ID; publishes to Kinesis via IoT Core.
3. Kinesis consumer Lambda writes to Amazon Timestream and evaluates anomaly thresholds.
4. If vitals exceed threshold, anomaly Lambda triggers alert workflow (same Step Functions).
5. Dashboard queries Timestream via API for trend charts (WebSocket for real-time updates).
6. 30-day report generation: scheduled Lambda aggregates Timestream data, renders PDF (Puppeteer), stores in S3.

### 4.3 Medication Reminder Flow

1. Medication schedule stored in RDS PostgreSQL per user.
2. EventBridge rule triggers Reminder Lambda at each dose time.
3. Reminder Lambda sends simultaneously: hub → voice assistant (MQTT), wearable (BLE vibration), mobile app (push via SNS).
4. Elder acknowledges via voice (*"I took it"*), wearable button tap, or app notification.
5. Acknowledgment event logged in DynamoDB with method and timestamp.
6. If no acknowledgment within 15 minutes, reminder repeats (max 3 times). After 3rd miss → missed-dose alert to family.

---

## 5. API Specification Overview

**Base URL:** `https://api.agecare.io/v1/`
**Auth:** Bearer JWT on all endpoints (OAuth2)
**Format:** REST/JSON over HTTPS (TLS 1.3)
**Full spec:** OpenAPI 3.0 maintained at `/docs/openapi.yaml`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/token` | POST | OAuth2 token exchange (user login or device auth) |
| `/users/{userId}/dashboard` | GET | Full dashboard data for a specific user |
| `/devices/{deviceId}/vitals` | GET | Time-series vitals with optional date range and interval |
| `/devices/{deviceId}/alerts` | GET | Alert history with pagination |
| `/alerts/{alertId}/acknowledge` | POST | Acknowledge an alert with responder ID and optional note |
| `/medications/{userId}/schedule` | GET | Current medication schedule |
| `/medications/{userId}/acknowledge` | POST | Log medication acknowledgment (elder or caregiver) |
| `/reports/{userId}/health-summary` | GET | Generate or retrieve 30-day health summary (PDF or JSON) |
| `/calls/initiate` | POST | Initiate a video/voice call between care circle members |
| `/caregivers/{userId}/shift-notes` | GET | Retrieve caregiver shift notes for a patient |
| `/caregivers/{userId}/shift-notes` | POST | Create a shift note or incident report |
| `/fhir/r4/Patient/{id}/Observation` | GET | FHIR R4 vitals observations endpoint (provider use) |

---

## 6. Security & HIPAA Compliance

### 6.1 Data Classification

| Data Class | Examples | Controls |
|------------|---------|---------|
| **PHI (Sensitive)** | Vitals, fall events, medication logs, health reports | AES-256 at rest, TLS 1.3 in transit, access logging, minimum access |
| **PII** | Name, email, phone, address | Encrypted at rest; masked in logs |
| **Device Data** | Sensor readings, device ID, firmware version | Pseudonymized with device token; separated from PHI |
| **System Data** | Logs, metrics, error traces | No PHI in logs; aggregated metrics only |

### 6.2 HIPAA Technical Safeguards

- **Audit Controls:** All PHI access logged to immutable CloudTrail + custom audit log in RDS (6-year retention).
- **Access Control:** RBAC enforced at API Gateway and service levels; least-privilege IAM roles for all AWS services.
- **Transmission Security:** TLS 1.3 enforced; TLS 1.0/1.1 disabled at all endpoints; certificate pinning on mobile apps.
- **Integrity Controls:** S3 object checksums; DynamoDB conditional writes prevent unauthorized data modification.
- **Backup & Recovery:** RDS automated daily backups (35-day retention); cross-region S3 replication for reports.
- **BAA:** AWS BAA in place; all third-party vendors (Twilio, Firebase) require BAA before use.

### 6.3 Device Security

- Unique X.509 certificate per device provisioned during manufacturing; private key never leaves device HSM.
- Firmware signed with platform private key; signature verified by hub before applying OTA update.
- OTA updates delivered via AWS IoT Jobs; staged rollout (5% → 25% → 100%) with automatic rollback on failure.
- Hub runs read-only OS partition; configuration partition encrypted with device-specific key.

---

## 7. Infrastructure & DevOps

### 7.1 AWS Services Used

| Service | Purpose |
|---------|---------|
| AWS IoT Core | MQTT broker for device communication; device registry |
| Amazon Kinesis | High-throughput vitals data ingestion |
| AWS Lambda | Event processing, alert engine, report generation (serverless) |
| AWS Step Functions | Alert escalation workflow orchestration |
| Amazon Timestream | Time-series vitals storage (HIPAA-eligible) |
| Amazon RDS (PostgreSQL) | User accounts, medication schedules, care notes (Multi-AZ) |
| Amazon DynamoDB | Alert log, event log, real-time session state |
| Amazon S3 | Reports, firmware binaries, app assets (SSE-KMS) |
| Amazon Cognito | User authentication and token management |
| AWS API Gateway | REST + WebSocket API hosting |
| Amazon CloudFront | CDN for web portal and static assets |
| Amazon SNS / SES | Push notifications and email delivery |
| AWS CloudTrail | HIPAA audit logging for all AWS API calls |
| AWS WAF + Shield | DDoS protection and web application firewall |

### 7.2 Availability & Performance Targets

| Requirement | Target |
|-------------|--------|
| Platform Uptime SLA | **99.9%** (< 8.7 hours downtime/year) |
| Alert end-to-end latency | **< 5 seconds** (device event → push notification) |
| API response time (p95) | **< 200ms** for dashboard queries |
| Vitals data ingestion lag | **< 30 seconds** device → dashboard |
| Disaster Recovery RTO | **< 1 hour** (multi-AZ automatic failover) |
| Disaster Recovery RPO | **< 5 minutes** (RDS automated snapshots) |
| OTA update delivery | **< 10 minutes** for 95% of fleet |

### 7.3 CI/CD Pipeline

```
GitHub PR → CI (GitHub Actions)
  ├── Lint + Unit Tests
  ├── Integration Tests
  ├── SAST (Semgrep)
  └── Dependency Scan (Snyk)
      ↓
Staging Deploy (auto on merge to main)
      ↓
Production Deploy (manual approval gate)
  └── Staged rollout via AWS CodeDeploy
```

- **IaC:** Terraform for all AWS resources; state in S3 + DynamoDB locking.
- **Containers:** Amazon ECR for images; ECS Fargate for long-running services.
- **Monitoring:** CloudWatch dashboards + PagerDuty for on-call; Datadog APM for performance traces.
- **Environments:** `dev` → `staging` → `production`

---

## 8. Client Applications

### 8.1 Mobile Apps (iOS & Android)

| Attribute | Specification |
|-----------|--------------|
| Framework | React Native (shared codebase) |
| Min iOS Version | iOS 15+ |
| Min Android Version | Android 10 (API 29)+ |
| Authentication | Cognito SDK + biometric auth (Face ID / fingerprint) |
| Offline Mode | Last 24h vitals cached locally (SQLite); alerts queued |
| Push Notifications | FCM (Android) + APNs (iOS) via AWS SNS |
| Real-time Updates | WebSocket to API Gateway |
| Accessibility (Elder UI) | Large text (min 18pt), WCAG AA contrast, 44pt touch targets, VoiceOver/TalkBack |
| Certificate Pinning | SSL pinning on all API calls |

### 8.2 Web Portal (Caregiver & Provider)

| Attribute | Specification |
|-----------|--------------|
| Framework | React 18 + TypeScript |
| Hosting | Amazon CloudFront + S3 (SPA) |
| Authentication | Cognito Hosted UI with MFA enforcement |
| Browser Support | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| Design System | Custom component library; WCAG 2.1 AA compliant |
| State Management | React Query (server state) + Zustand (UI state) |
| Charts | Recharts for vitals trend visualizations |
| Session Timeout | 15 minutes of inactivity auto-logout (HIPAA safeguard) |

---

## Appendix: Technology Decisions Log

| Decision | Options Considered | Choice | Rationale |
|----------|--------------------|--------|-----------|
| IoT protocol | MQTT vs HTTP vs WebSocket | **MQTT** | Lightweight, pub/sub, ideal for constrained IoT devices |
| Cloud provider | AWS vs GCP vs Azure | **AWS** | Broadest HIPAA-eligible service coverage; IoT Core maturity |
| Time-series DB | InfluxDB vs TimescaleDB vs Timestream | **Timestream** | Native AWS integration, HIPAA-eligible, serverless |
| Mobile framework | React Native vs Flutter vs Native | **React Native** | Shared codebase, large talent pool, sufficient performance |
| Home sensor protocol | Zigbee vs Z-Wave vs Thread | **Zigbee + Z-Wave** | Widest device ecosystem compatibility for Phase 1 |
| Auth | Auth0 vs Cognito vs custom | **Cognito** | Native AWS, HIPAA BAA, lower operational overhead |

---

*Document End — AgeCare Technical Architecture Spec v1.0 | March 2026*
