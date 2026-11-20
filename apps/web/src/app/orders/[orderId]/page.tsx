"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  Receipt,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lock,
} from "lucide-react";
import {
  useLanguage,
  localizeOrderStatus,
  localizePaymentStatus,
  localizeSiteName,
  localizeOrderEventDescription,
  localizeApiMessage,
} from "@/components/LanguageProvider";

export default function OrderReceiptDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { lang, t } = useLanguage();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data?.order || data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetail();
    const timer = setInterval(fetchOrderDetail, 3000);
    return () => clearInterval(timer);
  }, [fetchOrderDetail]);

  const formatRm = (sen: number) => `RM ${(Math.round(Number(sen) || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(Number(wh) || 0) / 1000).toFixed(3)} kWh`;
  const formatMyt = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      const localeTag = lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en-MY";
      return new Intl.DateTimeFormat(localeTag, {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(d));
    } catch {
      return String(d);
    }
  };

  if (loading) {
    return (
      <div className="container-pwa">
        <div className="card-elevated" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          Loading receipt...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-pwa">
        <div className="card-red" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ fontWeight: 800, marginBottom: "0.75rem" }}>Order not found</div>
          <Link href="/orders" className="btn btn-secondary">
            {t.backToOrdersBtn}
          </Link>
        </div>
      </div>
    );
  }

  const snapshot = order.tariffSnapshot || {
    name: "Malaysia Phase 1A Demo Tariff",
    energyPriceSenPerKwh: 120,
    serviceFeeSenPerKwh: 30,
    taxRateBps: 600,
    isTaxInclusive: true,
  };
  const payment = order.payments?.[0] || null;
  const events: any[] = order.events || [];
  const qrToken =
    order.connector?.qrCodes?.[0]?.qrToken ||
    (order.charger?.ocppId === "MY-KL-DC-002" ? "C7xR4tN9wM2p" : "K9mP2xQ8vL4n");

  return (
    <div className="container-pwa">
      {/* Top Navigation Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <Link href="/orders" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          <span>{t.backToOrdersBtn}</span>
        </Link>

        <Link href={`/c/${qrToken}`} className="btn btn-outline btn-sm">
          <QrCode size={14} />
          <span>
            {t.backToChargerBtn} (/c/{qrToken})
          </span>
        </Link>
      </div>

      {/* Prominent Phase 1A Simulated Payment Banner (REQ-BIL-007) */}
      <div className="sim-payment-banner" style={{ marginBottom: "1.1rem" }}>
        <AlertCircle size={19} style={{ flexShrink: 0 }} />
        <div>
          <div>{t.simulatedPaymentNotice}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary)" }}>
            {t.simulatedPaymentSub}
          </div>
        </div>
      </div>

      {/* Receipt Header & Billing Breakdown */}
      <section className="card-emerald" style={{ marginBottom: "1.15rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 700 }}>
              {t.receiptPageSubtitle}
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900 }}>{t.receiptPageTitle}</h1>
          </div>

          <span className="badge badge-emerald" style={{ fontSize: "0.82rem", padding: "0.35rem 0.85rem" }}>
            <CheckCircle2 size={14} />
            {localizeOrderStatus(order.status, lang)}
          </span>
        </div>

        <div className="grid-4" style={{ marginBottom: "1rem" }}>
          <div className="gauge-box">
            <span className="gauge-label">{t.orderNoLabel}</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {order.orderNo}
            </span>
            <span className="gauge-sub mono">idTag: {order.ocppIdTag}</span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">{t.chargerIdLabel}</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {order.charger?.ocppId || "MY-KL-DC-001"}
            </span>
            <span className="gauge-sub">{localizeSiteName(order.site, lang)}</span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">{t.chargedEnergyLabel}</span>
            <span
              className="mono"
              style={{ fontWeight: 900, fontSize: "1.12rem", color: "var(--emerald-400)" }}
            >
              {formatKwh(order.chargedEnergyWh)}
            </span>
            <span className="gauge-sub mono">
              {order.meterStartWh ?? 0} Wh -&gt; {order.meterStopWh ?? order.meterCurrentWh ?? order.chargedEnergyWh} Wh
            </span>
          </div>

          <div className="gauge-box">
            <span className="gauge-label">{t.finalSocLabel}</span>
            <span
              className="mono"
              style={{ fontWeight: 900, fontSize: "1.12rem", color: "var(--cyan-400)" }}
            >
              {order.lastValidSocPercent != null ? `${order.lastValidSocPercent}%` : "85%"}
            </span>
            <span className="gauge-sub">{t.socFilteredNote}</span>
          </div>
        </div>

        {/* Itemized Integer MYR Sen Settlement Box */}
        <div
          style={{
            background: "#060c15",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.15rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              fontSize: "0.88rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {t.energyCostLabel} ({formatRm(snapshot.energyPriceSenPerKwh)}/kWh ×{" "}
                {formatKwh(order.chargedEnergyWh)}):
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {formatRm(order.energyAmountSen)} ({order.energyAmountSen} Sen)
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {t.serviceCostLabel} ({formatRm(snapshot.serviceFeeSenPerKwh)}/kWh ×{" "}
                {formatKwh(order.chargedEnergyWh)}):
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {formatRm(order.serviceAmountSen)} ({order.serviceAmountSen} Sen)
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>
                {t.includedTaxLabel} ({(Number(snapshot.taxRateBps || 600) / 100).toFixed(2)}%):
              </span>
              <span className="mono">
                {formatRm(order.taxAmountSen)} ({order.taxAmountSen} Sen)
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "0.6rem",
                marginTop: "0.25rem",
                fontSize: "1.15rem",
                fontWeight: 900,
                color: "var(--emerald-400)",
              }}
            >
              <span>{t.totalAmountLabel}:</span>
              <span className="mono">
                {formatRm(order.totalAmountSen)} ({order.totalAmountSen} Sen)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Immutable Tariff Snapshot & Simulated Payment Record */}
      <div className="grid-2" style={{ marginBottom: "1.15rem" }}>
        <section className="card-elevated">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <Lock size={16} style={{ color: "var(--emerald-400)" }} />
            <h2 style={{ fontSize: "0.98rem", fontWeight: 800 }}>{t.immutableSnapshotTitle}</h2>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
            {t.immutableSnapshotDesc}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.42rem",
              fontSize: "0.83rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Snapshot ID:</span>
              <span className="mono">{snapshot.id || order.tariffSnapshotId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.snapshotNameLabel}:</span>
              <span style={{ fontWeight: 700 }}>{snapshot.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.energyRateLabel}:</span>
              <span className="mono">{formatRm(snapshot.energyPriceSenPerKwh)} / kWh</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.serviceFeeLabel}:</span>
              <span className="mono">{formatRm(snapshot.serviceFeeSenPerKwh)} / kWh</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.totalRateLabel}:</span>
              <span className="mono" style={{ color: "var(--emerald-400)", fontWeight: 800 }}>
                {formatRm(snapshot.energyPriceSenPerKwh + snapshot.serviceFeeSenPerKwh)} / kWh
              </span>
            </div>
          </div>
        </section>

        <section className="card-elevated">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <ShieldCheck size={16} style={{ color: "var(--amber-400)" }} />
            <h2 style={{ fontSize: "0.98rem", fontWeight: 800 }}>{t.paymentRecordTitle}</h2>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              fontSize: "0.83rem",
              marginTop: "0.65rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.paymentNoLabel}:</span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {payment?.paymentNo || `SIM-PAY-${order.orderNo}`}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.paymentModeLabel}:</span>
              <span className="badge badge-amber">{order.paymentMode || "SIMULATED"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.paymentStatusLabel}:</span>
              <span className="badge badge-emerald">
                {localizePaymentStatus(payment?.status || "SIMULATED_SUCCEEDED", lang)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.ocppTxIdLabel}:</span>
              <span className="mono">
                #{order.ocppTransaction?.transactionId ?? "-"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.createdAtLabel}:</span>
              <span className="mono">{formatMyt(order.createdAt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t.settledAtLabel}:</span>
              <span className="mono">{formatMyt(order.settledAt || order.updatedAt)}</span>
            </div>
            {order.stopReason && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{t.stopReasonLabel}:</span>
                <span className="mono">{order.stopReason}</span>
              </div>
            )}
            {order.failureReason && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--red-400)" }}>{t.failureReasonLabel}:</span>
                <span style={{ color: "var(--red-400)" }}>
                  {localizeApiMessage(order.failureReason, lang)}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ChargingOrderEvent Full Timeline in Asia/Kuala_Lumpur Timezone */}
      <section className="card-elevated">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.9rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.02rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            <Activity size={17} style={{ color: "var(--emerald-400)" }} />
            {t.eventTimelineTitle}
          </h2>
          <span className="badge badge-neutral">
            <Clock size={12} />
            {t.timezoneLabel}
          </span>
        </div>

        <div className="stepper-list">
          {events.map((ev, idx) => (
            <div key={ev.id || idx} className="stepper-item done">
              <div
                className="mono"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--emerald-400)",
                  minWidth: "145px",
                  fontWeight: 700,
                }}
              >
                {formatMyt(ev.createdAt)}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    flexWrap: "wrap",
                    marginBottom: "0.2rem",
                  }}
                >
                  <span className="badge badge-cyan mono">{ev.eventType}</span>
                  <span className="badge badge-neutral">
                    {ev.fromStatus ? `${ev.fromStatus} -> ` : ""}
                    {ev.toStatus}
                  </span>
                  <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                    Actor: {ev.actor}
                  </span>
                </div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-primary)" }}>
                  {localizeOrderEventDescription(ev, lang)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
