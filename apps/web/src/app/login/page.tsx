"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  UserPlus,
  MailCheck,
  KeyRound,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useLanguage, localizeApiMessage } from "@/components/LanguageProvider";

type AuthTab = "login" | "register" | "verify" | "reset";

function LoginContent() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const initialTab = (searchParams.get("tab") as AuthTab) || "login";

  const [activeTab, setActiveTab] = useState<AuthTab>(
    ["login", "register", "verify", "reset"].includes(initialTab) ? initialTab : "login"
  );

  const [email, setEmail] = useState("driver@evcpo.my");
  const [password, setPassword] = useState("Password123!");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("888666");
  const [resetCode, setResetCode] = useState("888666");
  const [newPassword, setNewPassword] = useState("Password123!");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const notifyAndRedirect = (dest?: string) => {
    window.dispatchEvent(new Event("ev-cpo-auth-changed"));
    setTimeout(() => {
      router.push(dest || returnTo || "/");
      router.refresh();
    }, 250);
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
        setErrorMsg(localizeApiMessage(data?.error || "邮箱或密码错误", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg(t.authSuccessRedirect);
      notifyAndRedirect(returnTo);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "网络错误", lang));
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "注册失败", lang));
        setLoading(false);
        return;
      }
      if (data?.demoVerificationCode) {
        setVerifyCode(String(data.demoVerificationCode));
      }
      setSuccessMsg("注册成功，请输入验证码 888666 完成激活");
      window.dispatchEvent(new Event("ev-cpo-auth-changed"));
      setActiveTab("verify");
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "网络错误", lang));
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
        body: JSON.stringify({ email: email.trim(), code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeApiMessage(data?.error || "验证码错误", lang));
        setLoading(false);
        return;
      }
      setSuccessMsg("邮箱验证成功，正在进入选枪页面...");
      notifyAndRedirect(returnTo);
    } catch (err: any) {
      setErrorMsg(localizeApiMessage(err?.message || "网络错误", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: resetCode.trim(),
          newPassword,
        }),
      });
      if (!res.ok) {
        setErrorMsg("重置失败");
        setLoading(false);
        return;
      }
      setPassword(newPassword);
      setSuccessMsg("密码已重置，请登录");
      setActiveTab("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-narrow" style={{ maxWidth: "440px", paddingTop: "1.5rem" }}>
      <div className="card-elevated" style={{ padding: "1.75rem 1.5rem" }}>
        {/* Clean Tabs: Login / Register / Verify / Reset */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.35rem",
            marginBottom: "1.35rem",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`tab-btn ${activeTab === "login" ? "active" : ""}`}
            style={{ justifyContent: "center", padding: "0.5rem" }}
          >
            <LogIn size={14} />
            <span>{t.authTabLogin}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
            style={{ justifyContent: "center", padding: "0.5rem" }}
          >
            <UserPlus size={14} />
            <span>{t.authTabRegister}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("verify")}
            className={`tab-btn ${activeTab === "verify" ? "active" : ""}`}
            style={{ justifyContent: "center", padding: "0.5rem" }}
          >
            <MailCheck size={14} />
            <span>{t.authTabVerify}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reset")}
            className={`tab-btn ${activeTab === "reset" ? "active" : ""}`}
            style={{ justifyContent: "center", padding: "0.5rem" }}
          >
            <KeyRound size={14} />
            <span>{t.authTabReset}</span>
          </button>
        </div>

        {errorMsg && (
          <div
            className="card"
            style={{
              borderColor: "rgba(239, 68, 68, 0.55)",
              background: "rgba(127, 29, 29, 0.25)",
              marginBottom: "1rem",
              padding: "0.75rem 0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#fecaca",
              fontSize: "0.84rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="card"
            style={{
              borderColor: "rgba(16, 185, 129, 0.55)",
              background: "rgba(6, 78, 59, 0.28)",
              marginBottom: "1rem",
              padding: "0.75rem 0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#a7f3d0",
              fontSize: "0.84rem",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="field-group">
              <label className="field-label">{t.emailLabel}</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">{t.passwordLabel}</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              <Zap size={16} />
              <span>{loading ? "..." : t.loginSubmitBtn}</span>
            </button>
          </form>
        )}

        {activeTab === "register" && (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div className="field-group">
              <label className="field-label">{t.emailLabel}</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.passwordLabel}</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.displayNameLabel}</label>
              <input
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              <UserPlus size={16} />
              <span>{loading ? "..." : t.registerSubmitBtn}</span>
            </button>
          </form>
        )}

        {activeTab === "verify" && (
          <form onSubmit={handleVerifyEmail} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div className="field-group">
              <label className="field-label">{t.emailLabel}</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.verifyCodeLabel} (888666)</label>
              <input
                type="text"
                required
                maxLength={6}
                className="input mono"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              <MailCheck size={16} />
              <span>{loading ? "..." : t.verifySubmitBtn}</span>
            </button>
          </form>
        )}

        {activeTab === "reset" && (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div className="field-group">
              <label className="field-label">{t.emailLabel}</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t.newPasswordLabel}</label>
              <input
                type="password"
                required
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              <KeyRound size={16} />
              <span>{loading ? "..." : t.resetSubmitBtn}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-narrow">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
