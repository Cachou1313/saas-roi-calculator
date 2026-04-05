import { useState, useMemo } from "react";

const fmt$ = v => "$" + Math.round(v).toLocaleString();
const fmtN = v => Math.round(v).toLocaleString();
const fmtPct = v => Math.round(v).toLocaleString() + "%";
const fmtDec = (v, d = 1) => parseFloat(v.toFixed(d)).toLocaleString();

const TIER_PRICING = [
  { max: 50,       basic: 1200,  moderate: 2400,  advanced: 3600  },
  { max: 150,      basic: 2400,  moderate: 4800,  advanced: 7200  },
  { max: 300,      basic: 4200,  moderate: 8400,  advanced: 12600 },
  { max: 600,      basic: 7200,  moderate: 14400, advanced: 21600 },
  { max: 1200,     basic: 12000, moderate: 24000, advanced: 36000 },
  { max: Infinity, basic: 18000, moderate: 36000, advanced: 54000 },
];
const getPlanCost = (e, a) => (TIER_PRICING.find(t => e <= t.max) || TIER_PRICING[5])[a];

const TICKET_RED  = { basic: 0.10, moderate: 0.20, advanced: 0.35 };
const DELEG_RATE  = { basic: 0.05, moderate: 0.15, advanced: 0.30 };
const COMP_MULTI  = { standard: 0.5, moderate: 1.0, strict: 1.5 };
const GOAL_W = {
  "basic only":                     { automation: 1.0, auditing: 0.1,  security: 0.05, scripts: 0.2 },
  "maximum time savings":           { automation: 1.0, auditing: 0.4,  security: 0.15, scripts: 1.0 },
  "high security/compliance focus": { automation: 0.6, auditing: 1.0,  security: 1.0,  scripts: 1.0 },
};
const GOAL_DESC = {
  "basic only": "MVP model — core automation only",
  "maximum time savings": "Maximize time savings, minimal compliance overhead",
  "high security/compliance focus": "Full compliance & security weighted",
};

const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceC: "#201F1F", surfaceH: "#2A2A2A", surfaceHH: "#353534",
  primary: "#C0C1FF", primaryD: "#6366F1", primaryC: "#8083FF",
  secondary: "#4FDBC8", tertiary: "#FFB783", tertiaryC: "#D97721",
  onSurf: "#E5E2E1", onSurfV: "#C7C4D7", outline: "#464554", error: "#FFB4AB",
};
const CAT = ["#4FDBC8","#8083FF","#FFB783","#ED93B1","#85B7EB","#97C459","#F09595"];

const DEFAULTS = {
  employees: 200, adminRate: 45, nextTierRate: 22, attritionPct: 15,
  automation: "moderate", compliance: "moderate", efficiencyGoal: "maximum time savings",
  securityValue: 50000, reportsPerMonth: 8, hoursPerOnboard: 3, scriptCosts: 8000,
  setupHours: 40, setupHourlyRate: 75, trainingHours: 8,
  rampWeeks: 6, rampEfficiencyPct: 60,
  totalLicenses: 220, activeUserPct: 85,
  integrationHoursAnnual: 20, integrationHourlyRate: 85,
  intangibleValue: 15000, replacedToolCost: 0,
  uptimeSLA: 99.9, currentUptimeSLA: 99.0,
};

// ── Vercel Analytics ────────────────────────────────────────────────────────
// In your actual React project:
//   1. npm install @vercel/analytics
//   2. import { Analytics } from "@vercel/analytics/react"
//   3. import { track } from "@vercel/analytics"
//   4. Render <Analytics /> once in your root App or main.tsx:
//        root.render(<><App /><Analytics /></>)
//
// The track() shim below is a sandbox-safe fallback — it calls window.va()
// which @vercel/analytics/react injects automatically at runtime.
import { track } from "@vercel/analytics";

const inputStyle = {
  width: "100%", background: "#2A2A2A", border: "none", borderLeft: `2px solid #464554`,
  color: "#E5E2E1", fontSize: 13, padding: "8px 12px", outline: "none",
  fontFamily: "Inter, sans-serif", boxSizing: "border-box", transition: "border-color .2s",
};

function Inp({ label, k, hint, pre, step = 1, s, set }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 10, color: C.onSurfV, fontWeight: 500,
        marginBottom: hint ? 2 : 6, textTransform: "uppercase", letterSpacing: ".15em" }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 11, color: C.onSurfV, opacity: .55, marginBottom: 5, lineHeight: 1.4 }}>{hint}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {pre && <span style={{ fontSize: 13, color: C.onSurfV }}>{pre}</span>}
        <input type="number" value={s[k]} min={0} step={step}
          onChange={e => set(k)(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          onFocus={e => e.target.style.borderLeftColor = C.primaryD}
          onBlur={e => {
            e.target.style.borderLeftColor = C.outline;
            track("input_changed", { field: k, value: s[k] });
          }}
          style={inputStyle} />
      </div>
    </div>
  );
}

function Sel({ label, k, hint, opts, s, set }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 10, color: C.onSurfV, fontWeight: 500,
        marginBottom: hint ? 2 : 6, textTransform: "uppercase", letterSpacing: ".15em" }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 11, color: C.onSurfV, opacity: .55, marginBottom: 5, lineHeight: 1.4 }}>{hint}</div>}
      <select value={s[k]} onChange={e => {
          set(k)(e.target.value);
          track("select_changed", { field: k, value: e.target.value });
        }}
        style={{ ...inputStyle, cursor: "pointer" }}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function SecHead({ label }) {
  return (
    <div style={{ marginTop: 24, marginBottom: 14 }}>
      <p style={{ fontSize: 10, color: C.primary, fontWeight: 500, textTransform: "uppercase",
        letterSpacing: ".2em", fontFamily: "Space Grotesk, sans-serif", margin: 0 }}>{label}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, wide, color }) {
  const bg = accent ? `linear-gradient(135deg, ${C.primaryD}, #494bd6)` : C.surfaceC;
  return (
    <div style={{ background: bg, padding: "20px 22px", gridColumn: wide ? "span 2" : "span 1",
      borderLeft: !accent && color ? `2px solid ${color}` : "none", minHeight: 120,
      display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <p style={{ fontSize: 10, color: accent ? "rgba(224,224,255,.75)" : C.onSurfV,
        textTransform: "uppercase", letterSpacing: ".15em",
        fontFamily: "Space Grotesk, sans-serif", margin: 0 }}>{label}</p>
      <div style={{ fontSize: accent ? 48 : 26, fontWeight: 800, color: color && !accent ? color : accent ? "#fff" : C.onSurf,
        fontFamily: "Manrope, sans-serif", lineHeight: 1, margin: "10px 0 6px" }}>{value}</div>
      {sub && <p style={{ fontSize: 10, color: accent ? C.secondary : C.onSurfV, opacity: accent ? 1 : .6, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em",
        fontFamily: "Space Grotesk, sans-serif", color: C.onSurf, margin: 0 }}>{label}</h4>
    </div>
  );
}

function StatRow({ label, val, sub, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "10px 0", borderBottom: `1px solid rgba(70,69,84,0.15)` }}>
      <div>
        <div style={{ fontSize: 13, color: C.onSurf }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.onSurfV, opacity: .6, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || C.onSurf,
        fontFamily: "Space Grotesk, sans-serif", whiteSpace: "nowrap", marginLeft: 16 }}>{val}</div>
    </div>
  );
}

function GaugeBar({ label, value, max, color, fmt }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.onSurfV, textTransform: "uppercase",
          letterSpacing: ".08em", fontFamily: "Space Grotesk, sans-serif" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: color,
          fontFamily: "Space Grotesk, sans-serif" }}>{fmt ? fmt(value) : value}</span>
      </div>
      <div style={{ height: 6, background: C.surfaceH }}>
        <div style={{ height: 6, background: color, width: `${pct}%`, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function MiniDonut({ slices, size = 80, stroke = 14 }) {
  const R = (size / 2) - stroke / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * R;
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let cum = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {slices.map((sl, i) => {
        const pct = sl.value / total;
        const dash = pct * circ;
        const rot = -90 + cum * 360;
        cum += pct;
        return <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={sl.color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }} />;
      })}
    </svg>
  );
}

function BarChart({ bars, maxVal }) {
  const m = maxVal || Math.max(...bars.map(b => b.value), 1);
  return (
    <div>
      {bars.map((b, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.onSurfV, textTransform: "uppercase",
              letterSpacing: ".08em", fontFamily: "Space Grotesk, sans-serif" }}>{b.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: b.color || C.secondary,
              fontFamily: "Space Grotesk, sans-serif" }}>{fmt$(b.value)}</span>
          </div>
          <div style={{ height: 20, background: C.surfaceH, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: b.color || C.secondary,
              width: `${Math.max(2, (b.value / m) * 100)}%`, opacity: .85, transition: "width .4s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ children }) {
  return (
    <div style={{ background: C.surfaceC, padding: "24px 28px", marginBottom: 20 }}>
      {children}
    </div>
  );
}

function DashboardView({ r, s }) {
  const isPos = r.netBenefit >= 0;
  const breakdown = [
    { label: "Automation",     value: r.automationSavings },
    { label: "Auditing",       value: r.auditingSavings },
    { label: "Tickets",        value: r.ticketSavings },
    { label: "Security",       value: r.securitySavings },
    { label: "Scripts",        value: r.scriptSavings },
    { label: "Uptime",         value: r.uptimeSavings },
    { label: "Intangibles",    value: s.intangibleValue },
    { label: "Displaced tool", value: s.replacedToolCost },
  ].filter(x => x.value > 0);
  const totalPct = breakdown.reduce((a, x) => a + x.value, 0) || 1;

  const tableRows = [
    { label: "Automation savings",          current: fmt$(r.automationSavings / (r.rampMultiplier || 1)), proposed: fmt$(r.automationSavings), delta: r.automationSavings, pos: true },
    { label: "Auditing savings",            current: fmt$(r.auditingSavings / (r.rampMultiplier || 1)),   proposed: fmt$(r.auditingSavings),   delta: r.auditingSavings,   pos: true },
    { label: "Ticket & delegation savings", current: fmt$(r.ticketSavings / (r.rampMultiplier || 1)),     proposed: fmt$(r.ticketSavings),     delta: r.ticketSavings,     pos: true },
    { label: "Security & risk savings",     current: "$0", proposed: fmt$(r.securitySavings),  delta: r.securitySavings,  pos: true },
    { label: "Script cost avoidance",       current: "$0", proposed: fmt$(r.scriptSavings),    delta: r.scriptSavings,    pos: true },
    { label: "Uptime reliability gain",     current: "$0", proposed: fmt$(r.uptimeSavings),    delta: r.uptimeSavings,    pos: true },
    { label: "Wasted license cost",         current: fmt$(r.wastedLicenseCost), proposed: "$0", delta: -r.wastedLicenseCost, pos: false },
    { label: "Integration overhead",        current: "$0", proposed: fmt$(-r.integrationCost), delta: -r.integrationCost, pos: false },
    { label: "Setup & training (3yr amort)",current: "$0", proposed: fmt$(-r.setupAmortized),  delta: -r.setupAmortized,  pos: false },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 24 }}>
        <KpiCard label="ROI Percentage" value={fmtPct(r.roi)} sub={isPos ? "Positive return" : "Negative return"} accent />
        <KpiCard label="Net annual benefit" value={fmt$(r.netBenefit)} sub={isPos ? "Positive net position" : "Investment exceeds return"} color={isPos ? C.secondary : C.error} />
        <KpiCard label="Payback period" value={r.paybackMonths > 60 ? "60+ mo" : `${fmtDec(r.paybackMonths,1)} mo`} sub="Aggressive amortization" />
        <KpiCard label="Total annual benefits" value={fmt$(r.grossSavings)} sub="Gross benefit stack" color={C.primary} />
        <KpiCard label="Total annual cost" value={fmt$(r.totalAnnualCost)} sub="OpEx allocation" color={C.error} />
        <KpiCard label="FTE equivalent" value={`${fmtDec(r.fte,1)}`} sub="Ramp-adjusted admin hours" color={C.tertiary} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 20, marginBottom: 20 }}>
        <Panel>
          <SectionLabel label="Benefits by category" />
          <BarChart bars={breakdown.map((b,i) => ({ ...b, color: CAT[i%CAT.length] }))} />
        </Panel>
        <Panel>
          <SectionLabel label="Benefit distribution" />
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <MiniDonut slices={breakdown.map((b,i) => ({ value: b.value, color: CAT[i%CAT.length] }))} size={110} stroke={18} />
              <div style={{ position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.primary, fontFamily: "Manrope, sans-serif" }}>
                  {breakdown.length > 0 ? Math.round((breakdown[0].value/totalPct)*100) : 0}%
                </div>
                <div style={{ fontSize: 8, color: C.onSurfV }}>top</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {breakdown.map((b,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, background: CAT[i%CAT.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: C.onSurfV, flex: 1, minWidth: 0, textTransform: "uppercase",
                    letterSpacing: ".06em", fontFamily: "Space Grotesk, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.onSurf,
                    fontFamily: "Space Grotesk, sans-serif" }}>{Math.round((b.value/totalPct)*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionLabel label="Detailed benefit attribution" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(53,53,52,.4)" }}>
              {["Metric detail","Baseline state","Proposed state","Annual delta"].map((h,i) => (
                <th key={h} style={{ padding: "12px 20px", fontSize: 10, textTransform: "uppercase",
                  letterSpacing: ".1em", color: C.onSurfV, fontFamily: "Space Grotesk, sans-serif",
                  textAlign: i===3 ? "right" : "left", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row,i) => (
              <tr key={i} style={{ borderBottom: `1px solid rgba(70,69,84,.1)` }}>
                <td style={{ padding: "14px 20px", fontWeight: 500, color: C.onSurf }}>{row.label}</td>
                <td style={{ padding: "14px 20px", color: C.onSurfV }}>{row.current}</td>
                <td style={{ padding: "14px 20px", color: C.onSurfV }}>{row.proposed}</td>
                <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 700,
                  color: row.pos ? C.secondary : C.error, fontFamily: "Space Grotesk, sans-serif" }}>
                  {row.pos ? "+" : ""}{fmt$(row.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "16px 20px", background: "rgba(42,42,42,.4)", textAlign: "right", marginTop: 1 }}>
          <p style={{ fontSize: 10, color: C.onSurfV, textTransform: "uppercase",
            letterSpacing: ".1em", fontFamily: "Space Grotesk, sans-serif", margin: "0 0 4px" }}>Net annual benefit</p>
          <p style={{ fontSize: 30, fontWeight: 800, color: isPos ? C.primary : C.error,
            fontFamily: "Manrope, sans-serif", margin: 0 }}>{isPos?"+":""}{fmt$(r.netBenefit)}</p>
        </div>
      </Panel>
    </div>
  );
}

function OperationsView({ r, s }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Base license cost" value={fmt$(r.baseLicenseCost)} sub={`${s.automation} tier — ${fmtN(s.employees)} seats`} color={C.primary} />
        <KpiCard label="Wasted license cost" value={fmt$(r.wastedLicenseCost)} sub={`${100-s.activeUserPct}% unused seats`} color={C.error} />
        <KpiCard label="Effective cost / active user" value={fmt$(r.effectiveCostPerUser)} sub={`${s.activeUserPct}% utilization rate`} color={C.tertiary} />
        <KpiCard label="Integration overhead" value={fmt$(r.integrationCost)} sub={`${s.integrationHoursAnnual} hrs/yr`} color={C.error} />
        <KpiCard label="Setup & training (amortized)" value={fmt$(r.setupAmortized)} sub={`Full cost: ${fmt$(r.setupCost)}`} color={C.onSurfV} />
        <KpiCard label="Total annual cost" value={fmt$(r.totalAnnualCost)} sub="All cost factors combined" color={C.error} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel>
          <SectionLabel label="Cost breakdown" />
          <BarChart bars={[
            { label: "Base license", value: r.baseLicenseCost, color: C.primaryC },
            { label: "Wasted licenses", value: r.wastedLicenseCost, color: C.error },
            { label: "Integration", value: r.integrationCost, color: C.tertiary },
            { label: "Setup & training", value: r.setupAmortized, color: C.onSurfV },
          ]} />
        </Panel>
        <Panel>
          <SectionLabel label="License utilization" />
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.onSurfV, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "Space Grotesk, sans-serif" }}>Active users</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.secondary, fontFamily: "Space Grotesk, sans-serif" }}>{s.activeUserPct}%</span>
            </div>
            <div style={{ height: 28, background: C.surfaceH, display: "flex" }}>
              <div style={{ width: `${s.activeUserPct}%`, background: C.secondary, opacity: .85 }} />
              <div style={{ flex: 1, background: C.error, opacity: .3 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: C.secondary, fontFamily: "Space Grotesk, sans-serif" }}>Active: {Math.round(s.totalLicenses * s.activeUserPct/100)}</span>
              <span style={{ fontSize: 10, color: C.error, fontFamily: "Space Grotesk, sans-serif" }}>Unused: {Math.round(s.totalLicenses * (1 - s.activeUserPct/100))}</span>
            </div>
          </div>
          <StatRow label="Total licenses purchased" val={fmtN(s.totalLicenses)} />
          <StatRow label="Active users" val={fmtN(Math.round(s.totalLicenses * s.activeUserPct/100))} color={C.secondary} />
          <StatRow label="Wasted seats" val={fmtN(Math.round(s.totalLicenses * (1-s.activeUserPct/100)))} color={C.error} />
          <StatRow label="Cost per active user" val={fmt$(r.effectiveCostPerUser)} color={C.tertiary} />
        </Panel>
        <Panel>
          <SectionLabel label="Ramp & productivity" />
          <StatRow label="Ramp period" val={`${s.rampWeeks} weeks`} />
          <StatRow label="Efficiency during ramp" val={`${s.rampEfficiencyPct}%`} color={C.tertiary} />
          <StatRow label="Ramp productivity factor" val={fmtPct(r.rampMultiplier * 100)} color={C.secondary} />
          <StatRow label="Productivity loss (ramp)" val={fmt$(r.rampLoss)} color={C.error} />
        </Panel>
        <Panel>
          <SectionLabel label="Uptime & reliability" />
          <GaugeBar label="Current uptime SLA" value={s.currentUptimeSLA} max={100} color={C.onSurfV} fmt={v => `${v}%`} />
          <GaugeBar label="New tool uptime SLA" value={s.uptimeSLA} max={100} color={C.secondary} fmt={v => `${v}%`} />
          <StatRow label="Uptime improvement" val={`+${fmtDec(Math.max(0,s.uptimeSLA-s.currentUptimeSLA),2)}%`} color={C.secondary} />
          <StatRow label="Uptime savings (annual)" val={fmt$(r.uptimeSavings)} color={C.secondary} />
        </Panel>
      </div>
    </div>
  );
}

function ComplianceView({ r, s }) {
  const compMulti = COMP_MULTI[s.compliance];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Auditing savings" value={fmt$(r.auditingSavings)} sub={`${s.compliance} compliance tier`} color={C.primary} />
        <KpiCard label="Security / risk savings" value={fmt$(r.securitySavings)} sub={`${compMulti}x compliance multiplier`} color={C.secondary} />
        <KpiCard label="Script cost avoidance" value={fmt$(r.scriptSavings)} sub="Avoided custom script maintenance" color={C.tertiary} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel>
          <SectionLabel label="Compliance savings breakdown" />
          <BarChart bars={[
            { label: "Auditing", value: r.auditingSavings, color: C.primary },
            { label: "Security / risk", value: r.securitySavings, color: C.secondary },
            { label: "Script avoidance", value: r.scriptSavings, color: C.tertiary },
          ]} />
        </Panel>
        <Panel>
          <SectionLabel label="Compliance tier impact" />
          {["standard","moderate","strict"].map(tier => {
            const multi = COMP_MULTI[tier];
            const active = s.compliance === tier;
            return (
              <div key={tier} style={{ padding: "12px 14px", marginBottom: 8,
                background: active ? "rgba(99,102,241,.12)" : C.surfaceH,
                borderLeft: `3px solid ${active ? C.primaryD : "transparent"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 400,
                    color: active ? C.primary : C.onSurfV, textTransform: "capitalize",
                    fontFamily: "Space Grotesk, sans-serif" }}>{tier}</span>
                  <span style={{ fontSize: 11, color: active ? C.secondary : C.onSurfV,
                    fontFamily: "Space Grotesk, sans-serif" }}>{multi}x multiplier</span>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 16 }}>
            <StatRow label="Active multiplier" val={`${compMulti}x`} color={C.secondary} />
            <StatRow label="Reports per month" val={fmtN(s.reportsPerMonth)} />
            <StatRow label="Audit hours saved (annual)" val={`${fmtDec(r.auditHoursSaved,1)} hrs`} color={C.primary} />
          </div>
        </Panel>
        <Panel>
          <SectionLabel label="Security risk profile" />
          <StatRow label="Annual risk exposure value" val={fmt$(s.securityValue)} />
          <StatRow label="Compliance multiplier" val={`${compMulti}x`} color={C.secondary} />
          <StatRow label="Goal security weight" val={fmtPct(GOAL_W[s.efficiencyGoal].security * 100)} color={C.tertiary} />
          <StatRow label="Calculated security savings" val={fmt$(r.securitySavings)} color={C.secondary} />
          <div style={{ marginTop: 16 }}>
            <GaugeBar label="Security weight (goal)" value={GOAL_W[s.efficiencyGoal].security} max={1} color={C.secondary} fmt={v => fmtPct(v*100)} />
            <GaugeBar label="Auditing weight (goal)" value={GOAL_W[s.efficiencyGoal].auditing} max={1} color={C.primary} fmt={v => fmtPct(v*100)} />
          </div>
        </Panel>
        <Panel>
          <SectionLabel label="Efficiency goal comparison" />
          {Object.entries(GOAL_W).map(([goal, w]) => {
            const active = s.efficiencyGoal === goal;
            const secSavings = s.securityValue * compMulti * w.security;
            const auditSavings = s.reportsPerMonth * (s.compliance==="strict"?4:s.compliance==="moderate"?2.5:1.5) * 12 * compMulti * w.auditing * s.adminRate;
            return (
              <div key={goal} style={{ padding: "12px 14px", marginBottom: 8,
                background: active ? "rgba(99,102,241,.12)" : C.surfaceH,
                borderLeft: `3px solid ${active ? C.primaryD : "transparent"}` }}>
                <div style={{ fontSize: 11, fontWeight: active ? 700 : 400,
                  color: active ? C.primary : C.onSurfV, marginBottom: 6,
                  fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {goal}
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 10, color: C.onSurfV }}>Security: <strong style={{ color: C.secondary }}>{fmt$(secSavings)}</strong></span>
                  <span style={{ fontSize: 10, color: C.onSurfV }}>Audit: <strong style={{ color: C.primary }}>{fmt$(auditSavings)}</strong></span>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}

function AutomationView({ r, s }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Automation savings" value={fmt$(r.automationSavings)} sub="Ramp-adjusted onboard/offboard" color={C.secondary} />
        <KpiCard label="Ticket savings" value={fmt$(r.ticketSavings)} sub="Via tier delegation rate" color={C.primary} />
        <KpiCard label="Total hours saved" value={`${fmtN(r.totalHoursSaved)} hrs`} sub={`${fmtDec(r.fte,2)} FTE equivalent`} color={C.tertiary} />
        <KpiCard label="Annual attrition" value={fmtN(r.attritionCount)} sub={`${s.attritionPct}% of ${fmtN(s.employees)} employees`} />
        <KpiCard label="Reduced tickets (annual)" value={fmtN(r.reducedTickets)} sub={`${Math.round(TICKET_RED[s.automation]*100)}% reduction — ${s.automation} tier`} color={C.primary} />
        <KpiCard label="Delegated hours" value={`${fmtDec(r.delegatedHours,1)} hrs`} sub="Shifted to lower-cost staff" color={C.tertiary} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel>
          <SectionLabel label="Automation savings comparison" />
          <BarChart bars={[
            { label: "Automation (onboard/offboard)", value: r.automationSavings, color: C.secondary },
            { label: "Ticket delegation", value: r.ticketSavings, color: C.primary },
            { label: "Script avoidance", value: r.scriptSavings, color: C.tertiary },
          ]} />
        </Panel>
        <Panel>
          <SectionLabel label="Tier automation profile" />
          {["basic","moderate","advanced"].map(tier => {
            const active = s.automation === tier;
            return (
              <div key={tier} style={{ padding: "12px 14px", marginBottom: 8,
                background: active ? "rgba(79,219,200,.08)" : C.surfaceH,
                borderLeft: `3px solid ${active ? C.secondary : "transparent"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: active?700:400, color: active?C.secondary:C.onSurfV,
                    textTransform: "capitalize", fontFamily: "Space Grotesk, sans-serif" }}>{tier}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 10, color: C.onSurfV }}>Ticket reduction: <strong style={{ color: C.primary }}>{Math.round(TICKET_RED[tier]*100)}%</strong></span>
                  <span style={{ fontSize: 10, color: C.onSurfV }}>Delegation: <strong style={{ color: C.secondary }}>{Math.round(DELEG_RATE[tier]*100)}%</strong></span>
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel>
          <SectionLabel label="Onboard / offboard detail" />
          <StatRow label="Annual attrition count" val={fmtN(r.attritionCount)} />
          <StatRow label="Hours per event" val={`${s.hoursPerOnboard} hrs`} />
          <StatRow label="Events per employee (in + out)" val="2x" />
          <StatRow label="Gross hours before ramp" val={`${fmtN(r.attritionCount * s.hoursPerOnboard * 2)} hrs`} />
          <StatRow label="Ramp factor applied" val={fmtPct(r.rampMultiplier*100)} color={C.tertiary} />
          <StatRow label="Ramp-adjusted hours saved" val={`${fmtDec(r.autoHoursSaved * r.rampMultiplier, 1)} hrs`} color={C.secondary} />
          <StatRow label="Automation savings" val={fmt$(r.automationSavings)} color={C.secondary} />
        </Panel>
        <Panel>
          <SectionLabel label="Goal weight — automation" />
          {Object.entries(GOAL_W).map(([goal, w]) => {
            const active = s.efficiencyGoal === goal;
            return (
              <div key={goal} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: active ? C.secondary : C.onSurfV,
                    fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase",
                    letterSpacing: ".06em", fontWeight: active ? 700 : 400 }}>{goal}</span>
                  <span style={{ fontSize: 10, color: active ? C.secondary : C.onSurfV,
                    fontFamily: "Space Grotesk, sans-serif" }}>{fmtPct(w.automation*100)}</span>
                </div>
                <div style={{ height: 6, background: C.surfaceH }}>
                  <div style={{ height: 6, background: active ? C.secondary : C.outline,
                    width: `${w.automation*100}%`, transition: "width .4s ease" }} />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsView({ r, s }) {
  const isPos = r.netBenefit >= 0;
  const years = [1,2,3];
  const yearData = years.map(y => {
    const benefit = r.grossSavings * y;
    const cost = r.totalAnnualCost * y + (y===1 ? r.setupCost * (2/3) : 0);
    return { year: `Year ${y}`, benefit, cost, net: benefit - cost };
  });
  const maxYr = Math.max(...yearData.map(d => d.benefit), 1);

  const scenarios = [
    { label: "Conservative (−25%)", benefits: r.grossSavings * .75, costs: r.totalAnnualCost * 1.1 },
    { label: "Base case",           benefits: r.grossSavings,       costs: r.totalAnnualCost },
    { label: "Optimistic (+25%)",   benefits: r.grossSavings * 1.25,costs: r.totalAnnualCost * .95 },
  ];

  const breakdownFull = [
    { label: "Automation",     value: r.automationSavings },
    { label: "Auditing",       value: r.auditingSavings },
    { label: "Tickets",        value: r.ticketSavings },
    { label: "Security",       value: r.securitySavings },
    { label: "Scripts",        value: r.scriptSavings },
    { label: "Uptime",         value: r.uptimeSavings },
    { label: "Intangibles",    value: s.intangibleValue },
    { label: "Displaced tool", value: s.replacedToolCost },
  ].filter(x => x.value > 0);

  return (
    <div>
      <Panel>
        <SectionLabel label="Multi-year benefit vs. cost projection" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          {yearData.map((d,i) => (
            <div key={i} style={{ background: C.surfaceH, padding: "16px 18px",
              borderLeft: `3px solid ${d.net >= 0 ? C.secondary : C.error}` }}>
              <div style={{ fontSize: 10, color: C.onSurfV, textTransform: "uppercase",
                letterSpacing: ".1em", fontFamily: "Space Grotesk, sans-serif", marginBottom: 8 }}>{d.year}</div>
              <div style={{ fontSize: 13, color: C.onSurf, marginBottom: 4 }}>Benefits: <strong style={{ color: C.secondary }}>{fmt$(d.benefit)}</strong></div>
              <div style={{ fontSize: 13, color: C.onSurf, marginBottom: 8 }}>Costs: <strong style={{ color: C.error }}>{fmt$(d.cost)}</strong></div>
              <div style={{ fontSize: 15, fontWeight: 800, color: d.net >= 0 ? C.secondary : C.error,
                fontFamily: "Manrope, sans-serif" }}>Net: {d.net >= 0 ? "+" : ""}{fmt$(d.net)}</div>
            </div>
          ))}
        </div>
        {yearData.map((d,i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.onSurfV, textTransform: "uppercase",
              letterSpacing: ".08em", fontFamily: "Space Grotesk, sans-serif", marginBottom: 6 }}>{d.year}</div>
            <div style={{ display: "flex", gap: 4, height: 20 }}>
              <div style={{ background: C.secondary, opacity: .85, width: `${(d.benefit/maxYr)*100}%`, transition: "width .4s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 4, height: 8, marginTop: 2 }}>
              <div style={{ background: C.error, opacity: .7, width: `${(d.cost/maxYr)*100}%`, transition: "width .4s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: C.secondary, fontFamily: "Space Grotesk, sans-serif" }}>Benefits</span>
              <span style={{ fontSize: 9, color: C.error, fontFamily: "Space Grotesk, sans-serif" }}>Costs</span>
            </div>
          </div>
        ))}
      </Panel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Panel>
          <SectionLabel label="Scenario analysis" />
          {scenarios.map((sc,i) => {
            const net = sc.benefits - sc.costs;
            const roi = sc.costs > 0 ? (net/sc.costs)*100 : 0;
            const isScPos = net >= 0;
            return (
              <div key={i} style={{ padding: "14px 16px", marginBottom: 10,
                background: i===1 ? "rgba(99,102,241,.1)" : C.surfaceH,
                borderLeft: `3px solid ${i===1 ? C.primaryD : isScPos ? C.secondary : C.error}` }}>
                <div style={{ fontSize: 11, color: i===1 ? C.primary : C.onSurfV, fontWeight: i===1?700:400,
                  fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase",
                  letterSpacing: ".06em", marginBottom: 8 }}>{sc.label}</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.onSurfV, marginBottom: 2 }}>Net benefit</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isScPos ? C.secondary : C.error,
                      fontFamily: "Manrope, sans-serif" }}>{isScPos?"+":""}{fmt$(net)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.onSurfV, marginBottom: 2 }}>ROI</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isScPos ? C.secondary : C.error,
                      fontFamily: "Manrope, sans-serif" }}>{fmtPct(roi)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.onSurfV, marginBottom: 2 }}>Payback</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.tertiary,
                      fontFamily: "Manrope, sans-serif" }}>
                      {sc.benefits > 0 ? `${fmtDec((sc.costs/sc.benefits)*12,1)} mo` : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel>
          <SectionLabel label="Cost vs. benefit ratio" />
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
            <MiniDonut size={100} stroke={18} slices={[
              { value: r.grossSavings, color: C.secondary },
              { value: r.totalAnnualCost, color: C.error },
            ]} />
            <div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: C.onSurfV, fontFamily: "Space Grotesk, sans-serif",
                  textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Total benefits</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.secondary,
                  fontFamily: "Manrope, sans-serif" }}>{fmt$(r.grossSavings)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.onSurfV, fontFamily: "Space Grotesk, sans-serif",
                  textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Total costs</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.error,
                  fontFamily: "Manrope, sans-serif" }}>{fmt$(r.totalAnnualCost)}</div>
              </div>
            </div>
          </div>
          <GaugeBar label="Benefits" value={r.grossSavings} max={r.grossSavings + r.totalAnnualCost} color={C.secondary} fmt={fmt$} />
          <GaugeBar label="Costs" value={r.totalAnnualCost} max={r.grossSavings + r.totalAnnualCost} color={C.error} fmt={fmt$} />
          <div style={{ marginTop: 16, padding: "12px 14px", background: C.surfaceH,
            borderLeft: `3px solid ${isPos ? C.primary : C.error}` }}>
            <span style={{ fontSize: 11, color: C.onSurfV, fontFamily: "Space Grotesk, sans-serif" }}>
              For every $1 spent, this tool returns{" "}
              <strong style={{ color: isPos ? C.secondary : C.error }}>
                ${r.totalAnnualCost > 0 ? fmtDec(r.grossSavings / r.totalAnnualCost, 2) : "0"}
              </strong>
            </span>
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionLabel label="Savings category deep dive" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {breakdownFull.map((b,i) => (
            <div key={i} style={{ background: C.surfaceH, padding: "14px 16px",
              borderTop: `3px solid ${CAT[i%CAT.length]}` }}>
              <div style={{ fontSize: 9, color: C.onSurfV, textTransform: "uppercase",
                letterSpacing: ".08em", fontFamily: "Space Grotesk, sans-serif", marginBottom: 8 }}>{b.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: CAT[i%CAT.length],
                fontFamily: "Manrope, sans-serif", marginBottom: 6 }}>{fmt$(b.value)}</div>
              <div style={{ height: 3, background: C.surfaceC }}>
                <div style={{ height: 3, background: CAT[i%CAT.length],
                  width: `${Math.round((b.value/(r.grossSavings||1))*100)}%` }} />
              </div>
              <div style={{ fontSize: 9, color: C.onSurfV, marginTop: 4 }}>
                {Math.round((b.value/(r.grossSavings||1))*100)}% of total
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MathView({ r, s }) {
  const compMulti = COMP_MULTI[s.compliance];
  const w = GOAL_W[s.efficiencyGoal];
  const auditHoursBase = s.compliance==="strict"?4:s.compliance==="moderate"?2.5:1.5;

  const Eq = ({ title, formula, result, note, steps }) => (
    <div style={{ background: C.surfaceH, padding: "18px 20px", marginBottom: 14,
      borderLeft: `3px solid ${C.primaryD}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: "uppercase",
        letterSpacing: ".1em", fontFamily: "Space Grotesk, sans-serif", marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: C.onSurfV, background: C.surfaceC,
        padding: "10px 14px", marginBottom: 10, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {formula}
      </div>
      {steps && steps.map((step, i) => (
        <div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: C.onSurf,
          background: "rgba(99,102,241,.08)", padding: "6px 14px", marginBottom: 4,
          borderLeft: `2px solid ${C.primaryC}` }}>
          {step}
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div style={{ fontSize: 11, color: C.onSurfV, opacity: .6, fontStyle: "italic" }}>{note}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.secondary,
          fontFamily: "Manrope, sans-serif" }}>{result}</div>
      </div>
    </div>
  );

  const Group = ({ label, children }) => (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, color: C.primary, fontWeight: 500, textTransform: "uppercase",
        letterSpacing: ".2em", fontFamily: "Space Grotesk, sans-serif",
        borderBottom: `1px solid rgba(99,102,241,.3)`, paddingBottom: 8, marginBottom: 16 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ background: C.surfaceC, padding: "16px 20px", marginBottom: 24,
        borderLeft: `3px solid ${C.tertiary}` }}>
        <div style={{ fontSize: 11, color: C.tertiary, fontWeight: 700, fontFamily: "Space Grotesk, sans-serif",
          textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Live methodology</div>
        <div style={{ fontSize: 12, color: C.onSurfV, lineHeight: 1.6 }}>
          All equations below reflect your current inputs and update in real time. Each formula shows the
          algebraic definition, the substituted values, and the computed result.
        </div>
      </div>
      <Group label="Cost structure">
        <Eq title="Base license cost" formula={`getPlanCost(employees, automationTier)\n= getPlanCost(${s.employees}, "${s.automation}")`} steps={[`= ${fmt$(r.baseLicenseCost)}`]} result={fmt$(r.baseLicenseCost)} note="Looked up from pricing tier table based on headcount and automation level." />
        <Eq title="Wasted license cost" formula={`baseLicenseCost × (1 − activeUserRate)\n= ${fmt$(r.baseLicenseCost)} × (1 − ${s.activeUserPct / 100})`} steps={[`= ${fmt$(r.baseLicenseCost)} × ${fmtDec(1 - s.activeUserPct/100, 2)}`, `= ${fmt$(r.wastedLicenseCost)}`]} result={fmt$(r.wastedLicenseCost)} note="The portion of the license cost attributable to unused seats." />
        <Eq title="Integration & maintenance cost" formula={`integrationHours × integrationRate\n= ${s.integrationHoursAnnual} hrs × ${s.integrationHourlyRate}/hr`} steps={[`= ${fmt$(r.integrationCost)}`]} result={fmt$(r.integrationCost)} note="Annual cost of maintaining API connections and integrations." />
        <Eq title="Setup & training cost (full)" formula={`(setupHours × setupRate) + (employees × trainingHours × nextTierRate)\n= (${s.setupHours} × ${s.setupHourlyRate}) + (${s.employees} × ${s.trainingHours} × ${s.nextTierRate})`} steps={[`= ${(s.setupHours*s.setupHourlyRate).toLocaleString()} + ${(s.employees*s.trainingHours*s.nextTierRate).toLocaleString()}`, `= ${fmt$(r.setupCost)}`]} result={fmt$(r.setupCost)} note="One-time cost of deployment and employee training." />
        <Eq title="Setup & training (amortized over 3 years)" formula={`setupCost ÷ 3\n= ${fmt$(r.setupCost)} ÷ 3`} steps={[`= ${fmt$(r.setupAmortized)}`]} result={fmt$(r.setupAmortized)} note="Spreads the one-time setup cost across a standard 3-year software lifecycle." />
        <Eq title="Total annual cost" formula={`baseLicenseCost + wastedLicenseCost + integrationCost + setupAmortized\n= ${fmt$(r.baseLicenseCost)} + ${fmt$(r.wastedLicenseCost)} + ${fmt$(r.integrationCost)} + ${fmt$(r.setupAmortized)}`} steps={[`= ${fmt$(r.totalAnnualCost)}`]} result={fmt$(r.totalAnnualCost)} note="The true all-in annual cost including overhead and wasted licenses." />
      </Group>
      <Group label="Productivity ramp">
        <Eq title="Ramp fraction" formula={`rampWeeks ÷ 52\n= ${s.rampWeeks} ÷ 52`} steps={[`= ${fmtDec(s.rampWeeks/52, 4)}`]} result={fmtDec(s.rampWeeks/52, 4)} note="The proportion of the year spent in the productivity ramp period." />
        <Eq title="Ramp deficit" formula={`1 − (rampEfficiency ÷ 100)\n= 1 − (${s.rampEfficiencyPct} ÷ 100)`} steps={[`= 1 − ${s.rampEfficiencyPct/100}`, `= ${fmtDec(1 - s.rampEfficiencyPct/100, 2)}`]} result={fmtDec(1 - s.rampEfficiencyPct/100, 2)} note="How far below full productivity staff operate during the ramp period." />
        <Eq title="Ramp multiplier" formula={`1 − (rampFraction × rampDeficit)\n= 1 − (${fmtDec(s.rampWeeks/52,4)} × ${fmtDec(1-s.rampEfficiencyPct/100,2)})`} steps={[`= 1 − ${fmtDec((s.rampWeeks/52)*(1-s.rampEfficiencyPct/100),4)}`, `= ${fmtDec(r.rampMultiplier, 4)}`]} result={fmtPct(r.rampMultiplier * 100)} note="Applied to all time-based savings to account for the productivity ramp." />
        <Eq title="Ramp productivity loss" formula={`grossTimeSavings × (1 − rampMultiplier)\n= grossTimeSavings × ${fmtDec(1 - r.rampMultiplier, 4)}`} steps={[`= ${fmt$(r.rampLoss)}`]} result={fmt$(r.rampLoss)} note="Dollar value of savings foregone during the ramp period." />
      </Group>
      <Group label="Automation savings">
        <Eq title="Annual attrition count" formula={`employees × (attritionPct ÷ 100)\n= ${s.employees} × (${s.attritionPct} ÷ 100)`} steps={[`= ${fmtDec(s.employees * s.attritionPct/100, 1)}`, `≈ ${fmtN(r.attritionCount)} employees`]} result={`${fmtN(r.attritionCount)} employees`} note="Number of employees onboarded or offboarded per year." />
        <Eq title="Gross automation hours saved" formula={`attritionCount × hoursPerEvent × 2 × goalWeight\n= ${r.attritionCount} × ${s.hoursPerOnboard} × 2 × ${w.automation}`} steps={[`= ${fmtDec(r.attritionCount * s.hoursPerOnboard * 2 * w.automation, 1)} hrs`]} result={`${fmtDec(r.attritionCount * s.hoursPerOnboard * 2 * w.automation, 1)} hrs`} note="×2 accounts for both onboarding and offboarding events." />
        <Eq title="Automation savings (ramp-adjusted)" formula={`grossHours × adminRate × rampMultiplier\n= ${fmtDec(r.attritionCount * s.hoursPerOnboard * 2 * w.automation,1)} × ${s.adminRate} × ${fmtDec(r.rampMultiplier,4)}`} steps={[`= ${fmt$(r.automationSavings)}`]} result={fmt$(r.automationSavings)} note="Time saved priced at the admin hourly rate, reduced by the ramp multiplier." />
        <Eq title="Reduced tickets (annual)" formula={`employees × 2 × ticketReductionRate\n= ${s.employees} × 2 × ${TICKET_RED[s.automation]}`} steps={[`= ${fmtN(r.reducedTickets)} tickets`]} result={`${fmtN(r.reducedTickets)} tickets`} note={`Ticket reduction rate for ${s.automation} tier is ${Math.round(TICKET_RED[s.automation]*100)}%.`} />
        <Eq title="Delegated hours" formula={`reducedTickets × 0.5 × (1 − delegationRate) × goalWeight\n= ${r.reducedTickets} × 0.5 × (1 − ${DELEG_RATE[s.automation]}) × ${w.automation}`} steps={[`= ${fmtDec(r.delegatedHours, 1)} hrs`]} result={`${fmtDec(r.delegatedHours, 1)} hrs`} note="Hours shifted from senior admins to lower-cost staff." />
        <Eq title="Ticket savings (ramp-adjusted)" formula={`delegatedHours × (adminRate − nextTierRate) × rampMultiplier\n= ${fmtDec(r.delegatedHours,1)} × (${s.adminRate} − ${s.nextTierRate}) × ${fmtDec(r.rampMultiplier,4)}`} steps={[`= ${fmtDec(r.delegatedHours,1)} × ${s.adminRate - s.nextTierRate} × ${fmtDec(r.rampMultiplier,4)}`, `= ${fmt$(r.ticketSavings)}`]} result={fmt$(r.ticketSavings)} note="Savings from rate differential between admin and next-tier staff." />
      </Group>
      <Group label="Compliance & auditing savings">
        <Eq title="Audit hours per report" formula={`Lookup by compliance tier: standard=1.5, moderate=2.5, strict=4\n= ${auditHoursBase} hrs (${s.compliance} tier)`} steps={[]} result={`${auditHoursBase} hrs/report`} note="Estimated manual hours required per compliance report or review." />
        <Eq title="Gross auditing hours saved" formula={`reportsPerMonth × auditHrsPerReport × 12 × complianceMulti × goalWeight\n= ${s.reportsPerMonth} × ${auditHoursBase} × 12 × ${compMulti} × ${w.auditing}`} steps={[`= ${fmtDec(r.auditHoursSaved, 1)} hrs`]} result={`${fmtDec(r.auditHoursSaved, 1)} hrs`} note="Total annual audit hours eliminated through automation." />
        <Eq title="Auditing savings (ramp-adjusted)" formula={`auditHoursSaved × adminRate × rampMultiplier\n= ${fmtDec(r.auditHoursSaved,1)} × ${s.adminRate} × ${fmtDec(r.rampMultiplier,4)}`} steps={[`= ${fmt$(r.auditingSavings)}`]} result={fmt$(r.auditingSavings)} note="Audit time savings priced at the admin rate, reduced by the ramp multiplier." />
        <Eq title="Security / risk savings" formula={`securityValue × complianceMultiplier × goalSecurityWeight\n= ${s.securityValue.toLocaleString()} × ${compMulti} × ${w.security}`} steps={[`= ${fmt$(r.securitySavings)}`]} result={fmt$(r.securitySavings)} note="Avoided cost of security incidents and compliance fines." />
        <Eq title="Script cost savings" formula={`scriptCosts × goalScriptWeight\n= ${s.scriptCosts.toLocaleString()} × ${w.scripts}`} steps={[`= ${fmt$(r.scriptSavings)}`]} result={fmt$(r.scriptSavings)} note="Annual spend on custom scripts and APIs that the tool eliminates." />
      </Group>
      <Group label="Uptime, intangibles & displacement">
        <Eq title="Uptime improvement" formula={`newUptimeSLA% − currentUptimeSLA%\n= ${s.uptimeSLA}% − ${s.currentUptimeSLA}%`} steps={[`= ${fmtDec(Math.max(0, s.uptimeSLA - s.currentUptimeSLA), 2)}%`]} result={`+${fmtDec(Math.max(0, s.uptimeSLA - s.currentUptimeSLA), 2)}%`} note="The percentage point gain in system availability." />
        <Eq title="Uptime savings" formula={`uptimeGain × employees × 2080 × adminRate\n= ${fmtDec(Math.max(0,s.uptimeSLA-s.currentUptimeSLA)/100,4)} × ${s.employees} × 2080 × ${s.adminRate}`} steps={[`= ${fmt$(r.uptimeSavings)}`]} result={fmt$(r.uptimeSavings)} note="Productivity recovered from fewer outages, priced at the admin hourly rate." />
        <Eq title="Intangible value" formula={`User-supplied estimate\n= ${s.intangibleValue.toLocaleString()}`} steps={[]} result={fmt$(s.intangibleValue)} note="Estimated value of satisfaction improvements, error reduction, and faster ramp. Added directly to gross benefits." />
        <Eq title="Displaced tool savings" formula={`Annual cost of replaced tool (avoided spend)\n= ${s.replacedToolCost.toLocaleString()}`} steps={[]} result={fmt$(s.replacedToolCost)} note="The incumbent tool's license cost is treated as avoided spend on the benefits side." />
      </Group>
      <Group label="ROI summary">
        <Eq title="Gross benefits (total annual benefits)" formula={`automationSavings + auditingSavings + ticketSavings + securitySavings\n+ scriptSavings + uptimeSavings + intangibleValue + replacedToolCost`} steps={[`= ${fmt$(r.automationSavings)} + ${fmt$(r.auditingSavings)} + ${fmt$(r.ticketSavings)}`, `  + ${fmt$(r.securitySavings)} + ${fmt$(r.scriptSavings)} + ${fmt$(r.uptimeSavings)}`, `  + ${fmt$(s.intangibleValue)} + ${fmt$(s.replacedToolCost)}`, `= ${fmt$(r.grossSavings)}`]} result={fmt$(r.grossSavings)} note="Sum of all benefit categories." />
        <Eq title="Net annual benefit" formula={`grossBenefits − totalAnnualCost\n= ${fmt$(r.grossSavings)} − ${fmt$(r.totalAnnualCost)}`} steps={[`= ${fmt$(r.netBenefit)}`]} result={fmt$(r.netBenefit)} note="The actual financial profit after subtracting all costs from all benefits." />
        <Eq title="Return on investment (ROI)" formula={`(netAnnualBenefit ÷ totalAnnualCost) × 100\n= (${fmt$(r.netBenefit)} ÷ ${fmt$(r.totalAnnualCost)}) × 100`} steps={[`= ${fmtPct(r.roi)}`]} result={fmtPct(r.roi)} note="Percentage return on total annualized investment." />
        <Eq title="Payback period" formula={`(totalAnnualCost ÷ grossBenefits) × 12\n= (${fmt$(r.totalAnnualCost)} ÷ ${fmt$(r.grossSavings)}) × 12`} steps={[`= ${r.paybackMonths > 60 ? "60+" : fmtDec(r.paybackMonths, 1)} months`]} result={r.paybackMonths > 60 ? "60+ months" : `${fmtDec(r.paybackMonths, 1)} months`} note="How many months before the tool fully pays for itself." />
        <Eq title="FTE equivalent" formula={`totalHoursSaved ÷ 2080\n= ${fmtN(r.totalHoursSaved)} ÷ 2080`} steps={[`= ${fmtDec(r.fte, 2)} FTE`]} result={`${fmtDec(r.fte, 2)} FTE`} note="Converts ramp-adjusted hours saved into full-time equivalent headcount (2,080 hr/yr standard)." />
        <Eq title="Effective cost per active user" formula={`baseLicenseCost ÷ (totalLicenses × activeUserRate)\n= ${fmt$(r.baseLicenseCost)} ÷ (${s.totalLicenses} × ${s.activeUserPct/100})`} steps={[`= ${fmt$(r.baseLicenseCost)} ÷ ${Math.round(s.totalLicenses * s.activeUserPct/100)}`, `= ${fmt$(r.effectiveCostPerUser)} per active user`]} result={`${fmt$(r.effectiveCostPerUser)}/user`} note="The true per-seat cost accounting for unused licenses." />
      </Group>
    </div>
  );
}

const icons = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  operations: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>,
  compliance: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l7 3v6c0 5-3.5 9.74-7 11-3.5-1.26-7-6-7-11V5l7-3z"/><path d="M9 12l2 2 4-4"/></svg>,
  automation: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>,
  analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  math: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
};

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard" },
  { id: "operations", label: "Operations" },
  { id: "compliance", label: "Compliance" },
  { id: "automation", label: "Automation" },
  { id: "analytics",  label: "Analytics" },
  { id: "math",       label: "Methodology" },
];

function InputSidebar({ s, set }) {
  const p = { s, set };
  return (
    <section style={{ width: 300, flexShrink: 0, background: C.surfaceC,
      borderRight: `1px solid rgba(70,69,84,.15)`, overflowY: "auto", padding: "24px 22px" }}>
      <SecHead label="Organization" />
      <Inp k="employees"    label="Total headcount"         hint="Total employees in your organization." {...p} />
      <Inp k="adminRate"    label="Admin hourly rate"   pre="$" hint="Fully-loaded hourly cost of senior admin." {...p} />
      <Inp k="nextTierRate" label="Next-tier staff rate" pre="$" hint="Hourly rate of lower-tier delegated staff." {...p} />
      <Inp k="attritionPct" label="Annual attrition (%)" pre="%" step={0.5} hint="% of workforce replaced annually." {...p} />
      <SecHead label="Operational needs & tier" />
      <Sel k="automation" label="Automation needs" hint="Classifies complexity and feature tier."
        opts={[{v:"basic",l:"Basic"},{v:"moderate",l:"Moderate"},{v:"advanced",l:"Advanced"}]} {...p} />
      <Sel k="compliance" label="Compliance requirements" hint="Multiplier on security and auditing."
        opts={[{v:"standard",l:"Standard"},{v:"moderate",l:"Moderate"},{v:"strict",l:"Strict"}]} {...p} />
      <Sel k="efficiencyGoal" label="Efficiency goal" hint={GOAL_DESC[s.efficiencyGoal]}
        opts={[
          {v:"basic only",l:"Basic only"},
          {v:"maximum time savings",l:"Maximum time savings"},
          {v:"high security/compliance focus",l:"High security / compliance focus"},
        ]} {...p} />
      <SecHead label="Compliance & risk" />
      <Inp k="securityValue"   label="Annual risk mitigation value" pre="$" hint="Value of avoided incidents and fines." {...p} />
      <Inp k="reportsPerMonth" label="Reports / reviews per month"  hint="Manual compliance reports run monthly." {...p} />
      <SecHead label="Automation" />
      <Inp k="hoursPerOnboard" label="Hours per onboard / offboard" step={0.5} hint="Admin hours per hire or departure." {...p} />
      <SecHead label="Risk avoidance" />
      <Inp k="scriptCosts" label="Avoided script costs (annual)" pre="$" hint="Annual spend on custom scripts." {...p} />
      <SecHead label="Implementation" />
      <Inp k="setupHours"      label="Setup & config hours"          hint="IT hours to deploy and configure." {...p} />
      <Inp k="setupHourlyRate" label="Setup staff hourly rate"   pre="$" hint="Rate of person(s) handling setup." {...p} />
      <Inp k="trainingHours"   label="Training hours per employee"   hint="Hours each employee learns the tool." step={0.5} {...p} />
      <SecHead label="Productivity ramp" />
      <Inp k="rampWeeks"         label="Ramp period (weeks)"          hint="Weeks before staff reach full productivity." {...p} />
      <Inp k="rampEfficiencyPct" label="Efficiency during ramp (%)"  pre="%" hint="% of full productivity during ramp." {...p} />
      <SecHead label="License utilization" />
      <Inp k="totalLicenses"  label="Total licenses purchased" hint="Total seats in your contract." {...p} />
      <Inp k="activeUserPct"  label="Active user rate (%)" pre="%" hint="% of licensed users actively using the tool." {...p} />
      <SecHead label="Integration & maintenance" />
      <Inp k="integrationHoursAnnual" label="Annual integration hours"    hint="Hours/year maintaining API connections." {...p} />
      <Inp k="integrationHourlyRate"  label="Integration staff rate"  pre="$" hint="Rate of technical integration staff." {...p} />
      <SecHead label="Intangible benefits" />
      <Inp k="intangibleValue" label="Estimated intangible value" pre="$" hint="Satisfaction, error reduction, faster ramp." {...p} />
      <SecHead label="Competitive displacement" />
      <Inp k="replacedToolCost" label="Replaced tool annual cost" pre="$" hint="Incumbent tool license — treated as avoided spend." {...p} />
      <SecHead label="Uptime & reliability" />
      <Inp k="uptimeSLA"        label="New tool uptime SLA (%)"     pre="%" step={0.01} hint="Uptime guarantee of the new tool." {...p} />
      <Inp k="currentUptimeSLA" label="Current solution uptime (%)" pre="%" step={0.01} hint="Uptime of your existing solution." {...p} />
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid rgba(70,69,84,.2)`, textAlign: "center" }}>
        <p style={{ fontSize: 9, color: C.onSurfV, opacity: .3, textTransform: "uppercase",
          letterSpacing: ".15em", fontFamily: "Space Grotesk, sans-serif" }}>Extended parameters locked</p>
      </div>
    </section>
  );
}

export default function App() {
  const [s, setS] = useState(DEFAULTS);
  const [view, setView] = useState("dashboard");
  const set = k => v => setS(p => ({ ...p, [k]: v }));

  // Track initial page load
  useState(() => {
    track("calculator_loaded", { defaultEmployees: DEFAULTS.employees });
  });

  const r = useMemo(() => {
    const w = GOAL_W[s.efficiencyGoal];
    const baseLicenseCost = getPlanCost(s.employees, s.automation);
    const integrationCost = s.integrationHoursAnnual * s.integrationHourlyRate;
    const utilRate = Math.min(s.activeUserPct, 100) / 100;
    const effectiveCostPerUser = utilRate > 0 ? baseLicenseCost / (s.totalLicenses * utilRate) : 0;
    const wastedLicenseCost = baseLicenseCost * (1 - utilRate);
    const setupCost = s.setupHours * s.setupHourlyRate + s.employees * s.trainingHours * s.nextTierRate;
    const setupAmortized = setupCost / 3;
    const rampFraction = s.rampWeeks / 52;
    const rampDeficit = 1 - Math.min(s.rampEfficiencyPct, 100) / 100;
    const rampMultiplier = 1 - rampFraction * rampDeficit;
    const uptimeSavings = Math.max(0, Math.min(s.uptimeSLA,100)/100 - Math.min(s.currentUptimeSLA,100)/100) * s.employees * 2080 * s.adminRate;
    const attritionCount = Math.round(s.employees * s.attritionPct / 100);
    const auditHoursBase = s.compliance==="strict"?4:s.compliance==="moderate"?2.5:1.5;
    const auditHoursSaved = s.reportsPerMonth * auditHoursBase * 12 * COMP_MULTI[s.compliance] * w.auditing;
    const autoHoursSaved = attritionCount * s.hoursPerOnboard * 2 * w.automation;
    const reducedTickets = Math.round(s.employees * 2 * TICKET_RED[s.automation]);
    const delegatedHours = reducedTickets * 0.5 * (1 - DELEG_RATE[s.automation]) * w.automation;
    const rampedAutomation = autoHoursSaved * s.adminRate * rampMultiplier;
    const rampedAuditing = auditHoursSaved * s.adminRate * rampMultiplier;
    const rampedTickets = delegatedHours * (s.adminRate - s.nextTierRate) * rampMultiplier;
    const securitySavings = s.securityValue * COMP_MULTI[s.compliance] * w.security;
    const scriptSavings = s.scriptCosts * w.scripts;
    const rampLoss = (autoHoursSaved*s.adminRate + auditHoursSaved*s.adminRate + delegatedHours*(s.adminRate-s.nextTierRate)) * (1-rampMultiplier);
    const grossSavings = rampedAutomation + rampedAuditing + rampedTickets + securitySavings + scriptSavings + uptimeSavings + s.intangibleValue + s.replacedToolCost;
    const totalAnnualCost = baseLicenseCost + integrationCost + setupAmortized + wastedLicenseCost;
    const netBenefit = grossSavings - totalAnnualCost;
    const roi = totalAnnualCost > 0 ? (netBenefit/totalAnnualCost)*100 : 0;
    const paybackMonths = grossSavings > 0 ? (totalAnnualCost/grossSavings)*12 : 999;
    const totalHoursSaved = (auditHoursSaved + autoHoursSaved + delegatedHours) * rampMultiplier;
    const fte = totalHoursSaved / 2080;
    return {
      baseLicenseCost, integrationCost, setupCost, setupAmortized, wastedLicenseCost,
      effectiveCostPerUser, utilRate, rampLoss, uptimeSavings, attritionCount,
      auditHoursSaved, auditingSavings: rampedAuditing, autoHoursSaved,
      automationSavings: rampedAutomation, reducedTickets, delegatedHours,
      ticketSavings: rampedTickets, securitySavings, scriptSavings,
      totalHoursSaved, fte, grossSavings, totalAnnualCost, netBenefit, roi, paybackMonths, rampMultiplier,
    };
  }, [s]);

  const handleNavClick = (id) => {
    setView(id);
    track("nav_tab_clicked", { tab: id });
  };

  const handleExport = () => {
    track("export_pdf_clicked", {
      roi: Math.round(r.roi),
      netBenefit: Math.round(r.netBenefit),
      employees: s.employees,
      automationTier: s.automation,
    });
    window.print();
  };

  const viewTitles = { dashboard:"Dashboard", operations:"Operations", compliance:"Compliance", automation:"Automation", analytics:"Analytics", math:"Methodology" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column",
      fontFamily: "Inter, sans-serif", color: C.onSurf, overflowX: "hidden" }}>

      {/* TOP NAV */}
      <header style={{ background: "rgba(19,19,19,.9)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid rgba(229,226,225,.08)`, padding: "0 28px",
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase",
          fontFamily: "Manrope, sans-serif" }}>SaaS Tool ROI Calculator</span>
        <button onClick={handleExport}
          style={{ padding: "7px 20px", background: C.primaryD, color: "#fff", border: "none",
            fontSize: 11, fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase",
            letterSpacing: ".1em", cursor: "pointer" }}>
          Export PDF
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 60px)" }}>

        {/* SIDEBAR */}
        <aside style={{ width: 200, background: C.surface, flexShrink: 0,
          borderRight: `1px solid rgba(70,69,84,.15)`, padding: "24px 12px",
          display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 28, padding: "0 8px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.onSurf, fontFamily: "Manrope, sans-serif" }}>ROI Calculator</div>
            <div style={{ fontSize: 9, color: C.onSurfV, opacity: .4, textTransform: "uppercase",
              letterSpacing: ".18em", marginTop: 3 }}>V1.0.4</div>
          </div>
          <nav style={{ flex: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = view === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 12px", marginBottom: 2, border: "none", borderRadius: 2,
                    background: active ? C.surfaceHH : "transparent",
                    color: active ? C.primaryD : `${C.onSurf}60`,
                    fontSize: 11, fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase",
                    letterSpacing: ".08em", fontWeight: active ? 700 : 400, cursor: "pointer",
                    textAlign: "left" }}>
                  <span style={{ color: active ? C.primaryD : `${C.onSurf}40`, flexShrink: 0 }}>
                    {icons[item.id]}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ paddingTop: 16, borderTop: `1px solid rgba(70,69,84,.2)` }}>
            <button onClick={handleExport}
              style={{ width: "100%", padding: "9px 0", background: C.surfaceH, border: "none",
                color: C.onSurf, fontSize: 10, cursor: "pointer",
                fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase", letterSpacing: ".1em" }}>
              Print PDF
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <InputSidebar s={s} set={set} />
          <main style={{ flex: 1, overflowY: "auto", background: C.bg, padding: "28px 32px" }}>
            <div style={{ marginBottom: 20, paddingBottom: 16,
              borderBottom: `1px solid rgba(70,69,84,.2)` }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.onSurf,
                fontFamily: "Manrope, sans-serif", margin: "0 0 4px" }}>{viewTitles[view]}</h2>
              <p style={{ fontSize: 12, color: C.onSurfV, opacity: .6, margin: 0 }}>
                {view==="dashboard"  && "Full ROI summary — all inputs and financial outputs combined."}
                {view==="operations" && "Cost structure, license utilization, ramp productivity and uptime analysis."}
                {view==="compliance" && "Compliance tier impact, security savings and risk profile breakdown."}
                {view==="automation" && "Automation savings, ticket delegation and onboard/offboard detail."}
                {view==="analytics"  && "Multi-year projections, scenario analysis and cross-metric comparisons."}
              </p>
            </div>
            {view==="dashboard"  ? <DashboardView  r={r} s={s} /> : null}
            {view==="operations" ? <OperationsView r={r} s={s} /> : null}
            {view==="compliance" ? <ComplianceView r={r} s={s} /> : null}
            {view==="automation" ? <AutomationView r={r} s={s} /> : null}
            {view==="analytics"  ? <AnalyticsView  r={r} s={s} /> : null}
            {view==="math"       ? <MathView        r={r} s={s} /> : null}
            <div style={{ marginTop: 32 }} />
          </main>
        </div>
      </div>
    </div>
  );
}