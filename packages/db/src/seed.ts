process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/ev_cpo_dev?schema=public";

import {
  prisma,
  hashPassword,
  RoleCode,
  UserStatus,
  ConnectorStandard,
  ChargerConnectionStatus,
  ConnectorOcppStatus,
} from "./index";

async function seed() {
  console.log("=== Seeding Malaysia EV CPO Platform (Phase 1A) Database ===");

  // 1. Sites
  const site1 = await prisma.site.upsert({
    where: { code: "MY-KL-001" },
    update: {
      name: "吉隆坡双子塔自营示范站",
      nameEn: "KLCC Flagship Demo Hub",
      nameMs: "Hab Demo Utama KLCC",
      countryCode: "MY",
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      address: "Jalan Ampang, Kuala Lumpur City Centre, 50088 Kuala Lumpur, Malaysia",
      latitude: 3.1579,
      longitude: 101.7116,
      isActive: true,
    },
    create: {
      code: "MY-KL-001",
      name: "吉隆坡双子塔自营示范站",
      nameEn: "KLCC Flagship Demo Hub",
      nameMs: "Hab Demo Utama KLCC",
      countryCode: "MY",
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      address: "Jalan Ampang, Kuala Lumpur City Centre, 50088 Kuala Lumpur, Malaysia",
      latitude: 3.1579,
      longitude: 101.7116,
      isActive: true,
    },
  });

  const site2 = await prisma.site.upsert({
    where: { code: "MY-PJ-002" },
    update: {
      name: "八打灵再也测试2站",
      nameEn: "Petaling Jaya Tech Hub",
      nameMs: "Hab Teknologi Petaling Jaya",
      countryCode: "MY",
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      address: "Section 13, 46200 Petaling Jaya, Selangor, Malaysia",
      latitude: 3.1121,
      longitude: 101.6398,
      isActive: true,
    },
    create: {
      code: "MY-PJ-002",
      name: "八打灵再也测试2站",
      nameEn: "Petaling Jaya Tech Hub",
      nameMs: "Hab Teknologi Petaling Jaya",
      countryCode: "MY",
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      address: "Section 13, 46200 Petaling Jaya, Selangor, Malaysia",
      latitude: 3.1121,
      longitude: 101.6398,
      isActive: true,
    },
  });

  console.log(`Seeded Sites: ${site1.code} (${site1.nameEn}), ${site2.code} (${site2.nameEn})`);

  // 2. Active Tariff
  const tariffName = "Malaysia Phase 1A Demo Tariff (20kW DC)";
  const existingTariff = await prisma.tariff.findFirst({
    where: { name: tariffName },
  });

  if (existingTariff) {
    await prisma.tariff.update({
      where: { id: existingTariff.id },
      data: {
        siteId: site1.id,
        currency: "MYR",
        energyPriceSenPerKwh: 120,
        serviceFeeSenPerKwh: 30,
        taxRateBps: 600,
        isTaxInclusive: true,
        isDemoPrice: true,
        isActive: true,
      },
    });
  } else {
    await prisma.tariff.create({
      data: {
        siteId: site1.id,
        name: tariffName,
        currency: "MYR",
        energyPriceSenPerKwh: 120,
        serviceFeeSenPerKwh: 30,
        taxRateBps: 600,
        isTaxInclusive: true,
        isDemoPrice: true,
        isActive: true,
      },
    });
  }
  console.log(`Seeded Active Tariff: ${tariffName} (120 + 30 Sen/kWh, 600 bps tax-inclusive)`);

  // 3. Chargers + Single-Gun Connectors (connectorId = 1) + Opaque QR Codes
  const chargersConfig = [
    {
      ocppId: "MY-KL-DC-001",
      siteId: site1.id,
      name: "KLCC 1号国标直流桩 (20kW GB/T)",
      vendor: "Techone",
      model: "GPEV20-BG102-S1P-EA",
      serialNumber: "SN-GPEV20-2026001",
      seccModel: "QY-SECC-02 (GB/T Native)",
      firmwareVersion: "V1.0.8-202604",
      ratedPowerKw: 20,
      staticPowerLimitKw: 20,
      voltageMinV: 200,
      voltageMaxV: 1000,
      currentMaxA: 66.7,
      requirePreparingState: false,
      connectionStatus: ChargerConnectionStatus.ONLINE,
      controllerOcppStatus: ConnectorOcppStatus.Available,
      connector: {
        standard: ConnectorStandard.GBT_DC,
        ocppStatus: ConnectorOcppStatus.Preparing,
        isPluggedIn: true,
        gunTemp1C: 32.4,
        gunTemp2C: 31.8,
        qrToken: "K9mP2xQ8vL4n",
      },
    },
    {
      ocppId: "MY-KL-DC-002",
      siteId: site1.id,
      name: "KLCC 2号欧标直流桩 (20kW CCS2)",
      vendor: "Techone",
      model: "GPEV20-BG102-S1P-EA",
      serialNumber: "SN-GPEV20-2026002",
      seccModel: "QY-SECC-02 (CCS2 PLC)",
      firmwareVersion: "V1.0.8-202604",
      ratedPowerKw: 20,
      staticPowerLimitKw: 20,
      voltageMinV: 200,
      voltageMaxV: 1000,
      currentMaxA: 66.7,
      requirePreparingState: true,
      connectionStatus: ChargerConnectionStatus.ONLINE,
      controllerOcppStatus: ConnectorOcppStatus.Available,
      connector: {
        standard: ConnectorStandard.CCS2,
        ocppStatus: ConnectorOcppStatus.Preparing,
        isPluggedIn: true,
        gunTemp1C: 33.1,
        gunTemp2C: 32.6,
        qrToken: "C7xR4tN9wM2p",
      },
    },
    {
      ocppId: "MY-PJ-DC-003",
      siteId: site2.id,
      name: "PJ 3号备用直流桩 (20kW CCS2)",
      vendor: "Techone",
      model: "GPEV20-BG102-S1P-EA",
      serialNumber: "SN-GPEV20-2026003",
      seccModel: "QY-SECC-01",
      firmwareVersion: "V1.0.5",
      ratedPowerKw: 20,
      staticPowerLimitKw: 20,
      voltageMinV: 200,
      voltageMaxV: 1000,
      currentMaxA: 66.7,
      requirePreparingState: false,
      connectionStatus: ChargerConnectionStatus.OFFLINE,
      controllerOcppStatus: ConnectorOcppStatus.Unavailable,
      connector: {
        standard: ConnectorStandard.CCS2,
        ocppStatus: ConnectorOcppStatus.Unavailable,
        isPluggedIn: false,
        gunTemp1C: null,
        gunTemp2C: null,
        qrToken: "P3zW8qB5jH6k",
      },
    },
  ];

  for (const cfg of chargersConfig) {
    const charger = await prisma.charger.upsert({
      where: { ocppId: cfg.ocppId },
      update: {
        siteId: cfg.siteId,
        name: cfg.name,
        vendor: cfg.vendor,
        model: cfg.model,
        serialNumber: cfg.serialNumber,
        seccModel: cfg.seccModel,
        firmwareVersion: cfg.firmwareVersion,
        ratedPowerKw: cfg.ratedPowerKw,
        staticPowerLimitKw: cfg.staticPowerLimitKw,
        voltageMinV: cfg.voltageMinV,
        voltageMaxV: cfg.voltageMaxV,
        currentMaxA: cfg.currentMaxA,
        requirePreparingState: cfg.requirePreparingState,
        connectionStatus: cfg.connectionStatus,
        controllerOcppStatus: cfg.controllerOcppStatus,
        isActive: true,
      },
      create: {
        ocppId: cfg.ocppId,
        siteId: cfg.siteId,
        name: cfg.name,
        vendor: cfg.vendor,
        model: cfg.model,
        serialNumber: cfg.serialNumber,
        seccModel: cfg.seccModel,
        firmwareVersion: cfg.firmwareVersion,
        ratedPowerKw: cfg.ratedPowerKw,
        staticPowerLimitKw: cfg.staticPowerLimitKw,
        voltageMinV: cfg.voltageMinV,
        voltageMaxV: cfg.voltageMaxV,
        currentMaxA: cfg.currentMaxA,
        requirePreparingState: cfg.requirePreparingState,
        connectionStatus: cfg.connectionStatus,
        controllerOcppStatus: cfg.controllerOcppStatus,
        isActive: true,
      },
    });

    const connector = await prisma.connector.upsert({
      where: {
        chargerId_connectorId: {
          chargerId: charger.id,
          connectorId: 1,
        },
      },
      update: {
        standard: cfg.connector.standard,
        ratedPowerKw: cfg.ratedPowerKw,
        ocppStatus: cfg.connector.ocppStatus,
        isPluggedIn: cfg.connector.isPluggedIn,
        gunTemp1C: cfg.connector.gunTemp1C,
        gunTemp2C: cfg.connector.gunTemp2C,
        isEnabled: true,
      },
      create: {
        chargerId: charger.id,
        connectorId: 1,
        standard: cfg.connector.standard,
        ratedPowerKw: cfg.ratedPowerKw,
        ocppStatus: cfg.connector.ocppStatus,
        isPluggedIn: cfg.connector.isPluggedIn,
        gunTemp1C: cfg.connector.gunTemp1C,
        gunTemp2C: cfg.connector.gunTemp2C,
        isEnabled: true,
      },
    });

    await prisma.connectorQrCode.upsert({
      where: { qrToken: cfg.connector.qrToken },
      update: {
        connectorId: connector.id,
        isActive: true,
        revokedAt: null,
      },
      create: {
        connectorId: connector.id,
        qrToken: cfg.connector.qrToken,
        isActive: true,
      },
    });

    console.log(
      `Seeded Charger ${charger.ocppId} -> Connector #1 (${connector.standard}) -> QR Token: ${cfg.connector.qrToken}`
    );
  }

  // 4. Test Accounts (all using password "Password123!")
  const passwordHash = hashPassword("Password123!");
  const accounts = [
    {
      email: "admin@evcpo.my",
      displayName: "System Administrator",
      status: UserStatus.ACTIVE,
      roles: [RoleCode.ADMIN, RoleCode.DRIVER],
      locale: "zh",
      phone: null as string | null,
      siteIds: [] as string[],
      emailVerificationCode: null as string | null,
      emailVerificationExp: null as Date | null,
    },
    {
      email: "cs@evcpo.my",
      displayName: "Customer Service Staff",
      status: UserStatus.ACTIVE,
      roles: [RoleCode.CUSTOMER_SERVICE],
      locale: "zh",
      phone: null as string | null,
      siteIds: [] as string[],
      emailVerificationCode: null as string | null,
      emailVerificationExp: null as Date | null,
    },
    {
      email: "staff-kl@evcpo.my",
      displayName: "KLCC Site Operator",
      status: UserStatus.ACTIVE,
      roles: [RoleCode.SITE_STAFF],
      locale: "zh",
      phone: null as string | null,
      siteIds: [site1.id],
      emailVerificationCode: null as string | null,
      emailVerificationExp: null as Date | null,
    },
    {
      email: "driver@evcpo.my",
      displayName: "Ahmad Razak (Verified Driver)",
      status: UserStatus.ACTIVE,
      roles: [RoleCode.DRIVER],
      locale: "en",
      phone: "+60123456789",
      siteIds: [] as string[],
      emailVerificationCode: null as string | null,
      emailVerificationExp: null as Date | null,
    },
    {
      email: "unverified@evcpo.my",
      displayName: "Unverified Test User",
      status: UserStatus.UNVERIFIED,
      roles: [RoleCode.DRIVER],
      locale: "ms",
      phone: null as string | null,
      siteIds: [] as string[],
      emailVerificationCode: "888666",
      emailVerificationExp: new Date(Date.now() + 86400000 * 7),
    },
  ];

  for (const acc of accounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        displayName: acc.displayName,
        status: acc.status,
        locale: acc.locale,
        phone: acc.phone,
        emailVerifiedAt: acc.status === UserStatus.ACTIVE ? new Date() : null,
      },
      create: {
        email: acc.email,
        displayName: acc.displayName,
        status: acc.status,
        locale: acc.locale,
        phone: acc.phone,
        emailVerifiedAt: acc.status === UserStatus.ACTIVE ? new Date() : null,
      },
    });

    await prisma.userCredential.upsert({
      where: { userId: user.id },
      update: {
        passwordHash,
        emailVerificationCode: acc.emailVerificationCode,
        emailVerificationExp: acc.emailVerificationExp,
      },
      create: {
        userId: user.id,
        passwordHash,
        emailVerificationCode: acc.emailVerificationCode,
        emailVerificationExp: acc.emailVerificationExp,
      },
    });

    // Replace user roles idempotently
    await prisma.role.deleteMany({ where: { userId: user.id } });
    for (const roleCode of acc.roles) {
      await prisma.role.create({
        data: {
          userId: user.id,
          roleCode,
        },
      });
    }

    // Replace site assignments idempotently
    await prisma.userSiteAssignment.deleteMany({ where: { userId: user.id } });
    for (const assignedSiteId of acc.siteIds) {
      await prisma.userSiteAssignment.create({
        data: {
          userId: user.id,
          siteId: assignedSiteId,
        },
      });
    }

    console.log(
      `Seeded Account: ${user.email} [${acc.status}] Roles=[${acc.roles.join(", ")}] Sites=[${acc.siteIds.length}]`
    );
  }

  console.log("=== Database Seed Complete ===");
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
