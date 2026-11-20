"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  QrCode,
  ArrowRight,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  useLanguage,
  localizeOrderStatus,
  localizePaymentStatus,
  localizeSiteName,
} from "@/components/LanguageProvider";

export default function OrdersListPage() {
  const { lang, t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data?.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 4000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

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

  return (
    <div className="container-pwa">
      <div className="sim-payment-banner" style={{ marginBottom: "1.1rem" }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span>{t.simulatedPaymentNotice}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800 }}>{t.myOrdersTitle}</h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
            <Clock size={13} style={{ display: "inline", marginRight: 4 }} />
            {t.myOrdersSubtitle}
          </p>
        </div>

        <button type="button" onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="card-elevated" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <RefreshCw size={24} style={{ color: "var(--emerald-400)", marginBottom: "0.6rem" }} />
          <div>Loading...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: "center", padding: "2.5rem 1.25rem" }}>
          <Receipt size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
          <p style={{ fontWeight: 700, marginBottom: "1rem" }}>{t.noOrdersYet}</p>
          <Link href="/" className="btn btn-primary">
            <QrCode size={16} />
            <span>{t.goScanChargerBtn}</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {orders.map((ord) => {
            const payment = ord.payments?.[0] || null;
            const snapshot = ord.tariffSnapshot || null;
            const isCompleted = ord.status === "COMPLETED";
            const isActive = ["STARTING", "CHARGING", "STOPPING", "AUTHORIZING"].includes(
              ord.status
            );

            return (
              <div
                key={ord.id}
                className={isActive ? "card-emerald" : "card-elevated"}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontWeight: 800, fontSize: "1rem" }}>
                      {ord.orderNo}
                    </span>
                    <span
                      className={`badge ${
                        isCompleted
                          ? "badge-emerald"
                          : isActive
                          ? "badge-cyan"
                          : "badge-amber"
                      }`}
                    >
                      {localizeOrderStatus(ord.status, lang)}
                    </span>
                    {payment && (
                      <span className="badge badge-amber">
                        {localizePaymentStatus(payment.status, lang)}
                      </span>
                    )}
                  </div>

                  <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {formatMyt(ord.createdAt)}
                  </span>
                </div>

                <div className="grid-4">
                  <div className="gauge-box">
                    <span className="gauge-label">{t.chargerIdLabel}</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {ord.charger?.ocppId || "-"}
                    </span>
                    <span className="gauge-sub">{localizeSiteName(ord.site, lang)}</span>
                  </div>

                  <div className="gauge-box">
                    <span className="gauge-label">{t.chargedEnergyLabel}</span>
                    <span
                      className="mono"
                      style={{ fontWeight: 800, fontSize: "1rem", color: "var(--emerald-400)" }}
                    >
                      {formatKwh(ord.chargedEnergyWh)}
                    </span>
                    <span className="gauge-sub mono">
                      {ord.chargedEnergyWh} Wh • SoC: {ord.lastValidSocPercent ?? "-"}%
                    </span>
                  </div>

                  <div className="gauge-box">
                    <span className="gauge-label">{t.snapshotNameLabel}</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                      {snapshot
                        ? `${formatRm(
                            snapshot.energyPriceSenPerKwh + snapshot.serviceFeeSenPerKwh
                          )}/kWh`
                        : "RM 1.50/kWh"}
                    </span>
                    <span className="gauge-sub">
                      {snapshot
                        ? `E: ${formatRm(snapshot.energyPriceSenPerKwh)} + S: ${formatRm(
                            snapshot.serviceFeeSenPerKwh
                          )}`
                        : "Immutable Snapshot"}
                    </span>
                  </div>

                  <div className="gauge-box">
                    <span className="gauge-label">{t.totalAmountLabel}</span>
                    <span
                      className="mono"
                      style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--emerald-400)" }}
                    >
                      {formatRm(ord.totalAmountSen)}
                    </span>
                    <span className="gauge-sub">
                      {t.includedTaxLabel}: {formatRm(ord.taxAmountSen)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="mono" style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {t.ocppIdTagLabel}: <strong>{ord.ocppIdTag}</strong> • {t.ocppTxIdLabel}:{" "}
                    <strong>#{ord.ocppTransaction?.transactionId ?? "-"}</strong>
                  </div>

                  <Link href={`/orders/${ord.id}`} className="btn btn-outline btn-sm">
                    <Receipt size={14} />
                    <span>{t.viewReceiptBtn}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
