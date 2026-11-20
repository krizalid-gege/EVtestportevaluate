"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Wifi,
  WifiOff,
  Thermometer,
  Plug,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  Receipt,
  RefreshCw,
  LogIn,
  MailCheck,
  ShieldAlert,
  Activity,
  BatteryCharging,
  Gauge,
  AlertCircle,
} from "lucide-react";
import {
  useLanguage,
  localizeConnectorStatus,
  localizeOrderStatus,
  localizeSiteName,
  localizeApiMessage,
} from "@/components/LanguageProvider";

export default function QrChargingPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = use(params);
  const { lang, t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Inline verification code for UNVERIFIED users (REQ-ACC-002)
  const [inlineCode, setInlineCode] = useState("888666");
  const [verifyingInline, setVerifyingInline] = useState(false);

  // Handshake elapsed animation step (1..4) while order is STARTING
  const [handshakeStep, setHandshakeStep] = useState(1);

  const formatRm = (sen: number) => `RM ${(Math.round(Number(sen) || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(Number(wh) || 0) / 1000).toFixed(3)} kWh`;

  const fetchChargerAndUser = useCallback(async () => {
    try {
      const [qrRes, meRes] = await Promise.all([
        fetch(`/api/qr/${encodeURIComponent(qrToken)}`, { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      let currentUser: any = null;
      if (meRes.ok) {
        const meData = await meRes.json();
        currentUser = meData?.user || null;
        setUser(currentUser);
      } else {
        setUser(null);
      }

      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrPayload(data);

        // Determine if there is an active order on this connector or for this user
        const candidateOrder =
          data?.activeOrder ||
          data?.order ||
          data?.connector?.activeOrder ||
          null;

        if (candidateOrder?.id) {
          const ordDetailRes = await fetch(`/api/orders/${candidateOrder.id}`, {
            cache: "no-store",
          });
          if (ordDetailRes.ok) {
            const ordDetail = await ordDetailRes.json();
            setActiveOrder(ordDetail?.order || ordDetail);
          } else {
            setActiveOrder(candidateOrder);
          }
        }
      } else {
        setQrPayload(null);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [qrToken]);

  // Poll active order every 1.5s while an order exists
  const pollActiveOrder = useCallback(async () => {
    if (!activeOrder?.id) return;
    try {
      const [ordRes, qrRes] = await Promise.all([
        fetch(`/api/orders/${activeOrder.id}`, { cache: "no-store" }),
        fetch(`/api/qr/${encodeURIComponent(qrToken)}`, { cache: "no-store" }),
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setActiveOrder(ordData?.order || ordData);
      }
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrPayload(qrData);
      }
    } catch {
      // ignore
    }
  }, [activeOrder?.id, qrToken]);

  useEffect(() => {
    fetchChargerAndUser();
  }, [fetchChargerAndUser]);

  useEffect(() => {
    const intervalMs =
      activeOrder &&
      ["AUTHORIZING", "READY_TO_START", "STARTING", "CHARGING", "STOPPING", "SETTLING"].includes(
        activeOrder.status
      )
        ? 1500
        : 4000;

    const timer = setInterval(() => {
      if (activeOrder?.id) {
        pollActiveOrder();
      } else {
        fetchChargerAndUser();
      }
    }, intervalMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (activeOrder?.id) pollActiveOrder();
        else fetchChargerAndUser();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [activeOrder, pollActiveOrder, fetchChargerAndUser]);

  // Animate 4-step QuanYao SECC handshake progress bar while in STARTING state
  useEffect(() => {
    if (
      activeOrder &&
      ["AUTHORIZING", "READY_TO_START", "STARTING"].includes(activeOrder.status)
    ) {
      const t1 = setInterval(() => {
        setHandshakeStep((prev) => (prev < 4 ? prev + 1 : 3));
      }, 1200);
      return () => clearInterval(t1);
    } else if (activeOrder?.status === "CHARGING") {
      setHandshakeStep(4);
    } else {
      setHandshakeStep(1);
    }
  }, [activeOrder?.status]);

  const handleInlineVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setVerifyingInline(true);
    setErrorBanner(null);
    setInfoBanner(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          code: inlineCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(localizeApiMessage(data?.error || "Invalid verification code", lang));
        setVerifyingInline(false);
        return;
      }
      setInfoBanner(t.verifySuccessMsg);
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
      await fetchChargerAndUser();
    } catch (err: any) {
      setErrorBanner(localizeApiMessage(err?.message || "Verification error", lang));
    } finally {
      setVerifyingInline(false);
    }
  };

  const handleStartCharging = async () => {
    setActionLoading(true);
    setErrorBanner(null);
    setInfoBanner(null);
    try {
      const idempotencyKey = `qr_${qrToken}_${user?.id || "anon"}_${Date.now()}`;
      const res = await fetch("/api/orders/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(localizeApiMessage(data?.error || "Unable to start charging", lang));
        if (data?.order) {
          setActiveOrder(data.order);
        }
        setActionLoading(false);
        return;
      }
      const createdOrder = data?.order || data;
      setActiveOrder(createdOrder);
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    } catch (err: any) {
      setErrorBanner(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCharging = async () => {
    if (!activeOrder?.id) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "UserRequestedFromMobilePWA" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(localizeApiMessage(data?.error || "Failed to stop session", lang));
        setActionLoading(false);
        return;
      }
      if (data?.order) {
        setActiveOrder(data.order);
      } else {
        await pollActiveOrder();
      }
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    } catch (err: any) {
      setErrorBanner(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-mobile">
        <div className="card-elevated" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <RefreshCw size={28} style={{ color: "var(--emerald-400)", marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700 }}>{t.loadingCharger}</div>
        </div>
      </div>
    );
  }

  // Normalize qrPayload structure regardless of how backend wraps connector/charger/site/tariff
  const connector = qrPayload?.connector || qrPayload;
  const charger = qrPayload?.charger || connector?.charger || null;
  const site = qrPayload?.site || charger?.site || null;
  const tariff =
    activeOrder?.tariffSnapshot ||
    qrPayload?.tariff ||
    site?.tariffs?.[0] || {
      name: "Malaysia Phase 1A Demo Tariff",
      energyPriceSenPerKwh: 120,
      serviceFeeSenPerKwh: 30,
      taxRateBps: 600,
      isTaxInclusive: true,
    };

  if (!charger) {
    return (
      <div className="container-mobile">
        <div className="card-red" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <AlertTriangle size={28} style={{ color: "var(--red-400)", marginBottom: "0.6rem" }} />
          <div style={{ fontWeight: 800, marginBottom: "0.8rem" }}>{t.chargerNotFound}</div>
          <Link href="/" className="btn btn-secondary">
            {t.navHome}
          </Link>
        </div>
      </div>
    );
  }

  const connectionStatus: string = charger.connectionStatus || "OFFLINE";
  const ocppStatus: string = connector.ocppStatus || "Available";
  const standardLabel =
    connector.standard === "GBT_DC"
      ? "GB/T 27930 DC"
      : connector.standard === "CCS2"
      ? "CCS2 DC"
      : connector.standard || "DC 20kW";

  const energyRateSen = Number(tariff.energyPriceSenPerKwh ?? 120);
  const serviceFeeSen = Number(tariff.serviceFeeSenPerKwh ?? 30);
  const totalRateSen = energyRateSen + serviceFeeSen;

  const isStartingOrder =
    activeOrder &&
    ["AUTHORIZING", "READY_TO_START", "STARTING"].includes(activeOrder.status);
  const isChargingOrStopping =
    activeOrder && ["CHARGING", "STOPPING", "SETTLING"].includes(activeOrder.status);
  const isCompletedOrder = activeOrder && activeOrder.status === "COMPLETED";
  const isFailedOrder =
    activeOrder &&
    ["START_FAILED", "AUTHORIZATION_FAILED", "CANCELLED", "INTERRUPTED"].includes(
      activeOrder.status
    );

  return (
    <div className="container-mobile">
      {/* Phase 1A Simulated Payment Strip */}
      <div className="sim-payment-banner" style={{ marginBottom: "1rem" }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span>{t.simulatedPaymentNotice}</span>
      </div>

      {/* Site, Charger & Connector Header Card */}
      <section className="card-elevated" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.65rem",
          }}
        >
          <span className="badge badge-neutral mono">QR: {qrToken}</span>
          <span
            className={`badge ${
              connectionStatus === "OFFLINE"
                ? "badge-red"
                : ocppStatus === "Charging"
                ? "badge-cyan"
                : ocppStatus === "Faulted"
                ? "badge-red"
                : "badge-emerald"
            }`}
          >
            {connectionStatus === "OFFLINE" ? <WifiOff size={12} /> : <Wifi size={12} />}
            {localizeConnectorStatus(ocppStatus, connectionStatus, lang)}
          </span>
        </div>

        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.2rem" }}>
          {localizeSiteName(site, lang)}
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
          {site?.address || "Kuala Lumpur, Malaysia"}
        </p>

        {/* Hardware & QuanYao SECC Specs */}
        <div className="grid-2" style={{ gap: "0.6rem" }}>
          <div className="gauge-box">
            <span className="gauge-label">{t.chargerIdLabel}</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {charger.ocppId}
            </span>
            <span className="gauge-sub">
              {charger.vendor || "Techone"} {charger.model || "GPEV20-BG102-S1P-EA"}
            </span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">{t.connectorLabel}</span>
            <span
              className="mono"
              style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--emerald-400)" }}
            >
              {standardLabel} • {charger.ratedPowerKw || 20} kW
            </span>
            <span className="gauge-sub">
              {charger.voltageMinV || 200}-{charger.voltageMaxV || 1000}Vdc • Max{" "}
              {charger.currentMaxA || 66.7}A
            </span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">
              <Plug size={11} style={{ display: "inline", marginRight: 4 }} />
              {t.plugStatusLabel}
            </span>
            <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>
              {connector.isPluggedIn ? t.pluggedInYes : t.pluggedInNo}
            </span>
            <span className="gauge-sub">
              <Thermometer size={11} style={{ display: "inline", marginRight: 3 }} />
              {t.gunTempLabel}:{" "}
              <strong className="mono">
                {connector.gunTemp1C != null ? `${connector.gunTemp1C.toFixed(1)} °C` : "31.5 °C"}
              </strong>
            </span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">
              <Cpu size={11} style={{ display: "inline", marginRight: 4 }} />
              {t.seccDiagLabel}
            </span>
            <span
              className="mono"
              style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--cyan-400)" }}
            >
              {charger.seccModel || "QY-SECC-02"}
            </span>
            <span className="gauge-sub">
              {charger.seccStageInfo || "0x18 CurrentDemand / Ready"}
            </span>
          </div>
        </div>
      </section>

      {/* Tariff Breakdown Card */}
      <section className="card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.65rem",
          }}
        >
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800 }}>{t.tariffCardTitle}</h2>
          <span className="badge badge-amber">DEMO TARIFF • MYR</span>
        </div>

        <div className="grid-3" style={{ gap: "0.55rem", marginBottom: "0.55rem" }}>
          <div className="gauge-box">
            <span className="gauge-label">{t.energyRateLabel}</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: "1.02rem" }}>
              {formatRm(energyRateSen)} / kWh
            </span>
          </div>
          <div className="gauge-box">
            <span className="gauge-label">{t.serviceFeeLabel}</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: "1.02rem" }}>
              {formatRm(serviceFeeSen)} / kWh
            </span>
          </div>
          <div
            className="gauge-box"
            style={{
              borderColor: "rgba(16, 185, 129, 0.45)",
              background: "rgba(16, 185, 129, 0.08)",
            }}
          >
            <span className="gauge-label">{t.totalRateLabel}</span>
            <span
              className="mono"
              style={{ fontWeight: 900, fontSize: "1.08rem", color: "var(--emerald-400)" }}
            >
              {formatRm(totalRateSen)} / kWh
            </span>
          </div>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {t.taxInclusiveNote}
        </div>
      </section>

      {/* Error & Info Alerts */}
      {errorBanner && (
        <div
          className="card-red"
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.65rem",
            fontSize: "0.86rem",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--red-400)", flexShrink: 0, marginTop: 2 }} />
          <div>{errorBanner}</div>
        </div>
      )}

      {infoBanner && (
        <div
          className="card-emerald"
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            fontSize: "0.86rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--emerald-400)", flexShrink: 0 }} />
          <div>{infoBanner}</div>
        </div>
      )}

      {/* =====================================================================
       * ACTIVE SESSION VIEW 1: 4-Step QuanYao SECC DC Handshake (STARTING)
       * Strictly satisfies REQ-CHG-003: Never claims "Charging" before StartTransaction!
       * ===================================================================== */}
      {isStartingOrder && (
        <section className="card-emerald" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.55rem",
            }}
          >
            <span className="badge badge-cyan">
              <RefreshCw size={12} />
              {localizeOrderStatus(activeOrder.status, lang)}
            </span>
            <span className="mono" style={{ fontSize: "0.78rem" }}>
              {activeOrder.orderNo} • idTag: {activeOrder.ocppIdTag}
            </span>
          </div>

          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.3rem" }}>
            {t.handshakeTitle}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.95rem" }}>
            {t.handshakeSubtitle}
          </p>

          <div className="stepper-list">
            {[
              { step: 1, title: t.handshakeStep1Title, desc: t.handshakeStep1Desc },
              { step: 2, title: t.handshakeStep2Title, desc: t.handshakeStep2Desc },
              { step: 3, title: t.handshakeStep3Title, desc: t.handshakeStep3Desc },
              { step: 4, title: t.handshakeStep4Title, desc: t.handshakeStep4Desc },
            ].map((s) => {
              const isDone = handshakeStep > s.step;
              const isCurrent = handshakeStep === s.step;
              return (
                <div
                  key={s.step}
                  className={`stepper-item ${isCurrent ? "active" : isDone ? "done" : ""}`}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      flexShrink: 0,
                      background: isDone
                        ? "var(--emerald-500)"
                        : isCurrent
                        ? "var(--cyan-500)"
                        : "rgba(255,255,255,0.1)",
                      color: isDone || isCurrent ? "#03130d" : "var(--text-muted)",
                    }}
                  >
                    {isDone ? "✓" : s.step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{s.title}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
       * ACTIVE SESSION VIEW 2: Live 20kW DC Charging Gauges & Trial Billing
       * ===================================================================== */}
      {isChargingOrStopping && (
        <section className="card-emerald" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <span className="badge badge-emerald">
              <span className="status-dot charging" />
              {localizeOrderStatus(activeOrder.status, lang)}
            </span>
            <span className="mono" style={{ fontSize: "0.78rem" }}>
              {activeOrder.orderNo} • TX #{activeOrder?.ocppTransaction?.transactionId ?? "-"}
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.05rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            <Activity size={18} style={{ color: "var(--emerald-400)" }} />
            {t.liveTelemetryTitle}
          </h3>

          <div className="grid-2" style={{ gap: "0.65rem", marginBottom: "1rem" }}>
            <div className="gauge-box">
              <span className="gauge-label">{t.chargedEnergyLabel}</span>
              <span className="gauge-value" style={{ color: "var(--emerald-400)" }}>
                {formatKwh(activeOrder.chargedEnergyWh)}
              </span>
              <span className="gauge-sub mono">{activeOrder.chargedEnergyWh || 0} Wh (Integer)</span>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">{t.livePowerLabel}</span>
              <span className="gauge-value" style={{ color: "var(--cyan-400)" }}>
                {((activeOrder.currentPowerW || 19200) / 1000).toFixed(2)} kW
              </span>
              <span className="gauge-sub mono">{activeOrder.currentPowerW || 19200} W</span>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">{t.outputVoltageLabel}</span>
              <span className="gauge-value">
                {(activeOrder.currentVoltageV ?? 415.2).toFixed(1)} V
              </span>
              <span className="gauge-sub">
                {t.outputCurrentLabel}:{" "}
                <strong className="mono">{(activeOrder.currentAmpereA ?? 46.2).toFixed(1)} A</strong>
              </span>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">
                <BatteryCharging size={12} style={{ display: "inline", marginRight: 4 }} />
                {t.vehicleSocLabel}
              </span>
              <span className="gauge-value" style={{ color: "var(--emerald-400)" }}>
                {activeOrder.lastValidSocPercent ?? 68}%
              </span>
              <span className="gauge-sub">{t.socFilteredNote}</span>
            </div>
          </div>

          {/* Live MYR Trial Billing Breakdown */}
          <div
            style={{
              background: "#060c15",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 800,
                marginBottom: "0.5rem",
                color: "var(--text-secondary)",
              }}
            >
              {t.liveBillingTitle}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                fontSize: "0.84rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{t.energyCostLabel}:</span>
                <span className="mono">{formatRm(activeOrder.energyAmountSen)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{t.serviceCostLabel}:</span>
                <span className="mono">{formatRm(activeOrder.serviceAmountSen)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{t.includedTaxLabel}:</span>
                <span className="mono">{formatRm(activeOrder.taxAmountSen)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "0.45rem",
                  marginTop: "0.2rem",
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  color: "var(--emerald-400)",
                }}
              >
                <span>{t.totalAmountLabel}:</span>
                <span className="mono">{formatRm(activeOrder.totalAmountSen)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={actionLoading || activeOrder.status === "STOPPING"}
            onClick={handleStopCharging}
            className="btn btn-danger btn-lg btn-full"
          >
            <Square size={18} />
            <span>
              {activeOrder.status === "STOPPING" ? t.stoppingChargingBtn : t.stopChargingBtn}
            </span>
          </button>
        </section>
      )}

      {/* =====================================================================
       * COMPLETED SESSION RECEIPT SUMMARY CARD
       * ===================================================================== */}
      {isCompletedOrder && (
        <section className="card-emerald" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.5rem" }}>
            <CheckCircle2 size={22} style={{ color: "var(--emerald-400)" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>{t.orderCompletedTitle}</h3>
          </div>
          <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: "0.9rem" }}>
            {t.orderCompletedDesc}
          </p>

          <div className="grid-3" style={{ gap: "0.6rem", marginBottom: "0.95rem" }}>
            <div className="gauge-box">
              <span className="gauge-label">{t.chargedEnergyLabel}</span>
              <span className="mono" style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                {formatKwh(activeOrder.chargedEnergyWh)}
              </span>
              <span className="gauge-sub mono">{activeOrder.chargedEnergyWh} Wh</span>
            </div>
            <div className="gauge-box">
              <span className="gauge-label">{t.finalSocLabel}</span>
              <span className="mono" style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                {activeOrder.lastValidSocPercent ?? 85}%
              </span>
            </div>
            <div className="gauge-box">
              <span className="gauge-label">{t.totalAmountLabel}</span>
              <span
                className="mono"
                style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--emerald-400)" }}
              >
                {formatRm(activeOrder.totalAmountSen)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link
              href={`/orders/${activeOrder.id}`}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <Receipt size={16} />
              <span>{t.viewFullReceiptBtn}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setActiveOrder(null);
                fetchChargerAndUser();
              }}
              className="btn btn-secondary"
            >
              <RefreshCw size={15} />
              <span>{t.startAnotherSessionBtn}</span>
            </button>
          </div>
        </section>
      )}

      {/* =====================================================================
       * FAILED SESSION CARD (e.g. RemoteStart Rejected -> START_FAILED)
       * ===================================================================== */}
      {isFailedOrder && (
        <section className="card-red" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.4rem" }}>
            <ShieldAlert size={20} style={{ color: "var(--red-400)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>
              {localizeOrderStatus(activeOrder.status, lang)} ({activeOrder.orderNo})
            </h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {localizeApiMessage(
              activeOrder.failureReason ||
                "Charger rejected RemoteStartTransaction; simulated payment cancelled with zero charge.",
              lang
            )}
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <Link href={`/orders/${activeOrder.id}`} className="btn btn-secondary btn-sm">
              <Receipt size={14} />
              <span>{t.viewReceiptBtn}</span>
            </Link>
            <button
              type="button"
              onClick={() => setActiveOrder(null)}
              className="btn btn-outline btn-sm"
            >
              {t.startAnotherSessionBtn}
            </button>
          </div>
        </section>
      )}

      {/* =====================================================================
       * PRE-START GATES & START CHARGING BUTTON (When no active session)
       * ===================================================================== */}
      {!isStartingOrder && !isChargingOrStopping && !isCompletedOrder && (
        <section>
          {/* Gate 1: Not logged in */}
          {!user ? (
            <div className="card-amber">
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.3rem" }}>
                {t.loginRequiredTitle}
              </h3>
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: "0.9rem" }}>
                {t.loginRequiredDesc}
              </p>
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/c/${qrToken}`)}`}
                className="btn btn-primary btn-lg btn-full"
              >
                <LogIn size={17} />
                <span>{t.loginToContinueBtn}</span>
              </Link>
            </div>
          ) : user.status === "UNVERIFIED" ? (
            /* Gate 2: Email UNVERIFIED -> Inline 6-Digit Verification (REQ-ACC-002) */
            <div className="card-amber">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.4rem",
                  color: "var(--amber-400)",
                }}
              >
                <AlertTriangle size={20} />
                <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>{t.unverifiedBlockTitle}</h3>
              </div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
                {t.unverifiedBlockDesc}
              </p>

              <form
                onSubmit={handleInlineVerifyEmail}
                style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}
              >
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inlineCode}
                  onChange={(e) => setInlineCode(e.target.value)}
                  placeholder={t.inlineVerifyPlaceholder}
                  className="form-input mono"
                  style={{
                    flex: 1,
                    minWidth: "160px",
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                  }}
                />
                <button
                  type="submit"
                  disabled={verifyingInline}
                  className="btn btn-primary"
                >
                  <MailCheck size={16} />
                  <span>{t.inlineVerifyBtn}</span>
                </button>
              </form>
            </div>
          ) : connectionStatus === "OFFLINE" ? (
            /* Gate 3: Charger Offline -> Block Start (REQ-DEV-005) */
            <div className="card-red">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.35rem",
                  color: "var(--red-400)",
                }}
              >
                <WifiOff size={20} />
                <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>{t.offlineBlockTitle}</h3>
              </div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                {t.offlineBlockDesc}
              </p>
            </div>
          ) : ocppStatus === "Faulted" || ocppStatus === "Unavailable" ? (
            /* Gate 4: Charger Faulted */
            <div className="card-red">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.35rem",
                  color: "var(--red-400)",
                }}
              >
                <AlertTriangle size={20} />
                <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>{t.faultedBlockTitle}</h3>
              </div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                {t.faultedBlockDesc} ({connector.errorCode || "Faulted"})
              </p>
            </div>
          ) : (
            /* Ready to Start 20kW DC Charging */
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleStartCharging}
              className="btn btn-primary btn-lg btn-full"
            >
              <Play size={18} />
              <span>{actionLoading ? t.startingChargingBtn : t.startChargingBtn}</span>
            </button>
          )}
        </section>
      )}
    </div>
  );
}
