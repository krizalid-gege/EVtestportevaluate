"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  Receipt,
  LogIn,
  LogOut,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useLanguage, LangCode } from "./LanguageProvider";

export interface AuthMeUser {
  id: string;
  email: string;
  displayName?: string | null;
  status: "UNVERIFIED" | "ACTIVE" | "DISABLED";
  roles: string[];
}

export interface ActiveOrderSummary {
  id: string;
  orderNo: string;
  status: string;
  chargedEnergyWh: number;
  totalAmountSen: number;
  qrToken?: string | null;
}

export function Navbar() {
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderSummary | null>(null);

  const isAdminRoute = pathname?.startsWith("/admin");

  const fetchAuthAndActiveSession = useCallback(async () => {
    if (isAdminRoute) return;
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setActiveOrder(null);
        return;
      }
      const data = await res.json();
      const currentUser: AuthMeUser | null = data?.user || null;
      setUser(currentUser);

      if (data?.activeOrder) {
        const qr =
          data.activeOrder?.connector?.qrCodes?.[0]?.qrToken ||
          data.activeOrder?.qrToken ||
          "K9mP2xQ8vL4n";
        setActiveOrder({
          id: data.activeOrder.id,
          orderNo: data.activeOrder.orderNo,
          status: data.activeOrder.status,
          chargedEnergyWh: data.activeOrder.chargedEnergyWh ?? 0,
          totalAmountSen: data.activeOrder.totalAmountSen ?? 0,
          qrToken: qr,
        });
      } else {
        setActiveOrder(null);
      }
    } catch {
      // ignore transient error
    }
  }, [isAdminRoute]);

  useEffect(() => {
    fetchAuthAndActiveSession();
    const timer = setInterval(fetchAuthAndActiveSession, 3000);
    const onAuthChanged = () => fetchAuthAndActiveSession();
    window.addEventListener("ev-cpo-auth-changed", onAuthChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener("ev-cpo-auth-changed", onAuthChanged);
    };
  }, [fetchAuthAndActiveSession, pathname]);

  // Do NOT render the consumer client navbar inside the independent Operator Admin Console (/admin)
  if (isAdminRoute) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    setActiveOrder(null);
    window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    router.push("/login");
  };

  const formatRm = (sen: number) => `RM ${(Math.round(sen || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(wh || 0) / 1000).toFixed(2)} kWh`;

  const labels = {
    brand: lang === "zh" ? "MY-EV 充电客户端" : lang === "ms" ? "Aplikasi Pengecasan EV" : "MY-EV Charging App",
    selectGun: lang === "zh" ? "选择充电枪" : lang === "ms" ? "Pilih Pengecas" : "Select Charger",
    myOrders: lang === "zh" ? "我的订单" : lang === "ms" ? "Pesanan Saya" : "My Orders",
    login: lang === "zh" ? "登录 / 注册" : lang === "ms" ? "Log Masuk" : "Login / Sign Up",
    logout: lang === "zh" ? "退出" : lang === "ms" ? "Log Keluar" : "Logout",
    chargingNow: lang === "zh" ? "正在充电中" : lang === "ms" ? "Sedang Mengecas" : "Charging in Progress",
    backToCharge: lang === "zh" ? "查看充电进度" : lang === "ms" ? "Lihat Kemajuan" : "View Charging",
  };

  return (
    <header className="navbar-wrapper">
      {activeOrder && !pathname?.startsWith("/c/") && (
        <div className="active-session-banner">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={16} />
            <strong>{labels.chargingNow}:</strong>
            <span>{formatKwh(activeOrder.chargedEnergyWh)}</span>
            <span>• {formatRm(activeOrder.totalAmountSen)}</span>
          </span>
          <Link
            href={activeOrder.qrToken ? `/c/${activeOrder.qrToken}` : `/orders/${activeOrder.id}`}
            className="active-session-cta"
          >
            {labels.backToCharge}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="navbar-inner" style={{ maxWidth: "560px" }}>
        <Link href="/" className="brand-link">
          <span className="brand-icon">
            <Zap size={18} />
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 800 }}>{labels.brand}</span>
        </Link>

        <div className="nav-links">
          {user && (
            <>
              <Link href="/" className={`nav-pill ${pathname === "/" ? "active" : ""}`}>
                <Zap size={14} />
                <span>{labels.selectGun}</span>
              </Link>
              <Link
                href="/orders"
                className={`nav-pill ${pathname?.startsWith("/orders") ? "active" : ""}`}
              >
                <Receipt size={14} />
                <span>{labels.myOrders}</span>
              </Link>
            </>
          )}

          <div className="lang-switcher" role="group" aria-label="Language Switcher">
            {(
              [
                { code: "zh", label: "中文" },
                { code: "en", label: "EN" },
                { code: "ms", label: "BM" },
              ] as Array<{ code: LangCode; label: string }>
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`lang-btn ${lang === item.code ? "active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="nav-pill"
              title={user.email}
            >
              <LogOut size={14} />
              <span>{labels.logout}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className={`nav-pill ${pathname === "/login" ? "active" : ""}`}
            >
              <LogIn size={14} />
              <span>{labels.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
