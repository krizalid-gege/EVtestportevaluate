export type Locale = "en" | "ms" | "zh";

export const SUPPORTED_LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "MY/EN" },
  { code: "ms", label: "Bahasa Melayu", flag: "MY/BM" },
  { code: "zh", label: "简体中文", flag: "CN/ZH" },
];

export interface I18nStrings {
  // Header & Navigation
  appTitle: string;
  appSubtitle: string;
  navScanCharge: string;
  navMyOrders: string;
  navAdminConsole: string;
  navLogin: string;
  navLogout: string;
  languageLabel: string;
  activeSessionBannerTitle: string;
  activeSessionBannerAction: string;
  demoModeBadge: string;

  // Auth: Login / Register / Verify Email / Reset Password
  authTitleLogin: string;
  authTitleRegister: string;
  authTitleVerifyEmail: string;
  authTitleResetPassword: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  verificationCodeLabel: string;
  verificationCodePlaceholder: string;
  resetTokenLabel: string;
  newPasswordLabel: string;
  loginButton: string;
  registerButton: string;
  verifyEmailButton: string;
  requestResetButton: string;
  confirmResetButton: string;
  switchToRegister: string;
  switchToLogin: string;
  switchToResetPassword: string;
  unverifiedBannerTitle: string;
  unverifiedBannerDesc: string;
  demoQuickSwitchTitle: string;
  demoVerificationCodeHint: string;
  passwordResetGenericNotice: string;

  // Connector & Charger Statuses (Non-Chinese enum keys -> Localized display)
  connectorStatus: {
    Available: string;
    Preparing: string;
    Charging: string;
    SuspendedEVSE: string;
    SuspendedEV: string;
    Finishing: string;
    Reserved: string;
    Unavailable: string;
    Faulted: string;
  };
  connectionStatus: {
    ONLINE: string;
    OFFLINE: string;
  };
  plugStatus: {
    pluggedIn: string;
    unplugged: string;
    requirePreparingHint: string;
  };

  // Tariff Breakdown & Simulated Payment Disclosure
  tariffSectionTitle: string;
  energyFeeLabel: string;
  serviceFeeLabel: string;
  totalRateLabel: string;
  sstIncludedLabel: string;
  perKwhUnit: string;
  simulatedPaymentBadge: string;
  simulatedPaymentNotice: string;
  immutableSnapshotNotice: string;

  // Charging Actions & 20s QuanYao SECC Handshake Steps
  startChargingButton: string;
  startingChargingButton: string;
  stopChargingButton: string;
  stoppingChargingButton: string;
  handshakeTitle: string;
  handshakeSubtitle: string;
  handshakeSteps: {
    step1CommandSent: string;
    step2CpWakeupSlac: string;
    step3ImdInsulationTest: string;
    step4PrechargePowerOutput: string;
  };

  // Active Charging Metrics
  activeChargingTitle: string;
  metrics: {
    energyKwh: string;
    powerKw: string;
    voltageV: string;
    currentA: string;
    socPercent: string;
    gunTempC: string;
    trialTotalRm: string;
    remainingTimeMin: string;
  };

  // Order Statuses & Completed Order Receipt
  orderStatus: {
    DRAFT: string;
    AUTHORIZING: string;
    READY_TO_START: string;
    STARTING: string;
    CHARGING: string;
    STOPPING: string;
    SETTLING: string;
    COMPLETED: string;
    AUTHORIZATION_FAILED: string;
    START_FAILED: string;
    INTERRUPTED: string;
    MANUAL_REVIEW: string;
    CANCELLED: string;
  };
  receipt: {
    title: string;
    orderNo: string;
    siteAndCharger: string;
    connectorStandard: string;
    tariffSnapshot: string;
    chargedEnergy: string;
    energyFee: string;
    serviceFee: string;
    subtotal: string;
    taxSnapshot: string;
    totalAmount: string;
    paymentMode: string;
    paymentStatus: string;
    SIMULATED_SUCCEEDED: string;
    SIMULATED_PENDING: string;
    SIMULATED_CANCELLED: string;
    startedAt: string;
    stoppedAt: string;
    settledAt: string;
    stopReason: string;
    ocppTransactionId: string;
    ocppIdTag: string;
  };

  // Error Messages
  errors: {
    EMAIL_UNVERIFIED: string;
    CONNECTOR_OCCUPIED: string;
    CHARGER_UNAVAILABLE: string;
    GUN_NOT_PLUGGED: string;
    INVALID_CREDENTIALS: string;
    ACCOUNT_DISABLED: string;
    INVALID_VERIFICATION_CODE: string;
    UNAUTHORIZED: string;
    FORBIDDEN: string;
    ORDER_NOT_FOUND: string;
    GENERIC_ERROR: string;
  };
}

export const I18N_DICTIONARY: Record<Locale, I18nStrings> = {
  en: {
    appTitle: "Malaysia EV CPO",
    appSubtitle: "20kW DC Fast Charging Network (Phase 1A)",
    navScanCharge: "Scan & Charge",
    navMyOrders: "My Orders",
    navAdminConsole: "Operations Console",
    navLogin: "Sign In",
    navLogout: "Sign Out",
    languageLabel: "Language",
    activeSessionBannerTitle: "Active Charging Session in Progress",
    activeSessionBannerAction: "Return to Session",
    demoModeBadge: "SIMULATED PAYMENT - NO REAL CHARGE",

    authTitleLogin: "Sign In to Charge",
    authTitleRegister: "Create EV Driver Account",
    authTitleVerifyEmail: "Verify Your Email Address",
    authTitleResetPassword: "Reset Password",
    emailLabel: "Email Address",
    emailPlaceholder: "driver@evcpo.my",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    displayNameLabel: "Full Name",
    displayNamePlaceholder: "Ahmad Daniel",
    phoneLabel: "Mobile Number (Optional)",
    phonePlaceholder: "+60 12-345 6789",
    verificationCodeLabel: "6-Digit Verification Code",
    verificationCodePlaceholder: "888666",
    resetTokenLabel: "Reset Token / Code",
    newPasswordLabel: "New Password",
    loginButton: "Sign In",
    registerButton: "Register & Receive Code",
    verifyEmailButton: "Verify Email Now",
    requestResetButton: "Send Reset Instructions",
    confirmResetButton: "Update Password",
    switchToRegister: "New driver? Create an account",
    switchToLogin: "Already have an account? Sign in",
    switchToResetPassword: "Forgot password?",
    unverifiedBannerTitle: "Email Verification Required Before Charging",
    unverifiedBannerDesc: "You can browse chargers and rates, but you must verify your email before starting a charging session.",
    demoQuickSwitchTitle: "One-Click Demo Account Switch (Phase 1A Evaluation)",
    demoVerificationCodeHint: "Demo Mode Verification Code:",
    passwordResetGenericNotice: "If an account exists for that email, a password reset code has been dispatched.",

    connectorStatus: {
      Available: "Available",
      Preparing: "Preparing (Plugged In)",
      Charging: "Charging",
      SuspendedEVSE: "Suspended by Charger",
      SuspendedEV: "Suspended by Vehicle",
      Finishing: "Finishing",
      Reserved: "Reserved",
      Unavailable: "Unavailable",
      Faulted: "Faulted",
    },
    connectionStatus: {
      ONLINE: "Online",
      OFFLINE: "Offline",
    },
    plugStatus: {
      pluggedIn: "Charging Gun Connected",
      unplugged: "Charging Gun Not Connected",
      requirePreparingHint: "Please plug the DC charging gun firmly into your vehicle port first.",
    },

    tariffSectionTitle: "Transparent Tariff Breakdown (MYR)",
    energyFeeLabel: "Energy Fee",
    serviceFeeLabel: "DC Fast Service Fee",
    totalRateLabel: "Total Rate",
    sstIncludedLabel: "6% SST Included",
    perKwhUnit: "/ kWh",
    simulatedPaymentBadge: "SIMULATED PAYMENT - NO REAL CHARGE",
    simulatedPaymentNotice: "Phase 1A Trial Mode: Authorization and settlement are 100% simulated in MYR. No real bank card or e-wallet is charged.",
    immutableSnapshotNotice: "Rate is locked via an immutable Tariff Snapshot the moment you tap Start Charging.",

    startChargingButton: "Start Charging (Simulated MYR)",
    startingChargingButton: "Authorizing & Starting...",
    stopChargingButton: "Stop Charging",
    stoppingChargingButton: "Sending RemoteStop...",
    handshakeTitle: "20kW DC SECC Handshake Progress",
    handshakeSubtitle: "Techone GPEV20 + QuanYao QY-SECC-02 (GB/T & CCS2 Bridge)",
    handshakeSteps: {
      step1CommandSent: "1. Command Sent",
      step2CpWakeupSlac: "2. CP 4s Wakeup & SLAC",
      step3ImdInsulationTest: "3. IMD 30s Insulation Test",
      step4PrechargePowerOutput: "4. Precharge & Power Output",
    },

    activeChargingTitle: "Live DC Fast Charging Telemetry",
    metrics: {
      energyKwh: "Energy kWh",
      powerKw: "Power kW",
      voltageV: "Voltage V",
      currentA: "Current A",
      socPercent: "SoC %",
      gunTempC: "Gun Temp °C",
      trialTotalRm: "Trial Total RM",
      remainingTimeMin: "Est. Remaining",
    },

    orderStatus: {
      DRAFT: "Draft",
      AUTHORIZING: "Authorizing",
      READY_TO_START: "Ready to Start",
      STARTING: "Starting Handshake",
      CHARGING: "Charging Active",
      STOPPING: "Stopping",
      SETTLING: "Settling Bill",
      COMPLETED: "Completed",
      AUTHORIZATION_FAILED: "Authorization Failed",
      START_FAILED: "Start Failed",
      INTERRUPTED: "Interrupted",
      MANUAL_REVIEW: "Manual Review",
      CANCELLED: "Cancelled",
    },
    receipt: {
      title: "Charging Order Receipt",
      orderNo: "Order No",
      siteAndCharger: "Station & Charger",
      connectorStandard: "Connector Standard",
      tariffSnapshot: "Tariff Snapshot",
      chargedEnergy: "Charged Energy",
      energyFee: "Energy Fee",
      serviceFee: "Service Fee",
      subtotal: "Subtotal (Excl. Tax)",
      taxSnapshot: "Tax Snapshot (6% SST)",
      totalAmount: "Total Amount",
      paymentMode: "Payment Mode",
      paymentStatus: "Payment Status",
      SIMULATED_SUCCEEDED: "SIMULATED_SUCCEEDED",
      SIMULATED_PENDING: "SIMULATED_PENDING",
      SIMULATED_CANCELLED: "SIMULATED_CANCELLED",
      startedAt: "Start Time (MYT)",
      stoppedAt: "Stop Time (MYT)",
      settledAt: "Settled Time (MYT)",
      stopReason: "Stop Reason",
      ocppTransactionId: "OCPP Transaction ID",
      ocppIdTag: "OCPP Session ID Tag",
    },

    errors: {
      EMAIL_UNVERIFIED: "Please verify your email address before starting a charging session.",
      CONNECTOR_OCCUPIED: "This connector already has an active charging session in progress.",
      CHARGER_UNAVAILABLE: "Charger is currently offline, faulted, or unavailable for charging.",
      GUN_NOT_PLUGGED: "Charging gun is not plugged in (Preparing state required).",
      INVALID_CREDENTIALS: "Invalid email or password.",
      ACCOUNT_DISABLED: "Your account has been disabled. Please contact customer support.",
      INVALID_VERIFICATION_CODE: "Invalid or expired verification code.",
      UNAUTHORIZED: "Please sign in to continue.",
      FORBIDDEN: "You do not have permission to perform this action.",
      ORDER_NOT_FOUND: "Charging order not found.",
      GENERIC_ERROR: "An unexpected error occurred. Please try again.",
    },
  },

  ms: {
    appTitle: "Malaysia EV CPO",
    appSubtitle: "Rangkaian Pengecasan Pantas DC 20kW (Fasa 1A)",
    navScanCharge: "Imbas & Cas",
    navMyOrders: "Pesanan Saya",
    navAdminConsole: "Konsol Operasi",
    navLogin: "Log Masuk",
    navLogout: "Log Keluar",
    languageLabel: "Bahasa",
    activeSessionBannerTitle: "Sesi Pengecasan Sedang Aktif",
    activeSessionBannerAction: "Kembali ke Sesi",
    demoModeBadge: "SIMULATED PAYMENT - NO REAL CHARGE",

    authTitleLogin: "Log Masuk untuk Mengecas",
    authTitleRegister: "Daftar Akaun Pemandu EV",
    authTitleVerifyEmail: "Sahkan Alamat E-mel Anda",
    authTitleResetPassword: "Set Semula Kata Laluan",
    emailLabel: "Alamat E-mel",
    emailPlaceholder: "driver@evcpo.my",
    passwordLabel: "Kata Laluan",
    passwordPlaceholder: "Masukkan kata laluan",
    displayNameLabel: "Nama Penuh",
    displayNamePlaceholder: "Ahmad Daniel",
    phoneLabel: "Nombor Telefon Bimbit (Pilihan)",
    phonePlaceholder: "+60 12-345 6789",
    verificationCodeLabel: "Kod Pengesahan 6-Digit",
    verificationCodePlaceholder: "888666",
    resetTokenLabel: "Token / Kod Set Semula",
    newPasswordLabel: "Kata Laluan Baharu",
    loginButton: "Log Masuk",
    registerButton: "Daftar & Terima Kod",
    verifyEmailButton: "Sahkan E-mel Sekarang",
    requestResetButton: "Hantar Arahan Set Semula",
    confirmResetButton: "Kemas Kini Kata Laluan",
    switchToRegister: "Pemandu baharu? Cipta akaun",
    switchToLogin: "Sudah mempunyai akaun? Log masuk",
    switchToResetPassword: "Lupa kata laluan?",
    unverifiedBannerTitle: "Pengesahan E-mel Diperlukan Sebelum Mengecas",
    unverifiedBannerDesc: "Anda boleh menyemak pengecas dan kadar harga, tetapi sila sahkan e-mel anda sebelum memulakan pengecasan.",
    demoQuickSwitchTitle: "Tukar Akaun Demo Satu Klik (Penilaian Fasa 1A)",
    demoVerificationCodeHint: "Kod Pengesahan Mod Demo:",
    passwordResetGenericNotice: "Jika akaun wujud untuk e-mel tersebut, kod set semula kata laluan telah dihantar.",

    connectorStatus: {
      Available: "Tersedia (Available)",
      Preparing: "Bersedia (Dipasang)",
      Charging: "Sedang Mengecas",
      SuspendedEVSE: "Dijeda oleh Pengecas",
      SuspendedEV: "Dijeda oleh Kenderaan",
      Finishing: "Menamatkan Sesi",
      Reserved: "Ditempah",
      Unavailable: "Tidak Tersedia",
      Faulted: "Ralat Perkakasan",
    },
    connectionStatus: {
      ONLINE: "Dalam Talian",
      OFFLINE: "Luar Talian",
    },
    plugStatus: {
      pluggedIn: "Kabel Pengecas Dipasang",
      unplugged: "Kabel Pengecas Belum Dipasang",
      requirePreparingHint: "Sila pasangkan muncung pengecas DC dengan kemas pada kenderaan anda dahulu.",
    },

    tariffSectionTitle: "Pecahan Tarif Telus (MYR)",
    energyFeeLabel: "Caj Tenaga",
    serviceFeeLabel: "Caj Perkhidmatan Pantas DC",
    totalRateLabel: "Kadar Jumlah",
    sstIncludedLabel: "Termasuk 6% SST",
    perKwhUnit: "/ kWh",
    simulatedPaymentBadge: "SIMULATED PAYMENT - NO REAL CHARGE",
    simulatedPaymentNotice: "Mod Percubaan Fasa 1A: Kebenaran dan penyelesaian pembayaran disimulasikan 100% dalam MYR. Tiada caj bank atau e-dompet sebenar dikenakan.",
    immutableSnapshotNotice: "Kadar harga dikunci melalui Tangkap Layar Tarif tetap sebaik sahaja anda menekan Mula Mengecas.",

    startChargingButton: "Mula Mengecas (Simulasi MYR)",
    startingChargingButton: "Mengesahkan & Memulakan...",
    stopChargingButton: "Henti Mengecas",
    stoppingChargingButton: "Menghantar Arahan Henti...",
    handshakeTitle: "Kemajuan Jabat Tangan SECC DC 20kW",
    handshakeSubtitle: "Techone GPEV20 + QuanYao QY-SECC-02 (Jambatan GB/T & CCS2)",
    handshakeSteps: {
      step1CommandSent: "1. Command Sent (Arahan Dihantar)",
      step2CpWakeupSlac: "2. CP 4s Wakeup & SLAC",
      step3ImdInsulationTest: "3. IMD 30s Insulation Test",
      step4PrechargePowerOutput: "4. Precharge & Power Output",
    },

    activeChargingTitle: "Telemetri Pengecasan Pantas DC Masa Nyata",
    metrics: {
      energyKwh: "Energy kWh",
      powerKw: "Power kW",
      voltageV: "Voltage V",
      currentA: "Current A",
      socPercent: "SoC %",
      gunTempC: "Gun Temp °C",
      trialTotalRm: "Trial Total RM",
      remainingTimeMin: "Anggaran Masa",
    },

    orderStatus: {
      DRAFT: "Draf",
      AUTHORIZING: "Mengesahkan",
      READY_TO_START: "Sedia Dimulakan",
      STARTING: "Memulakan Jabat Tangan",
      CHARGING: "Sedang Mengecas",
      STOPPING: "Sedang Berhenti",
      SETTLING: "Menyelesaikan Bil",
      COMPLETED: "Selesai",
      AUTHORIZATION_FAILED: "Pengesahan Gagal",
      START_FAILED: "Gagal Dimulakan",
      INTERRUPTED: "Terputus",
      MANUAL_REVIEW: "Semakan Manual",
      CANCELLED: "Dibatalkan",
    },
    receipt: {
      title: "Resit Pesanan Pengecasan",
      orderNo: "Order No",
      siteAndCharger: "Stesen & Pengecas",
      connectorStandard: "Piawaian Penyambung",
      tariffSnapshot: "Tariff Snapshot",
      chargedEnergy: "Tenaga Dicas",
      energyFee: "Energy Fee",
      serviceFee: "Service Fee",
      subtotal: "Subjumlah (Tanpa Cukai)",
      taxSnapshot: "Tax Snapshot (6% SST)",
      totalAmount: "Total Amount",
      paymentMode: "Mod Pembayaran",
      paymentStatus: "Status Pembayaran",
      SIMULATED_SUCCEEDED: "SIMULATED_SUCCEEDED",
      SIMULATED_PENDING: "SIMULATED_PENDING",
      SIMULATED_CANCELLED: "SIMULATED_CANCELLED",
      startedAt: "Masa Mula (MYT)",
      stoppedAt: "Masa Tamat (MYT)",
      settledAt: "Masa Selesai (MYT)",
      stopReason: "Sebab Berhenti",
      ocppTransactionId: "ID Transaksi OCPP",
      ocppIdTag: "Tag ID Sesi OCPP",
    },

    errors: {
      EMAIL_UNVERIFIED: "Sila sahkan alamat e-mel anda sebelum memulakan sesi pengecasan.",
      CONNECTOR_OCCUPIED: "Penyambung ini sedang digunakan oleh sesi pengecasan aktif yang lain.",
      CHARGER_UNAVAILABLE: "Pengecas kini berada di luar talian, mengalami ralat, atau tidak tersedia.",
      GUN_NOT_PLUGGED: "Kabel pengecas belum dipasang (status Preparing diperlukan).",
      INVALID_CREDENTIALS: "E-mel atau kata laluan tidak sah.",
      ACCOUNT_DISABLED: "Akaun anda telah dinyahaktifkan. Sila hubungi khidmat pelanggan.",
      INVALID_VERIFICATION_CODE: "Kod pengesahan tidak sah atau telah tamat tempoh.",
      UNAUTHORIZED: "Sila log masuk untuk meneruskan.",
      FORBIDDEN: "Anda tidak mempunyai kebenaran untuk melakukan tindakan ini.",
      ORDER_NOT_FOUND: "Pesanan pengecasan tidak ditemui.",
      GENERIC_ERROR: "Ralat tidak dijangka berlaku. Sila cuba lagi.",
    },
  },

  zh: {
    appTitle: "马来西亚 EV 充电运营平台",
    appSubtitle: "20kW 单枪直流快充网络 (Phase 1A 试运营)",
    navScanCharge: "扫码充电",
    navMyOrders: "我的订单",
    navAdminConsole: "运营后台",
    navLogin: "登录",
    navLogout: "退出登录",
    languageLabel: "语言",
    activeSessionBannerTitle: "当前有进行中的充电订单",
    activeSessionBannerAction: "返回充电页",
    demoModeBadge: "模拟支付 - 不会产生真实扣款 (SIMULATED PAYMENT - NO REAL CHARGE)",

    authTitleLogin: "登录以开始充电",
    authTitleRegister: "注册 EV 车主账号",
    authTitleVerifyEmail: "验证您的电子邮箱",
    authTitleResetPassword: "重置密码",
    emailLabel: "电子邮箱",
    emailPlaceholder: "driver@evcpo.my",
    passwordLabel: "登录密码",
    passwordPlaceholder: "请输入密码",
    displayNameLabel: "姓名 / 昵称",
    displayNamePlaceholder: "Ahmad Daniel",
    phoneLabel: "手机号码 (选填，Phase 1B 预留)",
    phonePlaceholder: "+60 12-345 6789",
    verificationCodeLabel: "6位邮箱验证码",
    verificationCodePlaceholder: "888666",
    resetTokenLabel: "重置验证码 / Token",
    newPasswordLabel: "新密码",
    loginButton: "立即登录",
    registerButton: "注册并获取验证码",
    verifyEmailButton: "立即验证邮箱",
    requestResetButton: "发送重置验证码",
    confirmResetButton: "确认更新密码",
    switchToRegister: "新用户？点击注册账号",
    switchToLogin: "已有账号？返回登录",
    switchToResetPassword: "忘记密码？",
    unverifiedBannerTitle: "启动充电前需完成邮箱验证",
    unverifiedBannerDesc: "未验证邮箱可正常登录浏览站点与费率，但需完成 6 位验证码校验后方可启动充电。",
    demoQuickSwitchTitle: "一键切换演示角色账号 (Phase 1A 验收专用)",
    demoVerificationCodeHint: "演示模式验证码：",
    passwordResetGenericNotice: "若该邮箱已注册，密码重置验证码已发送至对应信箱（防撞库统一提示）。",

    connectorStatus: {
      Available: "空闲可用 (Available)",
      Preparing: "已插枪就绪 (Preparing)",
      Charging: "充电中 (Charging)",
      SuspendedEVSE: "桩端暂停 (SuspendedEVSE)",
      SuspendedEV: "车端暂停 (SuspendedEV)",
      Finishing: "结束拔枪中 (Finishing)",
      Reserved: "已预约 (Reserved)",
      Unavailable: "不可用 (Unavailable)",
      Faulted: "设备故障 (Faulted)",
    },
    connectionStatus: {
      ONLINE: "在线 (ONLINE)",
      OFFLINE: "离线 (OFFLINE)",
    },
    plugStatus: {
      pluggedIn: "充电枪已连接车辆",
      unplugged: "充电枪未插枪",
      requirePreparingHint: "请先将 20kW 直流充电枪插紧至车辆充电口。",
    },

    tariffSectionTitle: "透明费率明细 (马来西亚林吉特 MYR)",
    energyFeeLabel: "电费 (Energy Fee)",
    serviceFeeLabel: "直流快充服务费 (Service Fee)",
    totalRateLabel: "含税总单价",
    sstIncludedLabel: "已含 6% SST 销售与服务税",
    perKwhUnit: "/ kWh",
    simulatedPaymentBadge: "SIMULATED PAYMENT - NO REAL CHARGE",
    simulatedPaymentNotice: "Phase 1A 模拟支付模式：授权与结算全程以 MYR 模拟演示，不产生任何真实银行卡或电子钱包扣款。",
    immutableSnapshotNotice: "点击启动充电瞬间即生成不可变费率快照 (TariffSnapshot)，后续后台改价不影响当前订单。",

    startChargingButton: "启动充电 (模拟支付 MYR)",
    startingChargingButton: "正在授权并下发启动...",
    stopChargingButton: "结束充电",
    stoppingChargingButton: "正在下发停止指令...",
    handshakeTitle: "20kW 直流桩 + 全耀 SECC 启动握手进度",
    handshakeSubtitle: "泰克能 GPEV20-BG102-S1P-EA + 全耀 QY-SECC-02 (国标转欧标桥接)",
    handshakeSteps: {
      step1CommandSent: "1. Command Sent (远程启动已下发)",
      step2CpWakeupSlac: "2. CP 4s Wakeup & SLAC (4秒唤醒与PLC匹配)",
      step3ImdInsulationTest: "3. IMD 30s Insulation Test (30秒绝缘检测)",
      step4PrechargePowerOutput: "4. Precharge & Power Output (预充与功率输出)",
    },

    activeChargingTitle: "实时直流充电遥测数据",
    metrics: {
      energyKwh: "已充电量 (Energy kWh)",
      powerKw: "实时功率 (Power kW)",
      voltageV: "输出电压 (Voltage V)",
      currentA: "输出电流 (Current A)",
      socPercent: "车辆电量 (SoC %)",
      gunTempC: "枪头温度 (Gun Temp °C)",
      trialTotalRm: "试算总额 (Trial Total RM)",
      remainingTimeMin: "预计剩余时间",
    },

    orderStatus: {
      DRAFT: "草稿 (DRAFT)",
      AUTHORIZING: "模拟授权中 (AUTHORIZING)",
      READY_TO_START: "准备启动 (READY_TO_START)",
      STARTING: "握手启动中 (STARTING)",
      CHARGING: "充电中 (CHARGING)",
      STOPPING: "停止中 (STOPPING)",
      SETTLING: "结算中 (SETTLING)",
      COMPLETED: "已完成 (COMPLETED)",
      AUTHORIZATION_FAILED: "授权失败 (AUTHORIZATION_FAILED)",
      START_FAILED: "启动失败 (START_FAILED)",
      INTERRUPTED: "异常中断 (INTERRUPTED)",
      MANUAL_REVIEW: "人工复核 (MANUAL_REVIEW)",
      CANCELLED: "已取消 (CANCELLED)",
    },
    receipt: {
      title: "充电订单结算账单",
      orderNo: "订单编号 (Order No)",
      siteAndCharger: "充电站与充电桩",
      connectorStandard: "枪头标准",
      tariffSnapshot: "费率快照 (Tariff Snapshot)",
      chargedEnergy: "充电电量",
      energyFee: "电费金额 (Energy Fee)",
      serviceFee: "服务费金额 (Service Fee)",
      subtotal: "不含税小计",
      taxSnapshot: "税费快照 (Tax Snapshot 6% SST)",
      totalAmount: "结算总额 (Total Amount)",
      paymentMode: "支付模式",
      paymentStatus: "支付状态",
      SIMULATED_SUCCEEDED: "模拟扣款成功 (SIMULATED_SUCCEEDED)",
      SIMULATED_PENDING: "模拟待结算 (SIMULATED_PENDING)",
      SIMULATED_CANCELLED: "模拟已取消 (SIMULATED_CANCELLED)",
      startedAt: "启动时间 (MYT)",
      stoppedAt: "结束时间 (MYT)",
      settledAt: "结算时间 (MYT)",
      stopReason: "结束原因",
      ocppTransactionId: "OCPP 交易号",
      ocppIdTag: "OCPP 会话令牌",
    },

    errors: {
      EMAIL_UNVERIFIED: "请先完成邮箱验证码校验后再启动充电。",
      CONNECTOR_OCCUPIED: "该枪头当前已有进行中的充电订单，请勿重复启动。",
      CHARGER_UNAVAILABLE: "当前充电桩离线、故障或不可用，无法下发启动指令。",
      GUN_NOT_PLUGGED: "检测到充电枪尚未插枪就绪 (需处于 Preparing 状态)。",
      INVALID_CREDENTIALS: "邮箱或密码错误。",
      ACCOUNT_DISABLED: "当前账号已被禁用，请联系运营客服。",
      INVALID_VERIFICATION_CODE: "验证码无效或已过期。",
      UNAUTHORIZED: "请先登录后再操作。",
      FORBIDDEN: "您当前的权限角色无权执行此操作。",
      ORDER_NOT_FOUND: "未找到对应的充电订单。",
      GENERIC_ERROR: "请求处理异常，请稍后重试。",
    },
  },
};

export function normalizeLocale(input?: string | null): Locale {
  if (input === "ms" || input === "zh" || input === "en") {
    return input;
  }
  return "en";
}

export function getDictionary(locale?: string | null): I18nStrings {
  return I18N_DICTIONARY[normalizeLocale(locale)];
}

export const translations = I18N_DICTIONARY;
export const dictionary = I18N_DICTIONARY;
