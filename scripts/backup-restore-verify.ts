import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PG_BIN_DIR = "C:\\software\\evTestEnvironment\\PostgreSQL\\pgsql\\bin";
const PG_DUMP_EXE = path.join(PG_BIN_DIR, "pg_dump.exe");
const PSQL_EXE = path.join(PG_BIN_DIR, "psql.exe");

const PG_HOST = process.env.PGHOST || "127.0.0.1";
const PG_PORT = process.env.PGPORT || "5432";
const PG_USER = process.env.PGUSER || "postgres";
const PG_PASSWORD = process.env.PGPASSWORD || "postgres";
const SOURCE_DB = "ev_cpo_dev";
const RESTORE_TEST_DB = "ev_cpo_restore_test";

const TABLES_TO_VERIFY = [
  "User",
  "UserCredential",
  "Role",
  "UserSiteAssignment",
  "Site",
  "Charger",
  "Connector",
  "ConnectorQrCode",
  "Tariff",
  "TariffSnapshot",
  "ChargingOrder",
  "ChargingOrderEvent",
  "OcppTransaction",
  "Payment",
  "AuditLog",
];

function runPgCommand(exePath: string, args: string[]): string {
  return execFileSync(exePath, args, {
    env: {
      ...process.env,
      PGPASSWORD: PG_PASSWORD,
    },
    encoding: "utf8",
  });
}

function getTableCounts(dbName: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of TABLES_TO_VERIFY) {
    const sql = `SELECT COUNT(*) FROM "${table}";`;
    const output = runPgCommand(PSQL_EXE, [
      "-h",
      PG_HOST,
      "-p",
      PG_PORT,
      "-U",
      PG_USER,
      "-d",
      dbName,
      "-t",
      "-A",
      "-c",
      sql,
    ]).trim();
    counts[table] = Number(output);
  }
  return counts;
}

function main() {
  console.log("=== Section 15.1 Item 8: PostgreSQL Backup & Restore Drill ===");

  const rootDir = path.resolve(__dirname, "..");
  const backupDir = path.join(rootDir, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `${SOURCE_DB}_backup_${timestamp}.sql`);

  // 1. Run pg_dump to create a timestamped SQL backup
  console.log(`[1/5] Dumping ${SOURCE_DB} to ${backupFile}...`);
  runPgCommand(PG_DUMP_EXE, [
    "-h",
    PG_HOST,
    "-p",
    PG_PORT,
    "-U",
    PG_USER,
    "-d",
    SOURCE_DB,
    "--no-owner",
    "--no-privileges",
    "-f",
    backupFile,
  ]);

  const stats = fs.statSync(backupFile);
  console.log(`      Backup created (${stats.size} bytes).`);

  // 2. Create temporary test database ev_cpo_restore_test
  console.log(`[2/5] Recreating temporary database ${RESTORE_TEST_DB}...`);
  runPgCommand(PSQL_EXE, [
    "-h",
    PG_HOST,
    "-p",
    PG_PORT,
    "-U",
    PG_USER,
    "-d",
    "postgres",
    "-c",
    `DROP DATABASE IF EXISTS "${RESTORE_TEST_DB}";`,
  ]);
  runPgCommand(PSQL_EXE, [
    "-h",
    PG_HOST,
    "-p",
    PG_PORT,
    "-U",
    PG_USER,
    "-d",
    "postgres",
    "-c",
    `CREATE DATABASE "${RESTORE_TEST_DB}";`,
  ]);

  try {
    // 3. Restore SQL dump into ev_cpo_restore_test
    console.log(`[3/5] Restoring SQL backup into ${RESTORE_TEST_DB}...`);
    runPgCommand(PSQL_EXE, [
      "-h",
      PG_HOST,
      "-p",
      PG_PORT,
      "-U",
      PG_USER,
      "-d",
      RESTORE_TEST_DB,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      backupFile,
    ]);

    // 4. Verify table row counts match ev_cpo_dev
    console.log(`[4/5] Verifying table row counts between ${SOURCE_DB} and ${RESTORE_TEST_DB}...`);
    const sourceCounts = getTableCounts(SOURCE_DB);
    const restoredCounts = getTableCounts(RESTORE_TEST_DB);

    let allMatch = true;
    for (const table of TABLES_TO_VERIFY) {
      const src = sourceCounts[table];
      const dst = restoredCounts[table];
      const match = src === dst;
      if (!match) allMatch = false;
      console.log(`      Table "${table}": source=${src}, restored=${dst} [${match ? "MATCH" : "MISMATCH"}]`);
    }

    if (!allMatch) {
      throw new Error("Row count mismatch detected between source and restored database!");
    }
    console.log("      All verified table row counts match 100%.");
  } finally {
    // 5. Drop temporary database ev_cpo_restore_test
    console.log(`[5/5] Dropping temporary database ${RESTORE_TEST_DB}...`);
    runPgCommand(PSQL_EXE, [
      "-h",
      PG_HOST,
      "-p",
      PG_PORT,
      "-U",
      PG_USER,
      "-d",
      "postgres",
      "-c",
      `DROP DATABASE IF EXISTS "${RESTORE_TEST_DB}";`,
    ]);
  }

  console.log("=== Backup & Restore Drill Succeeded ===");
}

main();
