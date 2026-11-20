# Hardware & SECC Protocol Reference Analysis (`INFOSECC`)

**Date:** 2026-11-20  
**Scope:** Complete technical analysis of all 9 reference files in `EVtestportevaluate/INFOSECC` (Techone charger references & QuanYao 全耀 SECC documentation) and their direct impact on the **Phase 1A OCPP 1.6J Server, Database, Simulator, and UI design**.

---

## 1. Corpus Inventory & Architecture Role

| # | Relative Path | Document Type & Purpose |
|---|---|---|
| 1 | `Techone充电桩范例参考资料/(20250829)GPEV20-BG102-S1P-EA Product Specification Document A.docx` | Product specification for the **Techone `GPEV20-BG102-S1P-EA` 20kW Euro-standard (CCS2) Single-Gun DC Group Charger**. Defines AC/DC electrical specs, parallel group-charging up to 80kW (4x20kW), CCS2 pinout, internal block diagram (`GPEV-DC-M2C` controller, `GPAD203M1000` rectifier, `GPEV-IMD` insulation detector), QR/VIN start modes, and LAN0/LAN1/RS232/CAN interfaces. |
| 2 | `Techone充电桩范例参考资料/3f6dade59efbfc68b3fdb1bf82f0a923.png` & `e5107bc126b39f1813378914f83c2d01.png` | State-machine diff diagrams ("2.9 GBT 充电实现修改成 ISO15118") illustrating how a legacy GB/T 27930 charger controller (`Customer's SECC = Charger Controller`) must modify its sequence to interoperate with a CCS/ISO 15118 `EVSE PLC` (SECC) board: moving Connector Lock, Insulation Test, and DC Relay ON, and adjusting timeouts. |
| 3 | `Techone充电桩范例参考资料/【公开】KM_SECC控制器CAN通信协议及编程手册V1.pdf` | KaiMai (凯迈洛阳) `KM_SECC` V1.8 CAN communication protocol manual (250kbps SAE J1939/GB/T 27930-2015 translation to DIN 70121 / ISO 15118). Defines the baseline CAN frames (`CHM`, `BHM`, `CRM`, `BRM`, `BCP`, `CTS`, `CML`, `BRO`, `CRO`, `BCL`, `BCS`, `CCS`, `BSM`, `BST`, `CST`, `BSD`, `CSD`, `BEM`, `CEM`, `BPT`) and modified CCS timeouts. |
| 4 | `全耀SECC/全耀SECC产品规格书-2026.04.pdf` | QuanYao (全耀) SECC Product Specification (v2026.04) covering standalone box models **`QY-SECC-01`** and **`QY-SECC-02`**. Both translate GB/T 27930 CAN <-> CCS (HomePlug GreenPHY PLC, ISO 15118 DC, DIN 70121, IEC 61851-1, Tesla adapter support). |
| 5 | `全耀SECC/全耀SECC流程图V1.0(1).pdf` | Complete side-by-side DC charging sequence flowchart between the Charger Main Controller (`充电机`) and `全耀 SECC` over GB/T 27930-adapted CAN frames, from plug-in (`BHM`/`CHM`) to welding detection (`BSD`/`CSD`). |
| 6 | `全耀SECC/SECC与充电桩控制板通信协议规范.pdf` | QuanYao **Native EVSE <-> SECC Communication Protocol Specification V1.0** (for EU CCS / ISO 15118 AC & DC chargers, supporting UART/Ethernet direct framing and CAN J1939 transport-layer segmentation `TP-CAN` / `TP-UART`). Defines periodic cyclic frames (`E_Dynamic` `0x01`, `E_Power` `0x02`, `E_Static` `0x03`, `S_Dynamic` `0x81`, `S_Power` `0x82`, `S_Static` `0x83`) and event-driven ISO 15118 PnC certificate/auth commands (`0x11`–`0x19`, `0x91`–`0x9F`). |
| 7 | `全耀SECC/QY-AC-SECC-Module-HLS 产品规格书.pdf` | QuanYao **`QY-AC-SECC-Module-HLS`** 18-pin vertical/horizontal solderable PLC core module (50x10x30mm, 5V/>600mA) for European/US AC & DC chargers (CCS1, CCS2, NACS), natively supporting ISO 15118-2 (EIM, PnC) and ISO 15118-20 (EIM, PnC, BPT/V2X) via UART2 + optional hardware/MCU CP/PP/PWM/E-state control switching (`PWM_EN` pin). |
| 8 | `全耀SECC/桩端国标转CCS通信协议.xls` | Comprehensive bit-level CAN protocol matrix (`通信协议报文` & `附录、错误代码`) for QuanYao's GB/T-to-CCS translation firmware. Contains exact J1939 CAN IDs, byte/bit offsets, scaling factors (`>400A` flag bit encoding), fields unsupported by CCS (hardcoded `0x00`), stop reason bit-triplets (`ChargerSuspend : FullChgComplete : ChgFinished`), V2G sequence step codes (`0x01`–`0x30`), and internal PLC/SLAC/SDP/DIN/CAN/EV error codes (`0x01`–`0xE5`). |
| 9 | `全耀SECC/ISO15118-PnC.docx` | 28-page technical design document (embedded page images) detailing ISO 15118 Plug & Charge (PnC) PKI hierarchy (`V2G Root`, `MO Root CA`, `OEM Root CA`, `CPO Sub-CA 1/2`, `EVSE Leaf`, `Contract Certificate`), TLS/ECDSA/ECDH/AES cryptography, V2G message sequence & EVCC state machine timers (`V2G2-483` to `V2G2-794`), and certificate provisioning archives (`.p12` + `eMAID`). |

---

## 2. Target Hardware Profile: Techone `GPEV20-BG102-S1P-EA`

### 2.1 Model Naming & Physical Overview
- **Brand / Manufacturer:** Techone (`GP` = Brand prefix, `EV` = Electric Vehicle Charger)
- **Model Number:** `GPEV20-BG102-S1P-EA`
  - `20`: 20 kW rated single-charger DC output power
  - `102`: 1000 Vdc max rated output voltage
  - `S1`: Integrated single-gun (`Single-gun`) design
  - `P`: Supports parallel group charging (`Parallel connection`)
  - **Product Category:** European-Standard Small DC Fast Charger with Group Charging (`歐標小直流充電樁（群充）`).
- **Mechanical & Environmental Specs:**
  - Dimensions (L x H x W, excluding top cover): `420 mm x 700 mm x 240 mm`
  - Weight: `≤ 57 kg` (including cabinet, power distribution, rectifier module; optional foundation pillar adds ~17 kg)
  - Mounting: Wall-mounted, pole-mounted, or floor pillar mounted
  - Protection Rating: **IP54** outdoor stainless-steel enclosure with independent air duct cooling (`≤ 55 dB` noise)
  - Operating Temperature: `-20°C to +50°C` certified (`-40°C to +55°C` extreme, with linear power derating between `50°C` and `55°C`)

### 2.2 Electrical & Connector Specifications
- **Connector Type:** **CCS Combo 2 (CCS2)** single gun (conforms to IEC 62196-3:2022, IEC 61851-23/24, ISO 15118-1/2/3, DIN SPEC 70121/70122).
  - **9-Wire Gun Pinout:**
    - `DC+` (Brown, 70 mm², up to 250A)
    - `DC-` (Blue, 70 mm², up to 250A)
    - `PE` (Yellow/Green, 35 mm², 140A protective earth)
    - `PP` (White, 0.75 mm², 2A Charging Connection Confirmation)
    - `CP` (Grey, 0.75 mm², 2A Control Pilot / PLC carrier line)
    - `T1+ / T1-` (Orange / Black, 0.75 mm², Temperature sensor 1)
    - `T2+ / T2-` (Brown / Blue, 0.75 mm², Temperature sensor 2)
  - **Gun Current Ratings:** Standard gun is **80A**; optional **150A, 200A, or 250A** guns for parallel group-charging units.
- **AC Input:**
  - Three-phase five-wire (`L1, L2, L3, N, PE`), `380 Vac` nominal (`323–437 Vac`), `47–63 Hz`, max `40A` per phase (`21.5 kVA`), PF `≥ 0.98–0.99`, THD `< 5%`.
  - Input Overvoltage Protection: Trips at `455–475 Vac` (auto-recovers at `445–465 Vac`).
  - Input Undervoltage Protection: Trips at `305–315 Vac` (auto-recovers at `315–325 Vac`).
- **DC Output & Group Charging Scaling:**
  - **DC Voltage Range:** **`200 Vdc – 1000 Vdc`** (derated operation between `200–300 Vdc`; output overvoltage lockout at `1020–1080 Vdc`).
  - **Single-Charger Mode (1 unit):** **`20 kW`** max power, **`0 – 66.7 A`** current.
  - **Dual-Charger Parallel Mode (2 units):** **`40 kW`** max power, **`0 – 133.4 A`** current.
  - **Triple-Charger Parallel Mode (3 units):** **`60 kW`** max power, **`0 – 200.0 A`** current.
  - **Quad-Charger Parallel Mode (4 units):** **`80 kW`** max power, **`0 – 250.0 A`** current.
  - *Group Charging Rule:* Up to 4 units can be interconnected on a parallel DC bus + CAN bus without a separate master cabinet. At any moment, at most one gun operates in parallel group-charging mode while non-grouped units can independently output 20 kW to their own guns.

### 2.3 Internal Hardware Architecture, Screen/QR & Network Interfaces
From the system configuration table and hardware wiring schematic (`image4.png`):
- **Core Subsystems:**
  1. **Charger Cabinet:** `GPEV20-BG102-S1P-EA` (with Front Display Screen `#1`, Door Lock `#2`, Emergency Stop Button `#5`, Air Inlets/Outlets `#3/#4/#6/#7`, Gun Outlet `#8`, Parallel Bus Port `#9`, AC Input `#10`).
  2. **Rectifier Power Module:** `GPAD203M1000-1A` / `GPAD203M1000-2A` (20 kW AC/DC module, controlled via internal CAN bus).
  3. **Main Monitoring & Control System:** **`GPEV-DC-M2C`** (`MAIN-System`, high-performance ARM controller).
     - `CCU-Control`: Main charging control unit managing BMS/SECC coordination, rectifier current/voltage allocation, parallel bus contactors, electronic lock, auxiliary 12V supply, fan speed, and discharge circuit.
     - `TCU-Control`: Telematics / Billing / Cloud platform communication unit.
     - `Charging-Comm`: Embedded or daughterboard SECC interface connected to `PE, PP, CP, T-, T+` of `GUN1`.
  4. **Insulation Detection Unit (IMD):** `GPEV-IMD`.
  5. **Auxiliary Power Supply:** `GPAD201M12-1C` (`12V+ / 12V-` internal system power).
- **Screen, User Auth & Network Interfaces:**
  - **Display Screen (`顯示幕`):** Front-mounted LCD display showing real-time charging information, status, and QR code.
  - **Authentication / Start Methods:** Explicitly specifies **Mobile QR Code scanning (`手機掃碼`)** and **VIN Code (`VIN碼` / AutoCharge)** startup, plus optional external **POS terminal (`POS Optionality` connected via `RS232`)**.
  - **Network & Communication Ports on `GPEV-DC-M2C`:**
    - Dual Ethernet RJ45 ports: **`LAN0`** and **`LAN1`** (for OCPP cloud platform connection / local commissioning / multi-charger daisy-chaining).
    - **`CAN` bus:** Connects `MAIN-System` to the rectifier module (`REC`), SECC controller, and external parallel group-charging CAN bus.
    - **`RS232` port:** Connects to optional POS terminal or SECC debug/upgrade port.

---

## 3. How the QuanYao (全耀) SECC Module Works with the Charger Control Board & OCPP 1.6J CSMS

### 3.1 Three Hardware Form Factors of QuanYao SECC
1. **`QY-SECC-01` (Compact Standalone Box, 82.2 x 55 x 29 mm, IP40, DC 9–32V):**
   - 16-pin terminal block: `PP`, `PE`, `CP`, `RS232_0 (RX0/TX0)`, `RS232_1 (RX1/TX1)`, Emergency Stop (`PWR/SIG`), `CANH/CANL` (250K/500K/1000K, default 250Kbps GB/T 27930), `V-/V+`.
2. **`QY-SECC-02` (Enhanced Standalone Box, 155 x 111 mm, IP40, DC 9–32V):**
   - Adds **2x PT100/NTC temperature sensor inputs (`T1+/T1-`, `T2+/T2-`)** matching the CCS2 gun (`GPEV20-BG102-S1P-EA`), **10/100Mbps RJ45 Ethernet**, **USB 2.0 Host/Device**, and `RUN` LED indicator.
3. **`QY-AC-SECC-Module-HLS` (18-pin Solderable Core Module, 50 x 10 x 30 mm, 5V):**
   - Designed for direct PCB integration onto AC or compact DC control boards (`UART2` for MCU business communication, `UART4` for debug logging, `USB` for flash drive OTA/log export, `PWM_EN` pin to switch CP/PP/PWM/E-state control between host MCU and SECC). Supports **ISO 15118-2 (EIM, PnC)** and **ISO 15118-20 (EIM, PnC, BPT/V2X)** across CCS1, CCS2, and NACS.

### 3.2 Dual Protocol Modes Between Charger Controller (EVSE) and SECC
The reference corpus reveals **two distinct integration architectures** used between Chinese charger control boards (like `GPEV-DC-M2C`) and the SECC module:

#### Mode A: GB/T 27930-to-CCS CAN Translation Mode (`桩端国标转CCS通信协议.xls`, `KM_SECC`, `全耀SECC流程图V1.0`)
- **Architectural Principle:** The charger main controller (`Customer's SECC / Charger Board`) continues to run a modified **GB/T 27930-2015/2023 CAN state machine** at `250 kbps`. The SECC acts as a transparent protocol gateway translating **CCS PLC (HomePlug GreenPHY / DIN 70121 / ISO 15118) + IEC 61851-1 CP/PP** on the vehicle side into **synthesized GB/T 27930 BMS CAN frames (`BHM`, `BRM`, `BCP`, `BRO`, `BCL`, `BCS`, `BSM`, `BST`, `BSD`, `BEM`)** on the charger controller side.
- **Crucial State-Machine Modifications Required on a GB/T Charger (`3f6dade59efbfc68b3fdb1bf82f0a923.png` & `e5107bc126b39f1813378914f83c2d01.png`):**
  1. **No physical Connector Lock / Aux Power (K3/K4) before Handshake:** CCS2 DC connectors do not use GB/T electronic gun locks or 12V/24V BMS auxiliary power relays (`K3/K4`) before `CHM`. In CCS, connector lock is handled by the vehicle (`EVCC`) before `BRO=0xAA` (`CableCheck`).
  2. **Modified Handshake (`BHM` <-> `CHM`) with `StartPlc` & `AAG`:**
     - Upon physical plug-in (`CP = 9V / State B1`), SECC immediately broadcasts `BHM` (`0x182756F4`, 250ms) with `CR_Plc_CpStatus = 1 (Plugged_in)` and `CR_Plc_Aagvalue = 0`.
     - Charger controller stays idle until user authorization (QR code / RFID / `RemoteStartTransaction` / VIN) triggers charging, then sends `CHM` (`0x1826F456`, 250ms) with `CF_Secc_StartPlc = 0`, and once `BHM` is seen, sets **`CF_Secc_StartPlc = 1`** and `CR_Secc_MaxPowerLimit` (e.g., `20 kW`).
     - Seeing `StartPlc = 1`, SECC turns on **6% (or 5%) 1kHz CP PWM**, runs HomePlug GreenPHY **SLAC**, and once SLAC succeeds, sets `CR_Plc_Aagvalue ≠ 0` (actual attenuation gain) and `CR_Plc_CommStart = 1` in `BHM`.
  3. **Insulation Test Moved to After `BRO=0xAA` (`CableCheck`):**
     - In GB/T, insulation test happens during `BHM`/`CHM` before `CRM`. In CCS (DIN 70121 / ISO 15118), `BHM` carries `0 V` max voltage because the vehicle hasn't sent its voltage limit yet!
     - Instead, the vehicle sends `Max Voltage` in `BCP` (`ChargeParameterDiscoveryReq`), waits for `CML`, then pulls CP to **State C (`6V`)** and sends `CableCheckReq`, which SECC translates to **`BRO = 0xAA`**.
     - Upon receiving `BRO = 0xAA`, the charger sends `CRO = 0x00` and performs the **30-second Insulation Test** (`K1/K2` closed -> test voltage output -> discharge circuit ON until `< 60V` -> `K1/K2` open), then sends **`CRO = 0xAA`** with `IsolationStatus = 1 (Valid)`.
  4. **Precharge & DC Relay Closure (`BCL` with `PreCharge_Status`):**
     - Vehicle sends `PreChargeReq` (`Target Voltage = EV battery voltage`, `Target Current < 2A` / `~0.1A`). SECC translates this to `BCL` (`0x181056F4`, 50ms) with Byte 8 **`CR_Plc_PreCharge_Stauts = 1`**.
     - Charger closes DC relays (`K1/K2`) and ramps output voltage (`CCS` `0x1812F456`, 50ms) until `|V_ev - V_evse| < 20V`.
     - Vehicle sends `PowerDeliveryReq(Start)` and `CurrentDemandReq`; SECC sets **`CR_Plc_PreCharge_Stauts = 0`** in `BCL` and begins sending `BCS` (`0x1C1156F4`, 250ms) and `BSM` (`0x181356F4`, 250ms).
  5. **Relaxed Timeouts (`5.7 超时`):**
     - `BHM` timeout: **Disabled / No timeout** (was 5s in GB/T) because plug-in to user authorization/SLAC can take arbitrary time.
     - `BRM` timeout (from first `CRM=0x00`): **10 seconds** (was 5s in GB/T).
     - `BCP` timeout (from `CRM=0xAA`): **60 seconds** (was 5s in GB/T — allows time for ISO 15118 TLS handshake, EIM/PnC authorization, and parameter discovery).
     - `BRO=0xAA` timeout (from `CML`): **60 seconds** (5s for first `BRO`, 60s for `BRO=0xAA`).
     - Insulation test (`CRO=0x00` -> `CRO=0xAA`): **Within 30 seconds**.
     - `BCL` timeout during charging: **1 second**.
     - `BCS` timeout during charging: **5 seconds**.

#### Mode B: Native EVSE-SECC Weak-Flow Protocol Mode (`SECC与充电桩控制板通信协议规范.pdf`)
- **Architectural Principle:** Used when the charger control board implements QuanYao's native CCS/ISO 15118 protocol over UART/Ethernet (or J1939 segmented CAN TP: Control IDs `0x1CECF456` / `0x1CEC56F4`, Data IDs `0x1CEBF456` / `0x1CEB56F4`, Big-Endian payload + CRC-16-MODBUS).
- **Cyclic Broadcast Frames ("Weak Flow" / State-Driven):**
  - `E_Dynamic` (`CMD 0x01`, EVSE -> SECC, every `200ms`): Start command (`0x00` Standby, `0x01` HLC Start, `0x02` HLC Wakeup, `0x03` AC BC Start), CP force control (`0` None, `1` Force E, `2` Force F — used for **4-second State E/F wakeup pulse** when user authorizes after EV has gone to sleep!), Authorization status (`0` Unauthorized, `1` EIM RFID/App/QR, `2` PnC), CableCheck status (`0x00` Not started, `0x01` In progress, `0x02` Finished/Ready for precharge), Isolation status (`0x00` Invalid, `0x01` Valid, `0x02` Warning, `0x03` Fault), Stop flag (`0x00` None, `0x01` Normal stop, `0x02` Fault stop), Stop reason (2-byte code), Payment mode (`0x00` EIM, `0x01` PnC).
  - `E_Power` (`CMD 0x02`, EVSE -> SECC, every `200ms`): Max/Min Voltage (0.1V), Max/Min Current (0.1A), Present Output Voltage (0.1V), Present Output Current (0.1A), Max Power (1 kW).
  - `E_Static` (`CMD 0x03`, EVSE -> SECC, every `500ms`): Charging mode (`00` AC_single .. `03` DC_extended `04` DC_combo), Contactor status (`0x00` Open, `0x01` Closed), RCD status.
  - `S_Dynamic` (`CMD 0x81`, SECC -> EVSE, every `200ms`, immediate on CP/PP fault): Wakeup flag, **EV MAC (6 bytes)**, **SLAC Attenuation `AAG` (1 byte)**, **CP State** (`0` Unknown, `1` A, `2` B, `3` C, `4` D, `5` E, `6` F, `7` Error), **PP State** (voltage in 0.1V), PWM duty cycle (0.1%), **SECC Charging Stage (`0x00` Standby, `0x01` SLAC, `0x02` Auth, `0x03` Params, `0x04` CableCheck, `0x05` Precharge, `0x06` Charging, `0x07` WeldingDetection, `0x08` Stop)**, Precharge completion flag (`0x01` Precharging, `0x02` Done), Welding detection flag (`0x01` Running, `0x02` Done), Stop flag (`0x00` Invalid, `0x01` Normal, `0x02` Abnormal, `0x03` PLC detection failed), Stop reason (2 bytes), EV selected auth mode (`0` None, `1` EIM, `2` PnC).
  - `S_Power` (`CMD 0x82`, SECC -> EVSE, every `200ms`): EV Target Voltage (0.1V), EV Target Current (0.1A), EV Max Voltage Limit (0.1V), EV Max Current Limit (0.1A), EV Min Current (0.1A).
  - `S_Static` (`CMD 0x83`, SECC -> EVSE, every `500ms`): AC estimated energy `Eamount` (3 bytes, 0.1 kWh), **Remaining Charging Time (2 bytes, minutes)**, **EV SoC (1 byte, 1% resolution)**.

### 3.3 How SECC + Control Board Map to OCPP 1.6J CSMS
Crucially, **the SECC module itself does NOT speak OCPP 1.6J directly to the CSMS**. Instead:
1. The **EVCC (Vehicle)** speaks **ISO 15118 / DIN 70121 + IEC 61851-1 CP/PP** to the **QuanYao SECC**.
2. The **QuanYao SECC** translates vehicle states, MAC address, target V/I, SoC, and fault codes over **CAN (`250kbps` GB/T-adapted or J1939 TP) / UART** to the **Charger Main Control Board (`GPEV-DC-M2C` TCU/CCU)**.
3. The **Charger Main Control Board (`GPEV-DC-M2C`)** runs the **OCPP 1.6J client** over Ethernet (`LAN0`/`LAN1`) and translates internal hardware/SECC events into OCPP 1.6J WebSocket JSON messages (`BootNotification`, `StatusNotification`, `Authorize`, `StartTransaction`, `MeterValues`, `StopTransaction`, `DataTransfer`).

---

## 4. Detailed Mapping to OCPP 1.6J Protocol Behaviors

### 4.1 Plug-In Detection (`Available` vs `Preparing`) & Wakeup Behavior
- **Hardware Mechanism:**
  - When unplugged, CP is at **`+12V` (`CP Status = 0 / State A1`)**. The charger reports OCPP `StatusNotification(status="Available", errorCode="NoError")`.
  - When the CCS2 gun is plugged into the vehicle inlet, the vehicle's resistor pulls CP to **`+9V` (`CP Status = 1 / State B1`)** and PP changes state.
  - In Mode A (`BHM` `0x182756F4` Byte 4.1–4.4), SECC immediately transmits `CR_Plc_CpStatus = 1` every `250ms` even before PLC/SLAC starts (`CR_Plc_Aagvalue = 0`, `CR_Plc_CommStart = 0`).
  - In Mode B (`S_Dynamic` `0x81`), SECC reports `CP State = 0x02 (State B)` and `Charging State = 0x00 (Standby)` or `0x01 (SLAC)`.
  - This physical `State A -> State B` transition triggers OCPP **`StatusNotification(status="Preparing", errorCode="NoError")`** on `connectorId = 1`.
- **Two Plug-In / Authorization Sequences (`6.1 鉴权与唤醒逻辑`):**
  1. **Auth First, Plug Second (`Auth -> Plug`):** User scans QR code / taps RFID / CSMS sends `RemoteStartTransaction` while gun is unplugged (`Available`). Once plugged in (`State B`), the controller immediately sends `HLC Start` (`CF_Secc_StartPlc = 1` or `E_Dynamic.StartCmd = 0x01`) to start 6% PWM and SLAC.
  2. **Plug First, Auth Second (`Plug -> Auth` — Sleep & 4-Second Wakeup Quirk!):** When a user plugs in first (`Preparing`) and takes >30–60s to scan the QR code or trigger `RemoteStartTransaction`, the vehicle EVCC often enters deep sleep! QuanYao's specification (`Section 6.1`) documents that upon late authorization, the EVSE controller **must force CP to State E/F (`E_Dynamic.CpForceCtrl = 0x02`) for 4 seconds**, then release CP back to normal (`0x00`) and issue `HLC Start` (`0x01`).
  - **Impact on OCPP 1.6J Server & Simulator:** After `RemoteStartTransaction` is accepted in `Preparing` state, there can be a **15 to 45 second delay** (4s CP wakeup + ~5–10s SLAC + ~5–15s V2G handshake/CableCheck/Precharge) before `StartTransaction.req` or `StatusNotification(status="Charging")` arrives. The CSMS and UI must **never timeout a `RemoteStartTransaction` within 10–15 seconds**; allow at least **60–90 seconds** for DC handshake + insulation test + precharge.

### 4.2 Authorization (`idTag`) Modes: QR Code, RFID (EIM), VIN (AutoCharge), and ISO 15118 PnC
The hardware documents define **four `idTag` / authorization flows**:
1. **QR Code / App Remote Start (EIM):**
   - The `GPEV20-BG102-S1P-EA` front display shows a station QR code. The user scans the QR code on their phone, and the CSMS sends **`RemoteStartTransaction.req(connectorId=1, idTag=...)`** to the charger.
2. **Local RFID / POS Card (EIM):**
   - Charger reads card or POS terminal (`RS232`) and sends `Authorize.req(idTag)` -> `StartTransaction.req(idTag)`.
3. **VIN / EVCC MAC AutoCharge (`VIN碼啟動` / `BRM` / `S_Dynamic`):**
   - The Techone spec explicitly highlights **"手机扫码或VIN码启动充电方式" (QR code or VIN code start)**.
   - However, notice a critical detail in `桩端国标转CCS通信协议.xls` (Row 37–47) and `KM_SECC` (Section 4.3.4): in DIN 70121 / ISO 15118 DC, the vehicle sends its **6-byte `EVCC MAC Address`** during SLAC / `SessionSetupReq`, which SECC places in **`BRM` (`0x1C0256F4` Bytes 3–8)** (or `S_Dynamic` `0x81` `EV MAC` 6 bytes).
   - Many Chinese CCS chargers refer to **EVCC MAC AutoCharge** colloquiality as "VIN start" (or map the 6-byte EVCC MAC to a 12-hex-char `idTag` such as `VID:1F2C3A4B5E6F` or raw `1F2C3A4B5E6F` in `Authorize.req` / `StartTransaction.req`).
4. **ISO 15118 Plug & Charge (PnC - `eMAID`):**
   - In Mode B (`SECC与充电桩控制板通信协议规范.pdf` Section 7 & `ISO15118-PnC.docx`), when the EV selects PnC (`S_Dynamic` `EV选择鉴权方式 = 2 (PNC)`), SECC pauses cyclic frames (`CMD 0x9F`) and forwards the vehicle's **`eMAID` (15-byte ASCII string, e.g., `DE-8AA-CA123456-7`) + Contract Certificate Chain** in `Contract Auth Req` (`CMD 0x99`, `ContractCert_Verify_t`, ~2423 bytes) to the EVSE controller.
   - The EVSE controller verifies OCSP/whitelist (locally or via OCPP `Authorize.req(idTag=eMAID)` / `DataTransfer`) and replies with `Contract Auth Res` (`CMD 0x19`, `0=OK`, `1=Signature Error`, `2=Certificate Expired`, `3=Certificate Revoked`, `4=No Certificate Available`, `5=Certificate Chain Error`, `6=Contract Cancelled`).
- **Impact on OCPP 1.6J Server & Database:**
  - The OCPP 1.6J `idTag` validator (max 20 chars in OCPP 1.6J) must support:
    - Standard RFID/QR tokens (e.g., `TEST-TAG-001`)
    - 12-hex-char / prefixed EVCC MAC AutoCharge tags (`1F2C...` or `VID:...`)
    - 14–15 char ISO 15118 `eMAID` identifiers (e.g. `DE8AACA1234567` or `DE-8AA-C123456-7`)
    - 17-char vehicle VIN strings (if passed via `idTag` or `DataTransfer`).

### 4.3 Charger States & OCPP `StatusNotification` Mapping
Combining the internal SECC charging states (`S_Dynamic` `0x00`–`0x08` and GB/T-CCS CAN stages) with OCPP 1.6J `ChargePointStatus`:

| Physical / SECC Stage | Mode A (CAN Frame) | Mode B (`S_Dynamic` `充电状态`) | OCPP 1.6J `ChargePointStatus` | Key Transitions & Quirks |
|---|---|---|---|---|
| **Unplugged / Idle** | `BHM`: `CpStatus=0` (`12V`) | `0x00: 待机`, `CP=1 (A)` | **`Available`** | Gun at rest in holster (`12V`). |
| **Plugged In** | `BHM`: `CpStatus=1` (`9V`), `AAG=0` | `0x00: 待机`, `CP=2 (B)` | **`Preparing`** | Triggered immediately on `CP 12V -> 9V` (`State B1`). |
| **SLAC & V2G Handshake** | `CHM` (`StartPlc=1`) -> `BHM` (`AAG≠0`, `CpStatus=2`) -> `CRM`/`BRM` | `0x01: SLAC` -> `0x02: 授权` | **`Preparing`** | `6% PWM` turned on; HomePlug GreenPHY SLAC + SDP + V2G SessionSetup + Auth. Up to 60s allowed before `BCP`. |
| **Parameter Discovery** | `BCP` <-> `CTS` + `CML` (`200-1000V`, `0-66.7A/250A`) | `0x03: 参数配置` | **`Preparing`** | Vehicle sends `EVMaxVoltage` & `EVMaxCurrent`; charger sends `CML` limits. |
| **CableCheck (Insulation Test)** | `BRO=0xAA` -> `CRO=0x00` (30s IMD test) -> `CRO=0xAA` | `0x04: 自检阶段` (`CP=3 / State C`) | **`Preparing`** (or **`Charging`** on some firmwares) | Vehicle shifts CP to `6V (State C)` and locks connector. Charger briefly closes `K1/K2` to test insulation, discharges to `<60V`, opens `K1/K2`, then sets `CRO=0xAA`. |
| **Precharge (Voltage Matching)** | `BCL` (`PreCharge_Status=1`, `I_target < 2A`) + `CCS` | `0x05: 预充阶段` (`EV预充完成=0x01`) | **`Preparing`** or **`Charging`** | Charger closes `K1/K2` DC contactors and matches EV battery voltage (`|V_ev - V_evse| < 20V`) with `<2A` current. **Many Chinese DC chargers send `StartTransaction.req` as soon as `K1/K2` closes at Precharge or at `PowerDeliveryReq(Start)`!** |
| **Power Delivery / Current Demand** | `BCL` (`PreCharge_Status=0`) + `BCS` + `CCS` + `BSM` | `0x06: 充电中` (`EV预充完成=0x02`) | **`Charging`** | Active DC energy transfer (`50ms` `BCL`/`CCS` loop, `250ms` `BCS`/`BSM` loop). |
| **EV / EVSE Pause** | `BSM` (`CF_Plc_EvReady=0`) or `CCS` (`EvseSuspended=0`) or `0xE1` | `0x08` / `GQ_ISO_PAUSE_BY_EV` | **`SuspendedEV`** / **`SuspendedEVSE`** | ISO 15118 pause or BSM charge forbidden. |
| **Stop & Welding Detection** | `BST` <-> `CST` (10ms) -> `K1/K2` open -> `BSD` (`WeldDetectionReq=1`) <-> `CSD` | `0x07: 粘连检测` -> `0x08: 停止` | **`Finishing`** | Charger ramps current to 0, opens `K1/K2`, sends `StopTransaction.req`, and continues sending live gun voltage in `CSD` until EV completes welding detection (`WeldDetectionReq=0`), then waits for unplug (`CP -> 12V` -> `Available`). |
| **Fault / Emergency Stop** | `BEM` / `CEM` / `CST` / `BST` error codes | `停止标志=0x02/0x03` + `停止原因` | **`Faulted`** | Triggered by E-stop button, IMD insulation fault, door open, over/undervoltage, over-temperature, or SLAC/V2G/CAN timeout. |

### 4.4 Meter Values (`MeterValues.req`): Available vs. Unavailable (`0x00`) Signals in CCS!
One of the most important findings in **`桩端国标转CCS通信协议.xls`** and **`KM_SECC`** is which telemetry fields are actually populated during CCS/ISO 15118 charging versus which GB/T fields are **unsupported by CCS and hardcoded to `0`** by the SECC:

| Telemetry / Measurand | OCPP 1.6J Measurand | Hardware Source (Charger vs. SECC) | Resolution & Range | Critical Quirks Found in Reference Files |
|---|---|---|---|---|
| **Energy (`Wh` / `kWh`)** | `Energy.Active.Import.Register` | **Charger Billing Unit / DC Meter** (NOT from SECC in DC mode!) | `Wh` or `0.01–0.1 kWh` | In DC mode, ISO 15118/DIN 70121 does not report energy from EV to SECC (`BCP.EvNormalEnergy = 0`). The charger's internal DC energy meter (`計費單元`) measures `Wh`/`kWh`. (In AC HLC mode `S_Static`, SECC estimates `Eamount` in `0.1 kWh`). |
| **Voltage (`V`)** | `Voltage` (Outlet) & EV Target | **Charger Output (`CCS` / `E_Power`)** & **SECC Target (`BCL` / `S_Power`)** | `0.1 V` (`200.0 – 1000.0 V`) | **Quirk:** In `BCP` (`EVCurrentVolt`) and `BCS` (`SensingVolt`), **SECC hardcodes `0.0 V` (`不支持 / 默认0x00`)** because CCS vehicles do not send measured battery voltage in `CurrentDemandReq`! Therefore, the charger always reports **its own DC output voltage (`CCS.CR_Secc_EvseOutVolt`)** or the vehicle's **Target Voltage (`BCL.CR_Plc_EvTargetVolt`)**. During Precharge, voltage jumps from `0V` to `300–800V` while current is `~0A`. |
| **Current (`A`)** | `Current.Import` & `Current.Offered` | **Charger Output (`CCS` / `E_Power`)** & **SECC Target (`BCL` / `S_Power`)** | `0.1 A` (`0 – 66.7 A` single, `0 – 250.0 A` group) | **Quirk 1:** `BCS.SensingCurrent` from SECC is **hardcoded to `0.0 A` (`不支持 / 默认0x00`)** in CCS! Charger always reports its own DC output current (`CCS.CR_Secc_EvseOutCurrent`).<br>**Quirk 2 (`>400A` Bit-Packing in CAN):** In `BCP`, `CML`, `BCL`, and `CCS`, current uses a 15-bit value (`0.1A/bit`, `-400A` offset) plus **Bit 4.8 (or 6.8) `>400A` flag**: if bit=`0`, $I = 400.0 - \text{raw}\times 0.1$; if bit=`1`, $I = 400.0 + \text{raw}\times 0.1$. |
| **Power (`W` / `kW`)** | `Power.Active.Import` & `Power.Offered` | **Charger Computed ($V \times I$)** & **`CHM`/`CCS.MaxPowerLimit`** | `1 W` / `0.1 kW` (limit in `1000 W` steps, `20 kW` single / `80 kW` quad) | `CHM` and `CCS` carry `CR_Secc_MaxPowerLimit` in **`1000 W/bit` (`1 kW` resolution)**. Furthermore, `CCS` Bytes 7.6–8.8 carry dynamic `CR_Secc_EvseMaxCurr_IsUse` + 10-bit `CR_Secc_EvseMaxCurr_A` (`1 A/bit`, `0–1000A`) enabling dynamic current reallocation when group-charging units join/leave or when OCPP `SetChargingProfile` is applied! |
| **State of Charge (`SoC`, `%`)** | `SoC` | **SECC `BCS` (`0x1C1156F4` Byte 7) / `S_Static` (`0x83`)** | **`1 %` integer** (`0 – 100 %`) | **Quirk:** In `BCP` (handshake parameter stage), `CR_Plc_EvRessSOC` (0.1% resolution) is **marked `不支持 / 默认0x00` (unsupported in CCS)**! Thus, **initial SoC at handshake (`BCP`) is `0%`** until the charger enters the active `CurrentDemand` stage (`BCS`), where `CR_Plc_EvRessSOC` (Byte 7, `1%/bit`) becomes valid! Also in `BSD` (stop statistics), `SuspendSoc` is marked `不支持` in `桩端国标转CCS通信协议.xls` (though supported in `KM_SECC`). **Our OCPP server/UI must ignore `SoC = 0%` during `Preparing`/Precharge or retain the last valid `BCS` SoC at stop!** |
| **Temperature (`°C`)** | `Temperature` | **Charger Gun Sensors (`T1+/T1-`, `T2+/T2-`) / `BPT` (`0x183056F4`)** | `1 °C` signed (`-50 to +200 °C`) | **Quirk:** All battery cell temperatures and cell voltages in `BCP`, `BCS`, `BSM`, and `BSD` are **unsupported in CCS and hardcoded to `0x00` (`-50°C` raw offset if decoded naively!)**. Only **gun connector temperatures (`Temp1`, `Temp2` via PT100/NTC)** and charger cabinet temperature are real. **Never display unvalidated BMS cell temperatures from a GB/T-to-CCS charger, or `-50°C` will appear!** |
| **Remaining Charging Time (`min`)** | Custom / UI display | **SECC `BCS` (Bytes 8–9) / `S_Static`** | `1 min` (`0 – 600 min`) | Valid during charging (`CR_Plc_FullSOCRemainedTime`). |

### 4.5 Transaction Start & Stop Behaviors (`StartTransaction` & `StopTransaction`)
- **Transaction Start Sequence:**
  1. Plug-in (`CP=9V`) -> `StatusNotification(Preparing)`.
  2. Authorization (`RemoteStartTransaction` / QR / RFID / AutoCharge MAC / PnC) -> Charger sets `StartPlc=1`.
  3. SLAC (`AAG≠0`) -> V2G Handshake (`CRM`/`BRM`) -> Parameter Discovery (`BCP`/`CML`) -> CableCheck (`BRO=0xAA` -> 30s IMD test -> `CRO=0xAA`) -> Precharge (`BCL PreCharge=1`, `K1/K2` closed, voltage ramp).
  4. `PowerDeliveryReq(Start)` (`BCL PreCharge=0`, `BCS` active) -> Charger sends **`StartTransaction.req(connectorId=1, idTag, meterStart, timestamp)`** and **`StatusNotification(Charging)`** (followed by periodic `MeterValues.req` including `Voltage`, `Current.Import`, `Power.Active.Import`, `Energy.Active.Import.Register`, `SoC`).
- **Transaction Stop Triplet Encoding (`桩端国标转CCS通信协议.xls` Rows 153–205):**
  In Mode A (`BST` `0x101956F4`, 10ms cycle), because CCS does not have GB/T's granular BMS cell-level stop flags, QuanYao encodes the **Stop Cause** using a 3-bit combination `(CF_Plc_ChargerSuspend [Byte 1.7-1.8] : CF_Plc_FullChgComplete [Byte 4.7] : CF_Plc_ChgFinished_ [Byte 4.8])`:
  - **`0 : 1 : 1` -> Vehicle Full Charge Complete (`车辆充电已完成`):** Vehicle requested normal stop at target SoC (`EVDisconnected` or `Local` / `Other` in OCPP 1.6J).
  - **`0 : 0 : 1` -> Vehicle-Initiated Stop (`车辆原因结束充电`):** User stopped charging from inside the vehicle / unlocked gun (`EVDisconnected` / `Local`) or EV reported an `EVErrorCode`.
  - **`1 : 0 : 1` -> Charger-Initiated Stop (`桩原因结束充电`):** Charger or CSMS (`RemoteStopTransaction`, emergency stop, or charger fault) initiated stop (`Remote`, `EmergencyStop`, `Other`).
- **Welding Detection Post-Stop Tail (`BSD` / `CSD`):**
  - After `BST`/`CST` exchange and DC contactor (`K1/K2`) opening, if `BSD` Byte 8.1 `CF_Plc_WeldDetectionReq == 1` (or `S_Dynamic` `焊接检测标志 == 0x01`), the EV is performing contactor welding detection (`WeldingDetectionReq`).
  - The charger must keep sending its real-time gun output voltage (`CR_Secc_EvseOutVolt`, dropping to `< 20V`) in `CSD` (`0x181DF456` / `E_Power`) until `CF_Plc_WeldDetectionReq == 0` (`0x02`).
  - Only after welding detection finishes does the session completely terminate (`Finishing` -> unplug -> `Available`).

---

## 5. Fault Codes & Error Mapping Matrix

### 5.1 Charger Hardware Faults (`GPEV20-BG102-S1P-EA` & `CST` / `CEM`)
| Hardware / CST Fault Condition | Trigger Threshold / Signal | OCPP 1.6J `ChargePointErrorCode` | `vendorErrorCode` / Detail |
|---|---|---|---|
| **AC Input Overvoltage** | `455 – 475 Vac` (recovers at `445–465 Vac`) | `OverVoltage` | Rectifier AC input overvoltage |
| **AC Input Undervoltage** | `305 – 315 Vac` (recovers at `315–325 Vac`) | `UnderVoltage` | Rectifier AC input undervoltage |
| **DC Output Overvoltage Lockout** | `1020 – 1080 Vdc` (latched lock) | `OverVoltage` | DC output overvoltage lockout |
| **Ambient / Module Over-Temperature** | `> 55°C` (derates `50–55°C`, auto-recovers `< 50°C`) / `CST.OverTemp` | `HighTemperature` | Cabinet or rectifier module over-temp |
| **Gun Connector Over-Temperature** | `T1` / `T2` PT100/NTC sensor / `BST.ConnectorHighTemp` | `HighTemperature` | Charging gun terminal over-temp |
| **Emergency Stop Button Pressed** | Physical E-Stop (`#5` / `SBE`) / `CST.SuddenStop = 01` | `OtherError` (stop reason: `EmergencyStop`) | Emergency stop circuit triggered |
| **Insulation Fault (IMD)** | `GPEV-IMD` / `CRO.IsolationStatus = 3` (Fault) or `2` (Warning) | `GroundFailure` | DC bus insulation resistance fault |
| **Connector / Electronic Lock Fault** | `CST.ConnectorFault = 01` / `EVErrorCode = 3` | `ConnectorLockFailure` | CCS gun electronic lock failure |
| **Surge Arrester (SPD) / Contactor Fault** | `GPEV-DC-M2C` status detection / `CurrentMismatch` | `PowerSwitchFailure` / `InternalError` | Contactor weld/open fault or SPD trip |
| **CAN Timeout (Charger -> SECC `CEM`)** | `BRM` (10s), `BCP` (60s), `BRO` (60s), `BCL` (1s), `BCS` (5s), `BST`, `BSD` | `EVCommunicationError` | `CEM` (`0x081FF456`) timeout flags |

### 5.2 QuanYao SECC Internal & Vehicle Fault Codes (`BEM` `0x081E56F4` & `BST` `0x101956F4` Bytes 5–8)
In `桩端国标转CCS通信协议.xls` (`附录、错误代码`), QuanYao embeds rich diagnostic telemetry into **Bytes 5–8 of both `BST` and `BEM`**:
- **Byte 5 (`Message_Sequence`, `0x01`–`0x30`):** Exact V2G state where failure occurred:
  - `0x01` Init, `0x02` Run V2G, `0x03` SLAC, `0x04/0x05` SDP Req/Res, `0x06/0x07` AppHandshake Req/Res, `0x08/0x09` SessionSetup Req/Res, `0x0A/0x0B` ServiceDiscovery, `0x0C/0x0D` PaymentSelection, `0x0E/0x0F` ContractAuth, `0x10/0x11` ChargeParameterDiscovery, `0x12/0x13` CableCheck, `0x14/0x15` PreCharge, `0x16/0x17` PowerDelivery(Start), `0x18/0x19` CurrentDemand, `0x1A/0x1B` PowerDelivery(Stop), `0x1C/0x1D` WeldingDetection, `0x1E/0x1F` SessionStop, `0x30` Restart.
- **Byte 6 (`CR_Plc_ErrorCodeII`) & Byte 7 (`CR_Plc_ErrorCode`):**
  - `0x01`: `GQ_SIG_ERROR_CP_PP` (CP/PP signal error)
  - `0x09`–`0x10`: Unknown state errors (`INIT`, `WAIT`, `SLAC`, `SDP`, `V2G_ACCEPT`, `V2G_HANDSHAKE`, `V2G_ERROR`)
  - `0x10`–`0x14`: PLC Initialization errors (`GENERAL`, `IFADDR`, `THREAD`, `OPENCHANNEL`, `KEY`)
  - `0x20`–`0x33`: **SLAC errors** (`TIMER_TIMEOUT 0x22`, `PARAM_TIMEOUT 0x24`, `START_ATTEN_CHAR_TIMEOUT 0x26`, `MNBC_SOUND_TIMEOUT 0x27`, `ATTEN_CHAR_TIMEOUT 0x28`, `VALIDATE_TIMEOUT 0x2A/0x2C`, `BCB_TOGGLE_TIMEOUT 0x2E`, `MATCH_TIMEOUT 0x2F`, `SET_KEY 0x32`, `LINK_DETECT 0x33`) -> Map to OCPP `EVCommunicationError`.
  - `0x40`–`0x47`: **SDP (SECC Discovery Protocol) errors** (`INIT_SOCKET 0x41`, `INIT_BIND 0x44`, `TIMEOUT 0x47`) -> Map to OCPP `EVCommunicationError`.
  - `0x50`–`0x60`: **DIN 70121 / ISO 15118 V2G Stack errors** (`TIMEOUT 0x57`, `V2GTP_HEADER 0x58`, `DECODE_EXI 0x5A`, `CREATE_RESPONSE 0x5B`, `ENCODE_EXI 0x5C`, `SOCKET_SEND 0x5F`, `NO_PROTOCOL 0x60` [vehicle protocol incompatible!]) -> Map to OCPP `EVCommunicationError`.
  - `0x70`: `GQ_DIN_SHUTDOWN_BY_EVSE` (or `GQ_CHM_TIMEOUT` in `ErrorCodeII`).
  - `0x80`–`0x8A`: V2G Session errors (`FAILED_RESPONSE 0x80`, `SEQUENCE_ERROR 0x81`, `SIGNATURE_ERROR 0x82`, `UNKNOWN_SESSION 0x83`, `SUDDEN_STOP_BY_SECC 0x84`, `STOP_BY_SECC 0x85`, `RECEIVED_CST 0x86`, `STOP_BY_EV 0x87`, `RECEIVED_CEM 0x88`, `NO_REQUEST_FROM_EV 0x89`, `EV_DO_NOT_STOP 0x8A`).
  - `0x90`–`0xA8`: **CP/PP Hardware State Errors** (`V2G_COMM_PORT_MAY_LOST 0x90`, `CP_STATE_B_2SECONDS 0x91`, `CP_STATE_C_2SECONDS 0x92`, `DETECT_CP_ZERO 0xA1`, `DETECT_PP_UNPLUG 0xA2`, `DETECT_CP_STATE_A 0xA3`, `DETECT_CP_STATE_B 0xA4`, `DETECT_CP_STATE_C 0xA5`, `DETECT_CP_STATE_EF 0xA6`, `DETECT_CP_STATE_D 0xA7`, `DETECT_PP_S3_PRESSED 0xA8`).
  - `0xB0`–`0xB6`: **Charger-side CAN Timeout Errors detected by SECC** (`CAN_LOSS 0xB0`, `CRMAA_TIMEOUT 0xB1`, `CRM00_TIMEOUT 0xB2`, `CTSCML_TIMEOUT 0xB3`, `CROAA_TIMEOUT 0xB4`, `CST_TIMEOUT 0xB5`, `CCS_TIMEOUT 0xB6`) -> Map to OCPP `InternalError`.
  - `0xE0`–`0xE5`: Stop codes (`STOP_BY_EV 0xE0`, `ISO_PAUSE_BY_EV 0xE1`, `EMERGENCY_STOP_BY_SECC 0xE4`, `STOP_BY_CHARGER 0xE5`).
- **Byte 8.1–8.3 (`ErrorCode by CP or PP state`, `0x1`–`0x5`):**
  - `0x1`: `ERR_CP_STATE_ZERO` (CP short/0V)
  - `0x2`: `ERR_PP_UNPLUG` (PP unplugged)
  - `0x3`: `ERR_CP_STATE_A` (12V unplugged during session)
  - `0x4`: `ERR_CP_STATE_B` (9V unexpectedly dropped from State C during charging)
  - `0x5`: `ERR_CP_STATE_C` (6V)
- **Byte 8.4–8.7 (`CR_Plc_EvErrCode`, `0x00`–`0x15` — Standard CCS `DC_EVErrorCodeType`):**
  - `0x00`: `NO_ERROR`
  - `0x01`: `FAILED_RESSTemperatureInhibit` (EV battery temperature inhibit)
  - `0x02`: `FAILED_EVShiftPosition` (Vehicle not in Park)
  - `0x03`: `FAILED_ChargerConnectorLockFault` (Vehicle connector lock fault)
  - `0x04`: `FAILED_EVRESSMalfunction` (EV battery/BMS malfunction)
  - `0x05`: `FAILED_ChargingCurrentdifferential` (Charging current mismatch)
  - `0x06`: `FAILED_ChargingVoltageOutOfRange` (Charging voltage out of range)
  - `0x0A` (`10` / `0x10` in xls): `FAILED_ChargingSystemIncompatibility` (Vehicle-charger system incompatible)
  - `0x0B` (`11` / `0x11` in xls): `NoData`
  - `0x12`–`0x15` (Extended in xls): `EVRESSMalfunction_by_SECC (0x12)`, `ChargingVoltageOutOfRange_by_SECC (0x13)`, `NormalStopRequestBeforeCharging_by_EVCC (0x14)`, `EV_Timeout_CAN_Data (0x15)`.

---

## 6. Architectural Impact on Phase 1A OCPP 1.6J Server, Database, Simulator & UI

### 6.1 OCPP 1.6J Server Requirements
1. **Generous Handshake & `RemoteStartTransaction` Timeouts (>= 60–90s):**
   - Between `RemoteStartTransaction.conf(Accepted)` and `StartTransaction.req`, a real `GPEV20-BG102-S1P-EA` + QuanYao SECC charger may perform a **4-second CP State E/F wakeup pulse**, up to **10s SLAC/BRM**, up to **60s BCP/Auth/ParameterDiscovery**, **30s IMD Insulation Test (`CableCheck`)**, and **7s Precharge**. The server must not expire pending remote-start sessions prematurely.
2. **Flexible `idTag` Validation & Normalization:**
   - Must accept QR/App session tokens, standard RFID UIDs, 12-hex-char EVCC MAC AutoCharge IDs (colloquially called "VIN start" on GB/T-to-CCS chargers), 17-char VINs, and 14–15 char ISO 15118 `eMAID` contract IDs.
3. **Resilient `MeterValues` Parser for Missing/Zeroed CCS Fields:**
   - Because GB/T-to-CCS SECC modules hardcode unsupported BMS fields (`BCP.SoC = 0`, `BCS.SensingVolt = 0`, `BCS.SensingCurrent = 0`, `BSM.Temperatures = 0` / `-50°C` offset, `BSD.SuspendSoc = 0`), the OCPP server must:
     - Rely on **charger-side DC output voltage/current/power/energy** (`Energy.Active.Import.Register`, `Voltage`, `Current.Import`, `Power.Active.Import`).
     - Treat `SoC = 0%` during `Preparing` / Precharge (or in the final stop packet if `BSD.SuspendSoc` is unpopulated) as "unreported" rather than overwriting a valid `SoC` (e.g., `80%`) with `0%` at transaction end!
     - Filter out bogus `-50°C` temperature readings if a charger forwards unpopulated `BSM`/`BSD` temperature bytes.
4. **Support `vendorErrorCode` & `info` in `StatusNotification.req`:**
   - Store and surface `errorCode`, `vendorId`, `vendorErrorCode`, and `info` so that QuanYao SECC hex codes (e.g., `Seq=0x12 CableCheck`, `Err=0x2F SLAC_MATCH_TIMEOUT`, `EVErr=0x03 ConnectorLockFault`) can be decoded in the UI.
5. **Dynamic Power/Current Limit Readiness (Smart Charging):**
   - Both the `GPEV20-BG102-S1P-EA` hardware (20kW single / 40kW / 60kW / 80kW parallel group charging) and the QuanYao SECC protocol (`CCS` frame dynamic `CR_Secc_EvseMaxCurr_A` & `CR_Secc_MaxPowerLimit`, `E_Power` frame) natively support real-time current/power limit updates during charging (`50ms`–`200ms` cycle).

### 6.2 Database Schema Recommendations
1. **Charger Profile / Capabilities Columns (`chargers` or `connectors` table):**
   - Store `vendor` (e.g., `Techone`), `model` (e.g., `GPEV20-BG102-S1P-EA`), `connector_type` (`CCS2`), `rated_power_kw` (`20.0`, expandable to `80.0` in group mode), `voltage_min_v` (`200.0`), `voltage_max_v` (`1000.0`), `current_max_a` (`66.7` single / `250.0` group).
2. **Rich Telemetry Columns on `transactions` & `meter_values`:**
   - Track `voltage_v`, `current_a`, `power_kw`, `energy_wh`, `soc_percent` (nullable integer `0–100`), `temperature_c` (nullable float), and `remaining_time_min` (nullable integer).
   - Keep `last_valid_soc_percent` on `transactions` so a trailing `0%` from `BSD` does not wipe out the final SoC.
3. **Diagnostic & Stop Reason Tracking (`transactions` & `status_logs`):**
   - Store `stop_reason` (OCPP standard: `EVDisconnected`, `Local`, `Remote`, `EmergencyStop`, `Other`, etc.), plus `vendor_error_code` and `error_info` for SECC/V2G stage diagnostics.

### 6.3 Simulator & UI Design Impact
1. **Realistic Hardware Preset in Simulator (`Techone GPEV20-BG102-S1P-EA + QuanYao SECC`):**
   - Pre-configure the built-in OCPP 1.6J simulator with the exact `GPEV20-BG102-S1P-EA` electrical envelope:
     - **Single Mode (20 kW):** `200–1000 Vdc`, `0–66.7 A` (e.g. at `400 V`, max current is `50.0 A`; at `800 V`, max current is `25.0 A`).
     - **Group Mode (up to 80 kW / 4x20 kW):** `200–1000 Vdc`, `0–250.0 A`.
   - Simulate realistic **CCS2 + SECC Stage Progression**:
     - `Available` (CP 12V) -> Plug-in -> `Preparing` (CP 9V -> SLAC -> V2G Auth -> Parameter Discovery -> 30s/fast-forwarded CableCheck Insulation Test -> Precharge voltage ramp to ~400V at <2A) -> `StartTransaction` + `Charging` (Current ramps to target up to 20kW/80kW limit, SoC increments 1% steps) -> Stop + Welding Detection (`Finishing`) -> Unplug -> `Available`.
2. **UI Dashboard & QR Code Test Flow:**
   - Provide a **Station QR Code / One-Click Remote Start** panel on the UI matching the `GPEV20-BG102-S1P-EA` front display workflow (`手機掃碼` / `VIN碼啟動`).
   - Display live **Voltage (`V`), Current (`A`), Power (`kW`), Energy (`kWh`/`Wh`), and SoC (`%`)** gauges scaled for `200–1000 Vdc` and `20 kW / 80 kW`.
   - Include a **SECC / Hardware Fault Injection & Decoder** in the simulator/UI capable of testing key field failures from the manual (e.g., `SLAC Timeout 0x2F`, `Insulation Fault / GroundFailure`, `Emergency Stop`, `AC OverVoltage 475V`, `Connector Lock Fault 0x03`).
