# Malaysia Self-Operated EV CPO Platform — Phase 1A (OCPP 1.6J Closed Loop & Simulated Settlement)

> **Target Market:** Malaysia (`MYR`, `Asia/Kuala_Lumpur`, English / Bahasa Melayu / 简体中文)  
> **Target Hardware:** Techone `GPEV20-BG102-S1P-EA` (20kW Single-Gun DC Fast Charger, 200–1000Vdc, 0–66.7A) + QuanYao (全耀) `QY-SECC-02` SECC Controller  
> **Current Stage:** Phase 1A — OCPP 1.6J Charging Closed Loop & Simulated Settlement (`SIMULATED_SUCCEEDED`)

---

## 1. Architecture & Monorepo Structure

```text
EVtestportevaluate/
├── packages/
│   └── db/                      # Prisma Schema (17 Core Tables), Integer Wh & MYR Sen Billing Engine,
│                                # 16-char OCPP idTag Generator, QuanYao SECC Telemetry Sanitizer & Seed
├── apps/
│   ├── ocpp-gateway/            # Independent Node.js OCPP 1.6J WebSocket CSMS (:9000)
│   │                            # + Internal Control HTTP Server (127.0.0.1:9001)
│   │                            # + Built-in Techone GPEV20 20kW GB/T & CCS2 Hardware Simulator
│   └── web/                     # Next.js 15 App Router Fullstack Application (:3000)
│                                # - Mobile 3-Language User PWA (EN / BM / 中文)
│                                # - Chinese Operations & Acceptance Admin Console (/admin)
│                                # - REST APIs with RBAC, Site Isolation & Security Audit Logging
├── scripts/
│   ├── e2e-phase1a-acceptance.ts # End-to-End Automated Verification of all 8 Phase 1A Criteria
│   └── backup-restore-verify.ts  # Automated PostgreSQL pg_dump Backup & Restore Integrity Verification
├── docs/superpowers/specs/
│   ├── 2026-11-20-malaysia-cpo-demo-design.md
│   └── infosecc-hardware-analysis.md
└── docker-compose.yml           # Cloud deployment compose specification (Huawei Cloud / Alibaba Cloud)
```

---

## 2. Quick Start (Local Windows / CodeArts Cloud Workstation)

### Prerequisites
- **Node.js** `>= 20` & **pnpm**
- **PostgreSQL 16** (either local native PostgreSQL at `127.0.0.1:5432` or remote CodeArts / Huawei Cloud / Alibaba Cloud PostgreSQL via `DATABASE_URL` in `.env`)

### Step 1: Configure `.env`
Copy `.env.example` to `.env` and set `DATABASE_URL` to your local or remote PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ev_cpo_dev?schema=public"
```

### Step 2: Install, Push Schema & Seed Demo Data
```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### Step 3: Start Independent OCPP 1.6J Gateway & Web Application
```bash
# Terminal 1: Start Independent OCPP 1.6J Gateway (:9000) & Embedded 20kW Simulators (:9001)
pnpm dev:ocpp

# Terminal 2: Start Next.js User PWA & Operations Console (:3000)
pnpm dev:web
```

---

## 3. Demo Entry URLs, QR Codes & Test Accounts

### Key URLs
- **Launchpad & QR Entry Portal:** `http://localhost:3000`
- **20kW GB/T DC Charger QR Scan Page (`MY-KL-DC-001`):** `http://localhost:3000/c/K9mP2xQ8vL4n`
- **20kW CCS2 DC Charger QR Scan Page (`MY-KL-DC-002`):** `http://localhost:3000/c/C7xR4tN9wM2p`
- **Offline Backup Charger QR Page (`MY-PJ-DC-003`):** `http://localhost:3000/c/P3zW8qB5jH6k`
- **Chinese Operations & Acceptance Admin Console:** `http://localhost:3000/admin`
- **Login & 1-Click Role Switcher:** `http://localhost:3000/login`

### Seeded Test Accounts (Password for all accounts: `Password123!`)
| Email | Role | Status | Purpose |
|---|---|---|---|
| `driver@evcpo.my` | `DRIVER` | `ACTIVE` | Verified driver account for scanning QR & charging |
| `unverified@evcpo.my` | `DRIVER` | `UNVERIFIED` | Verifies `REQ-ACC-002` (blocks charging until 6-digit code `888666` is entered) |
| `admin@evcpo.my` | `ADMIN`, `DRIVER` | `ACTIVE` | Full platform management, tariff editing, 2FA remote control & audit inspection |
| `cs@evcpo.my` | `CUSTOMER_SERVICE` | `ACTIVE` | Desensitized PII view; blocked (403 + security audit) from tariff edit or remote control |
| `staff-kl@evcpo.my` | `SITE_STAFF` | `ACTIVE` | Strictly isolated to assigned site `MY-KL-001` (`REQ-ADM-001`) |

---

## 4. Automated Verification & Acceptance Tests

```bash
# 1. Run Unit Tests (Integer Wh/Sen Billing, idTag & QuanYao SECC Telemetry Sanitizer)
pnpm test:db

# 2. Run Full Phase 1A End-to-End Acceptance Suite (All 8 Acceptance Criteria)
pnpm --filter @ev-cpo/db exec tsx ../../scripts/e2e-phase1a-acceptance.ts

# 3. Run PostgreSQL Backup & Restore Verification (Acceptance Criterion 8)
pnpm --filter @ev-cpo/db exec tsx ../../scripts/backup-restore-verify.ts
```
