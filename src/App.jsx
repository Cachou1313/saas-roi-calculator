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

const P = "#534AB7"; const PT = "#EEEDFE"; const PS = "#3C3489";
const T = "#0F6E56"; const TT = "#E1F5EE"; const TS = "#085041";
const A = "#BA7517"; const AT = "#FAEEDA";
const CAT_COLORS = ["#534AB7","#0F6E56","#BA7517","#D4537E","#185FA5","#D85A30","#639922"];

const DEFAULTS = {
  employees: 200, adminRate: 45, nextTierRate: 22, attritionPct: 15,
  automation: "moderate", compliance: "moderate",
  efficiencyGoal: "maximum time savings",
  securityValue: 50000, reportsPerMonth: 8,
  hoursPerOnboard: 3, scriptCosts: 8000,
  setupHours: 40, setupHourlyRate: 75, trainingHours: 8,
  rampWeeks: 6, rampEfficiencyPct: 60,
  totalLicenses: 220, activeUserPct: 85,
  integrationHoursAnnual: 20, integrationHourlyRate: 85,
  intangibleValue: 15000,
  replacedToolCost: 0,
  uptimeSLA: 99.9, currentUptimeSLA: 99.0,
};

export default function App() {
  const [s, setS] = useState(DEFAULTS);
  const set = k => v => setS(p => ({ ...p, [k]: v }));

  const r = useMemo(() => {
    const w = GOAL_W[s.efficiencyGoal];
    const baseLicenseCost = getPlanCost(s.employees, s.automation);

    // ── Integration & maintenance overhead (reduces net savings) ──
    const integrationCost = s.integrationHoursAnnual * s.integrationHourlyRate;

    // ── License utilization (adjusts effective cost per user) ──
    const utilRate = Math.min(s.activeUserPct, 100) / 100;
    const effectiveCostPerUser = utilRate > 0 ? baseLicenseCost / (s.totalLicenses * utilRate) : 0;
    const wastedLicenseCost = baseLicenseCost * (1 - utilRate);

    // ── Implementation & onboarding (one-time, amortized over 3yr) ──
    const setupCost = s.setupHours * s.setupHourlyRate + s.employees * s.trainingHours * s.nextTierRate;
    const setupAmortized = setupCost / 3;

    // ── Productivity ramp loss (reduces year-1 savings) ──
    const rampFraction = (s.rampWeeks / 52);
    const rampDeficit = 1 - (Math.min(s.rampEfficiencyPct, 100) / 100);

    // ── Uptime / reliability value ──
    const newUptime = Math.min(s.uptimeSLA, 100) / 100;
    const oldUptime = Math.min(s.currentUptimeSLA, 100) / 100;
    const uptimeGain = Math.max(0, newUptime - oldUptime);
    const annualWorkHours = s.employees * 2080;
    const uptimeSavings = uptimeGain * annualWorkHours * s.adminRate;

    // ── Core operational savings (weighted by goal & ramp) ──
    const attritionCount = Math.round(s.employees * s.attritionPct / 100);
    const auditHoursBase = s.compliance === "strict" ? 4 : s.compliance === "moderate" ? 2.5 : 1.5;
    const auditHoursSaved = s.reportsPerMonth * auditHoursBase * 12 * COMP_MULTI[s.compliance] * w.auditing;
    const auditingSavings = auditHoursSaved * s.adminRate;
    const autoHoursSaved = attritionCount * s.hoursPerOnboard * 2 * w.automation;
    const automationSavings = autoHoursSaved * s.adminRate;
    const reducedTickets = Math.round(s.employees * 2 * TICKET_RED[s.automation]);
    const delegatedHours = reducedTickets * 0.5 * (1 - DELEG_RATE[s.automation]) * w.automation;
    const ticketSavings = delegatedHours * (s.adminRate - s.nextTierRate);
    const securitySavings = s.securityValue * COMP_MULTI[s.compliance] * w.security;
    const scriptSavings = s.scriptCosts * w.scripts;

    // Apply ramp reduction to time-based savings only
    const rampMultiplier = 1 - (rampFraction * rampDeficit);
    const rampedAutomation = automationSavings * rampMultiplier;
    const rampedAuditing = auditingSavings * rampMultiplier;
    const rampedTickets = ticketSavings * rampMultiplier;
    const rampLoss = (automationSavings + auditingSavings + ticketSavings) - (rampedAutomation + rampedAuditing + rampedTickets);

    // ── Gross benefits ──
    const grossSavings = rampedAutomation + rampedAuditing + rampedTickets + securitySavings + scriptSavings + uptimeSavings + s.intangibleValue + s.replacedToolCost;

    // ── Total costs (license + integration overhead + amortized setup + wasted licenses) ──
    const totalAnnualCost = baseLicenseCost + integrationCost + setupAmortized + wastedLicenseCost;

    const netBenefit = grossSavings - totalAnnualCost;
    const roi = totalAnnualCost > 0 ? (netBenefit / totalAnnualCost) * 100 : 0;
    const paybackMonths = grossSavings > 0 ? (totalAnnualCost / grossSavings) * 12 : 999;
    const totalHoursSaved = auditHoursSaved * rampMultiplier + autoHoursSaved * rampMultiplier + delegatedHours * rampMultiplier;
    const fte = totalHoursSaved / 2080;

    return {
      baseLicenseCost, integrationCost, setupCost, setupAmortized, wastedLicenseCost,
      effectiveCostPerUser, utilRate, rampLoss, uptimeSavings,
      attritionCount, auditHoursSaved, auditingSavings: rampedAuditing,
      autoHoursSaved, automationSavings: rampedAutomation,
      reducedTickets, delegatedHours, ticketSavings: rampedTickets,
      securitySavings, scriptSavings, totalHoursSaved, fte,
      grossSavings, totalAnnualCost, netBenefit, roi, paybackMonths,
      rampMultiplier,
    };
  }, [s]);

  const isPos = r.netBenefit >= 0;

  const breakdown = [
    { label: "Automation",  value: r.automationSavings },
    { label: "Auditing",    value: r.auditingSavings },
    { label: "Tickets",     value: r.ticketSavings },
    { label: "Security",    value: r.securitySavings },
    { label: "Scripts",     value: r.scriptSavings },
    { label: "Uptime",      value: r.uptimeSavings },
    { label: "Intangibles", value: s.intangibleValue },
    { label: "Displaced tool", value: s.replacedToolCost },
  ].filter(x => x.value > 0);
  const maxBar = Math.max(...breakdown.map(x => x.value), 1);
  const totalPct = breakdown.reduce((a, x) => a + x.value, 0) || 1;

  const Inp = ({ label, k, hint, pre, step = 1 }) => (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, lineHeight: 1.4, opacity: .8 }}>{hint}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {pre && <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{pre}</span>}
        <input type="number" value={s[k]} min={0} step={step}
          onChange={e => set(k)(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          style={{ width: "100%", boxSizing: "border-box" }} />
      </div>
    </div>
  );

  const Sel = ({ label, k, hint, opts }) => (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, lineHeight: 1.4, opacity: .8 }}>{hint}</div>}
      <select value={s[k]} onChange={e => set(k)(e.target.value)} style={{ width: "100%" }}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  const SecHead = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase",
      color: P, borderBottom: `2px solid ${P}`, paddingBottom: 6, marginBottom: 14, marginTop: 18 }}>
      {label}
    </div>
  );

  const DetailRow = ({ label, val, sub, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div>
        <div style={{ fontSize: 13, color: accent ? P : "var(--color-text-primary)", fontWeight: accent ? 500 : 400 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", marginLeft: 12, color: accent ? P : "var(--color-text-primary)" }}>{val}</div>
    </div>
  );

  const SubHead = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".07em",
      color: "var(--color-text-secondary)", padding: "10px 0 3px" }}>{label}</div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans,system-ui,sans-serif)", padding: "0 0 2rem" }}>

      {/* HEADER */}
      <div style={{ background: P, borderRadius: "var(--border-radius-lg)", padding: "22px 28px", marginBottom: 24,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#fff", marginBottom: 2 }}>SaaS ROI calculator</div>
          <div style={{ fontSize: 13, color: "#CECBF6" }}>Estimate your annual savings and return on investment</div>
        </div>
        <button onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500,
            border: "1.5px solid #CECBF6", borderRadius: "var(--border-radius-md)",
            background: "transparent", color: "#fff", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="1" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="3" y="10" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M3 9H1V6a1 1 0 011-1h12a1 1 0 011 1v3h-2" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="12.5" cy="7.5" r=".8" fill="currentColor"/>
          </svg>
          Print / export PDF
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.35fr)", gap: 28, alignItems: "start" }}>

        {/* ── INPUTS ── */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)", padding: "20px 22px" }}>

          <SecHead label="Organizational metrics" />
          <Inp k="employees" label="Number of employees" hint="Total headcount in your organization." />
          <Inp k="adminRate" label="Admin hourly rate" pre="$" hint="Fully-loaded hourly cost of your highest-paid administrator." />
          <Inp k="nextTierRate" label="Next-tier staff hourly rate" pre="$" hint="Hourly rate of lower-tier staff who could handle delegated tasks." />
          <Inp k="attritionPct" label="Annual employee attrition (%)" pre="%" hint="Estimated percentage of workforce replaced each year." step={0.5} />

          <SecHead label="Operational needs & tier" />
          <Sel k="automation" label="Automation needs" hint="Classifies your organization's complexity and feature tier."
            opts={[{ v: "basic", l: "Basic" }, { v: "moderate", l: "Moderate" }, { v: "advanced", l: "Advanced" }]} />
          <Sel k="compliance" label="Compliance & retention requirements" hint="Determines multipliers applied to security and auditing savings."
            opts={[{ v: "standard", l: "Standard" }, { v: "moderate", l: "Moderate" }, { v: "strict", l: "Strict" }]} />
          <Sel k="efficiencyGoal" label="Support team efficiency goal" hint={GOAL_DESC[s.efficiencyGoal]}
            opts={[
              { v: "basic only", l: "Basic only" },
              { v: "maximum time savings", l: "Maximum time savings" },
              { v: "high security/compliance focus", l: "High security / compliance focus" },
            ]} />

          <SecHead label="Security & compliance" />
          <Inp k="securityValue" label="Security / risk mitigation value (annual)" pre="$" hint="Estimated annual value of avoiding security incidents and fines." />
          <Inp k="reportsPerMonth" label="Reports / reviews per month" hint="Average manual security or compliance reports run monthly." />

          <SecHead label="Automation" />
          <Inp k="hoursPerOnboard" label="Manual hours per onboard / offboard" hint="Average admin hours per hire or departure." step={0.5} />

          <SecHead label="Risk avoidance" />
          <Inp k="scriptCosts" label="Avoided script costs & maintenance (annual)" pre="$" hint="Annual spend on maintaining custom scripts (APIs, GAM, etc.)." />

          <SecHead label="Implementation & onboarding" />
          <Inp k="setupHours" label="Setup & configuration hours" hint="IT / admin hours required to deploy and configure the tool." />
          <Inp k="setupHourlyRate" label="Setup staff hourly rate" pre="$" hint="Hourly rate of the person(s) handling setup and integration." />
          <Inp k="trainingHours" label="Training hours per employee" hint="Average hours each employee spends learning the tool." step={0.5} />

          <SecHead label="Productivity ramp" />
          <Inp k="rampWeeks" label="Ramp period (weeks)" hint="Estimated weeks before staff reach full productivity." />
          <Inp k="rampEfficiencyPct" label="Efficiency during ramp (%)" pre="%" hint="Percentage of full productivity achieved during the ramp period." />

          <SecHead label="License utilization" />
          <Inp k="totalLicenses" label="Total licenses purchased" hint="Number of seats/licenses in your contract." />
          <Inp k="activeUserPct" label="Active user rate (%)" pre="%" hint="Percentage of licensed users actively using the tool." />

          <SecHead label="Integration & maintenance" />
          <Inp k="integrationHoursAnnual" label="Annual integration maintenance hours" hint="Hours/year spent maintaining API connections and integrations." />
          <Inp k="integrationHourlyRate" label="Integration staff hourly rate" pre="$" hint="Hourly rate of the technical staff handling integrations." />

          <SecHead label="Intangible benefits" />
          <Inp k="intangibleValue" label="Estimated intangible value (annual)" pre="$" hint="Estimated value of improved satisfaction, error reduction, faster ramp, etc. Enter conservatively." />

          <SecHead label="Competitive displacement" />
          <Inp k="replacedToolCost" label="Annual cost of tool being replaced" pre="$" hint="Subscription or license cost of the incumbent tool this replaces. Counts as avoided spend." />

          <SecHead label="Uptime & reliability" />
          <Inp k="uptimeSLA" label="New tool uptime SLA (%)" pre="%" hint="Uptime guarantee of the new tool (e.g. 99.9)." step={0.01} />
          <Inp k="currentUptimeSLA" label="Current solution uptime (%)" pre="%" hint="Uptime of your existing solution or process baseline." step={0.01} />
        </div>

        {/* ── RESULTS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: P, borderRadius: "var(--border-radius-lg)", padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#CECBF6", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Return on investment</div>
              <div style={{ fontSize: 34, fontWeight: 500, color: "#fff" }}>{fmtPct(r.roi)}</div>
            </div>
            <div style={{ background: isPos ? TT : "#FCEBEB", borderRadius: "var(--border-radius-lg)", padding: "18px 20px", border: `2px solid ${isPos ? T : "#E24B4A"}` }}>
              <div style={{ fontSize: 11, color: isPos ? TS : "#791F1F", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Net annual benefit</div>
              <div style={{ fontSize: 28, fontWeight: 500, color: isPos ? T : "#A32D2D" }}>{fmt$(r.netBenefit)}</div>
            </div>
            <div style={{ background: TT, borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: TS, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".07em" }}>Total annual benefits</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: T }}>{fmt$(r.grossSavings)}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".07em" }}>Total annual cost</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt$(r.totalAnnualCost)}</div>
            </div>
            <div style={{ background: AT, borderRadius: "var(--border-radius-lg)", padding: "14px 20px" }}>
              <div style={{ fontSize: 11, color: A, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".07em" }}>Payback period</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: A }}>{r.paybackMonths > 60 ? "60+ mo" : `${fmtDec(r.paybackMonths, 1)} mo`}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "14px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".07em" }}>License utilization</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmtPct(s.activeUserPct)}</div>
            </div>
          </div>

          {/* GOAL BADGE */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
            background: AT, borderRadius: "var(--border-radius-md)", border: `1px solid ${A}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: A, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: A }}>Goal: {GOAL_DESC[s.efficiencyGoal]}</span>
          </div>

          {/* BAR CHART */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: P, marginBottom: 14 }}>Benefits by category</div>
            {breakdown.map((b, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{b.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt$(b.value)}</span>
                </div>
                <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 99 }}>
                  <div style={{ height: 8, borderRadius: 99, background: CAT_COLORS[i % CAT_COLORS.length],
                    width: `${Math.max(2, (b.value / maxBar) * 100)}%`, transition: "width .4s ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* DONUT */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: P, marginBottom: 14 }}>Distribution breakdown</div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <svg viewBox="0 0 100 100" width={90} height={90} style={{ flexShrink: 0 }}>
                {(() => {
                  const R = 35, cx = 50, cy = 50, circ = 2 * Math.PI * R;
                  let cum = 0;
                  return breakdown.map((b, i) => {
                    const pct = b.value / totalPct;
                    const dash = pct * circ;
                    const rot = -90 + cum * 360;
                    cum += pct;
                    return <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                      stroke={CAT_COLORS[i % CAT_COLORS.length]} strokeWidth={18}
                      strokeDasharray={`${dash} ${circ - dash}`}
                      style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }} />;
                  });
                })()}
                <circle cx={50} cy={50} r={26} fill="var(--color-background-primary)" />
                <text x={50} y={47} textAnchor="middle" style={{ fontSize: 9, fill: P, fontWeight: 500 }}>Total</text>
                <text x={50} y={57} textAnchor="middle" style={{ fontSize: 8, fill: "var(--color-text-secondary)" }}>{fmt$(r.grossSavings)}</text>
              </svg>
              <div style={{ flex: 1 }}>
                {breakdown.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 99, background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>{b.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{Math.round(b.value / totalPct * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DETAILED BREAKDOWN */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: P, marginBottom: 14 }}>Detailed breakdown</div>

            <SubHead label="Capacity" />
            <DetailRow label="Total admin hours saved (annual)" val={`${fmtN(r.totalHoursSaved)} hrs`} />
            <DetailRow label="Full-time equivalent saved" val={`${fmtDec(r.fte, 2)} FTE`} sub="Based on 2,080-hour work year" />
            <DetailRow label="Employee attrition (annual)" val={`${fmtN(r.attritionCount)} employees`} />

            <SubHead label="Operational benefits (ramp-adjusted)" />
            <DetailRow label="Automation savings" val={fmt$(r.automationSavings)} sub={`Ramp factor: ${fmtPct(r.rampMultiplier * 100)}`} />
            <DetailRow label="Auditing savings" val={fmt$(r.auditingSavings)} sub={`${s.compliance} compliance × goal weight`} />
            <DetailRow label="Ticket savings" val={fmt$(r.ticketSavings)} sub={`${Math.round(TICKET_RED[s.automation] * 100)}% reduction — ${s.automation} tier`} />
            <DetailRow label="Security / risk savings" val={fmt$(r.securitySavings)} />
            <DetailRow label="Script cost savings" val={fmt$(r.scriptSavings)} />

            <SubHead label="Additional benefits" />
            <DetailRow label="Uptime improvement savings" val={fmt$(r.uptimeSavings)} sub={`${s.currentUptimeSLA}% → ${s.uptimeSLA}% uptime`} />
            <DetailRow label="Displaced tool savings" val={fmt$(s.replacedToolCost)} sub="Avoided incumbent tool renewal" />
            <DetailRow label="Intangible value (estimated)" val={fmt$(s.intangibleValue)} sub="Satisfaction, error reduction, faster ramp" />

            <SubHead label="Cost factors" />
            <DetailRow label="Base license cost" val={fmt$(r.baseLicenseCost)} sub={`${fmtN(s.employees)} employees — ${s.automation} tier`} />
            <DetailRow label="Wasted license cost" val={fmt$(r.wastedLicenseCost)} sub={`${100 - s.activeUserPct}% unused licenses`} />
            <DetailRow label="Integration & maintenance" val={fmt$(r.integrationCost)} sub={`${s.integrationHoursAnnual} hrs/yr @ $${s.integrationHourlyRate}/hr`} />
            <DetailRow label="Setup & training (amortized 3yr)" val={fmt$(r.setupAmortized)} sub={`Full cost: ${fmt$(r.setupCost)}`} />
            <DetailRow label="Productivity ramp loss" val={fmt$(-r.rampLoss)} sub={`${s.rampWeeks} wk ramp @ ${s.rampEfficiencyPct}% efficiency`} accent />
            <DetailRow label="Effective cost per active user" val={`${fmt$(r.effectiveCostPerUser)}/user`} sub={`${s.activeUserPct}% utilization`} />

            {/* TOTALS */}
            <div style={{ marginTop: 14, padding: "14px 16px", background: PT, borderRadius: "var(--border-radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: PS }}>Total annual benefits</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: PS }}>{fmt$(r.grossSavings)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: P }}>Less: total annual cost</span>
                <span style={{ fontSize: 12, color: P }}>({fmt$(r.totalAnnualCost)})</span>
              </div>
              <div style={{ height: "0.5px", background: P, opacity: .3, marginBottom: 8 }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: isPos ? T : "#A32D2D" }}>Net annual benefit</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: isPos ? T : "#A32D2D" }}>{fmt$(r.netBenefit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: A }}>Payback period</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: A }}>{r.paybackMonths > 60 ? "60+ months" : `${fmtDec(r.paybackMonths, 1)} months`}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}