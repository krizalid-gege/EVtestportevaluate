"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plug,
  CheckCircle2,
  Play,
  Square,
  Receipt,
  LogIn,
  BatteryCharging,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  useLanguage,
  localizeSiteName,
  localizeApiMessage,
} from "@/components/LanguageProvider";

export default function CleanChargingPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = use(params);
  const { lang } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("888666");
  const [verifying, setVerifying] = useState(false);

  const formatRm = (sen: number) => `RM ${(Math.round(Number(sen) || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(Number(wh) || 0) / 1000).toFixed(2)} kWh`;

  const fetchInitial = useCallback(async () => {
    try {
      const [qrRes, meRes] = await Promise.all([
        fetch(`/api/qr/${encodeURIComponent(qrToken)}`, { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData?.user || null);
      } else {
        setUser(null);
      }

      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrPayload(data);
        const candidate = data?.activeOrder || data?.order || null;
        if (candidate?.id) {
          const ordRes = await fetch(`/api/orders/${candidate.id}`, { cache: "no-store" });
          if (ordRes.ok) {
            const ordData = await ordRes.json();
            setActiveOrder(ordData?.order || ordData);
          } else {
            setActiveOrder(candidate);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [qrToken]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Poll active order every 1.2s while starting/charging/stopping so auto-settlement at 100% pushes immediately
  useEffect(() => {
    if (!activeOrder?.id) return;
    if (["COMPLETED", "START_FAILED", "CANCELLED"].includes(activeOrder.status)) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${activeOrder.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.order) {
            setActiveOrder(data.order);
          }
        }
      } catch {
        // ignore
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [activeOrder?.id, activeOrder?.status]);

  const handleStartCharging = async () => {
    setErrorBanner(null);
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/c/${qrToken}`)}`);
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/orders/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          idempotencyKey: `start-${qrToken}-${user.id}-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(localizeApiMessage(data?.message || data?.error || "启动失败", lang));
        if (data?.order) setActiveOrder(data.order);
        return;
      }
      setActiveOrder(data?.order || data);
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    } catch (err: any) {
      setErrorBanner(localizeApiMessage(err?.message || "网络错误", lang));
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
        body: JSON.stringify({ reason: "User clicked stop" }),
      });
      const data = await res.json();
      if (res.ok && data?.order) {
        setActiveOrder(data.order);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleInlineVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      if (res.ok) {
        await fetchInitial();
        window.dispatchEvent(new Event("ev-cpo-auth-changed"));
      } else {
        const d = await res.json();
        setErrorBanner(localizeApiMessage(d?.error || "验证码错误", lang));
      }
    } finally {
      setVerifying(false);
    }
  };

  const copy = {
    backToGuns: lang === "zh" ? "返回选择充电枪" : lang === "ms" ? "Kembali Pilih Pengecas" : "Back to Chargers",
    readyState: lang === "zh" ? "已插枪 • 可立即充电" : lang === "ms" ? "Sedia Mengecas" : "Plugged In & Ready",
    offlineState: lang === "zh" ? "设备离线 • 暂不可用" : lang === "ms" ? "Luar Talian" : "Charger Offline",
    priceTitle: lang === "zh" ? "充电单价" : lang === "ms" ? "Kadar Caj" : "Charging Rate",
    priceDetail:
      lang === "zh"
        ? "电费 RM 1.20/度 + 服务费 RM 0.30/度"
        : lang === "ms"
        ? "Tenaga RM 1.20 + Servis RM 0.30"
        : "Energy RM 1.20/kWh + Service RM 0.30/kWh",
    startBtn: lang === "zh" ? "开始充电" : lang === "ms" ? "Mula Mengecas" : "Start Charging",
    startingText:
      lang === "zh"
        ? "正在启动充电桩，请稍候..."
        : lang === "ms"
        ? "Memulakan pengecas..."
        : "Starting charger, please wait...",
    chargingTitle:
      lang === "zh" ? "正在为您充电" : lang === "ms" ? "Sedang Mengecas" : "Charging in Progress",
    autoStopHint:
      lang === "zh"
        ? "充满 100% 将自动停止并结算订单，您也可随时点击下方停止"
        : lang === "ms"
        ? "Berhenti automatik apabila penuh 100%, atau klik berhenti bila-bila masa"
        : "Auto-stops and settles at 100%, or tap Stop anytime",
    stopBtn: lang === "zh" ? "停止充电" : lang === "ms" ? "Henti Mengecas" : "Stop Charging",
    stoppingText:
      lang === "zh" ? "正在停止并结算账单..." : lang === "ms" ? "Menghentikan..." : "Stopping & settling...",
    energyLabel: lang === "zh" ? "已充电量" : lang === "ms" ? "Tenaga Dicas" : "Charged Energy",
    amountLabel: lang === "zh" ? "当前金额" : lang === "ms" ? "Jumlah Semasa" : "Current Amount",
    powerLabel: lang === "zh" ? "充电功率" : lang === "ms" ? "Kuasa Semasa" : "Charging Power",
    settledTitle:
      lang === "zh"
        ? "充电完成 • 订单已自动结算"
        : lang === "ms"
        ? "Selesai • Pesanan Diselesaikan"
        : "Charging Complete • Order Settled",
    settledSub:
      lang === "zh"
        ? "账单已生成并推送至运营商后台"
        : lang === "ms"
        ? "Resit telah dijana secara automatik"
        : "Receipt generated and pushed to operator console",
    orderNoLabel: lang === "zh" ? "订单编号" : lang === "ms" ? "No. Pesanan" : "Order Number",
    energyFeeLabel: lang === "zh" ? "电费" : lang === "ms" ? "Caj Tenaga" : "Energy Fee",
    serviceFeeLabel: lang === "zh" ? "服务费" : lang === "ms" ? "Caj Servis" : "Service Fee",
    totalPaidLabel: lang === "zh" ? "结算总金额" : lang === "ms" ? "Jumlah Bayaran" : "Total Amount",
    chargeAgainBtn: lang === "zh" ? "继续充电 / 返回选枪" : lang === "ms" ? "Kembali" : "Back to Chargers",
    viewOrdersBtn: lang === "zh" ? "查看我的订单列表" : lang === "ms" ? "Pesanan Saya" : "My Orders",
  };

  if (loading) {
    return (
      <div className="container-narrow" style={{ maxWidth: "460px", paddingTop: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const site = qrPayload?.site;
  const charger = qrPayload?.charger;
  const connector = qrPayload?.connector;
  const isOnline = charger?.connectionStatus === "ONLINE";

  const orderStatus = activeOrder?.status || null;
  const isChargingActive = ["STARTING", "CHARGING", "STOPPING", "SETTLING"].includes(orderStatus);
  const isCompleted = orderStatus === "COMPLETED";

  const currentSoc = activeOrder?.lastValidSocPercent || 48;
  const currentKwh = formatKwh(activeOrder?.chargedEnergyWh || 0);
  const currentRm = formatRm(activeOrder?.totalAmountSen || 0);
  const currentKw =
    orderStatus === "CHARGING"
      ? `${((activeOrder?.currentPowerW || 19430) / 1000).toFixed(1)} kW`
      : "0.0 kW";

  return (
    <div className="container-narrow" style={{ maxWidth: "460px", paddingTop: "1rem" }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <ArrowLeft size={15} />
          <span>{copy.backToGuns}</span>
        </Link>
      </div>

      {errorBanner && (
        <div
          className="card"
          style={{
            borderColor: "rgba(239, 68, 68, 0.55)",
            background: "rgba(127, 29, 29, 0.25)",
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <AlertCircle size={18} style={{ color: "#f87171", flexShrink: 0 }} />
          <div style={{ fontSize: "0.86rem", color: "#fecaca" }}>{errorBanner}</div>
        </div>
      )}

      {/* VIEW 1: COMPLETED & AUTO-SETTLED ORDER RECEIPT PUSH */}
      {isCompleted && activeOrder ? (
        <div
          className="card-emerald"
          style={{
            padding: "1.75rem 1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.2)",
              color: "#34d399",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "0.85rem",
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {copy.settledTitle}
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            {copy.settledSub}
          </p>

          <div
            style={{
              background: "rgba(7, 13, 23, 0.75)",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              {copy.totalPaidLabel}
            </div>
            <div
              style={{
                fontSize: "2.3rem",
                fontWeight: 900,
                color: "var(--emerald-400)",
                marginBottom: "0.85rem",
              }}
            >
              {formatRm(activeOrder.totalAmountSen)}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                fontSize: "0.86rem",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{copy.orderNoLabel}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{activeOrder.orderNo}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{copy.energyLabel}</span>
                <span style={{ fontWeight: 700 }}>{formatKwh(activeOrder.chargedEnergyWh)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{copy.energyFeeLabel}</span>
                <span>{formatRm(activeOrder.energyAmountSen)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>{copy.serviceFeeLabel}</span>
                <span>{formatRm(activeOrder.serviceAmountSen)}</span>
              </div>
              {activeOrder.lastValidSocPercent && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>电池电量 (SoC)</span>
                  <span style={{ fontWeight: 700, color: "#34d399" }}>
                    {activeOrder.lastValidSocPercent}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => {
                setActiveOrder(null);
                router.push("/");
              }}
              className="btn btn-primary btn-lg btn-full"
            >
              <Zap size={17} />
              <span>{copy.chargeAgainBtn}</span>
            </button>
            <Link href="/orders" className="btn btn-secondary btn-full">
              <Receipt size={16} />
              <span>{copy.viewOrdersBtn}</span>
            </Link>
          </div>
        </div>
      ) : isChargingActive && activeOrder ? (
        /* VIEW 2: ACTIVE CHARGING SCREEN (SIMPLE LIVE PROGRESS & STOP BUTTON) */
        <div className="card-elevated" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <span className="badge badge-emerald" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
              <BatteryCharging size={15} />
              {orderStatus === "STARTING"
                ? copy.startingText
                : orderStatus === "STOPPING"
                ? copy.stoppingText
                : copy.chargingTitle}
            </span>
          </div>

          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            {charger?.name || "20kW 直流充电枪"}
          </div>

          {/* Big Battery Percentage Display */}
          <div style={{ margin: "1rem 0 1.25rem" }}>
            <div
              style={{
                fontSize: "3.4rem",
                fontWeight: 900,
                color: "var(--emerald-400)",
                lineHeight: 1,
                marginBottom: "0.65rem",
              }}
            >
              {currentSoc}%
            </div>

            {/* Clean Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "14px",
                background: "#0b1526",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(10, currentSoc))}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #059669, #34d399)",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {/* 3 Clean Live Numbers: Charged kWh, Current RM, Power kW */}
          <div
            className="grid-3"
            style={{
              gap: "0.65rem",
              marginBottom: "1.35rem",
            }}
          >
            <div
              style={{
                background: "#070d17",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.85rem 0.5rem",
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                {copy.energyLabel}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>{currentKwh}</div>
            </div>

            <div
              style={{
                background: "#070d17",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.85rem 0.5rem",
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                {copy.amountLabel}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--emerald-400)" }}>
                {currentRm}
              </div>
            </div>

            <div
              style={{
                background: "#070d17",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.85rem 0.5rem",
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                {copy.powerLabel}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>{currentKw}</div>
            </div>
          </div>

          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginBottom: "1.15rem",
            }}
          >
            {copy.autoStopHint}
          </p>

          <button
            type="button"
            onClick={handleStopCharging}
            disabled={actionLoading || orderStatus === "STOPPING"}
            className="btn btn-danger btn-lg btn-full"
            style={{ padding: "1rem", fontSize: "1.05rem" }}
          >
            <Square size={18} />
            <span>{orderStatus === "STOPPING" ? copy.stoppingText : copy.stopBtn}</span>
          </button>
        </div>
      ) : (
        /* VIEW 3: READY TO START CHARGING (SIMPLE GUN CARD + BIG START BUTTON) */
        <div className="card-elevated" style={{ padding: "1.75rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.35rem" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isOnline ? "var(--emerald-400)" : "#f87171",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Plug size={28} />
            </div>

            <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              {localizeSiteName(site, lang)}
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              {charger?.name || "20kW 直流充电枪"}
            </h1>

            {isOnline ? (
              <span className="badge badge-emerald">
                <CheckCircle2 size={13} />
                {copy.readyState}
              </span>
            ) : (
              <span className="badge badge-red">{copy.offlineState}</span>
            )}
          </div>

          {/* Simple Price Box */}
          <div
            style={{
              background: "#070d17",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "1rem 1.15rem",
              marginBottom: "1.35rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{copy.priceTitle}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                {copy.priceDetail}
              </div>
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--emerald-400)" }}>
              RM 1.50 <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>/ kWh</span>
            </div>
          </div>

          {/* If user is unverified, inline verify box */}
          {user && user.status === "UNVERIFIED" && (
            <form
              onSubmit={handleInlineVerify}
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "10px",
                padding: "0.9rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fcd34d", marginBottom: "0.5rem" }}>
                首次充电请验证邮箱（演示验证码：888666）
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input mono"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                />
                <button type="submit" disabled={verifying} className="btn btn-primary">
                  {verifying ? "..." : "验证"}
                </button>
              </div>
            </form>
          )}

          {/* Action Button */}
          {!user ? (
            <Link
              href={`/login?returnTo=${encodeURIComponent(`/c/${qrToken}`)}`}
              className="btn btn-primary btn-lg btn-full"
              style={{ padding: "1rem", fontSize: "1.05rem" }}
            >
              <LogIn size={18} />
              <span>登录后开始充电</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleStartCharging}
              disabled={!isOnline || actionLoading || user.status === "UNVERIFIED"}
              className="btn btn-primary btn-lg btn-full"
              style={{ padding: "1rem", fontSize: "1.1rem" }}
            >
              <Play size={19} />
              <span>{actionLoading ? copy.startingText : copy.startBtn}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
