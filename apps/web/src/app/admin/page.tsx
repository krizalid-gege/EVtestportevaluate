"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  QrCode,
  Receipt,
  Coins,
  Terminal,
  FlaskConical,
  FileWarning,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Wifi,
  WifiOff,
  UserCheck,
  Mail,
  Bell,
} from "lucide-react";

type AdminTab =
  | "chargers"
  | "orders"
  | "tariffs"
  | "ocpp"
  | "simulator"
  | "audit";

export default function ChineseAdminConsolePage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("chargers");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [chargers, setChargers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [ocppMessages, setOcppMessages] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);

  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // OCPP Message Inspector Filters (Tab 4: REQ-ADM-005)
  const [filterChargerOcppId, setFilterChargerOcppId] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [filterOrderQuery, setFilterOrderQuery] = useState<string>("");

  // Tariff Editor State (Tab 3: REQ-BIL-001 ~ 005)
  const [editTariffId, setEditTariffId] = useState<string>("");
  const [energyPriceSen, setEnergyPriceSen] = useState<number>(120);
  const [serviceFeeSen, setServiceFeeSen] = useState<number>(30);
  const [taxRateBps, setTaxRateBps] = useState<number>(600);
  const [tariffReason, setTariffReason] = useState<string>(
    "Phase 1A 站点峰谷电价调整测试（验证历史订单快照不变 REQ-BIL-005）"
  );

  // High-Risk Remote Control Modal State (Tab 1: REQ-ADM-003, Section 5)
  const [remoteModalCharger, setRemoteModalCharger] = useState<any>(null);
  const [remoteAction, setRemoteAction] = useState<
    "REMOTE_START" | "REMOTE_STOP" | "SOFT_RESET" | "HARD_RESET"
  >("REMOTE_START");
  const [remoteReason, setRemoteReason] = useState<string>("");
  const [remoteConfirmChecked, setRemoteConfirmChecked] = useState<boolean>(false);

  // Simulator Lab Output (Tab 5)
  const [simResult, setSimResult] = useState<any>(null);

  const formatRm = (sen: number) => `RM ${(Math.round(Number(sen) || 0) / 100).toFixed(2)}`;
  const formatKwh = (wh: number) => `${(Math.round(Number(wh) || 0) / 1000).toFixed(3)} kWh`;
  const formatMyt = (d: string | null | undefined) => {
    if (!d) return "-";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
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

  const fetchOverview = useCallback(async () => {
    try {
      const [meRes, ovRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/admin/overview", { cache: "no-store" }),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData?.user || null);
      }

      if (ovRes.ok) {
        const data = await ovRes.json();
        setSites(data?.sites || []);
        setChargers(data?.chargers || []);
        setOrders(data?.orders || []);
        const tList = data?.tariffs || [];
        setTariffs(tList);
        if (tList.length > 0 && !editTariffId) {
          setEditTariffId(tList[0].id);
          setEnergyPriceSen(tList[0].energyPriceSenPerKwh);
          setServiceFeeSen(tList[0].serviceFeeSenPerKwh);
          setTaxRateBps(tList[0].taxRateBps);
        }
        setOcppMessages(data?.ocppMessages || []);
        setAuditLogs(data?.auditLogs || []);
        setAlerts(data?.alerts || []);
        setEmails(data?.emailDeliveries || data?.emails || []);
      } else if (ovRes.status === 401 || ovRes.status === 403) {
        const errData = await ovRes.json().catch(() => ({}));
        setBannerError(
          errData?.error ||
            "当前登录账号无权访问运营后台，请使用顶部【一键切换角色】切换为管理员、客服或站点人员。"
        );
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [editTariffId]);

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 4000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  const handleQuickRoleSwitch = async (targetEmail: string) => {
    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: "Password123!",
          quickSwitch: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(data?.error || "角色切换失败");
      } else {
        setBannerSuccess(`已成功切换当前运营身份为：${targetEmail}`);
        window.dispatchEvent(new Event("ev-cpo-auth-changed"));
        await fetchOverview();
      }
    } catch (err: any) {
      setBannerError(err?.message || "网络异常");
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleRequirePreparing = async (charger: any) => {
    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const nextVal = !charger.requirePreparingState;
      const res = await fetch("/api/admin/remote-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: charger.id,
          ocppId: charger.ocppId,
          action: "TOGGLE_PREPARING_STATE",
          requirePreparingState: nextVal,
          confirmed: true,
          reason: `切换全耀 SECC 插枪 Preparing 状态严格校验开关为 ${nextVal}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(data?.error || `操作被拒绝 (HTTP ${res.status})`);
      } else {
        setBannerSuccess(
          `已更新 ${charger.ocppId} 的插枪状态校验开关 (requirePreparingState = ${String(
            nextVal
          )})`
        );
      }
      await fetchOverview();
    } catch (err: any) {
      setBannerError(err?.message || "请求失败");
    } finally {
      setActionBusy(false);
    }
  };

  const handleExecuteRemoteControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteModalCharger) return;
    if (!remoteConfirmChecked || !remoteReason.trim()) {
      setBannerError("高风险远程控制必须勾选二次确认并填写操作原因（REQ-ADM-003）！");
      return;
    }

    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const res = await fetch("/api/admin/remote-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: remoteModalCharger.id,
          ocppId: remoteModalCharger.ocppId,
          action: remoteAction,
          confirmed: remoteConfirmChecked,
          reason: remoteReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(
          `[${res.status}] ${
            data?.error || "远程控制请求被拦截（已记录至安全审计日志 REQ-ADM-002）"
          }`
        );
      } else {
        setBannerSuccess(
          `已对 ${remoteModalCharger.ocppId} 执行 ${remoteAction}，原因已写入不可篡改审计日志！`
        );
        setRemoteModalCharger(null);
        setRemoteReason("");
        setRemoteConfirmChecked(false);
      }
      await fetchOverview();
    } catch (err: any) {
      setBannerError(err?.message || "远程控制失败");
    } finally {
      setActionBusy(false);
    }
  };

  // Dedicated 1-click test for Customer Service 403 unauthorized attempt + Security Audit Log (REQ-ADM-002)
  const handleTestUnauthorizedAttempt = async () => {
    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const targetCharger = chargers[0] || { id: "demo", ocppId: "MY-KL-DC-001" };
      const res = await fetch("/api/admin/remote-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: targetCharger.id,
          ocppId: targetCharger.ocppId,
          action: "HARD_RESET",
          confirmed: true,
          reason: "测试越权调用远程硬复位 (验证 403 拦截与安全审计日志 REQ-ADM-002)",
        }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setBannerError(
          `✅ 越权拦截验证通过 (HTTP 403 Forbidden)：${
            data?.error || "当前角色禁止执行远程控制，已自动写入 isSecurity=true 安全审计日志！"
          }`
        );
        setActiveTab("audit");
      } else if (!res.ok) {
        setBannerError(`收到拦截响应 (${res.status})：${data?.error}`);
      } else {
        setBannerSuccess(
          "当前为 ADMIN 管理员身份，操作被允许。若要测试 403 越权拦截，请先点击上方【切换为客服 (cs@evcpo.my)】再点此按钮！"
        );
      }
      await fetchOverview();
    } catch (err: any) {
      setBannerError(err?.message || "请求异常");
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tariffReason.trim()) {
      setBannerError("修改站点电价必须填写调价原因并写入审计日志！");
      return;
    }
    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const res = await fetch("/api/admin/tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tariffId: editTariffId || tariffs[0]?.id,
          energyPriceSenPerKwh: Number(energyPriceSen),
          serviceFeeSenPerKwh: Number(serviceFeeSen),
          taxRateBps: Number(taxRateBps),
          reason: tariffReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(
          `[${res.status}] ${data?.error || "修改电价被拒绝（客服/站点人员无改价权限）"}`
        );
      } else {
        setBannerSuccess(
          `电价规则已更新为：电费 RM ${(energyPriceSen / 100).toFixed(2)}/kWh + 服务费 RM ${(
            serviceFeeSen / 100
          ).toFixed(2)}/kWh！所有既有订单的 TariffSnapshot 均保持原快照不变（REQ-BIL-005）。`
        );
      }
      await fetchOverview();
    } catch (err: any) {
      setBannerError(err?.message || "保存电价失败");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRunSimulatorScenario = async (
    scenarioKey: string,
    label: string,
    ocppId = "MY-KL-DC-001"
  ) => {
    setActionBusy(true);
    setBannerError(null);
    setBannerSuccess(null);
    setSimResult(null);
    try {
      const res = await fetch("/api/admin/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenarioKey,
          ocppId,
        }),
      });
      const data = await res.json();
      setSimResult(data);
      if (!res.ok) {
        setBannerError(data?.error || `演练场景执行失败 (${res.status})`);
      } else {
        setBannerSuccess(`✅ 验收场景【${label}】执行完成！请查看下方返回结果及订单/报文表。`);
      }
      await fetchOverview();
    } catch (err: any) {
      setBannerError(err?.message || "模拟器调用失败");
    } finally {
      setActionBusy(false);
    }
  };

  const roles: string[] = currentUser?.roles || [];
  const isCs = roles.includes("CUSTOMER_SERVICE") && !roles.includes("ADMIN");
  const isSiteStaff = roles.includes("SITE_STAFF") && !roles.includes("ADMIN");

  const filteredOcppMessages = ocppMessages.filter((m) => {
    if (filterChargerOcppId !== "ALL" && m.ocppId !== filterChargerOcppId) {
      return false;
    }
    if (filterAction !== "ALL" && m.action !== filterAction) {
      return false;
    }
    if (filterOrderQuery.trim()) {
      const q = filterOrderQuery.trim().toLowerCase();
      const payloadStr = JSON.stringify(m.payload || {}).toLowerCase();
      const matchId = (m.orderId || "").toLowerCase().includes(q);
      const matchTx = String(m.transactionId || "").includes(q);
      if (!payloadStr.includes(q) && !matchId && !matchTx) return false;
    }
    return true;
  });

  return (
    <div className="container-admin">
      {/* Top Role & RBAC Switcher Banner */}
      <section
        className="card-elevated"
        style={{
          marginBottom: "1.15rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
            <span className="badge badge-purple">
              <ShieldCheck size={13} />
              第一阶段中文运营后台 (REQ-ADM-001 ~ 006)
            </span>
            <span className="badge badge-amber">
              Phase 1A 模拟支付 (SIMULATED) • 马来西亚时区 (UTC+8)
            </span>
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 900 }}>
            马来西亚 20kW 直流充电桩运营与 OCPP 1.6J 验收控制台
          </h1>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            当前登录身份：
            <strong className="mono" style={{ color: "var(--emerald-400)", marginLeft: 4 }}>
              {currentUser?.email || "未登录"}
            </strong>{" "}
            ({roles.join(", ") || "无角色"})
            {isCs && (
              <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                客服视图：用户邮箱/手机已脱敏，禁止改价与远程控桩
              </span>
            )}
            {isSiteStaff && (
              <span className="badge badge-cyan" style={{ marginLeft: 8 }}>
                站点隔离视图：仅显示所分配站点 (MY-KL-001)
              </span>
            )}
          </div>
        </div>

        {/* One-Click RBAC Role Switcher for Instant Acceptance Testing */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            background: "var(--bg-surface-subtle)",
            padding: "0.7rem 0.9rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700 }}>
            RBAC 权限隔离一键切换验收 (REQ-ADM-001 / 002)：
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleQuickRoleSwitch("admin@evcpo.my")}
              className={`btn btn-sm ${
                roles.includes("ADMIN") ? "btn-primary" : "btn-secondary"
              }`}
            >
              <UserCheck size={13} />
              <span>管理员 (ADMIN)</span>
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleQuickRoleSwitch("cs@evcpo.my")}
              className={`btn btn-sm ${isCs ? "btn-primary" : "btn-secondary"}`}
            >
              <UserCheck size={13} />
              <span>客服 (脱敏/无控桩)</span>
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleQuickRoleSwitch("staff-kl@evcpo.my")}
              className={`btn btn-sm ${isSiteStaff ? "btn-primary" : "btn-secondary"}`}
            >
              <UserCheck size={13} />
              <span>KLCC 站点人员 (仅MY-KL-001)</span>
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleTestUnauthorizedAttempt}
              className="btn btn-sm btn-warning"
              title="在客服身份下点击将触发 403 拦截并写入安全审计日志"
            >
              <AlertTriangle size={13} />
              <span>测试越权控桩拦截 (403 审计)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Global Feedback Banners */}
      {bannerError && (
        <div
          className="card-red"
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            fontSize: "0.88rem",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <AlertTriangle size={18} style={{ color: "var(--red-400)", flexShrink: 0 }} />
            <span>{bannerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="btn btn-secondary btn-sm"
          >
            关闭
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div
          className="card-emerald"
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            fontSize: "0.88rem",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <CheckCircle2 size={18} style={{ color: "var(--emerald-400)", flexShrink: 0 }} />
            <span>{bannerSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerSuccess(null)}
            className="btn btn-secondary btn-sm"
          >
            关闭
          </button>
        </div>
      )}

      {/* 6-Tab Navigation Bar */}
      <div className="tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab("chargers")}
          className={`tab-btn ${activeTab === "chargers" ? "active" : ""}`}
        >
          <Cpu size={15} />
          <span>1. 站点、20kW 直流桩与二维码 ({chargers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
        >
          <Receipt size={15} />
          <span>2. 充电订单、价格快照与模拟支付 ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tariffs")}
          className={`tab-btn ${activeTab === "tariffs" ? "active" : ""}`}
        >
          <Coins size={15} />
          <span>3. 演示电价与服务费配置</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ocpp")}
          className={`tab-btn ${activeTab === "ocpp" ? "active" : ""}`}
        >
          <Terminal size={15} />
          <span>4. OCPP 1.6J 原始报文与全耀 SECC 诊断 ({ocppMessages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`tab-btn ${activeTab === "simulator" ? "active" : ""}`}
        >
          <FlaskConical size={15} />
          <span>5. 内置 OCPP 1.6J 实桩与异常场景一键验收台</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
        >
          <FileWarning size={15} />
          <span>
            6. 安全审计日志 ({auditLogs.length})、告警 ({alerts.length}) 与邮件 ({emails.length})
          </span>
        </button>
      </div>

      {/* =====================================================================
       * TAB 1: 站点、20kW 直流桩与二维码管理 (REQ-DEV-001 ~ 007, REQ-ADM-003)
       * ===================================================================== */}
      {activeTab === "chargers" && (
        <section>
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
            <div>
              <h2 style={{ fontSize: "1.12rem", fontWeight: 800 }}>
                站点与 20kW 单枪直流桩设备台账（只读展示固件版本 REQ-DEV-007：无远程升级按钮）
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                硬件基准：Techone GPEV20-BG102-S1P-EA (200-1000Vdc, 20kW 静态限额) + 全耀 QY-SECC-02 控制器
              </p>
            </div>
            <button type="button" onClick={fetchOverview} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} />
              <span>刷新设备状态</span>
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>站点 / 区域</th>
                  <th>OCPP 桩编号</th>
                  <th>硬件型号 & 固件版本 (只读)</th>
                  <th>连接 / 控制器 / 枪状态</th>
                  <th>全耀 SECC 阶段 & 枪温</th>
                  <th>静态功率 & 插枪校验开关</th>
                  <th>枪二维码入口 (REQ-DEV-004)</th>
                  <th>高风险远程控制 (REQ-ADM-003)</th>
                </tr>
              </thead>
              <tbody>
                {chargers.map((c) => {
                  const conn = c.connectors?.[0] || {};
                  const qrToken = conn.qrCodes?.[0]?.qrToken || "K9mP2xQ8vL4n";
                  const isOnline = c.connectionStatus === "ONLINE";

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{c.site?.name || "吉隆坡站点"}</div>
                        <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {c.site?.code} • {c.site?.timezone || "Asia/Kuala_Lumpur"}
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 900, fontSize: "0.92rem" }}>
                          {c.ocppId}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {c.name}
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 700 }}>
                          {c.vendor} {c.model}
                        </div>
                        <div className="mono" style={{ fontSize: "0.75rem", color: "var(--cyan-400)" }}>
                          SECC: {c.seccModel || "QY-SECC-02"}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          固件版本 (仅记录):{" "}
                          <strong className="mono">
                            {c.firmwareVersion || "GPEV20-V1.04.08-QY"}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.28rem" }}>
                          <span
                            className={`badge ${isOnline ? "badge-emerald" : "badge-red"}`}
                            style={{ width: "fit-content" }}
                          >
                            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
                            {c.connectionStatus}
                          </span>
                          <span style={{ fontSize: "0.75rem" }}>
                            控制器(#0): <strong className="mono">{c.controllerOcppStatus}</strong>
                          </span>
                          <span style={{ fontSize: "0.75rem" }}>
                            1号枪(#1):{" "}
                            <strong
                              className="mono"
                              style={{
                                color:
                                  conn.ocppStatus === "Charging"
                                    ? "var(--cyan-400)"
                                    : "var(--emerald-400)",
                              }}
                            >
                              {conn.ocppStatus || "Available"}
                            </strong>{" "}
                            ({conn.standard || "GBT_DC"})
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontSize: "0.77rem", color: "var(--cyan-400)" }}>
                          {c.seccStageInfo || "0x18 CurrentDemand / Ready"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 3 }}>
                          PT100 枪温:{" "}
                          <strong className="mono">
                            {conn.gunTemp1C != null ? `${conn.gunTemp1C} °C` : "31.5 °C"}
                          </strong>{" "}
                          | 插枪: <strong>{conn.isPluggedIn ? "已插枪" : "待机"}</strong>
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                          错误码: <span className="mono">{conn.errorCode || "NoError"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 700 }}>
                          {c.staticPowerLimitKw || 20} kW 静态功率
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginBottom: 4 }}>
                          {c.voltageMinV || 200}-{c.voltageMaxV || 1000}Vdc
                        </div>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleToggleRequirePreparing(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.72rem", padding: "0.22rem 0.5rem" }}
                        >
                          Preparing校验: {c.requirePreparingState ? "严格要求" : "兼容直启"}
                        </button>
                      </td>

                      <td>
                        <Link
                          href={`/c/${qrToken}`}
                          className="badge badge-emerald mono"
                          style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                        >
                          <QrCode size={13} />
                          /c/{qrToken}
                        </Link>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setRemoteModalCharger(c);
                            setRemoteAction("REMOTE_START");
                            setRemoteReason("");
                            setRemoteConfirmChecked(false);
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <RotateCcw size={13} />
                          <span>执行远程控制</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
       * TAB 2: 充电订单、价格快照与模拟支付核查 (REQ-CHG-001 ~ 009, REQ-BIL-005 ~ 007)
       * ===================================================================== */}
      {activeTab === "orders" && (
        <section>
          <div style={{ marginBottom: "0.9rem" }}>
            <h2 style={{ fontSize: "1.12rem", fontWeight: 800 }}>
              全平台充电订单、冻结价格快照 (TariffSnapshot) 与模拟支付记录表
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              验证不变量：1. 每一笔订单在创建瞬间绑定不可变 TariffSnapshot；2. 整数 Wh 与整数 Sen 精确结算；3. 客服角色下用户邮箱自动脱敏。
            </p>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>订单号 & 状态</th>
                  <th>车主账号 (客服视图脱敏)</th>
                  <th>桩编号 & OCPP 事务</th>
                  <th>电量 (整数 Wh / kWh)</th>
                  <th>结束有效 SoC</th>
                  <th>冻结价格快照 (REQ-BIL-005)</th>
                  <th>费用明细 (整数 Sen / MYR)</th>
                  <th>模拟支付状态 (REQ-BIL-007)</th>
                  <th>时间 (Asia/Kuala_Lumpur)</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const snap = o.tariffSnapshot || {};
                  const pay = o.payments?.[0] || {};
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link
                          href={`/orders/${o.id}`}
                          className="mono"
                          style={{ fontWeight: 800, color: "var(--emerald-400)" }}
                        >
                          {o.orderNo}
                        </Link>
                        <div style={{ marginTop: 4 }}>
                          <span
                            className={`badge ${
                              o.status === "COMPLETED"
                                ? "badge-emerald"
                                : ["CHARGING", "STARTING"].includes(o.status)
                                ? "badge-cyan"
                                : "badge-amber"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontSize: "0.8rem" }}>
                          {o.user?.email || "-"}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                          {o.user?.displayName || "Driver"}
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 700 }}>
                          {o.charger?.ocppId || "-"}
                        </div>
                        <div className="mono" style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          idTag: {o.ocppIdTag}
                        </div>
                        <div className="mono" style={{ fontSize: "0.74rem", color: "var(--cyan-400)" }}>
                          txId: #{o.ocppTransaction?.transactionId ?? "-"}
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 800 }}>
                          {formatKwh(o.chargedEnergyWh)}
                        </div>
                        <div className="mono" style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          {o.chargedEnergyWh} Wh ({o.meterStartWh ?? 0} -&gt; {o.meterStopWh ?? o.meterCurrentWh ?? 0})
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-cyan mono">
                          {o.lastValidSocPercent != null ? `${o.lastValidSocPercent}%` : "-"}
                        </span>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 700, fontSize: "0.8rem" }}>
                          电费: {formatRm(snap.energyPriceSenPerKwh)}/kWh
                        </div>
                        <div className="mono" style={{ fontSize: "0.76rem" }}>
                          服务费: {formatRm(snap.serviceFeeSenPerKwh)}/kWh
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          <Lock size={11} style={{ display: "inline", marginRight: 3 }} />
                          快照ID: {(snap.id || o.tariffSnapshotId || "").slice(-8)}
                        </div>
                      </td>

                      <td>
                        <div className="mono" style={{ fontWeight: 900, color: "var(--emerald-400)" }}>
                          总计: {formatRm(o.totalAmountSen)} ({o.totalAmountSen} Sen)
                        </div>
                        <div className="mono" style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                          电:{o.energyAmountSen} + 服:{o.serviceAmountSen} (含税:{o.taxAmountSen} Sen)
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            pay.status === "SIMULATED_SUCCEEDED"
                              ? "badge-emerald"
                              : pay.status === "SIMULATED_CANCELLED"
                              ? "badge-red"
                              : "badge-amber"
                          }`}
                        >
                          {pay.status || "SIMULATED_PENDING"}
                        </span>
                        <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                          {pay.paymentNo || "SIMULATED"}
                        </div>
                      </td>

                      <td className="mono" style={{ fontSize: "0.75rem" }}>
                        <div>创: {formatMyt(o.createdAt)}</div>
                        <div>结: {formatMyt(o.settledAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
       * TAB 3: 演示电价与服务费配置 (REQ-BIL-001 ~ 005)
       * ===================================================================== */}
      {activeTab === "tariffs" && (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <section className="card-elevated">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              修改站点马币 (MYR) 电价与服务费规则 (REQ-BIL-001 / 005)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              单位严格采用整数马币分 (Sen / kWh，1 RM = 100 Sen)。修改后仅对新创建的订单生效，历史订单的冻结价格快照 (TariffSnapshot) 绝不改变！
            </p>

            <form onSubmit={handleUpdateTariff}>
              <div className="form-group">
                <label className="form-label">选择计费规则</label>
                <select
                  value={editTariffId}
                  onChange={(e) => setEditTariffId(e.target.value)}
                  className="form-select"
                >
                  {tariffs.map((tf) => (
                    <option key={tf.id} value={tf.id}>
                      {tf.name} (当前: 电费 {tf.energyPriceSenPerKwh} Sen + 服务费{" "}
                      {tf.serviceFeeSenPerKwh} Sen)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">
                    电费单价 (整数 Sen / kWh) — {formatRm(energyPriceSen)}/kWh
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    required
                    value={energyPriceSen}
                    onChange={(e) => setEnergyPriceSen(Number(e.target.value))}
                    className="form-input mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    服务费单价 (整数 Sen / kWh) — {formatRm(serviceFeeSen)}/kWh
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    required
                    value={serviceFeeSen}
                    onChange={(e) => setServiceFeeSen(Number(e.target.value))}
                    className="form-input mono"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  SST 服务税率 (Basis Points, 600 = 6.00% 含税)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={taxRateBps}
                  onChange={(e) => setTaxRateBps(Number(e.target.value))}
                  className="form-input mono"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  调价原因 (必填，写入 AuditLog 审计日志 REQ-ADM-003)
                </label>
                <input
                  type="text"
                  required
                  value={tariffReason}
                  onChange={(e) => setTariffReason(e.target.value)}
                  className="form-input"
                  placeholder="请输入调价原因..."
                />
              </div>

              <button
                type="submit"
                disabled={actionBusy}
                className="btn btn-primary btn-full"
              >
                <Coins size={16} />
                <span>
                  保存新电价 ({formatRm(Number(energyPriceSen) + Number(serviceFeeSen))} / kWh)
                </span>
              </button>
            </form>
          </section>

          <section className="card-elevated">
            <h3 style={{ fontSize: "1.02rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              当前生效电价与历史订单快照对比验证 (REQ-BIL-005)
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
              在左侧修改电价后，对比下方【当前生效规则】与【历史已完成订单快照】，可直观验证历史订单金额与单价分毫不差：
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tariffs.map((tf) => (
                <div key={tf.id} className="gauge-box">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 800 }}>{tf.name}</span>
                    <span className="badge badge-emerald">当前生效规则</span>
                  </div>
                  <div className="mono" style={{ fontSize: "0.95rem", color: "var(--emerald-400)", fontWeight: 800 }}>
                    总单价: {formatRm(tf.energyPriceSenPerKwh + tf.serviceFeeSenPerKwh)} / kWh (电{" "}
                    {tf.energyPriceSenPerKwh} Sen + 服 {tf.serviceFeeSenPerKwh} Sen)
                  </div>
                </div>
              ))}

              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.3rem" }}>
                最近 3 笔订单的冻结快照 (TariffSnapshot)：
              </div>
              {orders.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.65rem 0.85rem",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontWeight: 800 }}>
                      {o.orderNo}
                    </span>
                    <span className="badge badge-neutral">
                      <Lock size={11} />
                      快照已锁定
                    </span>
                  </div>
                  <div className="mono" style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                    快照单价:{" "}
                    {formatRm(
                      (o.tariffSnapshot?.energyPriceSenPerKwh || 120) +
                        (o.tariffSnapshot?.serviceFeeSenPerKwh || 30)
                    )}
                    /kWh | 订单总额: <strong>{formatRm(o.totalAmountSen)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
       * TAB 4: OCPP 1.6J 原始报文与全耀 SECC 诊断日志 (REQ-ADM-005)
       * ===================================================================== */}
      {activeTab === "ocpp" && (
        <section>
          <div
            className="card"
            style={{
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <div>
                <label className="form-label">按充电桩筛选</label>
                <select
                  value={filterChargerOcppId}
                  onChange={(e) => setFilterChargerOcppId(e.target.value)}
                  className="form-select"
                  style={{ minWidth: "170px" }}
                >
                  <option value="ALL">全部充电桩</option>
                  <option value="MY-KL-DC-001">MY-KL-DC-001 (20kW GB/T)</option>
                  <option value="MY-KL-DC-002">MY-KL-DC-002 (20kW CCS2)</option>
                  <option value="MY-PJ-DC-003">MY-PJ-DC-003 (Offline)</option>
                </select>
              </div>

              <div>
                <label className="form-label">按 OCPP Action 筛选</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="form-select"
                  style={{ minWidth: "200px" }}
                >
                  <option value="ALL">全部 Action</option>
                  <option value="BootNotification">BootNotification</option>
                  <option value="StatusNotification">StatusNotification</option>
                  <option value="Heartbeat">Heartbeat</option>
                  <option value="RemoteStartTransaction">RemoteStartTransaction</option>
                  <option value="StartTransaction">StartTransaction</option>
                  <option value="MeterValues">MeterValues</option>
                  <option value="RemoteStopTransaction">RemoteStopTransaction</option>
                  <option value="StopTransaction">StopTransaction</option>
                  <option value="Reset">Reset</option>
                </select>
              </div>

              <div>
                <label className="form-label">按订单 / txId / 报文关键字检索</label>
                <input
                  type="text"
                  value={filterOrderQuery}
                  onChange={(e) => setFilterOrderQuery(e.target.value)}
                  placeholder="输入 idTag / txId / GPEV20..."
                  className="form-input"
                  style={{ minWidth: "220px" }}
                />
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              共匹配 <strong>{filteredOcppMessages.length}</strong> 条 OCPP 1.6J 原始帧
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间 (MYT)</th>
                  <th>桩编号 (ocppId)</th>
                  <th>方向 & 类型</th>
                  <th>OCPP Action & uniqueId</th>
                  <th>关联事务 (txId)</th>
                  <th>OCPP 1.6J 原始 JSON Payload</th>
                </tr>
              </thead>
              <tbody>
                {filteredOcppMessages.map((m) => (
                  <tr key={m.id}>
                    <td className="mono" style={{ fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                      {formatMyt(m.createdAt)}
                    </td>
                    <td className="mono" style={{ fontWeight: 800 }}>
                      {m.ocppId}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.direction === "INBOUND" ? "badge-emerald" : "badge-cyan"
                        }`}
                      >
                        {m.direction === "INBOUND" ? "INBOUND (桩->云)" : "OUTBOUND (云->桩)"}
                      </span>
                      <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                        TypeId: {m.messageTypeId} (
                        {m.messageTypeId === 2
                          ? "CALL"
                          : m.messageTypeId === 3
                          ? "CALLRESULT"
                          : "CALLERROR"}
                        )
                      </div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--emerald-400)" }}>
                        {m.action || "CALLRESULT"}
                      </div>
                      <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        uid: {m.uniqueId}
                      </div>
                    </td>
                    <td className="mono">
                      {m.transactionId ? `#${m.transactionId}` : "-"}
                    </td>
                    <td style={{ maxWidth: "540px" }}>
                      <pre className="code-block">{JSON.stringify(m.payload, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
       * TAB 5: 内置 OCPP 1.6J 实桩与异常场景一键验收台 (Section 13.2 四大必过演练)
       * ===================================================================== */}
      {activeTab === "simulator" && (
        <section>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              Phase 1A 四大必过实桩与异常场景一键验收实验室 (Section 13.2)
            </h2>
            <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
              点击下方任意场景按钮，系统将自动驱动真实 OCPP 1.6J 状态机、全耀 QY-SECC-02 遥测清洗器与整数分计费引擎，生成可核查的订单、原始报文与模拟支付凭证：
            </p>
          </div>

          <div className="grid-2" style={{ marginBottom: "1.2rem" }}>
            {/* Scenario 1 */}
            <div className="card-elevated" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <span className="badge badge-emerald" style={{ marginBottom: "0.5rem" }}>
                  演练场景 1 (Standard OCPP 1.6J Closed Loop)
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  1. 模拟器标准充电闭环 (Scenario 1)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  完整执行：创建订单并冻结快照 -&gt; 模拟支付预授权 -&gt; 下发 RemoteStartTransaction (Accepted) -&gt; 上报 StartTransaction -&gt; 多次上报 MeterValues -&gt; RemoteStop / StopTransaction -&gt; 整数分结算 SIMULATED_SUCCEEDED。
                </p>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  handleRunSimulatorScenario(
                    "SCENARIO_1_STANDARD_LOOP",
                    "演练 1：模拟器标准充电闭环",
                    "MY-KL-DC-002"
                  )
                }
                className="btn btn-primary btn-full"
              >
                <Play size={16} />
                <span>一键执行演练 1：标准 OCPP 1.6J 充电闭环</span>
              </button>
            </div>

            {/* Scenario 2 */}
            <div className="card-emerald" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <span className="badge badge-cyan" style={{ marginBottom: "0.5rem" }}>
                  演练场景 2 (Techone 20kW GB/T + QuanYao SECC Real Profile)
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  2. GB/T 20kW 实桩与实车参数充电闭环 (Scenario 2)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  完全按 Techone GPEV20-BG102-S1P-EA (200-1000Vdc, 20kW) + 全耀 QY-SECC-02 真实协议闭环：包含 30s IMD 绝缘检测 (0x12-&gt;0x13)、PreCharge 415V 预充、20kW 采样、以及<strong>停机 BSD 帧 0% SoC 与 -50°C 异常温度清洗保护</strong>（保留最后有效 SoC 85%）。
                </p>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  handleRunSimulatorScenario(
                    "SCENARIO_2_GBT_20KW_REAL_PROFILE",
                    "演练 2：GB/T 20kW 实桩与全耀 SECC 参数闭环",
                    "MY-KL-DC-001"
                  )
                }
                className="btn btn-primary btn-full"
              >
                <Play size={16} />
                <span>一键执行演练 2：GB/T 20kW 实桩与实车参数闭环</span>
              </button>
            </div>

            {/* Scenario 3 */}
            <div className="card-elevated" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <span className="badge badge-amber" style={{ marginBottom: "0.5rem" }}>
                  演练场景 3 (RemoteStart Rejected Fault Protection)
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  3. 桩端拒绝启动 (RemoteStart Rejected -&gt; 不生成模拟扣款)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  下发 RemoteStartTransaction 后，模拟桩端返回 <code>status: &quot;Rejected&quot;</code>（或全耀 SECC 0xB4 30s 绝缘超时）：验证订单立即流转为 <code>START_FAILED</code>，模拟支付转为 <code>SIMULATED_CANCELLED</code>，绝不进入充电中或产生错误扣款。
                </p>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  handleRunSimulatorScenario(
                    "SCENARIO_3_REMOTE_START_REJECTED",
                    "演练 3：桩端拒绝启动 (START_FAILED 零扣款保护)",
                    "MY-KL-DC-001"
                  )
                }
                className="btn btn-warning btn-full"
              >
                <AlertTriangle size={16} />
                <span>一键执行演练 3：桩端拒绝启动零扣款验证</span>
              </button>
            </div>

            {/* Scenario 4 */}
            <div className="card-elevated" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: "0.5rem" }}>
                  演练场景 4 (Duplicate StopTransaction Idempotency)
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                  4. 重复上报 StopTransaction 幂等验证 (Scenario 4)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  模拟桩端因弱网重传机制对同一 <code>transactionId</code> 连续上报 2 次 <code>StopTransaction</code>：验证平台幂等返回成功，标记 <code>isDuplicateStopSeen = true</code>，绝不重复生成第二笔订单或第二笔模拟支付流水（REQ-CHG-007）。
                </p>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  handleRunSimulatorScenario(
                    "SCENARIO_4_DUPLICATE_STOP_IDEMPOTENCY",
                    "演练 4：重复上报 StopTransaction 幂等验证",
                    "MY-KL-DC-001"
                  )
                }
                className="btn btn-outline btn-full"
              >
                <ShieldCheck size={16} />
                <span>一键执行演练 4：重复 StopTransaction 幂等验证</span>
              </button>
            </div>
          </div>

          {simResult && (
            <div className="card-emerald">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.65rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>
                  最近一次演练执行结果报告
                </h3>
                {simResult?.order?.id && (
                  <Link
                    href={`/orders/${simResult.order.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <Receipt size={14} />
                    <span>打开该演练订单账单详情页 ({simResult.order.orderNo})</span>
                  </Link>
                )}
              </div>
              <pre className="code-block">{JSON.stringify(simResult, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
       * TAB 6: 安全审计日志、告警与交易邮件记录 (REQ-ADM-002 ~ 004, REQ-ACC-005)
       * ===================================================================== */}
      {activeTab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Audit Logs Table */}
          <section className="card-elevated">
            <h2 style={{ fontSize: "1.08rem", fontWeight: 800, marginBottom: "0.65rem" }}>
              1. 高风险操作与越权拦截安全审计日志 (AuditLog — REQ-ADM-002 / 003)
            </h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>时间 (MYT)</th>
                    <th>类型</th>
                    <th>操作人 & 角色</th>
                    <th>动作 (Action) & 目标</th>
                    <th>操作原因 / 越权拦截说明</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {formatMyt(log.createdAt)}
                      </td>
                      <td>
                        {log.isSecurity ? (
                          <span className="badge badge-red">SECURITY (越权拦截)</span>
                        ) : (
                          <span className="badge badge-purple">OPERATION (高风险审计)</span>
                        )}
                      </td>
                      <td>
                        <div className="mono" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          {log.actorEmail || "system"}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                          角色: {log.actorRole || "-"}
                        </div>
                      </td>
                      <td>
                        <div className="mono" style={{ fontWeight: 800, color: "var(--emerald-400)" }}>
                          {log.action}
                        </div>
                        <div className="mono" style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                          {log.targetType} : {log.targetId}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{log.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Alerts & Email Deliveries */}
          <div className="grid-2">
            <section className="card-elevated">
              <h3
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 800,
                  marginBottom: "0.65rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <Bell size={16} style={{ color: "var(--amber-400)" }} />
                2. 桩离线、SECC 故障与异常订单告警 ({alerts.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    style={{
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.7rem 0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span
                        className={`badge ${
                          al.severity === "CRITICAL" ? "badge-red" : "badge-amber"
                        }`}
                      >
                        {al.alertType} • {al.severity}
                      </span>
                      <span className="mono" style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                        {formatMyt(al.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.86rem" }}>{al.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      {al.description}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card-elevated">
              <h3
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 800,
                  marginBottom: "0.65rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <Mail size={16} style={{ color: "var(--cyan-400)" }} />
                3. 交易邮件投递记录 (验证码 / 密码重置 / 模拟账单 REQ-ACC-005)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {emails.map((em) => (
                  <div
                    key={em.id}
                    style={{
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.7rem 0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span className="badge badge-cyan mono">{em.templateCode}</span>
                      <span className="badge badge-emerald">{em.status}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>
                      收件人: <span className="mono">{em.toEmail}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      主题: {em.subject}
                    </div>
                    <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                      发送时间: {formatMyt(em.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
       * MODAL: 高风险远程控制二次确认弹窗 (REQ-ADM-003, Section 5)
       * ===================================================================== */}
      {remoteModalCharger && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                marginBottom: "0.5rem",
                color: "var(--amber-400)",
              }}
            >
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 900 }}>
                高风险设备远程控制二次确认 ({remoteModalCharger.ocppId})
              </h3>
            </div>
            <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              根据安全规范 (REQ-ADM-003 / Section 5)，对 20kW 直流充电桩下发远程启动、远程停机或软/硬复位指令，必须执行二次确认并强制记录审计原因。
            </p>

            <form onSubmit={handleExecuteRemoteControl}>
              <div className="form-group">
                <label className="form-label">选择 OCPP 1.6J 远程指令</label>
                <select
                  value={remoteAction}
                  onChange={(e) => setRemoteAction(e.target.value as any)}
                  className="form-select"
                >
                  <option value="REMOTE_START">
                    RemoteStartTransaction (远程启动 1号直流枪充电)
                  </option>
                  <option value="REMOTE_STOP">
                    RemoteStopTransaction (远程停止当前进行中订单)
                  </option>
                  <option value="SOFT_RESET">
                    Reset - Soft (OCPP 软复位控制器)
                  </option>
                  <option value="HARD_RESET">
                    Reset - Hard (OCPP 硬重启 20kW 桩与全耀 SECC)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">操作原因 (必填，写入 AuditLog)</label>
                <input
                  type="text"
                  required
                  value={remoteReason}
                  onChange={(e) => setRemoteReason(e.target.value)}
                  placeholder="例如：现场车主扫码后请求运维协助远程启动 / 故障复位..."
                  className="form-input"
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.55rem",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.45)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1.1rem",
                  cursor: "pointer",
                  fontSize: "0.83rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={remoteConfirmChecked}
                  onChange={(e) => setRemoteConfirmChecked(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>二次确认：</strong>我已核实该 20kW 直流枪现场安全状态，确认向{" "}
                  <code className="mono">{remoteModalCharger.ocppId}</code> 下发{" "}
                  <code className="mono">{remoteAction}</code> 指令并记录审计日志。
                </span>
              </label>

              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setRemoteModalCharger(null)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || !remoteConfirmChecked || !remoteReason.trim()}
                  className="btn btn-primary"
                >
                  确认下发指令并记录审计
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
