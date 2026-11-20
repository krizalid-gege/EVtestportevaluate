"use client";

import React from "react";
import Link from "next/link";
import {
  Zap,
  QrCode,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  Cpu,
  Gauge,
  ArrowRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function LandingPage() {
  const { t } = useLanguage();

  const seededChargers = [
    {
      ocppId: "MY-KL-DC-001",
      qrToken: "K9mP2xQ8vL4n",
      standard: "GB/T 27930 DC",
      power: "20 kW (200-1000Vdc)",
      model: "Techone GPEV20-BG102-S1P-EA",
      secc: "QuanYao QY-SECC-02",
      online: true,
      title: t.charger1Title,
      desc: t.charger1Desc,
    },
    {
      ocppId: "MY-KL-DC-002",
      qrToken: "C7xR4tN9wM2p",
      standard: "CCS2 DC",
      power: "20 kW (200-1000Vdc)",
      model: "Techone GPEV20-BG102-S1P-EA",
      secc: "QuanYao QY-SECC-02",
      online: true,
      title: t.charger2Title,
      desc: t.charger2Desc,
    },
    {
      ocppId: "MY-PJ-DC-003",
      qrToken: "P3zW8qB5jH6k",
      standard: "CCS2 DC",
      power: "20 kW (200-1000Vdc)",
      model: "Techone GPEV20-BG102-S1P-EA",
      secc: "QuanYao QY-SECC-02",
      online: false,
      title: t.charger3Title,
      desc: t.charger3Desc,
    },
  ];

  return (
    <div className="container-pwa">
      {/* Phase 1A Simulated Payment Notice Banner */}
      <div className="sim-payment-banner" style={{ marginBottom: "1.25rem" }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <div>
          <div>{t.simulatedPaymentNotice}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary)" }}>
            {t.simulatedPaymentSub} • <Clock size={12} style={{ display: "inline" }} />{" "}
            {t.timezoneLabel}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="card-emerald" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-emerald">
            <Zap size={13} />
            {t.heroBadge}
          </span>
          <span className="badge badge-cyan">MYR (RM) • Integer Sen & Wh</span>
          <span className="badge badge-neutral">EN | BM | 中文</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(1.45rem, 3vw, 2.05rem)",
            fontWeight: 800,
            marginBottom: "0.6rem",
            lineHeight: 1.2,
          }}
        >
          {t.heroTitle}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "780px" }}>
          {t.heroDesc}
        </p>
      </section>

      {/* Quick Scan Charger Entry Cards */}
      <section style={{ marginBottom: "1.75rem" }}>
        <div style={{ marginBottom: "0.95rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>{t.quickScanTitle}</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t.quickScanSubtitle}</p>
        </div>

        <div className="grid-3">
          {seededChargers.map((c) => (
            <div
              key={c.ocppId}
              className={c.online ? "card-elevated" : "card"}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1rem",
                borderColor: c.online
                  ? "rgba(16, 185, 129, 0.38)"
                  : "rgba(239, 68, 68, 0.35)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.65rem",
                  }}
                >
                  <span className="badge badge-neutral mono">{c.ocppId}</span>
                  {c.online ? (
                    <span className="badge badge-emerald">
                      <Wifi size={12} />
                      ONLINE
                    </span>
                  ) : (
                    <span className="badge badge-red">
                      <WifiOff size={12} />
                      OFFLINE
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "1.02rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  {c.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.85rem",
                  }}
                >
                  {c.desc}
                </p>

                <div
                  style={{
                    background: "#070d17",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.78rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.32rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      <Cpu size={12} style={{ display: "inline", marginRight: 4 }} />
                      {t.hardwareSpecLabel}:
                    </span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {c.standard} • 20kW
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      <Gauge size={12} style={{ display: "inline", marginRight: 4 }} />
                      {t.seccModuleLabel}:
                    </span>
                    <span className="mono">{c.secc}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      <QrCode size={12} style={{ display: "inline", marginRight: 4 }} />
                      {t.qrTokenLabel}:
                    </span>
                    <span className="mono" style={{ color: "var(--emerald-400)", fontWeight: 700 }}>
                      /c/{c.qrToken}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/c/${c.qrToken}`}
                className={`btn btn-full ${c.online ? "btn-primary" : "btn-secondary"}`}
              >
                <QrCode size={16} />
                <span>{c.online ? t.scanToChargeBtn : t.testOfflineBtn}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Operations Console & Demo Account Switcher Launch Cards */}
      <section className="grid-2">
        <div className="card-elevated" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="badge badge-purple">
                <ShieldCheck size={13} />
                REQ-ADM-001 ~ 006
              </span>
            </div>
            <h3 style={{ fontSize: "1.08rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              {t.adminPortalCardTitle}
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              {t.adminPortalCardDesc}
            </p>
          </div>
          <Link href="/admin" className="btn btn-outline btn-full">
            <ShieldCheck size={16} />
            <span>{t.openAdminBtn}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="card-elevated" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="badge badge-cyan">
                <UserCheck size={13} />
                REQ-ACC-001 ~ 005
              </span>
            </div>
            <h3 style={{ fontSize: "1.08rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              {t.accountCardTitle}
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              {t.accountCardDesc}
            </p>
          </div>
          <Link href="/login" className="btn btn-secondary btn-full">
            <UserCheck size={16} />
            <span>{t.openLoginBtn}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
