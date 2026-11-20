"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  UserPlus,
  MailCheck,
  KeyRound,
  Shield,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  QrCode,
} from "lucide-react";
import { useLanguage, localizeApiMessage } from "@/components/LanguageProvider";

type AuthTab = "login" | "register" | "verify" | "reset";

function LoginContent() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "";
  const initialTab = (searchParams.get("tab") as AuthTab) || "login";

  const [activeTab, setActiveTab] = useState<AuthTab>(
    ["login", "register", "verify", "reset"].includes(initialTab) ? initialTab : "login"
  );

  const [email, setEmail] = useState("driver@evcpo.my");
  const [password, setPassword] = useState("Demo1234!");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("888666");
  const [resetCode, setResetCode] = useState("888666");
  const [newPassword, setNewPassword] = useState("Demo1234!");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const notifyAuthChangedAndRedirect = (targetOverride?: string) => {
    window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    const target = targetOverride || returnTo || "/";
    setTimeout(() => {
      router.push(target);
      router.refresh();
    }, 350);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Invalid credentials", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg(t.authSuccessRedirect);
      const roles: string[] = data?.user?.roles || [];
      const defaultDest =
        returnTo ||
        (roles.includes("ADMIN") ||
        roles.includes("CUSTOMER_SERVICE") ||
        roles.includes("SITE_STAFF")
          ? "/admin"
          : "/");
      notifyAuthChangedAndRedirect(defaultDest);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (demoEmail: string, isAdminTarget: boolean) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail(demoEmail);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: demoEmail,
          password: "Password123!",
          quickSwitch: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Quick sign-in failed", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg(`${t.authSuccessRedirect} (${demoEmail})`);
      const dest = returnTo || (isAdminTarget ? "/admin" : "/c/K9mP2xQ8vL4n");
      notifyAuthChangedAndRedirect(dest);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          phone: phone.trim() || undefined,
          locale: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Registration failed", lang));
        setLoading(false);
        return;
      }
      if (data?.verificationCode) {
        setVerifyCode(String(data.verificationCode));
      } else {
        setVerifyCode("888666");
      }
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
      setActiveTab("verify");
      setSuccessMsg(t.verificationCodeHint);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: verifyCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Invalid verification code", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg(t.verifySuccessMsg);
      notifyAuthChangedAndRedirect(returnTo || "/c/K9mP2xQ8vL4n");
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Reset request failed", lang));
        setLoading(false);
        return;
      }
      if (data?.resetToken) {
        setResetCode(String(data.resetToken));
      }
      setSuccessMsg(t.resetCodeSentMsg);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email: email.trim(),
          token: resetCode.trim(),
          code: resetCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "Password reset failed", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg(t.resetSuccessMsg);
      notifyAuthChangedAndRedirect(returnTo || "/");
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "Network error", lang));
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      email: "driver@evcpo.my",
      roleBadge: "DRIVER (ACTIVE)",
      badgeClass: "badge-emerald",
      label: t.accDriverLabel,
      desc: t.accDriverDesc,
      isAdminTarget: false,
    },
    {
      email: "unverified@evcpo.my",
      roleBadge: "DRIVER (UNVERIFIED)",
      badgeClass: "badge-amber",
      label: t.accUnverifiedLabel,
      desc: t.accUnverifiedDesc,
      isAdminTarget: false,
    },
    {
      email: "admin@evcpo.my",
      roleBadge: "ADMIN",
      badgeClass: "badge-purple",
      label: t.accAdminLabel,
      desc: t.accAdminDesc,
      isAdminTarget: true,
    },
    {
      email: "cs@evcpo.my",
      roleBadge: "CUSTOMER_SERVICE",
      badgeClass: "badge-blue",
      label: t.accCsLabel,
      desc: t.accCsDesc,
      isAdminTarget: true,
    },
    {
      email: "staff-kl@evcpo.my",
      roleBadge: "SITE_STAFF (MY-KL-001)",
      badgeClass: "badge-cyan",
      label: t.accStaffLabel,
      desc: t.accStaffDesc,
      isAdminTarget: true,
    },
  ];

  return (
    <div className="container-pwa">
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.55rem", fontWeight: 800, marginBottom: "0.3rem" }}>
          {t.authPageTitle}
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
          {t.authPageSubtitle}
        </p>
      </div>

      {returnTo && (
        <div
          className="card-emerald"
          style={{
            marginBottom: "1.2rem",
            padding: "0.85rem 1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <QrCode size={18} style={{ color: "var(--emerald-400)" }} />
            <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>{t.returnToNotice}</span>
          </div>
          <span className="badge badge-emerald mono">{returnTo}</span>
        </div>
      )}

      {errorMsg && (
        <div
          className="card-red"
          style={{
            marginBottom: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--red-400)", flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="card-emerald"
          style={{
            marginBottom: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--emerald-400)", flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Left Card: 4-Tab Auth Forms */}
        <div className="card-elevated">
          <div className="tabs-bar">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMsg(null);
              }}
              className={`tab-btn ${activeTab === "login" ? "active" : ""}`}
            >
              <LogIn size={15} />
              <span>{t.tabLogin}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMsg(null);
              }}
              className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
            >
              <UserPlus size={15} />
              <span>{t.tabRegister}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("verify");
                setErrorMsg(null);
              }}
              className={`tab-btn ${activeTab === "verify" ? "active" : ""}`}
            >
              <MailCheck size={15} />
              <span>{t.tabVerifyEmail}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("reset");
                setErrorMsg(null);
              }}
              className={`tab-btn ${activeTab === "reset" ? "active" : ""}`}
            >
              <KeyRound size={15} />
              <span>{t.tabResetPassword}</span>
            </button>
          </div>

          {activeTab === "login" && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">{t.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="driver@evcpo.my"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.passwordLabel}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
                style={{ marginTop: "0.4rem" }}
              >
                <LogIn size={16} />
                <span>{t.loginSubmitBtn}</span>
              </button>
            </form>
          )}

          {activeTab === "register" && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">{t.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="newdriver@evcpo.my"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.displayNameLabel}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  placeholder="Ahmad / Tan Wei Ming"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.phoneOptionalLabel}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  placeholder="+60 12-345 6789"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.passwordLabel}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
                style={{ marginTop: "0.4rem" }}
              >
                <UserPlus size={16} />
                <span>{t.registerSubmitBtn}</span>
              </button>
            </form>
          )}

          {activeTab === "verify" && (
            <form onSubmit={handleVerifyEmail}>
              <div className="form-group">
                <label className="form-label">{t.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.verificationCodeLabel}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="form-input mono"
                  style={{ fontSize: "1.2rem", letterSpacing: "0.2em", fontWeight: 800 }}
                  placeholder="888666"
                />
                <span style={{ fontSize: "0.75rem", color: "var(--emerald-400)" }}>
                  {t.verificationCodeHint}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
                style={{ marginTop: "0.4rem" }}
              >
                <MailCheck size={16} />
                <span>{t.verifySubmitBtn}</span>
              </button>
            </form>
          )}

          {activeTab === "reset" && (
            <form onSubmit={handleConfirmReset}>
              <div className="form-group">
                <label className="form-label">{t.emailLabel}</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestReset}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {t.requestResetBtn}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.resetTokenLabel}</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="form-input mono"
                  placeholder="888666"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.newPasswordLabel}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
                style={{ marginTop: "0.4rem" }}
              >
                <KeyRound size={16} />
                <span>{t.confirmResetBtn}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Card: Demo Quick Account Switcher Panel */}
        <div className="card-elevated">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
            <Shield size={18} style={{ color: "var(--emerald-400)" }} />
            <h2 style={{ fontSize: "1.08rem", fontWeight: 800 }}>
              {t.quickAccountSwitcherTitle}
            </h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            {t.quickAccountSwitcherDesc}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {demoAccounts.map((acc) => (
              <div
                key={acc.email}
                style={{
                  background: "#080f1a",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      marginBottom: "0.25rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>{acc.label}</span>
                    <span className={`badge ${acc.badgeClass}`}>{acc.roleBadge}</span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.76rem",
                      color: "var(--emerald-400)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {acc.email}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{acc.desc}</div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickSwitch(acc.email, acc.isAdminTarget)}
                  className="btn btn-outline btn-sm"
                >
                  <UserCheck size={14} />
                  <span>{t.quickSwitchBtn}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-pwa">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
