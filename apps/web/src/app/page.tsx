"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plug,
  ArrowRight,
  LogIn,
  UserPlus,
  Receipt,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function ClientHomePage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);

  useEffect(() => {
    // Default to Chinese if first visit so user can read immediately
    if (typeof window !== "undefined" && !localStorage.getItem("ev_cpo_lang_init")) {
      localStorage.setItem("ev_cpo_lang_init", "1");
    }
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoadingAuth(false));
  }, []);

  const handleQuickDriverLogin = async () => {
    setQuickLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "driver@evcpo.my",
          password: "Password123!",
          quickSwitch: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        window.dispatchEvent(new Event("ev-cpo-auth-changed"));
      }
    } finally {
      setQuickLoggingIn(false);
    }
  };

  const copy = {
    welcomeTitle:
      lang === "zh"
        ? "欢迎使用自助充电"
        : lang === "ms"
        ? "Selamat Datang ke Pengecasan EV"
        : "Welcome to EV Charging",
    welcomeSub:
      lang === "zh"
        ? "请先登录或注册账号，然后选择充电枪开始充电"
        : lang === "ms"
        ? "Sila log masuk atau daftar akaun, kemudian pilih pengecas"
        : "Please login or register, then select a charging gun to start",
    loginBtn:
      lang === "zh" ? "车主登录 / 注册" : lang === "ms" ? "Log Masuk / Daftar" : "Driver Login / Register",
    quickDriverBtn:
      lang === "zh"
        ? "⚡ 一键登录测试车主账号 (driver@evcpo.my)"
        : lang === "ms"
        ? "⚡ Log Masuk Pantas Akaun Pemandu"
        : "⚡ 1-Click Demo Driver Login (driver@evcpo.my)",
    selectGunHeading:
      lang === "zh"
        ? "请选择充电枪"
        : lang === "ms"
        ? "Sila Pilih Pengecas"
        : "Select a Charging Gun",
    selectGunSub:
      lang === "zh"
        ? "吉隆坡双子塔自营示范站 • RM 1.50 / 度 (含服务费)"
        : lang === "ms"
        ? "Stesen KLCC • RM 1.50 / kWh"
        : "KLCC Station • RM 1.50 / kWh",
    gun1Name:
      lang === "zh"
        ? "1号充电枪 (国标直流 20kW)"
        : lang === "ms"
        ? "Pengecas #1 (GB/T DC 20kW)"
        : "Charging Gun #1 (GB/T DC 20kW)",
    gun2Name:
      lang === "zh"
        ? "2号充电枪 (欧标直流 20kW)"
        : lang === "ms"
        ? "Pengecas #2 (CCS2 DC 20kW)"
        : "Charging Gun #2 (CCS2 DC 20kW)",
    gun3Name:
      lang === "zh"
        ? "3号充电枪 (八打灵再也站)"
        : lang === "ms"
        ? "Pengecas #3 (Stesen PJ)"
        : "Charging Gun #3 (PJ Station)",
    readyBadge:
      lang === "zh" ? "已插枪就绪" : lang === "ms" ? "Sedia Mengecas" : "Plugged In & Ready",
    offlineBadge:
      lang === "zh" ? "设备离线" : lang === "ms" ? "Luar Talian" : "Offline",
    priceText:
      lang === "zh"
        ? "电价：RM 1.50 / 度 (电费 RM 1.20 + 服务费 RM 0.30)"
        : lang === "ms"
        ? "Harga: RM 1.50 / kWh"
        : "Rate: RM 1.50 / kWh (Energy RM 1.20 + Service RM 0.30)",
    enterGunBtn:
      lang === "zh" ? "选择此枪充电" : lang === "ms" ? "Pilih Pengecas Ini" : "Select This Gun",
    offlineBtn:
      lang === "zh" ? "离线不可用" : lang === "ms" ? "Tidak Tersedia" : "Unavailable (Offline)",
    myOrdersBtn:
      lang === "zh" ? "查看我的历史充电订单" : lang === "ms" ? "Lihat Pesanan Saya" : "View My Charging Orders",
  };

  const guns = [
    {
      id: "1",
      name: copy.gun1Name,
      qrToken: "K9mP2xQ8vL4n",
      online: true,
    },
    {
      id: "2",
      name: copy.gun2Name,
      qrToken: "C7xR4tN9wM2p",
      online: true,
    },
    {
      id: "3",
      name: copy.gun3Name,
      qrToken: "P3zW8qB5jH6k",
      online: false,
    },
  ];

  if (loadingAuth) {
    return (
      <div className="container-narrow" style={{ paddingTop: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{ maxWidth: "480px", paddingTop: "1.5rem" }}>
      {/* Step 1: If not logged in, only show clean Login / Register prompt */}
      {!user ? (
        <div className="card-elevated" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--emerald-400)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <Zap size={28} />
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {copy.welcomeTitle}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {copy.welcomeSub}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handleQuickDriverLogin}
              disabled={quickLoggingIn}
              className="btn btn-primary btn-lg btn-full"
            >
              {quickLoggingIn ? "..." : copy.quickDriverBtn}
            </button>

            <Link href="/login" className="btn btn-secondary btn-full">
              <LogIn size={16} />
              <span>{copy.loginBtn}</span>
            </Link>

            <Link href="/login?tab=register" className="btn btn-outline btn-full">
              <UserPlus size={16} />
              <span>{lang === "zh" ? "注册新账号" : lang === "ms" ? "Daftar Akaun" : "Create Account"}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Step 2: Logged in -> Cleanly select a Charging Gun */
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {copy.selectGunHeading}
            </h1>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>
              {copy.selectGunSub}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {guns.map((gun) => (
              <div
                key={gun.qrToken}
                className={gun.online ? "card-elevated" : "card"}
                style={{
                  padding: "1.25rem",
                  borderColor: gun.online
                    ? "rgba(16, 185, 129, 0.45)"
                    : "rgba(239, 68, 68, 0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Plug
                      size={20}
                      style={{ color: gun.online ? "var(--emerald-400)" : "var(--text-muted)" }}
                    />
                    <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>{gun.name}</span>
                  </div>
                  {gun.online ? (
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} />
                      {copy.readyBadge}
                    </span>
                  ) : (
                    <span className="badge badge-red">
                      <XCircle size={12} />
                      {copy.offlineBadge}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: "0.84rem",
                    color: "var(--text-secondary)",
                    marginBottom: "1rem",
                  }}
                >
                  {copy.priceText}
                </p>

                <button
                  type="button"
                  onClick={() => router.push(`/c/${gun.qrToken}`)}
                  className={`btn btn-full ${gun.online ? "btn-primary btn-lg" : "btn-secondary"}`}
                >
                  <Zap size={17} />
                  <span>{gun.online ? copy.enterGunBtn : copy.offlineBtn}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <Link href="/orders" className="btn btn-secondary btn-full">
              <Receipt size={16} />
              <span>{copy.myOrdersBtn}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
