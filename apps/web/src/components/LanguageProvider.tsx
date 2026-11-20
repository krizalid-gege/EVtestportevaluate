"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type LangCode = "en" | "ms" | "zh";

export const LANG_STORAGE_KEY = "ev_cpo_lang";

export interface PwaTranslations {
  // Navigation & Global
  brandTitle: string;
  brandSubtitle: string;
  navHome: string;
  navOrders: string;
  navLogin: string;
  navLogout: string;
  navAdminConsole: string;
  activeSessionTitle: string;
  activeSessionJumpBtn: string;
  roleVerifiedDriver: string;
  roleUnverifiedDriver: string;
  roleAdmin: string;
  roleCustomerService: string;
  roleSiteStaff: string;
  simulatedPaymentNotice: string;
  simulatedPaymentSub: string;
  timezoneLabel: string;

  // Landing Page (/)
  heroBadge: string;
  heroTitle: string;
  heroDesc: string;
  quickScanTitle: string;
  quickScanSubtitle: string;
  scanToChargeBtn: string;
  testOfflineBtn: string;
  charger1Title: string;
  charger1Desc: string;
  charger2Title: string;
  charger2Desc: string;
  charger3Title: string;
  charger3Desc: string;
  hardwareSpecLabel: string;
  seccModuleLabel: string;
  qrTokenLabel: string;
  adminPortalCardTitle: string;
  adminPortalCardDesc: string;
  openAdminBtn: string;
  accountCardTitle: string;
  accountCardDesc: string;
  openLoginBtn: string;

  // Login / Register / Verify / Reset (/login)
  authPageTitle: string;
  authPageSubtitle: string;
  returnToNotice: string;
  tabLogin: string;
  tabRegister: string;
  tabVerifyEmail: string;
  tabResetPassword: string;
  emailLabel: string;
  passwordLabel: string;
  displayNameLabel: string;
  phoneOptionalLabel: string;
  verificationCodeLabel: string;
  verificationCodeHint: string;
  resetTokenLabel: string;
  newPasswordLabel: string;
  loginSubmitBtn: string;
  registerSubmitBtn: string;
  verifySubmitBtn: string;
  resendCodeBtn: string;
  requestResetBtn: string;
  confirmResetBtn: string;
  quickAccountSwitcherTitle: string;
  quickAccountSwitcherDesc: string;
  quickSwitchBtn: string;
  accDriverLabel: string;
  accDriverDesc: string;
  accUnverifiedLabel: string;
  accUnverifiedDesc: string;
  accAdminLabel: string;
  accAdminDesc: string;
  accCsLabel: string;
  accCsDesc: string;
  accStaffLabel: string;
  accStaffDesc: string;
  authSuccessRedirect: string;
  verifySuccessMsg: string;
  resetCodeSentMsg: string;
  resetSuccessMsg: string;

  // QR Charging Page (/c/[qrToken])
  loadingCharger: string;
  chargerNotFound: string;
  siteAddressLabel: string;
  chargerIdLabel: string;
  connectorLabel: string;
  powerOutputLabel: string;
  voltageRangeLabel: string;
  gunTempLabel: string;
  plugStatusLabel: string;
  pluggedInYes: string;
  pluggedInNo: string;
  seccDiagLabel: string;
  tariffCardTitle: string;
  energyRateLabel: string;
  serviceFeeLabel: string;
  totalRateLabel: string;
  taxInclusiveNote: string;
  loginRequiredTitle: string;
  loginRequiredDesc: string;
  loginToContinueBtn: string;
  unverifiedBlockTitle: string;
  unverifiedBlockDesc: string;
  inlineVerifyPlaceholder: string;
  inlineVerifyBtn: string;
  offlineBlockTitle: string;
  offlineBlockDesc: string;
  faultedBlockTitle: string;
  faultedBlockDesc: string;
  busyBlockTitle: string;
  busyBlockDesc: string;
  startChargingBtn: string;
  startingChargingBtn: string;
  stopChargingBtn: string;
  stoppingChargingBtn: string;
  handshakeTitle: string;
  handshakeSubtitle: string;
  handshakeStep1Title: string;
  handshakeStep1Desc: string;
  handshakeStep2Title: string;
  handshakeStep2Desc: string;
  handshakeStep3Title: string;
  handshakeStep3Desc: string;
  handshakeStep4Title: string;
  handshakeStep4Desc: string;
  liveTelemetryTitle: string;
  chargedEnergyLabel: string;
  livePowerLabel: string;
  outputVoltageLabel: string;
  outputCurrentLabel: string;
  vehicleSocLabel: string;
  socFilteredNote: string;
  liveBillingTitle: string;
  energyCostLabel: string;
  serviceCostLabel: string;
  includedTaxLabel: string;
  totalAmountLabel: string;
  orderCompletedTitle: string;
  orderCompletedDesc: string;
  viewFullReceiptBtn: string;
  startAnotherSessionBtn: string;

  // Orders & Receipt (/orders & /orders/[orderId])
  myOrdersTitle: string;
  myOrdersSubtitle: string;
  noOrdersYet: string;
  goScanChargerBtn: string;
  orderNoLabel: string;
  orderStatusLabel: string;
  ocppTxIdLabel: string;
  ocppIdTagLabel: string;
  meterRangeLabel: string;
  finalSocLabel: string;
  createdAtLabel: string;
  settledAtLabel: string;
  viewReceiptBtn: string;
  receiptPageTitle: string;
  receiptPageSubtitle: string;
  backToOrdersBtn: string;
  backToChargerBtn: string;
  immutableSnapshotTitle: string;
  immutableSnapshotDesc: string;
  snapshotNameLabel: string;
  paymentRecordTitle: string;
  paymentNoLabel: string;
  paymentStatusLabel: string;
  paymentModeLabel: string;
  eventTimelineTitle: string;
  stopReasonLabel: string;
  failureReasonLabel: string;
}

export const PWA_DICTIONARY: Record<LangCode, PwaTranslations> = {
  en: {
    brandTitle: "MY-EV CPO",
    brandSubtitle: "Malaysia 20kW DC Charging Network",
    navHome: "Scan & Chargers",
    navOrders: "My Orders",
    navLogin: "Sign In",
    navLogout: "Sign Out",
    navAdminConsole: "Ops Console (CN)",
    activeSessionTitle: "Active Charging Session in Progress",
    activeSessionJumpBtn: "Return to Live Session",
    roleVerifiedDriver: "Verified Driver",
    roleUnverifiedDriver: "Unverified Email",
    roleAdmin: "Admin",
    roleCustomerService: "Customer Service",
    roleSiteStaff: "Site Staff",
    simulatedPaymentNotice: "SIMULATED PAYMENT (PHASE 1A) — NO REAL BANK CARD CHARGED",
    simulatedPaymentSub: "All MYR (RM) amounts are integer Sen trial calculations with immutable tariff snapshots.",
    timezoneLabel: "Malaysia Time (Asia/Kuala_Lumpur, UTC+8)",

    heroBadge: "MALAYSIA PHASE 1A • OCPP 1.6J + QUANYAO SECC",
    heroTitle: "Scan QR to Start 20kW Fast DC Charging",
    heroDesc:
      "Direct mobile web charging for Techone GPEV20-BG102-S1P-EA (200-1000Vdc) single-gun DC chargers with QuanYao QY-SECC-02 GB/T & CCS2 controller.",
    quickScanTitle: "Select a Charger QR Gun to Scan",
    quickScanSubtitle: "Tap any seeded Malaysia charger below to open its mobile QR charging terminal (/c/<qrToken>)",
    scanToChargeBtn: "Scan QR to Charge",
    testOfflineBtn: "Test Offline Protection",
    charger1Title: "KLCC Bay 1 — 20kW GB/T DC Fast Charger",
    charger1Desc: "Online • Techone GPEV20-BG102-S1P-EA + QuanYao QY-SECC-02 (GB/T 27930 <-> CCS PLC)",
    charger2Title: "KLCC Bay 2 — 20kW CCS2 DC Fast Charger",
    charger2Desc: "Online • Techone GPEV20-BG102-S1P-EA + QuanYao QY-SECC-02 (ISO 15118 / DIN 70121)",
    charger3Title: "PJ Backup Bay 3 — Offline Test Charger",
    charger3Desc: "Offline • Demonstrates REQ-DEV-005 pre-start offline interception",
    hardwareSpecLabel: "Hardware Model",
    seccModuleLabel: "SECC Controller",
    qrTokenLabel: "Opaque QR Token",
    adminPortalCardTitle: "Chinese Operations & OCPP Acceptance Console",
    adminPortalCardDesc:
      "Inspect 20kW chargers, immutable tariff snapshots, OCPP 1.6J raw frames, QuanYao SECC diagnostics, and run 1-click acceptance scenarios.",
    openAdminBtn: "Open Operations Console (/admin)",
    accountCardTitle: "Driver Sign-In & 1-Click Test Account Switcher",
    accountCardDesc:
      "Switch between Verified Driver, Unverified User (code 888666), Admin, Customer Service, and KLCC Site Staff.",
    openLoginBtn: "Sign In / Switch Account (/login)",

    authPageTitle: "Driver Account & Demo Role Switcher",
    authPageSubtitle: "Email registration with mandatory 6-digit verification before charging (REQ-ACC-002)",
    returnToNotice: "After signing in, you will automatically return to your scanned charger:",
    tabLogin: "Sign In",
    tabRegister: "Register",
    tabVerifyEmail: "Verify Email (6-Digit)",
    tabResetPassword: "Reset Password",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    displayNameLabel: "Full Name / Display Name",
    phoneOptionalLabel: "Mobile Phone (Optional, +60)",
    verificationCodeLabel: "6-Digit Verification Code",
    verificationCodeHint: "Demo verification code is 888666 (also logged to EmailDeliveries table)",
    resetTokenLabel: "6-Digit Reset Code",
    newPasswordLabel: "New Password (min 6 chars)",
    loginSubmitBtn: "Sign In to EV CPO",
    registerSubmitBtn: "Create Account & Send 6-Digit Code",
    verifySubmitBtn: "Verify Email & Activate Charging",
    resendCodeBtn: "Resend 6-Digit Code",
    requestResetBtn: "Send Password Reset Code",
    confirmResetBtn: "Confirm Password Reset",
    quickAccountSwitcherTitle: "Phase 1A Demo Quick Account Switcher",
    quickAccountSwitcherDesc: "One-click instant sign-in for acceptance testing across all 5 seeded roles:",
    quickSwitchBtn: "Instant Sign-In",
    accDriverLabel: "Verified EV Driver",
    accDriverDesc: "Active status • Ready to scan QR and start charging immediately",
    accUnverifiedLabel: "Unverified Email Driver (REQ-ACC-002 Test)",
    accUnverifiedDesc: "UNVERIFIED status • Blocked from starting charge until code 888666 is entered",
    accAdminLabel: "Platform Administrator (ADMIN)",
    accAdminDesc: "Full access to sites, tariff edits, remote start/stop/reset, and simulator lab",
    accCsLabel: "Customer Service (CUSTOMER_SERVICE)",
    accCsDesc: "Desensitized view • No tariff edit or remote charger control (tests 403 audit log)",
    accStaffLabel: "KLCC Site Staff (SITE_STAFF)",
    accStaffDesc: "Site-isolated to MY-KL-001 (KLCC) • Cannot view or control MY-PJ-002",
    authSuccessRedirect: "Signed in successfully. Redirecting...",
    verifySuccessMsg: "Email verified! Your account is now ACTIVE for charging.",
    resetCodeSentMsg: "Reset code generated (Demo code: 888666). Enter your new password below.",
    resetSuccessMsg: "Password reset completed. You are now signed in.",

    loadingCharger: "Loading 20kW DC Charger telemetry...",
    chargerNotFound: "Invalid or expired QR Code token.",
    siteAddressLabel: "Station Location",
    chargerIdLabel: "OCPP ChargeBox ID",
    connectorLabel: "Connector #1",
    powerOutputLabel: "Rated DC Output",
    voltageRangeLabel: "Output Voltage Range",
    gunTempLabel: "Gun PT100 Sensor",
    plugStatusLabel: "Physical Gun State",
    pluggedInYes: "Plugged In (CP Ready)",
    pluggedInNo: "Standby / Ready",
    seccDiagLabel: "QuanYao SECC Stage",
    tariffCardTitle: "Transparent MYR Charging Tariff",
    energyRateLabel: "Energy Fee",
    serviceFeeLabel: "CPO Service Fee",
    totalRateLabel: "Total Rate (Tax Inclusive)",
    taxInclusiveNote: "Includes 6.00% Malaysia SST • Settled in integer MYR Sen",
    loginRequiredTitle: "Sign In Required to Start Charging",
    loginRequiredDesc: "Your scanned QR charger will be preserved after signing in.",
    loginToContinueBtn: "Sign In & Return to This Gun",
    unverifiedBlockTitle: "Email Verification Required Before Charging (REQ-ACC-002)",
    unverifiedBlockDesc:
      "Unverified accounts cannot trigger RemoteStartTransaction. Enter your 6-digit verification code (Demo: 888666) below to unlock immediately:",
    inlineVerifyPlaceholder: "Enter 6-digit code (888666)",
    inlineVerifyBtn: "Verify & Unlock Charging",
    offlineBlockTitle: "Charger Currently Offline (REQ-DEV-005)",
    offlineBlockDesc:
      "This charger is disconnected from the OCPP 1.6J gateway. Starting a session is blocked to prevent ghost charges.",
    faultedBlockTitle: "Hardware Fault Detected on Connector",
    faultedBlockDesc: "Charging is temporarily unavailable due to a controller or SECC error.",
    busyBlockTitle: "Connector Currently Occupied",
    busyBlockDesc: "Another charging transaction is active on this single-gun charger.",
    startChargingBtn: "Start 20kW DC Charging (Simulated Payment)",
    startingChargingBtn: "Initiating OCPP RemoteStart...",
    stopChargingBtn: "Stop Charging & Settle Receipt",
    stoppingChargingBtn: "Sending OCPP RemoteStop...",
    handshakeTitle: "20kW DC Handshake in Progress (Not Billing Yet)",
    handshakeSubtitle:
      "Waiting for QuanYao QY-SECC-02 & vehicle BMS handshake before OCPP StartTransaction confirms power delivery:",
    handshakeStep1Title: "1. Simulated Auth & OCPP RemoteStartTransaction Sent",
    handshakeStep1Desc: "CSMS dispatched <=20-char idTag to charger and received RemoteStart Accepted.",
    handshakeStep2Title: "2. CP 4s Wakeup & SLAC / GB/T 27930 BRM Handshake",
    handshakeStep2Desc: "QuanYao SECC establishes PLC SLAC matching / CAN 250kbps BHM-CRM-BRM-BCP protocol.",
    handshakeStep3Title: "3. 30-Second IMD CableCheck Insulation Test (BRO=0xAA -> CRO=0xAA)",
    handshakeStep3Desc: "High-voltage DC insulation test at target EV voltage before closing DC contactors.",
    handshakeStep4Title: "4. PreCharge Voltage Ramp & OCPP StartTransaction Confirmation",
    handshakeStep4Desc: "Contactor closed (<20V delta) and OCPP StartTransaction integer meterStartWh recorded.",
    liveTelemetryTitle: "Live 20kW DC Charging Telemetry",
    chargedEnergyLabel: "Charged Energy",
    livePowerLabel: "DC Output Power",
    outputVoltageLabel: "Bus Voltage",
    outputCurrentLabel: "Output Current",
    vehicleSocLabel: "Vehicle BMS SoC",
    socFilteredNote: "QuanYao 0% boundary filter active",
    liveBillingTitle: "Live Trial Billing Breakdown (MYR)",
    energyCostLabel: "Energy Charge",
    serviceCostLabel: "Service Fee",
    includedTaxLabel: "Included SST (6%)",
    totalAmountLabel: "Total Simulated Charge",
    orderCompletedTitle: "Charging Session Completed & Settled",
    orderCompletedDesc: "OCPP StopTransaction received and simulated payment receipt generated.",
    viewFullReceiptBtn: "View Official Simulated Receipt",
    startAnotherSessionBtn: "Start Another Session",

    myOrdersTitle: "My Charging Orders & Receipts",
    myOrdersSubtitle: "All historical and active sessions displayed in Malaysia Time (Asia/Kuala_Lumpur)",
    noOrdersYet: "You have not started any charging sessions yet.",
    goScanChargerBtn: "Select a Charger QR to Start",
    orderNoLabel: "Order No.",
    orderStatusLabel: "Status",
    ocppTxIdLabel: "OCPP Transaction ID",
    ocppIdTagLabel: "OCPP idTag (<=20 chars)",
    meterRangeLabel: "Meter Register (Start -> Stop)",
    finalSocLabel: "Last Valid EV SoC",
    createdAtLabel: "Started (MYT)",
    settledAtLabel: "Settled (MYT)",
    viewReceiptBtn: "View Receipt & Timeline",
    receiptPageTitle: "Simulated Charging Receipt & OCPP Audit Trail",
    receiptPageSubtitle: "Immutable Tariff Snapshot • Integer Wh & MYR Sen Settlement",
    backToOrdersBtn: "Back to My Orders",
    backToChargerBtn: "Scan Charger Again",
    immutableSnapshotTitle: "Immutable Order Tariff Snapshot (REQ-BIL-005)",
    immutableSnapshotDesc:
      "Locked at order creation. Any subsequent price changes by Admin never alter this order.",
    snapshotNameLabel: "Tariff Plan Snapshot",
    paymentRecordTitle: "Simulated Payment Settlement Record (REQ-BIL-007)",
    paymentNoLabel: "Payment Reference",
    paymentStatusLabel: "Settlement Status",
    paymentModeLabel: "Payment Mode",
    eventTimelineTitle: "Order State Machine & OCPP 1.6J Lifecycle Timeline",
    stopReasonLabel: "OCPP Stop Reason",
    failureReasonLabel: "Failure / Diagnostic Note",
  },

  ms: {
    brandTitle: "MY-EV CPO",
    brandSubtitle: "Rangkaian Pengecasan DC 20kW Malaysia",
    navHome: "Imbas & Pengecas",
    navOrders: "Pesanan Saya",
    navLogin: "Log Masuk",
    navLogout: "Log Keluar",
    navAdminConsole: "Konsol Operasi (CN)",
    activeSessionTitle: "Sesi Pengecasan Aktif Sedang Berjalan",
    activeSessionJumpBtn: "Kembali ke Sesi Langsung",
    roleVerifiedDriver: "Pemandu Disahkan",
    roleUnverifiedDriver: "E-mel Belum Disahkan",
    roleAdmin: "Pentadbir",
    roleCustomerService: "Khidmat Pelanggan",
    roleSiteStaff: "Staf Tapak",
    simulatedPaymentNotice: "PEMBAYARAN SIMULASI (FASA 1A) — TIADA KAD BANK SEBENAR DICAJ",
    simulatedPaymentSub: "Semua amaun MYR (RM) dikira dalam integer Sen dengan petikan tarif tetap.",
    timezoneLabel: "Waktu Malaysia (Asia/Kuala_Lumpur, UTC+8)",

    heroBadge: "MALAYSIA FASA 1A • OCPP 1.6J + QUANYAO SECC",
    heroTitle: "Imbas QR untuk Pengecasan Pantas DC 20kW",
    heroDesc:
      "Pengecasan web mudah alih terus untuk pengecas DC satu-gun Techone GPEV20-BG102-S1P-EA (200-1000Vdc) dengan pengawal QuanYao QY-SECC-02 GB/T & CCS2.",
    quickScanTitle: "Pilih Kod QR Pengecas untuk Diimbas",
    quickScanSubtitle: "Tekan mana-mana pengecas Malaysia di bawah untuk membuka terminal QR (/c/<qrToken>)",
    scanToChargeBtn: "Imbas QR & Cas",
    testOfflineBtn: "Uji Sekatan Luar Talian",
    charger1Title: "KLCC Petak 1 — Pengecas Pantas DC 20kW GB/T",
    charger1Desc: "Dalam Talian • Techone GPEV20-BG102-S1P-EA + QuanYao QY-SECC-02 (GB/T 27930 <-> CCS PLC)",
    charger2Title: "KLCC Petak 2 — Pengecas Pantas DC 20kW CCS2",
    charger2Desc: "Dalam Talian • Techone GPEV20-BG102-S1P-EA + QuanYao QY-SECC-02 (ISO 15118 / DIN 70121)",
    charger3Title: "PJ Petak 3 — Pengecas Ujian Luar Talian",
    charger3Desc: "Luar Talian • Menunjukkan sekatan keselamatan pra-mula REQ-DEV-005",
    hardwareSpecLabel: "Model Perkakasan",
    seccModuleLabel: "Pengawal SECC",
    qrTokenLabel: "Token QR",
    adminPortalCardTitle: "Konsol Operasi & Ujian Penerimaan OCPP",
    adminPortalCardDesc:
      "Pantau pengecas 20kW, petikan tarif, mesej mentah OCPP 1.6J, diagnostik QuanYao SECC, dan ujian automatik 1-klik.",
    openAdminBtn: "Buka Konsol Operasi (/admin)",
    accountCardTitle: "Log Masuk Pemandu & Penukar Akaun Ujian 1-Klik",
    accountCardDesc:
      "Tukar antara Pemandu Disahkan, Pengguna Belum Disahkan (kod 888666), Pentadbir, Khidmat Pelanggan, dan Staf KLCC.",
    openLoginBtn: "Log Masuk / Tukar Akaun (/login)",

    authPageTitle: "Akaun Pemandu & Penukar Peranan Demo",
    authPageSubtitle: "Pendaftaran e-mel dengan pengesahan kod 6-digit wajib sebelum mengecas (REQ-ACC-002)",
    returnToNotice: "Selepas log masuk, anda akan kembali secara automatik ke pengecas QR anda:",
    tabLogin: "Log Masuk",
    tabRegister: "Daftar Baru",
    tabVerifyEmail: "Sahkan E-mel (6-Digit)",
    tabResetPassword: "Set Semula Kata Laluan",
    emailLabel: "Alamat E-mel",
    passwordLabel: "Kata Laluan",
    displayNameLabel: "Nama Penuh / Nama Paparan",
    phoneOptionalLabel: "No. Telefon Bimbit (Pilihan, +60)",
    verificationCodeLabel: "Kod Pengesahan 6-Digit",
    verificationCodeHint: "Kod pengesahan demo ialah 888666 (juga direkodkan dalam jadual EmailDeliveries)",
    resetTokenLabel: "Kod Set Semula 6-Digit",
    newPasswordLabel: "Kata Laluan Baru (min 6 aksara)",
    loginSubmitBtn: "Log Masuk ke EV CPO",
    registerSubmitBtn: "Cipta Akaun & Hantar Kod 6-Digit",
    verifySubmitBtn: "Sahkan E-mel & Aktifkan Pengecasan",
    resendCodeBtn: "Hantar Semula Kod 6-Digit",
    requestResetBtn: "Hantar Kod Set Semula",
    confirmResetBtn: "Sahkan Kata Laluan Baru",
    quickAccountSwitcherTitle: "Penukar Akaun Pantas Demo Fasa 1A",
    quickAccountSwitcherDesc: "Log masuk 1-klik untuk ujian penerimaan merentasi 5 peranan:",
    quickSwitchBtn: "Log Masuk Segera",
    accDriverLabel: "Pemandu EV Disahkan",
    accDriverDesc: "Status ACTIVE • Sedia untuk imbas QR dan mula mengecas serta-merta",
    accUnverifiedLabel: "Pemandu E-mel Belum Disahkan (Ujian REQ-ACC-002)",
    accUnverifiedDesc: "Status UNVERIFIED • Disekat daripada mengecas sehingga kod 888666 dimasukkan",
    accAdminLabel: "Pentadbir Platform (ADMIN)",
    accAdminDesc: "Akses penuh ke tapak, ubah tarif, kawalan jauh mula/henti/reset, dan makmal simulator",
    accCsLabel: "Khidmat Pelanggan (CUSTOMER_SERVICE)",
    accCsDesc: "Paparan tersamar • Tiada kebenaran ubah tarif atau kawalan jauh (ujian log audit 403)",
    accStaffLabel: "Staf Tapak KLCC (SITE_STAFF)",
    accStaffDesc: "Terhad kepada tapak MY-KL-001 (KLCC) sahaja • Tidak boleh akses MY-PJ-002",
    authSuccessRedirect: "Berjaya log masuk. Sedang mengalihkan...",
    verifySuccessMsg: "E-mel disahkan! Akaun anda kini ACTIVE untuk mengecas.",
    resetCodeSentMsg: "Kod set semula dijana (Kod demo: 888666). Masukkan kata laluan baru di bawah.",
    resetSuccessMsg: "Set semula kata laluan selesai. Anda kini telah log masuk.",

    loadingCharger: "Memuatkan telemetri Pengecas DC 20kW...",
    chargerNotFound: "Token Kod QR tidak sah atau telah tamat tempoh.",
    siteAddressLabel: "Lokasi Stesen",
    chargerIdLabel: "ID ChargeBox OCPP",
    connectorLabel: "Penyambung #1",
    powerOutputLabel: "Kuasa Output DC",
    voltageRangeLabel: "Julat Voltan Output",
    gunTempLabel: "Sensor PT100 Gun",
    plugStatusLabel: "Status Fizikal Gun",
    pluggedInYes: "Disambung (CP Sedia)",
    pluggedInNo: "Sedia / Tunggu",
    seccDiagLabel: "Peringkat QuanYao SECC",
    tariffCardTitle: "Tarif Pengecasan MYR Telus",
    energyRateLabel: "Caj Tenaga",
    serviceFeeLabel: "Fi Perkhidmatan CPO",
    totalRateLabel: "Kadar Jumlah (Termasuk Cukai)",
    taxInclusiveNote: "Termasuk 6.00% SST Malaysia • Dikira dalam integer MYR Sen",
    loginRequiredTitle: "Log Masuk Diperlukan untuk Mula Mengecas",
    loginRequiredDesc: "Pengecas QR yang diimbas akan dikekalkan selepas anda log masuk.",
    loginToContinueBtn: "Log Masuk & Kembali ke Gun Ini",
    unverifiedBlockTitle: "Pengesahan E-mel Wajib Sebelum Mengecas (REQ-ACC-002)",
    unverifiedBlockDesc:
      "Akaun belum disahkan tidak boleh menghantar RemoteStartTransaction. Masukkan kod 6-digit anda (Demo: 888666) di bawah untuk buka kunci segera:",
    inlineVerifyPlaceholder: "Masukkan kod 6-digit (888666)",
    inlineVerifyBtn: "Sahkan & Buka Kunci",
    offlineBlockTitle: "Pengecas Kini Luar Talian (REQ-DEV-005)",
    offlineBlockDesc:
      "Pengecas ini terputus daripada get laluan OCPP 1.6J. Permulaan sesi disekat untuk keselamatan.",
    faultedBlockTitle: "Ralat Perkakasan Dikesan pada Penyambung",
    faultedBlockDesc: "Pengecasan tidak tersedia buat sementara waktu kerana ralat pengawal atau SECC.",
    busyBlockTitle: "Penyambung Sedang Digunakan",
    busyBlockDesc: "Satu lagi transaksi pengecasan sedang aktif pada pengecas satu-gun ini.",
    startChargingBtn: "Mula Pengecasan DC 20kW (Pembayaran Simulasi)",
    startingChargingBtn: "Menghantar OCPP RemoteStart...",
    stopChargingBtn: "Henti Mengecas & Jana Resit",
    stoppingChargingBtn: "Menghantar OCPP RemoteStop...",
    handshakeTitle: "Jabat Tangan DC 20kW Sedang Berjalan (Belum Dicaj)",
    handshakeSubtitle:
      "Menunggu jabat tangan QuanYao QY-SECC-02 & BMS kenderaan sebelum OCPP StartTransaction mengesahkan aliran kuasa:",
    handshakeStep1Title: "1. Kebenaran Simulasi & OCPP RemoteStartTransaction Dihantar",
    handshakeStep1Desc: "CSMS menghantar idTag <=20 aksara ke pengecas dan menerima status Accepted.",
    handshakeStep2Title: "2. Bangun CP 4s & Jabat Tangan SLAC / GB/T 27930 BRM",
    handshakeStep2Desc: "QuanYao SECC memadankan PLC SLAC / protokol CAN 250kbps BHM-CRM-BRM-BCP.",
    handshakeStep3Title: "3. Ujian Penebatan IMD CableCheck 30 Saat (BRO=0xAA -> CRO=0xAA)",
    handshakeStep3Desc: "Ujian penebatan voltan tinggi DC sebelum menutup sesentuh utama DC.",
    handshakeStep4Title: "4. Pra-Caj Voltan & Pengesahan OCPP StartTransaction",
    handshakeStep4Desc: "Sesentuh ditutup (<20V beza) dan bacaan integer meterStartWh direkodkan.",
    liveTelemetryTitle: "Telemetri Pengecasan DC 20kW Langsung",
    chargedEnergyLabel: "Tenaga Dicas",
    livePowerLabel: "Kuasa Output DC",
    outputVoltageLabel: "Voltan Bas",
    outputCurrentLabel: "Arus Output",
    vehicleSocLabel: "SoC BMS Kenderaan",
    socFilteredNote: "Penapis sempadan 0% QuanYao aktif",
    liveBillingTitle: "Pecahan Bil Percubaan Langsung (MYR)",
    energyCostLabel: "Caj Tenaga",
    serviceCostLabel: "Fi Perkhidmatan",
    includedTaxLabel: "Termasuk SST (6%)",
    totalAmountLabel: "Jumlah Caj Simulasi",
    orderCompletedTitle: "Sesi Pengecasan Selesai & Dijelaskan",
    orderCompletedDesc: "OCPP StopTransaction diterima dan resit pembayaran simulasi telah dijana.",
    viewFullReceiptBtn: "Lihat Resit Simulasi Rasmi",
    startAnotherSessionBtn: "Mula Sesi Lain",

    myOrdersTitle: "Pesanan & Resit Pengecasan Saya",
    myOrdersSubtitle: "Semua sesi sejarah dan aktif dipaparkan dalam Waktu Malaysia (Asia/Kuala_Lumpur)",
    noOrdersYet: "Anda belum memulakan sebarang sesi pengecasan.",
    goScanChargerBtn: "Pilih Kod QR Pengecas untuk Mula",
    orderNoLabel: "No. Pesanan",
    orderStatusLabel: "Status",
    ocppTxIdLabel: "ID Transaksi OCPP",
    ocppIdTagLabel: "idTag OCPP (<=20 aksara)",
    meterRangeLabel: "Daftar Meter (Mula -> Henti)",
    finalSocLabel: "SoC EV Sah Terakhir",
    createdAtLabel: "Mula (MYT)",
    settledAtLabel: "Selesai (MYT)",
    viewReceiptBtn: "Lihat Resit & Garis Masa",
    receiptPageTitle: "Resit Pengecasan Simulasi & Jejak Audit OCPP",
    receiptPageSubtitle: "Petikan Tarif Tetap • Penyelesaian Integer Wh & MYR Sen",
    backToOrdersBtn: "Kembali ke Pesanan Saya",
    backToChargerBtn: "Imbas Pengecas Semula",
    immutableSnapshotTitle: "Petikan Tarif Pesanan Tetap (REQ-BIL-005)",
    immutableSnapshotDesc:
      "Dikunci semasa pesanan dicipta. Sebarang perubahan harga kemudian tidak menjejaskan pesanan ini.",
    snapshotNameLabel: "Pelan Petikan Tarif",
    paymentRecordTitle: "Rekod Penyelesaian Pembayaran Simulasi (REQ-BIL-007)",
    paymentNoLabel: "Rujukan Pembayaran",
    paymentStatusLabel: "Status Penyelesaian",
    paymentModeLabel: "Mod Pembayaran",
    eventTimelineTitle: "Garis Masa Mesin Keadaan Pesanan & Kitaran Hayat OCPP 1.6J",
    stopReasonLabel: "Sebab Henti OCPP",
    failureReasonLabel: "Nota Ralat / Diagnostik",
  },

  zh: {
    brandTitle: "MY-EV CPO",
    brandSubtitle: "马来西亚 20kW 直流快充运营网络",
    navHome: "扫码与桩群",
    navOrders: "我的订单",
    navLogin: "登录",
    navLogout: "退出",
    navAdminConsole: "中文运营后台",
    activeSessionTitle: "当前存在进行中的充电会话",
    activeSessionJumpBtn: "返回实时充电页",
    roleVerifiedDriver: "已验证车主",
    roleUnverifiedDriver: "未验证邮箱",
    roleAdmin: "平台管理员",
    roleCustomerService: "客服人员",
    roleSiteStaff: "站点值守",
    simulatedPaymentNotice: "第一阶段（Phase 1A）模拟支付 — 不发生真实银行卡扣款",
    simulatedPaymentSub: "所有马币（RM）金额均基于订单冻结价格快照与整数分（Sen）试算。",
    timezoneLabel: "马来西亚标准时间 (Asia/Kuala_Lumpur, UTC+8)",

    heroBadge: "马来西亚一期 1A • OCPP 1.6J + 全耀 SECC 实桩协议",
    heroTitle: "手机扫码启动 20kW 直流快充",
    heroDesc:
      "适配 Techone GPEV20-BG102-S1P-EA (200-1000Vdc) 20kW 单枪直流桩与全耀 QY-SECC-02 (GB/T 27930 与 CCS2 协议转换控制器)。",
    quickScanTitle: "选择要扫码的充电枪二维码",
    quickScanSubtitle: "点击下方预置充电枪卡片，直接进入手机扫码充电终端 (/c/<qrToken>)",
    scanToChargeBtn: "扫码进入充电枪",
    testOfflineBtn: "测试离线拦截保护",
    charger1Title: "吉隆坡双子塔 1号桩 — 20kW 国标 GB/T 直流快充枪",
    charger1Desc: "在线 • Techone GPEV20-BG102-S1P-EA + 全耀 QY-SECC-02 (GB/T 27930 <-> CCS PLC)",
    charger2Title: "吉隆坡双子塔 2号桩 — 20kW 欧标 CCS2 直流快充枪",
    charger2Desc: "在线 • Techone GPEV20-BG102-S1P-EA + 全耀 QY-SECC-02 (ISO 15118 / DIN 70121)",
    charger3Title: "八打灵再也 3号备用桩 — 离线拦截测试桩",
    charger3Desc: "离线 • 演示 REQ-DEV-005 离线不可启动拦截保护",
    hardwareSpecLabel: "设备型号",
    seccModuleLabel: "SECC 控制器",
    qrTokenLabel: "非连续二维码 Token",
    adminPortalCardTitle: "中文运营与 OCPP 1.6J 一键验收后台",
    adminPortalCardDesc:
      "查看 20kW 直流桩状态、价格快照、OCPP 1.6J 原始报文、全耀 SECC 诊断日志，并一键运行四大验收场景。",
    openAdminBtn: "打开中文运营后台 (/admin)",
    accountCardTitle: "车主登录与五角色一键切换面板",
    accountCardDesc:
      "支持一键切换：已验证车主、未验证邮箱用户（验证码 888666）、管理员、客服人员（脱敏/无越权）、KLCC 站点人员。",
    openLoginBtn: "登录 / 切换测试账号 (/login)",

    authPageTitle: "车主账号认证与演示角色切换",
    authPageSubtitle: "支持邮箱注册、6位验证码强制校验（未验证不可启动充电 REQ-ACC-002）及密码重置",
    returnToNotice: "登录或验证完成后，系统将自动跳回您刚才扫码的充电枪页面：",
    tabLogin: "密码登录",
    tabRegister: "邮箱注册",
    tabVerifyEmail: "邮箱验证码 (6位)",
    tabResetPassword: "密码重置",
    emailLabel: "电子邮箱",
    passwordLabel: "登录密码",
    displayNameLabel: "姓名 / 昵称",
    phoneOptionalLabel: "手机号码 (选填预留, +60)",
    verificationCodeLabel: "6 位邮箱验证码",
    verificationCodeHint: "演示环境固定通用验证码为 888666（同时记录于邮件投递表）",
    resetTokenLabel: "6 位重置验证码",
    newPasswordLabel: "设置新密码 (至少 6 位)",
    loginSubmitBtn: "登录充电平台",
    registerSubmitBtn: "注册并发送 6 位验证码",
    verifySubmitBtn: "完成邮箱验证并激活充电权限",
    resendCodeBtn: "重新发送验证码",
    requestResetBtn: "发送密码重置码",
    confirmResetBtn: "确认重置密码",
    quickAccountSwitcherTitle: "Phase 1A 五角色一键切换验收台",
    quickAccountSwitcherDesc: "点击即可免密一键切换以下 5 个预置角色账号：",
    quickSwitchBtn: "一键切换登录",
    accDriverLabel: "已验证邮箱车主 (DRIVER)",
    accDriverDesc: "ACTIVE 状态 • 可直接扫码并发起 20kW 直流充电",
    accUnverifiedLabel: "未验证邮箱车主 (REQ-ACC-002 拦截测试)",
    accUnverifiedDesc: "UNVERIFIED 状态 • 扫码点启动会被拦截，输入 888666 后立即放行",
    accAdminLabel: "平台超级管理员 (ADMIN)",
    accAdminDesc: "拥有站点、电价配置、远程启停/复位二次确认及模拟器实验室全部权限",
    accCsLabel: "客服人员 (CUSTOMER_SERVICE)",
    accCsDesc: "信息脱敏 • 禁止改价与远程控桩（可用于测试 403 越权拦截与安全审计日志）",
    accStaffLabel: "KLCC 站点值守人员 (SITE_STAFF)",
    accStaffDesc: "仅绑定吉隆坡 MY-KL-001 站点 • 无法越权查看或操作八打灵 MY-PJ-002 站点",
    authSuccessRedirect: "登录成功，正在跳转...",
    verifySuccessMsg: "邮箱验证通过！您的账号已激活充电权限。",
    resetCodeSentMsg: "重置验证码已生成（演示码：888666），请在下方输入新密码。",
    resetSuccessMsg: "密码重置成功并已自动登录。",

    loadingCharger: "正在加载 20kW 直流桩实时遥测状态...",
    chargerNotFound: "无效或已失效的充电枪二维码 Token。",
    siteAddressLabel: "站点地址",
    chargerIdLabel: "OCPP 桩编号",
    connectorLabel: "1号直流枪",
    powerOutputLabel: "额定直流功率",
    voltageRangeLabel: "输出电压范围",
    gunTempLabel: "枪头 PT100 温度",
    plugStatusLabel: "插枪物理状态",
    pluggedInYes: "已插枪 (CP 就绪)",
    pluggedInNo: "待机 / 可直接启动",
    seccDiagLabel: "全耀 SECC 阶段",
    tariffCardTitle: "透明马币 (MYR) 充电计费标准",
    energyRateLabel: "电费单价",
    serviceFeeLabel: "服务费单价",
    totalRateLabel: "含税总单价",
    taxInclusiveNote: "已含马来西亚 6.00% SST 服务税 • 全链路整数分 (Sen) 结算",
    loginRequiredTitle: "请先登录后启动充电",
    loginRequiredDesc: "登录后将自动返回当前扫码的充电枪页面。",
    loginToContinueBtn: "前往登录并返回本枪",
    unverifiedBlockTitle: "启动拦截：您的邮箱尚未完成验证 (REQ-ACC-002)",
    unverifiedBlockDesc:
      "未完成邮箱验证的账号禁止下发 RemoteStartTransaction。请在下方直接输入 6 位验证码（演示码：888666）立即解锁本枪：",
    inlineVerifyPlaceholder: "输入 6 位验证码 (888666)",
    inlineVerifyBtn: "立即验证并解锁充电",
    offlineBlockTitle: "设备离线不可启动 (REQ-DEV-005)",
    offlineBlockDesc: "该充电桩当前未连接 OCPP 1.6J 网关，系统已拦截启动请求以防止异常挂单。",
    faultedBlockTitle: "充电枪处于故障保护状态",
    faultedBlockDesc: "控制器或全耀 SECC 上报硬件故障，暂时无法启动充电。",
    busyBlockTitle: "当前充电枪已被占用",
    busyBlockDesc: "该单枪直流桩正在执行另一笔充电事务。",
    startChargingBtn: "立即启动 20kW 直流充电（模拟支付授权）",
    startingChargingBtn: "正在下发 OCPP RemoteStart...",
    stopChargingBtn: "结束充电并生成模拟账单",
    stoppingChargingBtn: "正在下发 OCPP RemoteStop...",
    handshakeTitle: "20kW 直流握手与绝缘检测中（尚未开始计费）",
    handshakeSubtitle:
      "严格区分 STARTING 与 CHARGING（REQ-CHG-003）：等待全耀 QY-SECC-02 完成绝缘检测与预充并收到 StartTransaction 后才进入充电中：",
    handshakeStep1Title: "1. 模拟支付授权通过 & OCPP RemoteStartTransaction 已下发",
    handshakeStep1Desc: "CSMS 生成 <=20 字符 ocppIdTag 下发至桩端并收到 Accepted。",
    handshakeStep2Title: "2. CP 4秒唤醒 & SLAC / GB/T 27930 BRM 车辆握手",
    handshakeStep2Desc: "全耀 SECC 建立 PLC SLAC 衰减匹配与 CAN 250kbps BHM-CRM-BRM-BCP 通信。",
    handshakeStep3Title: "3. 30秒 IMD 直流母线绝缘检测 (CableCheck BRO=0xAA -> CRO=0xAA)",
    handshakeStep3Desc: "高压直流接触器吸合前执行最高 30 秒绝缘阻抗安全测试。",
    handshakeStep4Title: "4. PreCharge 415V 预充调压 & OCPP StartTransaction 确认送电",
    handshakeStep4Desc: "压差 <20V 吸合主接触器，桩端上报整数 meterStartWh，正式进入 CHARGING 状态。",
    liveTelemetryTitle: "20kW 直流充电实时遥测仪表盘",
    chargedEnergyLabel: "已充电量",
    livePowerLabel: "实时直流功率",
    outputVoltageLabel: "输出母线电压",
    outputCurrentLabel: "输出直流电流",
    vehicleSocLabel: "车辆 BMS SoC",
    socFilteredNote: "已启用全耀 0% 边界零值过滤",
    liveBillingTitle: "马币 (MYR) 实时试算费用明细",
    energyCostLabel: "电费金额",
    serviceCostLabel: "服务费金额",
    includedTaxLabel: "内含 SST 税额 (6%)",
    totalAmountLabel: "模拟支付总金额",
    orderCompletedTitle: "充电已完成并生成模拟结算凭证",
    orderCompletedDesc: "已收到 OCPP StopTransaction 并基于不可变价格快照完成整数分结算。",
    viewFullReceiptBtn: "查看完整模拟支付账单与时间线",
    startAnotherSessionBtn: "发起新一轮扫码充电",

    myOrdersTitle: "我的充电订单与模拟账单",
    myOrdersSubtitle: "所有订单时间均按马来西亚时区 (Asia/Kuala_Lumpur) 展示",
    noOrdersYet: "您还没有发起过充电订单。",
    goScanChargerBtn: "前往扫码选择充电枪",
    orderNoLabel: "订单编号",
    orderStatusLabel: "订单状态",
    ocppTxIdLabel: "OCPP 事务编号",
    ocppIdTagLabel: "OCPP idTag (<=20字符)",
    meterRangeLabel: "电表起止读数 (Wh)",
    finalSocLabel: "结束有效 SoC",
    createdAtLabel: "创建时间 (MYT)",
    settledAtLabel: "结算时间 (MYT)",
    viewReceiptBtn: "查看账单与事件时间线",
    receiptPageTitle: "模拟支付充电账单与 OCPP 审计时间线",
    receiptPageSubtitle: "冻结价格快照 • 整数 Wh 电量与整数 Sen 金额结算",
    backToOrdersBtn: "返回订单列表",
    backToChargerBtn: "再次扫码该充电枪",
    immutableSnapshotTitle: "订单冻结价格快照 (REQ-BIL-005)",
    immutableSnapshotDesc: "在订单创建瞬间锁定。管理员后续修改站点电价绝不会改变本历史订单账单。",
    snapshotNameLabel: "计费规则快照名称",
    paymentRecordTitle: "模拟支付结算记录 (REQ-BIL-007)",
    paymentNoLabel: "模拟支付单号",
    paymentStatusLabel: "模拟结算状态",
    paymentModeLabel: "支付通道模式",
    eventTimelineTitle: "订单状态机与 OCPP 1.6J 全生命周期时间线",
    stopReasonLabel: "OCPP 停机原因",
    failureReasonLabel: "失败 / 诊断说明",
  },
};

export function localizeOrderStatus(status: string, lang: LangCode): string {
  const table: Record<string, Record<LangCode, string>> = {
    DRAFT: { en: "Draft", ms: "Draf", zh: "草稿" },
    AUTHORIZING: { en: "Authorizing (Simulated)", ms: "Mengesahkan (Simulasi)", zh: "模拟授权中" },
    READY_TO_START: { en: "Ready to Start", ms: "Sedia untuk Mula", zh: "准备启动" },
    STARTING: { en: "Starting (DC Handshake)", ms: "Memulakan (Jabat Tangan DC)", zh: "启动握手中 (STARTING)" },
    CHARGING: { en: "Charging Active", ms: "Sedang Mengecas", zh: "充电进行中 (CHARGING)" },
    STOPPING: { en: "Stopping Session", ms: "Menghentikan Sesi", zh: "停止握手中 (STOPPING)" },
    SETTLING: { en: "Settling Receipt", ms: "Menyelesaikan Resit", zh: "账单结算中" },
    COMPLETED: { en: "Completed & Settled", ms: "Selesai & Dijelaskan", zh: "已完成结算 (COMPLETED)" },
    AUTHORIZATION_FAILED: { en: "Auth Failed", ms: "Pengesahan Gagal", zh: "授权失败" },
    START_FAILED: { en: "Start Rejected / Timeout", ms: "Permulaan Ditolak / Tamat Masa", zh: "启动失败 (START_FAILED)" },
    INTERRUPTED: { en: "Interrupted", ms: "Tergendala", zh: "异常中断" },
    MANUAL_REVIEW: { en: "Manual Review", ms: "Semakan Manual", zh: "待人工复核" },
    CANCELLED: { en: "Cancelled", ms: "Dibatalkan", zh: "已取消" },
  };
  return table[status]?.[lang] || status;
}

export function localizeConnectorStatus(status: string, connectionStatus: string, lang: LangCode): string {
  if (connectionStatus === "OFFLINE") {
    return lang === "zh" ? "离线 (OFFLINE)" : lang === "ms" ? "Luar Talian (OFFLINE)" : "Offline";
  }
  const table: Record<string, Record<LangCode, string>> = {
    Available: { en: "Available", ms: "Tersedia", zh: "空闲可用 (Available)" },
    Preparing: { en: "Preparing (Handshake)", ms: "Menyediakan (Jabat Tangan)", zh: "准备握手中 (Preparing)" },
    Charging: { en: "Charging", ms: "Sedang Mengecas", zh: "充电送电中 (Charging)" },
    SuspendedEVSE: { en: "Suspended by Charger", ms: "Digantung oleh Pengecas", zh: "桩端暂停 (SuspendedEVSE)" },
    SuspendedEV: { en: "Suspended by EV", ms: "Digantung oleh EV", zh: "车端暂停 (SuspendedEV)" },
    Finishing: { en: "Finishing", ms: "Menamatkan", zh: "收尾复位中 (Finishing)" },
    Reserved: { en: "Reserved", ms: "Ditempah", zh: "已预约" },
    Unavailable: { en: "Unavailable", ms: "Tidak Tersedia", zh: "不可用" },
    Faulted: { en: "Faulted", ms: "Rosak / Ralat", zh: "故障保护 (Faulted)" },
  };
  return table[status]?.[lang] || status;
}

export function localizePaymentStatus(status: string, lang: LangCode): string {
  const table: Record<string, Record<LangCode, string>> = {
    SIMULATED_PENDING: {
      en: "Simulated Authorized (Pending Capture)",
      ms: "Simulasi Dibenarkan (Menunggu)",
      zh: "模拟预授权通过 (待结算)",
    },
    SIMULATED_SUCCEEDED: {
      en: "Simulated Payment Succeeded (RM 0 Real Bank Charge)",
      ms: "Pembayaran Simulasi Berjaya (Tiada Caj Bank)",
      zh: "模拟结算完成 (未发生真实扣款)",
    },
    SIMULATED_CANCELLED: {
      en: "Simulated Voided / Cancelled (No Charge)",
      ms: "Simulasi Dibatalkan (Tiada Caj)",
      zh: "模拟授权已撤销 (未生成扣款)",
    },
  };
  return table[status]?.[lang] || status;
}

export function localizeSiteName(
  site: { name?: string; nameEn?: string | null; nameMs?: string | null } | null | undefined,
  lang: LangCode
): string {
  if (!site) return "-";
  if (lang === "en") return site.nameEn || site.name || "-";
  if (lang === "ms") return site.nameMs || site.nameEn || site.name || "-";
  return site.name || site.nameEn || "-";
}

/**
 * Translates backend API errors or event descriptions into clean EN / MS / ZH
 * so that when EN or MS is selected on any user PWA page, zero Chinese prompts appear (Acceptance Criterion 7).
 */
export function localizeApiMessage(rawMsg: string | null | undefined, lang: LangCode): string {
  if (!rawMsg) return "";
  if (lang === "zh") return rawMsg;

  const map: Array<{ match: RegExp; en: string; ms: string }> = [
    {
      match: /UNVERIFIED|未验证|verify your email/i,
      en: "Please verify your email with the 6-digit code (888666) before starting a charging session.",
      ms: "Sila sahkan e-mel anda dengan kod 6-digit (888666) sebelum memulakan pengecasan.",
    },
    {
      match: /OFFLINE|离线/i,
      en: "Charger is currently offline and cannot start a charging session.",
      ms: "Pengecas sedang luar talian dan tidak boleh memulakan sesi pengecasan.",
    },
    {
      match: /Faulted|故障/i,
      en: "Charger reported a hardware fault and cannot start charging.",
      ms: "Pengecas melaporkan ralat perkakasan dan tidak boleh memulakan pengecasan.",
    },
    {
      match: /occupied|占用|active order|进行中/i,
      en: "This connector or account already has an active charging session in progress.",
      ms: "Penyambung atau akaun ini sudah mempunyai sesi pengecasan aktif yang sedang berjalan.",
    },
    {
      match: /Invalid credentials|密码错误|账号或密码/i,
      en: "Invalid email or password. Please check your credentials or use the 1-click demo switcher.",
      ms: "E-mel atau kata laluan tidak sah. Sila semak butiran anda atau gunakan penukar demo 1-klik.",
    },
    {
      match: /Invalid verification code|验证码无效|验证码错误/i,
      en: "Invalid or expired 6-digit verification code. Use demo code 888666.",
      ms: "Kod pengesahan 6-digit tidak sah atau tamat tempoh. Gunakan kod demo 888666.",
    },
    {
      match: /Unauthorized|未登录|请先登录/i,
      en: "Authentication required. Please sign in first.",
      ms: "Pengesahan diperlukan. Sila log masuk terlebih dahulu.",
    },
    {
      match: /Rejected|拒绝启动/i,
      en: "Charger rejected RemoteStartTransaction. Simulated authorization has been cancelled with zero charge.",
      ms: "Pengecas menolak RemoteStartTransaction. Kebenaran simulasi telah dibatalkan tanpa sebarang caj.",
    },
  ];

  for (const item of map) {
    if (item.match.test(rawMsg)) {
      return lang === "ms" ? item.ms : item.en;
    }
  }

  // Strip any residual CJK characters if backend returned a bilingual string in EN/MS mode
  if (/[\u4e00-\u9fff]/.test(rawMsg)) {
    const asciiPart = rawMsg.replace(/[\u4e00-\u9fff，。！？；：（）【】]+/g, " ").trim();
    if (asciiPart.length > 3) return asciiPart;
    return lang === "ms"
      ? "Permintaan telah diproses oleh sistem EV CPO."
      : "Request processed by EV CPO system.";
  }

  return rawMsg;
}

export function localizeOrderEventDescription(
  event: { eventType: string; description?: string | null },
  lang: LangCode
): string {
  const typeMap: Record<string, { en: string; ms: string; zh: string }> = {
    ORDER_CREATED: {
      en: "Charging order created & immutable MYR tariff snapshot locked.",
      ms: "Pesanan pengecasan dicipta & petikan tarif MYR tetap dikunci.",
      zh: "充电订单已创建，不可变马币计费快照已锁定。",
    },
    SIMULATED_AUTH_OK: {
      en: "Simulated payment pre-authorization succeeded (Phase 1A — no real bank charge).",
      ms: "Pra-kebenaran pembayaran simulasi berjaya (Fasa 1A — tiada caj bank sebenar).",
      zh: "第一阶段模拟支付授权通过（不发生真实银行扣款）。",
    },
    REMOTE_START_SENT: {
      en: "OCPP 1.6J RemoteStartTransaction dispatched to 20kW DC charger.",
      ms: "OCPP 1.6J RemoteStartTransaction dihantar ke pengecas DC 20kW.",
      zh: "已向 20kW 直流桩下发 OCPP 1.6J RemoteStartTransaction 启动指令。",
    },
    REMOTE_START_ACCEPTED: {
      en: "Charger accepted RemoteStartTransaction; QuanYao SECC starting 30s IMD insulation & precharge handshake.",
      ms: "Pengecas menerima RemoteStartTransaction; QuanYao SECC memulakan ujian penebatan 30s & pra-caj.",
      zh: "桩端已接受启动指令 (Accepted)，全耀 SECC 进入 30 秒绝缘检测与预充握手。",
    },
    REMOTE_START_REJECTED: {
      en: "Charger rejected RemoteStartTransaction; order marked START_FAILED and simulated payment cancelled.",
      ms: "Pengecas menolak RemoteStartTransaction; pesanan ditanda START_FAILED dan pembayaran simulasi dibatalkan.",
      zh: "桩端拒绝启动 (Rejected)，订单转为 START_FAILED 且撤销模拟支付。",
    },
    OCPP_START_TX: {
      en: "OCPP StartTransaction confirmed! DC contactor closed and power delivery started.",
      ms: "OCPP StartTransaction disahkan! Sesentuh DC ditutup dan penghantaran kuasa bermula.",
      zh: "收到 OCPP StartTransaction！直流主接触器吸合，正式开始送电计费。",
    },
    METER_UPDATE: {
      en: "OCPP MeterValues telemetry updated (integer Wh & live MYR trial billing).",
      ms: "Telemetri OCPP MeterValues dikemas kini (integer Wh & bil percubaan MYR langsung).",
      zh: "收到 OCPP MeterValues 遥测采样更新（整数 Wh 电量与马币实时试算）。",
    },
    REMOTE_STOP_SENT: {
      en: "OCPP 1.6J RemoteStopTransaction requested.",
      ms: "OCPP 1.6J RemoteStopTransaction diminta.",
      zh: "已下发 OCPP 1.6J RemoteStopTransaction 远程停机指令。",
    },
    OCPP_STOP_TX: {
      en: "OCPP StopTransaction received from charger.",
      ms: "OCPP StopTransaction diterima daripada pengecas.",
      zh: "收到桩端上报 OCPP StopTransaction 停机事务报文。",
    },
    SETTLED: {
      en: "Final integer Wh & MYR Sen billing settled with SIMULATED_SUCCEEDED receipt.",
      ms: "Bil akhir integer Wh & MYR Sen diselesaikan dengan resit SIMULATED_SUCCEEDED.",
      zh: "完成整数 Wh 电量与马币分 (Sen) 最终结算，生成 SIMULATED_SUCCEEDED 模拟账单。",
    },
    START_TIMEOUT: {
      en: "Handshake timeout waiting for StartTransaction; session closed safely with zero charge.",
      ms: "Tamat masa menunggu StartTransaction; sesi ditutup dengan selamat tanpa caj.",
      zh: "等待 StartTransaction 握手超时，订单安全关闭且不产生扣款。",
    },
  };

  const entry = typeMap[event.eventType];
  if (entry) return entry[lang];
  return localizeApiMessage(event.description || event.eventType, lang);
}

interface LanguageContextValue {
  lang: LangCode;
  setLang: (next: LangCode) => void;
  t: PwaTranslations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: PWA_DICTIONARY.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === "en" || saved === "ms" || saved === "zh") {
        setLangState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: PWA_DICTIONARY[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
