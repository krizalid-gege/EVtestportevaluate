"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  QrCode,
  Receipt,
  ShieldCheck,
  LogIn,
  LogOut,
  Activity,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useLanguage, LangCode, localizeOrderStatus } from "./LanguageProvider";

export interface AuthMeUser {
  id: string;
  email: string;
  displayName?: string | null;
  status: "UNVERIFIED" | "ACTIVE" | "DISABLED";
  roles: string[];
  siteCodes?: string[];
}

export interface ActiveOrderSummary {
  id: string;
  orderNo: string;
  status: string;
  chargedEnergyWh: number;
  totalAmountSen: number;
  qrToken?: string | null;
  chargerOcppId?: string | null;
}

export function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderSummary | null>(null);

  const fetchAuthAndActiveSession = useCallback(async () => {
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

      // Check if /api/auth/me returned activeOrder directly, otherwise check /api/orders
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
          chargerOcppId: data.activeOrder?.charger?.ocppId || null,
        });
      } else if (currentUser) {
        const ordRes = await fetch("/api/orders", { cache: "no-store" });
        if (ordRes.ok) {
          const ordData = await ordRes.json();
          const list: any[] = ordData?.orders || [];
          const ongoing = list.find((o) =>
            ["AUTHORIZING", "READY_TO_START", "STARTING", "CHARGING", "STOPPING", "SETTLING"].includes(
              o.status
            )
          );
          if (ongoing) {
            const qr =
              ongoing?.connector?.qrCodes?.[0]?.qrToken ||
              ongoing?.qrToken ||
              "K9mP2xQ8vL4n";
            setActiveOrder({
              id: ongoing.id,
              orderNo: ongoing.orderNo,
              status: ongoing.status,
              chargedEnergyWh: ongoing.chargedEnergyWh ?? 0,
              totalAmountSen: ongoing.totalAmountSen ?? 0,
              qrToken: qr,
              chargerOcppId: ongoing?.charger?.ocppId || null,
            });
          } else {
            setActiveOrder(null);
          }
        }
      } else {
        setActiveOrder(null);
      }
    } catch {
      // ignore network glitches during background polling
    }
  }, []);

  useEffect(() => {
    fetchAuthAndActiveSession();
    const timer = setInterval(fetchAuthAndActiveSession, 4000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchAuthAndActiveSession();
      }
    };
    const onAuthChanged = () => fetchAuthAndActiveSession();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("ev-cpo-auth-changed", onAuthChanged);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("ev-cpo-auth-changed", onAuthChanged);
    };
  }, [fetchAuthAndActiveSession, pathname]);

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

  const roles = user?.roles || [];
  const isStaffOrAdmin =
    roles.includes("ADMIN") ||
    roles.includes("CUSTOMER_SERVICE") ||
    roles.includes("SITE_STAFF");

  const getRoleBadge = () => {
    if (!user) return null;
    if (roles.includes("ADMIN")) {
      return <span className="badge badge-purple">{t.roleAdmin}</span>;
    }
    if (roles.includes("CUSTOMER_SERVICE")) {
      return <span className="badge badge-blue">{t.roleCustomerService}</span>;
    }
    if (roles.includes("SITE_STAFF")) {
      return <span className="badge badge-cyan">{t.roleSiteStaff}</span>;
    }
    if (user.status === "UNVERIFIED") {
      return (
        <span className="badge badge-amber">
          <AlertTriangle size={12} />
          {t.roleUnverifiedDriver}
        </span>
      );
    }
    return <span className="badge badge-emerald">{t.roleVerifiedDriver}</span>;
  };

  const formatRm = (sen: number) => `RM ${(Math.round(sen || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(wh || 0) / 1000).toFixed(3)} kWh`;

  return (
    <header className="navbar-wrapper">
      {activeOrder && (
        <div className="active-session-banner">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Activity size={16} />
            <strong>{t.activeSessionTitle}:</strong>
            <span className="mono">{activeOrder.orderNo}</span>
            <span>({localizeOrderStatus(activeOrder.status, lang)})</span>
            <span>• {formatKwh(activeOrder.chargedEnergyWh)}</span>
            <span>• {formatRm(activeOrder.totalAmountSen)}</span>
          </span>
          <Link
            href={activeOrder.qrToken ? `/c/${activeOrder.qrToken}` : `/orders/${activeOrder.id}`}
            className="active-session-cta"
          >
            {t.activeSessionJumpBtn}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="navbar-inner">
        <Link href="/" className="brand-link">
          <span className="brand-icon">
            <Zap size={19} />
          </span>
          <div>
            <div style={{ lineHeight: 1.15 }}>{t.brandTitle}</div>
            <div style={{ fontSize: "0.71rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {t.brandSubtitle}
            </div>
          </div>
        </Link>

        <div className="nav-links">
          <Link href="/" className={`nav-pill ${pathname === "/" ? "active" : ""}`}>
            <QrCode size={15} />
            <span>{t.navHome}</span>
          </Link>

          <Link
            href="/orders"
            className={`nav-pill ${pathname?.startsWith("/orders") ? "active" : ""}`}
          >
            <Receipt size={15} />
            <span>{t.navOrders}</span>
          </Link>

          <Link
            href="/admin"
            className={`nav-pill ${pathname?.startsWith("/admin") ? "active" : ""}`}
            style={
              isStaffOrAdmin
                ? { borderColor: "rgba(192, 132, 252, 0.55)", color: "#e9d5ff" }
                : undefined
            }
          >
            <ShieldCheck size={15} />
            <span>{t.navAdminConsole}</span>
          </Link>

          {/* Instant 3-Language Switcher: EN | BM | 中文 (REQ-ADM-006 / Criterion 7) */}
          <div className="lang-switcher" role="group" aria-label="Language Switcher">
            {(
              [
                { code: "en", label: "EN" },
                { code: "ms", label: "BM" },
                { code: "zh", label: "中文" },
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              {getRoleBadge()}
              <Link
                href="/login"
                className="mono"
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  maxWidth: "155px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={user.email}
              >
                {user.email}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="nav-pill"
                title={t.navLogout}
              >
                <LogOut size={14} />
                <span>{t.navLogout}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className={`nav-pill ${pathname === "/login" ? "active" : ""}`}
            >
              <LogIn size={15} />
              <span>{t.navLogin}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
