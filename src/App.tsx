import React from "react";

export default function App() {
  return <div className="min-h-screen bg-[#0a0b10] text-slate-50 p-6">Loading Cursor Account Intelligence…</div>;
}

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EstimateMode = "conservative" | "moderate" | "aggressive";
type BillingCadence = "monthly" | "annual";
type CurrentPlan = "teams" | "enterprise";
type AICodingTool = "None" | "GitHub Copilot" | "Other";
type TabKey = "roi" | "expansion" | "upsell";

const WORK_HOURS_PER_YEAR = 2080;
const ANNUAL_BILLING_DISCOUNT = 0.2; // 20% off for annual billing

const CURSOR_TEAMS_PRICE_MONTHLY = 40;
const CURSOR_PRO_PRICE_MONTHLY = 20;
const CURSOR_PRO_PLUS_PRICE_MONTHLY = 60;
const CURSOR_ULTRA_PRICE_MONTHLY = 200;

const BUGBOT_PRICE_MONTHLY = 40;

const DEFAULT_ENTERPRISE_PRICE_MONTHLY = 60; // per-seat default for the tool

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatUSD(value: number, maxFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatUSD2(value: number) {
  return formatUSD(value, 2);
}

function formatInt(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function estimateModeMultiplier(mode: EstimateMode) {
  switch (mode) {
    case "conservative":
      return 0.6;
    case "aggressive":
      return 1.4;
    case "moderate":
    default:
      return 1;
  }
}

function replacedToolProductivityReductionPoints(tool: AICodingTool) {
  switch (tool) {
    case "GitHub Copilot":
      return 10;
    case "Other":
      return 5;
    case "None":
    default:
      return 0;
  }
}

async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function SegmentedControl<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
      {props.options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => props.onChange(opt.value)}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-r from-brand-500/25 to-fuchsia-500/20 text-slate-50 shadow-glow"
                : "text-slate-300 hover:text-slate-100",
            ].join(" ")}
            aria-pressed={active}
            aria-label={opt.label}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
  hero?: boolean;
}) {
  const toneStyles =
    props.tone === "good"
      ? "text-emerald-400"
      : props.tone === "bad"
        ? "text-rose-400"
        : "text-slate-50";

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm transition-all duration-300 sm:p-5">
      {props.hero ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-20 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/30 via-fuchsia-500/10 to-cyan-500/30 blur-3xl" />
        </div>
      ) : null}

      <div className="relative">
        <div className="text-sm text-slate-300">{props.label}</div>
        <div
          className={[
            "mt-2 whitespace-nowrap font-semibold tracking-tight transition-all duration-300 leading-none text-[clamp(1.15rem,2.9vw,2.05rem)]",
            toneStyles,
            props.hero ? "drop-shadow-[0_0_22px_rgba(99,102,241,0.35)]" : "",
          ].join(" ")}
        >
          {props.value}
        </div>
        {props.sub ? <div className="mt-1 text-sm text-slate-400">{props.sub}</div> : null}
      </div>
    </div>
  );
}

function StepNumber(props: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
}) {
  const step = props.step ?? 1;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
        onClick={() => props.onChange(clamp(props.value - step, props.min, props.max))}
        aria-label={`Decrease ${props.ariaLabel}`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        step={step}
        value={props.value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          props.onChange(clamp(next, props.min, props.max));
        }}
        className="h-10 flex-1 rounded-xl border border-white/10 bg-[#0a0b10] px-3 text-lg text-slate-50 outline-none transition focus:border-brand-400/40"
        aria-label={props.ariaLabel}
      />
      <button
        type="button"
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
        onClick={() => props.onChange(clamp(props.value + step, props.min, props.max))}
        aria-label={`Increase ${props.ariaLabel}`}
      >
        +
      </button>
    </div>
  );
}

function Slider(props: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (next: number) => void;
  ariaLabel: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  const step = props.step ?? 1;
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-slate-200">{props.label}</label>
        <div className="text-sm font-semibold text-brand-100">
          {props.value}
          {props.unit ? <span className="text-slate-400">{props.unit}</span> : null}
        </div>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-3 w-full accent-brand-500"
        aria-label={props.ariaLabel}
      />
      {props.minLabel || props.maxLabel ? (
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{props.minLabel ?? props.min}</span>
          <span>{props.maxLabel ?? props.max}</span>
        </div>
      ) : null}
    </div>
  );
}

function assumptionsFooter(lines: string[]) {
  return (
    <span>
      {lines.map((l, i) => (
        <span key={`${l}-${i}`}>
          {i > 0 ? " " : null}
          <span className="text-slate-300">•</span> <span className="text-slate-400">{l}</span>
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("roi");

  // Global features
  const [estimateMode, setEstimateMode] = useState<EstimateMode>("moderate");
  const [billingCadence, setBillingCadence] = useState<BillingCadence>("annual");

  // Tab 1 shared customer inputs
  const [customerName, setCustomerName] = useState<string>("Acme Corp");
  const [currentSeats, setCurrentSeats] = useState<number>(50);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>("teams");
  const [enterpriseSeatPriceMonthly, setEnterpriseSeatPriceMonthly] = useState<number>(
    DEFAULT_ENTERPRISE_PRICE_MONTHLY,
  );
  const [salaryAnnual, setSalaryAnnual] = useState<number>(165_000);
  const [codingTimePct, setCodingTimePct] = useState<number>(40);
  const [adoptionRatePct, setAdoptionRatePct] = useState<number>(70);
  const [perceivedProductivityGainPct, setPerceivedProductivityGainPct] = useState<number>(30);
  const [replacedTool, setReplacedTool] = useState<AICodingTool>("None");

  // Tab 2: Expansion inputs
  const [expansionTeamLabel, setExpansionTeamLabel] = useState<string>("Platform Engineering team");
  const [newSeats, setNewSeats] = useState<number>(25);
  const [newTeamInitialAdoptionPct, setNewTeamInitialAdoptionPct] = useState<number>(50);
  const [newTeamAdoptionAt6Pct, setNewTeamAdoptionAt6Pct] = useState<number>(75);
  const [newTeamAdoptionAt12Pct, setNewTeamAdoptionAt12Pct] = useState<number>(85);
  const [newTeamSalaryAnnual, setNewTeamSalaryAnnual] = useState<number>(165_000);
  const [rampMonths, setRampMonths] = useState<number>(2); // 1-3

  // Tab 3: Upsell inputs
  const [toggleTeamsToEnterprise, setToggleTeamsToEnterprise] = useState<boolean>(false);
  const [enterpriseUpgradeSeatPriceMonthly, setEnterpriseUpgradeSeatPriceMonthly] = useState<number>(
    DEFAULT_ENTERPRISE_PRICE_MONTHLY,
  );
  const [toggleProToProPlus, setToggleProToProPlus] = useState<boolean>(false);
  const [proPlusUsers, setProPlusUsers] = useState<number>(10);
  const [toggleProToUltra, setToggleProToUltra] = useState<boolean>(false);
  const [proUltraUsers, setProUltraUsers] = useState<number>(3);
  const [bugbotSeats, setBugbotSeats] = useState<number>(20);
  const [bugbotReviewTimeReductionPct, setBugbotReviewTimeReductionPct] = useState<number>(30);

  const confidenceMult = useMemo(() => estimateModeMultiplier(estimateMode), [estimateMode]);
  const annualPriceMultiplier = billingCadence === "annual" ? 1 - ANNUAL_BILLING_DISCOUNT : 1;

  // Productive gain model (applies to all productivity deltas)
  const gainReductionPoints = useMemo(() => replacedToolProductivityReductionPoints(replacedTool), [replacedTool]);
  const gainNoConfidencePct = useMemo(
    () => clamp(perceivedProductivityGainPct - gainReductionPoints, 0, 100),
    [perceivedProductivityGainPct, gainReductionPoints],
  );
  const gainEffectivePct = useMemo(
    () => clamp(gainNoConfidencePct * confidenceMult, 0, 100),
    [gainNoConfidencePct, confidenceMult],
  );

  const currentSeatMonthlyPrice = useMemo(() => {
    return currentPlan === "teams" ? CURSOR_TEAMS_PRICE_MONTHLY : enterpriseSeatPriceMonthly;
  }, [currentPlan, enterpriseSeatPriceMonthly]);

  const currentSeatMonthlyPriceAfterBilling = useMemo(() => {
    return currentSeatMonthlyPrice * annualPriceMultiplier;
  }, [currentSeatMonthlyPrice, annualPriceMultiplier]);

  const tab1 = useMemo(() => {
    const annualSpend = currentSeats * currentSeatMonthlyPriceAfterBilling * 12;
    const hourlyRate = salaryAnnual / WORK_HOURS_PER_YEAR;

    // Spec formula: annual coding hours per active user includes adoption.
    const annualCodingHoursPerActiveUser =
      WORK_HOURS_PER_YEAR * (codingTimePct / 100) * (adoptionRatePct / 100);
    const hoursSavedPerActiveUserPerYear = annualCodingHoursPerActiveUser * (gainEffectivePct / 100);

    const totalHoursSavedAcrossAllActiveUsers = hoursSavedPerActiveUserPerYear * currentSeats;
    const annualValueSaved = totalHoursSavedAcrossAllActiveUsers * hourlyRate;

    const netRoi = annualValueSaved - annualSpend;
    const roiMultiple = annualSpend > 0 ? annualValueSaved / annualSpend : 0;

    return {
      annualSpend,
      hourlyRate,
      annualCodingHoursPerActiveUser,
      hoursSavedPerActiveUserPerYear,
      totalHoursSavedAcrossAllActiveUsers,
      annualValueSaved,
      netRoi,
      roiMultiple,
    };
  }, [
    currentSeats,
    currentSeatMonthlyPriceAfterBilling,
    salaryAnnual,
    codingTimePct,
    adoptionRatePct,
    gainEffectivePct,
  ]);

  const tab2 = useMemo(() => {
    const newTeamHourlyRate = newTeamSalaryAnnual / WORK_HOURS_PER_YEAR;
    const newMonthlyCost = newSeats * currentSeatMonthlyPriceAfterBilling;
    const additionalAnnualCost = newMonthlyCost * 12;

    const existingMonthlyValue = tab1.annualValueSaved / 12;
    const existingMonthlyCost = tab1.annualSpend / 12;

    const ramp = clamp(rampMonths, 1, 3);

    const getNewAdoptionPct = (m: number) => {
      // m in 1..12
      if (m <= 6) {
        const t = m / 6;
        return newTeamInitialAdoptionPct + (newTeamAdoptionAt6Pct - newTeamInitialAdoptionPct) * t;
      }
      const t = (m - 6) / 6;
      return newTeamAdoptionAt6Pct + (newTeamAdoptionAt12Pct - newTeamAdoptionAt6Pct) * t;
    };

    const getProductivityRampFactor = (m: number) => clamp(m / ramp, 0, 1);

    const rows = Array.from({ length: 13 }, (_, m) => m).map((m) => {
      let cumulativeNewSavings = 0;
      for (let mm = 1; mm <= m; mm++) {
        const adoptionPct = getNewAdoptionPct(mm);
        const rampFactor = getProductivityRampFactor(mm);
        const effectiveGainPctThisMonth = gainEffectivePct * rampFactor;

        const monthlyHoursSavedPerSeat =
          (WORK_HOURS_PER_YEAR / 12) *
          (codingTimePct / 100) *
          (adoptionPct / 100) *
          (effectiveGainPctThisMonth / 100);
        const monthlyValueSaved = monthlyHoursSavedPerSeat * newTeamHourlyRate * newSeats;
        cumulativeNewSavings += monthlyValueSaved;
      }

      const cumulativeNewCost = newMonthlyCost * m;
      const combinedCost = existingMonthlyCost * m + cumulativeNewCost;
      const combinedValue = existingMonthlyValue * m + cumulativeNewSavings;
      const combinedRoiMultiple = combinedCost > 0 ? combinedValue / combinedCost : 0;

      return {
        month: m,
        cumulativeNewCost,
        cumulativeNewSavings,
        combinedRoiMultiple,
      };
    });

    const atMonth = (mm: number) => rows.find((r) => r.month === mm)!;

    const savingsM3 = atMonth(3).cumulativeNewSavings;
    const savingsM6 = atMonth(6).cumulativeNewSavings;
    const savingsM12 = atMonth(12).cumulativeNewSavings;

    const breakevenMonth = (() => {
      for (const r of rows) {
        if (r.month === 0) continue;
        if (r.cumulativeNewSavings >= r.cumulativeNewCost && r.cumulativeNewCost > 0) return r.month;
      }
      return null;
    })();

    return {
      newMonthlyCost,
      additionalAnnualCost,
      rows,
      savingsM3,
      savingsM6,
      savingsM12,
      breakevenMonth,
      combinedRoiAt12: atMonth(12).combinedRoiMultiple,
      baseRoiAt12: tab1.roiMultiple,
      newValueWithin12Months: savingsM12,
    };
  }, [
    newTeamSalaryAnnual,
    newSeats,
    currentSeatMonthlyPriceAfterBilling,
    tab1.annualValueSaved,
    tab1.annualSpend,
    tab1.roiMultiple,
    rampMonths,
    newTeamInitialAdoptionPct,
    newTeamAdoptionAt6Pct,
    newTeamAdoptionAt12Pct,
    gainEffectivePct,
    codingTimePct,
  ]);

  const tab3 = useMemo(() => {
    const hourlyRate = tab1.hourlyRate;
    const annualCodingHoursPerActiveUser =
      WORK_HOURS_PER_YEAR * (codingTimePct / 100) * (adoptionRatePct / 100);

    const discount = annualPriceMultiplier;

    const proPlusAdditionalRelativeBoost = 0.125; // model as 10-15% midpoint
    const proUltraAdditionalRelativeBoost = 0.2; // model as 20%

    // Base gain (effective already includes confidence)
    const baseGainEffectivePct = gainEffectivePct;

    const gainProPlusEffectivePct = clamp(
      clamp(gainNoConfidencePct * (1 + proPlusAdditionalRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );
    const gainUltraEffectivePct = clamp(
      clamp(gainNoConfidencePct * (1 + proUltraAdditionalRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );

    // Teams -> Enterprise (cost delta only)
    const enterpriseUpgradeDeltaMonthly = Math.max(
      0,
      enterpriseUpgradeSeatPriceMonthly * discount - CURSOR_TEAMS_PRICE_MONTHLY * discount,
    );
    const enterpriseAdditionalAnnualInvestment =
      toggleTeamsToEnterprise && currentPlan === "teams" ? currentSeats * enterpriseUpgradeDeltaMonthly * 12 : 0;
    const enterpriseAdditionalAnnualValue = 0;

    // Pro -> Pro+
    const proPlusIncrementalMonthly = Math.max(
      0,
      (CURSOR_PRO_PLUS_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * discount,
    );
    const proPlusAdditionalAnnualInvestment = toggleProToProPlus ? proPlusUsers * proPlusIncrementalMonthly * 12 : 0;

    const baseHoursSavedPerSeatAnnual = annualCodingHoursPerActiveUser * (baseGainEffectivePct / 100);
    const proPlusHoursSavedPerSeatAnnual = annualCodingHoursPerActiveUser * (gainProPlusEffectivePct / 100);
    const proPlusAdditionalAnnualValue = toggleProToProPlus
      ? proPlusUsers * (proPlusHoursSavedPerSeatAnnual - baseHoursSavedPerSeatAnnual) * hourlyRate
      : 0;

    // Pro -> Ultra
    const proUltraIncrementalMonthly = Math.max(
      0,
      (CURSOR_ULTRA_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * discount,
    );
    const proUltraAdditionalAnnualInvestment = toggleProToUltra ? proUltraUsers * proUltraIncrementalMonthly * 12 : 0;

    const proUltraHoursSavedPerSeatAnnual = annualCodingHoursPerActiveUser * (gainUltraEffectivePct / 100);
    const proUltraAdditionalAnnualValue = toggleProToUltra
      ? proUltraUsers * (proUltraHoursSavedPerSeatAnnual - baseHoursSavedPerSeatAnnual) * hourlyRate
      : 0;

    // Bugbot
    const bugbotAnnualCost = bugbotSeats * (BUGBOT_PRICE_MONTHLY * discount) * 12;
    const effectiveReviewReductionPct = clamp(bugbotReviewTimeReductionPct * confidenceMult, 0, 100);
    const baselineCodeReviewHoursPerDevPerWeek = 4; // assumed baseline avg
    const hoursSavedPerDevPerWeek = baselineCodeReviewHoursPerDevPerWeek * (effectiveReviewReductionPct / 100);
    const totalAnnualReviewHoursSaved = bugbotSeats * hoursSavedPerDevPerWeek * 52;
    const bugbotAnnualValue = totalAnnualReviewHoursSaved * hourlyRate;

    const combinedAdditionalAnnualInvestment =
      enterpriseAdditionalAnnualInvestment +
      proPlusAdditionalAnnualInvestment +
      proUltraAdditionalAnnualInvestment +
      bugbotAnnualCost;
    const combinedAdditionalAnnualValue =
      enterpriseAdditionalAnnualValue +
      proPlusAdditionalAnnualValue +
      proUltraAdditionalAnnualValue +
      bugbotAnnualValue;

    const baseAnnualInvestment = tab1.annualSpend;
    const baseAnnualValue = tab1.annualValueSaved;

    const combinedAnnualInvestment = baseAnnualInvestment + combinedAdditionalAnnualInvestment;
    const combinedAnnualValue = baseAnnualValue + combinedAdditionalAnnualValue;
    const combinedNet = combinedAnnualValue - combinedAnnualInvestment;
    const combinedRoiMultiple = combinedAnnualInvestment > 0 ? combinedAnnualValue / combinedAnnualInvestment : 0;

    return {
      enterpriseAdditionalAnnualInvestment,
      enterpriseAdditionalAnnualValue,
      proPlusAdditionalAnnualInvestment,
      proPlusAdditionalAnnualValue,
      gainProPlusEffectivePct,
      proPlusAdditionalRelativeBoost: proPlusAdditionalRelativeBoost,
      proUltraAdditionalAnnualInvestment,
      proUltraAdditionalAnnualValue,
      gainUltraEffectivePct,
      proUltraAdditionalRelativeBoost: proUltraAdditionalRelativeBoost,
      bugbotAnnualCost,
      hoursSavedPerDevPerWeek,
      totalAnnualReviewHoursSaved,
      bugbotAnnualValue,
      combinedAdditionalAnnualInvestment,
      combinedAdditionalAnnualValue,
      combinedAnnualInvestment,
      combinedAnnualValue,
      combinedNet,
      combinedRoiMultiple,
      baselineCodeReviewHoursPerDevPerWeek,
      baseGainEffectivePct,
    };
  }, [
    tab1.hourlyRate,
    tab1.annualSpend,
    tab1.annualValueSaved,
    codingTimePct,
    adoptionRatePct,
    annualPriceMultiplier,
    gainEffectivePct,
    gainNoConfidencePct,
    confidenceMult,
    enterpriseUpgradeSeatPriceMonthly,
    toggleTeamsToEnterprise,
    currentPlan,
    currentSeats,
    toggleProToProPlus,
    proPlusUsers,
    toggleProToUltra,
    proUltraUsers,
    bugbotSeats,
    bugbotReviewTimeReductionPct,
  ]);

  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const copyToClipboardFallback = async (text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("fail");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  };

  const summaryText = useMemo(() => {
    const modeLabel =
      estimateMode === "conservative" ? "Conservative" : estimateMode === "aggressive" ? "Aggressive" : "Moderate";
    const billingLabel = billingCadence === "annual" ? "Annual billing (20% off)" : "Monthly billing";

    if (tab === "roi") {
      const sentence = `${customerName}'s ${currentSeats} Cursor seats are generating an estimated ${formatUSD(
        tab1.annualValueSaved,
      )} in annual productivity value against a ${formatUSD(tab1.annualSpend)} investment — a ${tab1.roiMultiple.toFixed(
        1,
      )}x return.`;
      return [
        `Cursor Account Intelligence (${modeLabel}; ${billingLabel})`,
        "",
        sentence,
        "",
        `Annual Cursor spend: ${formatUSD(tab1.annualSpend)}`,
        `Annual value of time saved: ${formatUSD(tab1.annualValueSaved)}`,
        `Net ROI: ${formatUSD(tab1.netRoi)} (${tab1.netRoi >= 0 ? "+" : ""}${((tab1.netRoi / tab1.annualSpend) * 100 || 0).toFixed(
          1,
        )}% of spend)`,
      ].join("\n");
    }

    if (tab === "expansion") {
      const breakeven = tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`;
      const sentence = `Adding ${newSeats} seats for ${customerName}'s ${expansionTeamLabel} would cost ${formatUSD(
        tab2.additionalAnnualCost,
      )} / year and is projected to generate ${formatUSD(tab2.newValueWithin12Months)} in value within 12 months. Breakeven is expected at ${breakeven}. Combined account ROI would increase from ${tab2.baseRoiAt12.toFixed(
        1,
      )}x to ${tab2.combinedRoiAt12.toFixed(1)}x.`;
      return [
        `Cursor Account Intelligence — Team Expansion (${modeLabel}; ${billingLabel})`,
        "",
        sentence,
        "",
        `Projected new-team savings: Month 3 ${formatUSD(tab2.savingsM3)}, Month 6 ${formatUSD(tab2.savingsM6)}, Month 12 ${formatUSD(
          tab2.savingsM12,
        )}`,
      ].join("\n");
    }

    // upsell
    const actions: string[] = [];
    if (toggleTeamsToEnterprise && currentPlan === "teams") actions.push("Enterprise upgrade");
    if (toggleProToProPlus) actions.push(`moving ${proPlusUsers} power users to Pro+`);
    if (toggleProToUltra) actions.push(`moving ${proUltraUsers} power users to Ultra`);
    if (bugbotSeats > 0) actions.push(`adding Bugbot for ${bugbotSeats} developers`);

    const sentence = `Upgrading ${customerName} via ${actions.join(", ") || "no selected changes"} would increase annual investment by ${formatUSD(
      tab3.combinedAdditionalAnnualInvestment,
    )} while generating an estimated ${formatUSD(tab3.combinedAdditionalAnnualValue)} in additional value. Combined ROI impact: ${tab3.combinedRoiMultiple.toFixed(
      1,
    )}x overall ROI multiple (incremental net: ${formatUSD(tab3.combinedNet)}).`;

    return [
      `Cursor Account Intelligence — SKU Upsell (${modeLabel}; ${billingLabel})`,
      "",
      sentence,
    ].join("\n");
  }, [
    tab,
    estimateMode,
    billingCadence,
    customerName,
    currentSeats,
    tab1,
    tab2,
    newSeats,
    expansionTeamLabel,
    toggleTeamsToEnterprise,
    currentPlan,
    toggleProToProPlus,
    proPlusUsers,
    toggleProToUltra,
    proUltraUsers,
    bugbotSeats,
    tab3,
  ]);

  const copySummary = async () => {
    try {
      await copyTextToClipboard(summaryText);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      copyToClipboardFallback(summaryText);
    }
  };

  const netTone = tab1.netRoi >= 0 ? "good" : "bad";

  const tabTitle = useMemo(() => `Cursor Account Intelligence — ${customerName}`, [customerName]);

  const barChartData = useMemo(
    () => [
      { name: "Year 1", cursorInvestment: tab1.annualSpend, timeValueSaved: tab1.annualValueSaved },
    ],
    [tab1.annualSpend, tab1.annualValueSaved],
  );

  const assumptionsTab1 = useMemo(
    () =>
      assumptionsFooter([
        `${WORK_HOURS_PER_YEAR} working hours/year`,
        "productivity gain applies only to coding time",
        "adoption rate weights expected coding time per licensed seat",
        `productivity gain reduced vs "${replacedTool}" by ${replacedToolProductivityReductionPoints(replacedTool)} points`,
        `confidence mode multiplies productivity gains by ${confidenceMult}`,
      ]),
    [confidenceMult, replacedTool],
  );

  const assumptionsTab2 = useMemo(
    () =>
      assumptionsFooter([
        "new-team adoption ramps linearly to targets at 6 and 12 months",
        "productivity gain ramps to full over the selected 1–3 month period",
        `confidence mode multiplies productivity gains by ${confidenceMult}`,
        `base productivity gain is ${gainNoConfidencePct.toFixed(1)}% (before confidence) and ${gainEffectivePct.toFixed(
          1,
        )}% (effective)`,
      ]),
    [confidenceMult, gainEffectivePct, gainNoConfidencePct],
  );

  const assumptionsTab3 = useMemo(
    () =>
      assumptionsFooter([
        "Enterprise upgrade models cost only (operational benefits listed, not converted into coding productivity delta)",
        "Pro+ modeled as a relative +12.5% gain for upgraded power users",
        "Ultra modeled as a relative +20% gain for upgraded users",
        `Bugbot baseline assumed ${tab3.baselineCodeReviewHoursPerDevPerWeek} hours/dev/week`,
        `Bugbot time-savings reduction is multiplied by confidence (${confidenceMult})`,
      ]),
    [tab3.baselineCodeReviewHoursPerDevPerWeek, confidenceMult],
  );

  const confidenceOptions = useMemo(
    () => [
      { value: "conservative" as const, label: "Conservative" },
      { value: "moderate" as const, label: "Moderate" },
      { value: "aggressive" as const, label: "Aggressive" },
    ],
    [],
  );

  const billingOptions = useMemo(
    () => [
      { value: "monthly" as const, label: "Monthly" },
      { value: "annual" as const, label: "Annual (20% off)" },
    ],
    [],
  );

  const Header = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500/30 via-fuchsia-500/15 to-cyan-500/20 shadow-glow" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cursor Account Intelligence</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          Internal ROI modeling for Cursor deployment QBRs (client-side calculations).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <div className="w-full sm:w-[520px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-400 mb-1">Estimate confidence</div>
              <SegmentedControl<EstimateMode>
                value={estimateMode}
                onChange={setEstimateMode}
                options={confidenceOptions}
                ariaLabel="Estimate confidence"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Billing</div>
              <SegmentedControl<BillingCadence>
                value={billingCadence}
                onChange={setBillingCadence}
                options={billingOptions}
                ariaLabel="Billing cadence"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 w-full sm:w-auto">
          <div className="text-xs text-slate-400">Export</div>
          <button
            type="button"
            onClick={copySummary}
            className="mt-2 w-full sm:w-44 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
            aria-label="Copy Summary"
          >
            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy Summary"}
          </button>
          <div className="mt-1 text-xs text-slate-400">Clipboard-ready for email/Slack</div>
        </div>
      </div>
    </header>
  );

  const Tabs = (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "roi" as const, label: "Current ROI" },
              { key: "expansion" as const, label: "Team Expansion" },
              { key: "upsell" as const, label: "SKU Upsell" },
            ] as Array<{ key: TabKey; label: string }>
          ).map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border-brand-400/40 bg-gradient-to-r from-brand-500/20 to-fuchsia-500/10 text-slate-100 shadow-glow"
                    : "border-white/10 bg-white/5 text-slate-300 hover:text-slate-100",
                ].join(" ")}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs text-slate-400">Current account</div>
          <div className="mt-1 text-sm font-semibold text-slate-100">
            {customerName} · {currentSeats} seats · {currentPlan === "teams" ? "Teams" : "Enterprise"}
          </div>
        </div>
      </div>
    </div>
  );

  const CurrentROI = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="text-base font-semibold text-slate-100">Inputs</div>
        <div className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-200">Customer name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Customer name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-200">Number of current Cursor seats</div>
                <div className="mt-1 text-xs text-slate-400">Licenses currently active in this account</div>
              </div>
              <div className="text-sm font-semibold text-brand-100">{currentSeats}</div>
            </div>
            <div className="mt-3">
              <StepNumber value={currentSeats} onChange={setCurrentSeats} min={1} max={5000} ariaLabel="Cursor seats" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Current plan</label>
            <select
              value={currentPlan}
              onChange={(e) => setCurrentPlan(e.target.value as CurrentPlan)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Current plan"
            >
              <option value="teams">Teams at $40/user/mo</option>
              <option value="enterprise">Enterprise (custom per-seat price)</option>
            </select>
            {currentPlan === "enterprise" ? (
              <div className="mt-4">
                <Slider
                  value={enterpriseSeatPriceMonthly}
                  min={30}
                  max={200}
                  step={1}
                  label="Enterprise per-seat price"
                  unit="/mo"
                  onChange={setEnterpriseSeatPriceMonthly}
                  ariaLabel="Enterprise per-seat monthly price"
                  minLabel="$30"
                  maxLabel="$200"
                />
              </div>
            ) : null}
          </div>

          <Slider
            value={salaryAnnual}
            min={80_000}
            max={400_000}
            step={5000}
            label="Average developer salary at this company"
            unit="/yr"
            onChange={setSalaryAnnual}
            ariaLabel="Average developer salary"
            minLabel="$80k"
            maxLabel="$400k"
          />

          <Slider
            value={codingTimePct}
            min={10}
            max={80}
            step={1}
            label="Estimated % of dev time spent coding"
            unit="%"
            onChange={setCodingTimePct}
            ariaLabel="Coding time percentage"
            minLabel="10%"
            maxLabel="80%"
          />

          <Slider
            value={adoptionRatePct}
            min={20}
            max={100}
            step={1}
            label="Average adoption rate (weekly active)"
            unit="%"
            onChange={setAdoptionRatePct}
            ariaLabel="Adoption rate"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={perceivedProductivityGainPct}
            min={10}
            max={55}
            step={1}
            label="Perceived productivity gain"
            unit="%"
            onChange={setPerceivedProductivityGainPct}
            ariaLabel="Perceived productivity gain"
            minLabel="10%"
            maxLabel="55%"
          />

          <div>
            <label className="text-sm font-medium text-slate-200">Current AI tool Cursor replaced</label>
            <select
              value={replacedTool}
              onChange={(e) => setReplacedTool(e.target.value as AICodingTool)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Cursor replaced AI tool"
            >
              <option value="None">None</option>
              <option value="GitHub Copilot">GitHub Copilot</option>
              <option value="Other">Other</option>
            </select>
            <div className="mt-2 text-xs text-slate-400">
              Cursor incremental productivity is reduced by{" "}
              <span className="text-slate-200 font-semibold">
                {replacedToolProductivityReductionPoints(replacedTool)}
              </span>{" "}
              percentage points.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Dynamic summary</div>
            <div className="mt-2 text-sm text-slate-200 leading-relaxed">
              {customerName}'s {currentSeats} Cursor seats are generating an estimated{" "}
              <span className="text-emerald-300 font-semibold">{formatUSD(tab1.annualValueSaved)}</span> in annual productivity
              value against a{" "}
              <span className="text-slate-50 font-semibold">{formatUSD(tab1.annualSpend)}</span> investment —{" "}
              <span className={tab1.roiMultiple >= 1 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"} style={{ fontWeight: 700 }}>
                {tab1.roiMultiple.toFixed(1)}x
              </span>{" "}
              return.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Annual Cursor spend"
              value={formatUSD(tab1.annualSpend)}
              sub={`${currentSeats} seats · ${billingCadence === "annual" ? "annual billing (20% off)" : "monthly billing"}`}
              tone="neutral"
            />
            <MetricCard
              label="Effective hourly rate per developer"
              value={formatUSD2(tab1.hourlyRate)}
              sub={`Salary / ${WORK_HOURS_PER_YEAR}h`}
              tone="neutral"
            />
            <MetricCard
              label="Annual coding hours per active user"
              value={`${formatInt(tab1.annualCodingHoursPerActiveUser)}h`}
              sub="Coding% × adoption%"
              tone="neutral"
            />
            <MetricCard
              label="Hours saved per active user per year"
              value={`${formatInt(tab1.hoursSavedPerActiveUserPerYear)}h`}
              sub="Coding hours × productivity gain"
              tone="neutral"
            />
            <MetricCard
              label="Total hours saved across all active users"
              value={`${formatInt(tab1.totalHoursSavedAcrossAllActiveUsers)}h`}
              sub={`${currentSeats} seats`}
              tone="neutral"
            />
            <MetricCard
              label="Dollar value of time saved"
              value={formatUSD(tab1.annualValueSaved)}
              sub="Annual value of time saved"
              tone="good"
            />
            <MetricCard
              hero
              label="Net ROI"
              value={`${tab1.netRoi >= 0 ? "+" : ""}${formatUSD(tab1.netRoi)}`}
              sub={`ROI multiple: ${tab1.roiMultiple.toFixed(1)}x`}
              tone={netTone}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
            <div className="text-sm font-semibold text-slate-100">Cursor annual investment vs. time value</div>
            <div className="mt-1 text-xs text-slate-400">Investment (cost) vs. estimated value of reclaimed engineering time</div>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 14, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                    formatter={(v: unknown) => formatUSD(Number(v))}
                    labelFormatter={() => ""}
                    cursor={{ fill: "rgba(99,102,241,0.10)" }}
                  />
                  <Bar
                    dataKey="cursorInvestment"
                    name="Cursor annual investment"
                    fill="rgba(99, 102, 241, 0.65)"
                    radius={[14, 14, 14, 14]}
                    barSize={64}
                  />
                  <Bar
                    dataKey="timeValueSaved"
                    name="Annual value of time saved"
                    fill="rgba(16, 185, 129, 0.75)"
                    radius={[14, 14, 14, 14]}
                    barSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab1}
          </div>
        </div>
      </section>
    </div>
  );

  const TeamExpansion = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="text-base font-semibold text-slate-100">Inputs</div>

        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-100">Base account (from Tab 1)</div>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-400">Current seats</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{currentSeats}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Current plan</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {currentPlan === "teams" ? `Teams ($${CURSOR_TEAMS_PRICE_MONTHLY}/user/mo)` : `Enterprise ($${enterpriseSeatPriceMonthly}/user/mo)`}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Coding time</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{codingTimePct}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Adoption (existing)</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{adoptionRatePct}% weekly</div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Expansion team name (for summary)</label>
            <input
              type="text"
              value={expansionTeamLabel}
              onChange={(e) => setExpansionTeamLabel(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Expansion team label"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-200">Number of new seats to add</div>
                <div className="mt-1 text-xs text-slate-400">Added on the same plan as the current account</div>
              </div>
              <div className="text-sm font-semibold text-brand-100">{newSeats}</div>
            </div>
            <div className="mt-3">
              <StepNumber value={newSeats} onChange={setNewSeats} min={1} max={5000} ariaLabel="New seats" />
            </div>
          </div>

          <Slider
            value={newTeamInitialAdoptionPct}
            min={20}
            max={100}
            step={1}
            label="Expected initial adoption rate for new teams"
            unit="%"
            onChange={setNewTeamInitialAdoptionPct}
            ariaLabel="Initial adoption for new teams"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamAdoptionAt6Pct}
            min={20}
            max={100}
            step={1}
            label="Expected adoption rate at 6 months"
            unit="%"
            onChange={setNewTeamAdoptionAt6Pct}
            ariaLabel="Adoption at 6 months"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamAdoptionAt12Pct}
            min={20}
            max={100}
            step={1}
            label="Expected adoption rate at 12 months"
            unit="%"
            onChange={setNewTeamAdoptionAt12Pct}
            ariaLabel="Adoption at 12 months"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamSalaryAnnual}
            min={80_000}
            max={400_000}
            step={5000}
            label="New team's average salary"
            unit="/yr"
            onChange={setNewTeamSalaryAnnual}
            ariaLabel="New team salary"
            minLabel="$80k"
            maxLabel="$400k"
          />

          <div>
            <label className="text-sm font-medium text-slate-200">Estimated ramp time to full productivity gain</label>
            <select
              value={rampMonths}
              onChange={(e) => setRampMonths(clamp(Number(e.target.value), 1, 3))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Productivity ramp time"
            >
              <option value={1}>1 month</option>
              <option value={2}>2 months</option>
              <option value={3}>3 months</option>
            </select>
            <div className="mt-2 text-xs text-slate-400">Productivity gain ramps linearly from 0 to full over this period.</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Dynamic summary</div>
            <div className="mt-2 text-sm text-slate-200 leading-relaxed">
              Adding {newSeats} seats for {customerName}'s{" "}
              <span className="font-semibold">{expansionTeamLabel}</span> would cost{" "}
              <span className="text-slate-50 font-semibold">{formatUSD(tab2.additionalAnnualCost)}</span> / year and is projected to generate{" "}
              <span className="text-emerald-300 font-semibold">{formatUSD(tab2.newValueWithin12Months)}</span> in value within 12 months. Breakeven is expected at{" "}
              <span className={tab2.breakevenMonth === null ? "text-slate-300" : "text-emerald-300 font-semibold"}>
                {tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`}
              </span>
              . Combined account ROI would increase from {tab2.baseRoiAt12.toFixed(1)}x to {tab2.combinedRoiAt12.toFixed(1)}x.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Additional annual cost for new seats" value={formatUSD(tab2.additionalAnnualCost)} sub={`${newSeats} seats`} />
            <MetricCard label="Projected savings at Month 6" value={formatUSD(tab2.savingsM6)} sub="Cumulative new-team savings" tone="good" />
            <MetricCard
              label="Time to breakeven"
              value={tab2.breakevenMonth === null ? "—" : `Month ${tab2.breakevenMonth}`}
              sub="Cumulative savings exceed cumulative cost"
              tone={tab2.breakevenMonth === null ? "neutral" : "good"}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">Projected savings checkpoints</div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 3</div>
                <div className="text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM3)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 6</div>
                <div className="text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM6)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 12</div>
                <div className="text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM12)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
            <div className="text-sm font-semibold text-slate-100">Cumulative economics over 12 months</div>
            <div className="mt-1 text-xs text-slate-400">
              New seats: cumulative cost vs cumulative savings, plus combined account ROI multiple over time.
            </div>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tab2.rows} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Months", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatUSD(Number(v))}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                    formatter={(v: unknown, name) => {
                      const num = Number(v);
                      if (String(name).toLowerCase().includes("roi")) return `${num.toFixed(1)}x`;
                      return formatUSD(num);
                    }}
                    labelFormatter={(label) => `Month ${label}`}
                  />

                  {tab2.breakevenMonth !== null ? (
                    <ReferenceLine
                      x={tab2.breakevenMonth}
                      stroke="rgba(52,211,153,0.5)"
                      strokeDasharray="4 4"
                      label={{
                        position: "top",
                        value: "Breakeven",
                        fill: "rgba(52,211,153,0.9)",
                        fontSize: 12,
                      }}
                    />
                  ) : null}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeNewCost"
                    name="Cumulative cost (new)"
                    stroke="rgba(99, 102, 241, 0.75)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeNewSavings"
                    name="Cumulative savings (new)"
                    stroke="rgba(16, 185, 129, 0.85)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="combinedRoiMultiple"
                    name="Combined ROI multiple"
                    stroke="rgba(59, 130, 246, 0.9)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab2}
          </div>
        </div>
      </section>
    </div>
  );

  const Upsell = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6 lg:col-span-2">
        <div className="text-base font-semibold text-slate-100">SKU Upsell Modeling</div>

        <div className="mt-5 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-100">Section A: Plan Upgrade Modeling</div>
            <div className="mt-1 text-xs text-slate-400">Toggle scenarios to add incremental cost + value to the bottom summary.</div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Teams → Enterprise</div>
                    <div className="text-xs text-slate-400 mt-1">Negotiated per-seat pricing</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleTeamsToEnterprise}
                      onChange={(e) => setToggleTeamsToEnterprise(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Teams to Enterprise"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">New Enterprise per-seat price</div>
                  <input
                    type="number"
                    value={enterpriseUpgradeSeatPriceMonthly}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setEnterpriseUpgradeSeatPriceMonthly(clamp(next, 30, 300));
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
                    aria-label="Enterprise upgrade per-seat price"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Assumes {billingCadence === "annual" ? "annual" : "monthly"} billing discount is applied to effective per-seat cost.
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Benefits (highlight only)</div>
                  <div className="mt-2 space-y-1">
                    <div>• Pooled usage across org (reduce waste from underutilizing credit pools)</div>
                    <div>• SAML/SSO</div>
                    <div>• Invoice billing</div>
                    <div>• Dedicated support</div>
                    <div>• Admin analytics dashboard</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.enterpriseAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">Pooled usage can reduce waste even if productivity delta is unchanged in this model.</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Pro → Pro+</div>
                    <div className="text-xs text-slate-400 mt-1">Power users</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleProToProPlus}
                      onChange={(e) => setToggleProToProPlus(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Pro to Pro+"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">Number of users to upgrade</div>
                  <div className="mt-2">
                    <StepNumber value={proPlusUsers} onChange={setProPlusUsers} min={0} max={5000} ariaLabel="Pro+ users" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Price delta modeled as ${CURSOR_PRO_PLUS_PRICE_MONTHLY}/mo vs ${CURSOR_PRO_PRICE_MONTHLY}/mo ⇒ ${CURSOR_PRO_PLUS_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY}/mo incremental.
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.proPlusAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Productivity boost: modeled as relative +{(tab3.proPlusAdditionalRelativeBoost * 100).toFixed(1)}% for upgraded users.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Pro → Ultra</div>
                    <div className="text-xs text-slate-400 mt-1">Heaviest users</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleProToUltra}
                      onChange={(e) => setToggleProToUltra(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Pro to Ultra"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">Number of users to upgrade</div>
                  <div className="mt-2">
                    <StepNumber value={proUltraUsers} onChange={setProUltraUsers} min={0} max={5000} ariaLabel="Ultra users" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Price delta modeled as ${CURSOR_ULTRA_PRICE_MONTHLY}/mo vs ${CURSOR_PRO_PRICE_MONTHLY}/mo ⇒ ${CURSOR_ULTRA_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY}/mo incremental.
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.proUltraAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Productivity boost: modeled as relative +{(tab3.proUltraAdditionalRelativeBoost * 100).toFixed(0)}% for upgraded users.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-100">Section B: Add-on — Bugbot</div>
            <div className="mt-1 text-xs text-slate-400">Estimate time saved from automated bug detection and PR-level code review.</div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="text-xs text-slate-400">Number of Bugbot seats</div>
                <div className="mt-3">
                  <StepNumber value={bugbotSeats} onChange={setBugbotSeats} min={0} max={5000} ariaLabel="Bugbot seats" />
                </div>
                <div className="mt-2 text-xs text-slate-400">Price: $40/user/month (annual billing discount applies)</div>
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <Slider
                  value={bugbotReviewTimeReductionPct}
                  min={10}
                  max={50}
                  step={1}
                  label="Estimated reduction in code review time"
                  unit="%"
                  onChange={setBugbotReviewTimeReductionPct}
                  ariaLabel="Bugbot review time reduction"
                  minLabel="10%"
                  maxLabel="50%"
                />

                <div className="mt-4 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Benefits (highlight only)</div>
                  <div className="mt-2 space-y-1">
                    <div>• AI code review on GitHub PRs</div>
                    <div>• Automated bug detection</div>
                    <div>• Estimated reduction in code review time (modeled above)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard label="Annual Bugbot cost" value={formatUSD(tab3.bugbotAnnualCost)} sub={`${bugbotSeats} seats × $${BUGBOT_PRICE_MONTHLY}/mo`} />
              <MetricCard
                label="Hours saved per developer per week"
                value={`${tab3.hoursSavedPerDevPerWeek.toFixed(1)}h`}
                sub="Review time saved"
              />
              <MetricCard
                label="Annual review hours saved"
                value={`${formatInt(tab3.totalAnnualReviewHoursSaved)}h`}
                sub="Bugbot-scoped review time"
                tone="good"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400">Dollar value of review time saved</div>
              <div className="mt-1 text-sm font-semibold text-emerald-300">{formatUSD(tab3.bugbotAnnualValue)}</div>
              <div className="mt-2 text-[11px] text-slate-400">
                Modeled as review hours saved × blended hourly rate (salary / {WORK_HOURS_PER_YEAR}h). Confidence mode scales the time-savings estimate.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#070813]/60 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-base font-semibold text-slate-100">Section C: Combined Upsell Summary</div>
                <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                  Upgrading {customerName} via{" "}
                  <span className="font-semibold">
                    {[
                      toggleTeamsToEnterprise ? "Enterprise" : null,
                      toggleProToProPlus ? `Pro+ (${proPlusUsers} power users)` : null,
                      toggleProToUltra ? `Ultra (${proUltraUsers} users)` : null,
                      bugbotSeats > 0 ? `Bugbot (${bugbotSeats} developers)` : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "no changes selected"}
                  </span>{" "}
                  would increase annual investment by{" "}
                  <span className="text-slate-50 font-semibold">{formatUSD(tab3.combinedAdditionalAnnualInvestment)}</span> while generating an estimated{" "}
                  <span className="text-emerald-300 font-semibold">{formatUSD(tab3.combinedAdditionalAnnualValue)}</span> in additional value.
                </div>
              </div>

              <div className="w-full md:w-[380px]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Combined ROI impact</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">{tab3.combinedRoiMultiple.toFixed(1)}x overall ROI multiple</div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Combined net (value − investment):{" "}
                    <span className={tab3.combinedNet >= 0 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
                      {tab3.combinedNet >= 0 ? "+" : ""}
                      {formatUSD(tab3.combinedNet)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard label="Total additional annual investment" value={formatUSD(tab3.combinedAdditionalAnnualInvestment)} sub="All enabled toggles + Bugbot" />
              <MetricCard label="Total additional annual value generated" value={formatUSD(tab3.combinedAdditionalAnnualValue)} sub="Incremental value only" tone="good" />
              <MetricCard
                hero
                label="Combined annual ROI multiple"
                value={`${tab3.combinedRoiMultiple.toFixed(1)}x`}
                sub={`Base ROI: ${tab1.roiMultiple.toFixed(1)}x`}
                tone={tab3.combinedRoiMultiple >= 1 ? "good" : "bad"}
              />
              <MetricCard
                label="Combined annual net ROI"
                value={`${tab3.combinedNet >= 0 ? "+" : ""}${formatUSD(tab3.combinedNet)}`}
                sub={`Base annual net: ${formatUSD(tab1.netRoi)}`}
                tone={tab3.combinedNet >= 0 ? "good" : "bad"}
              />
            </div>

            <div className="mt-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab3}
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#05060b] via-[#0a0b10] to-[#070813]" />
        <div aria-hidden="true" className="absolute -top-36 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
          {Header}
          {Tabs}

          <div className="mt-3">
            <div className="text-xs text-slate-400 mb-3">{tabTitle}</div>
            {tab === "roi" ? CurrentROI : tab === "expansion" ? TeamExpansion : Upsell}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EstimateMode = "conservative" | "moderate" | "aggressive";
type BillingCadence = "monthly" | "annual";
type CurrentPlan = "teams" | "enterprise";
type AICodingTool = "None" | "GitHub Copilot" | "Other";
type TabKey = "roi" | "expansion" | "upsell";

const WORK_HOURS_PER_YEAR = 2080;
const ANNUAL_BILLING_DISCOUNT = 0.2; // save 20%

// Default pricing reference (monthly prices)
const CURSOR_TEAMS_PRICE_MONTHLY = 40;
const CURSOR_PRO_PRICE_MONTHLY = 20;
const CURSOR_PRO_PLUS_PRICE_MONTHLY = 60;
const CURSOR_ULTRA_PRICE_MONTHLY = 200;

const BUGBOT_PRICE_MONTHLY = 40;

const DEFAULT_ENTERPRISE_PRICE_MONTHLY = 60; // per-seat

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatUSD(value: number, maxFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatInt(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function estimateModeMultiplier(mode: EstimateMode) {
  switch (mode) {
    case "conservative":
      return 0.6;
    case "aggressive":
      return 1.4;
    case "moderate":
    default:
      return 1;
  }
}

function replacedToolProductivityReductionPoints(tool: AICodingTool) {
  switch (tool) {
    case "GitHub Copilot":
      return 10; // reduce by 10 percentage points
    case "Other":
      return 5; // reduce by 5 percentage points
    case "None":
    default:
      return 0;
  }
}

async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function SegmentedControl<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
      {props.options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => props.onChange(opt.value)}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-r from-brand-500/25 to-fuchsia-500/20 text-slate-50 shadow-glow"
                : "text-slate-300 hover:text-slate-100",
            ].join(" ")}
            aria-pressed={active}
            aria-label={opt.label}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
  hero?: boolean;
}) {
  const toneStyles =
    props.tone === "good"
      ? "text-emerald-400"
      : props.tone === "bad"
        ? "text-rose-400"
        : "text-slate-50";

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm transition-all duration-300 sm:p-5">
      {props.hero ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-20 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/30 via-fuchsia-500/10 to-cyan-500/30 blur-3xl" />
        </div>
      ) : null}

      <div className="relative">
        <div className="text-sm text-slate-300">{props.label}</div>
        <div
          className={[
            "mt-2 leading-none whitespace-nowrap font-semibold tracking-tight transition-all duration-300",
            "text-[clamp(1.15rem,2.9vw,2.05rem)]",
            toneStyles,
            props.hero ? "drop-shadow-[0_0_22px_rgba(99,102,241,0.35)]" : "",
          ].join(" ")}
        >
          {props.value}
        </div>
        {props.sub ? <div className="mt-1 text-sm text-slate-400">{props.sub}</div> : null}
      </div>
    </div>
  );
}

function StepNumber(props: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
}) {
  const step = props.step ?? 1;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
        onClick={() => props.onChange(clamp(props.value - step, props.min, props.max))}
        aria-label={`Decrease ${props.ariaLabel}`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        step={step}
        value={props.value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          props.onChange(clamp(next, props.min, props.max));
        }}
        className="h-10 flex-1 rounded-xl border border-white/10 bg-[#0a0b10] px-3 text-lg text-slate-50 outline-none transition focus:border-brand-400/40"
        aria-label={props.ariaLabel}
      />
      <button
        type="button"
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
        onClick={() => props.onChange(clamp(props.value + step, props.min, props.max))}
        aria-label={`Increase ${props.ariaLabel}`}
      >
        +
      </button>
    </div>
  );
}

function Slider(props: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (next: number) => void;
  ariaLabel: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  const step = props.step ?? 1;
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-slate-200">{props.label}</label>
        <div className="text-sm font-semibold text-brand-100">
          {props.value}
          {props.unit ? <span className="text-slate-400">{props.unit}</span> : null}
        </div>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-3 w-full accent-brand-500"
        aria-label={props.ariaLabel}
      />
      {props.minLabel || props.maxLabel ? (
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{props.minLabel ?? props.min}</span>
          <span>{props.maxLabel ?? props.max}</span>
        </div>
      ) : null}
    </div>
  );
}

function buildAssumptionsFooter(lines: string[]) {
  return lines.map((l) => `• ${l}`).join(" ");
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("roi");

  // Global features
  const [estimateMode, setEstimateMode] = useState<EstimateMode>("moderate");
  const [billingCadence, setBillingCadence] = useState<BillingCadence>("annual");

  // Shared customer inputs (Tab 1 -> Tab 2 persistence)
  const [customerName, setCustomerName] = useState<string>("Acme Corp");
  const [currentSeats, setCurrentSeats] = useState<number>(50);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>("teams");
  const [enterpriseSeatPriceMonthly, setEnterpriseSeatPriceMonthly] = useState<number>(
    DEFAULT_ENTERPRISE_PRICE_MONTHLY,
  );
  const [salaryAnnual, setSalaryAnnual] = useState<number>(165_000);
  const [codingTimePct, setCodingTimePct] = useState<number>(40);
  const [adoptionRatePct, setAdoptionRatePct] = useState<number>(70);
  const [perceivedProductivityGainPct, setPerceivedProductivityGainPct] = useState<number>(30);
  const [replacedTool, setReplacedTool] = useState<AICodingTool>("None");

  // Tab 2: team expansion
  const [expansionTeamLabel, setExpansionTeamLabel] = useState<string>("Platform Engineering team");
  const [newSeats, setNewSeats] = useState<number>(25);
  const [newTeamInitialAdoptionPct, setNewTeamInitialAdoptionPct] = useState<number>(50);
  const [newTeamAdoptionAt6Pct, setNewTeamAdoptionAt6Pct] = useState<number>(75);
  const [newTeamAdoptionAt12Pct, setNewTeamAdoptionAt12Pct] = useState<number>(85);
  const [newTeamSalaryAnnual, setNewTeamSalaryAnnual] = useState<number>(165_000);
  const [rampMonths, setRampMonths] = useState<number>(2); // 1-3 months

  // Tab 3: SKU upsell
  const [toggleTeamsToEnterprise, setToggleTeamsToEnterprise] = useState<boolean>(false);
  const [enterpriseUpgradeSeatPriceMonthly, setEnterpriseUpgradeSeatPriceMonthly] = useState<number>(
    DEFAULT_ENTERPRISE_PRICE_MONTHLY,
  );
  const [toggleProToProPlus, setToggleProToProPlus] = useState<boolean>(false);
  const [proPlusUsers, setProPlusUsers] = useState<number>(10);
  const [toggleProToUltra, setToggleProToUltra] = useState<boolean>(false);
  const [proUltraUsers, setProUltraUsers] = useState<number>(3);

  const [bugbotSeats, setBugbotSeats] = useState<number>(20);
  const [bugbotReviewTimeReductionPct, setBugbotReviewTimeReductionPct] = useState<number>(30);

  const confidenceMult = useMemo(() => estimateModeMultiplier(estimateMode), [estimateMode]);
  const annualBillingPriceMult = billingCadence === "annual" ? 1 - ANNUAL_BILLING_DISCOUNT : 1;

  const gainReductionPoints = useMemo(
    () => replacedToolProductivityReductionPoints(replacedTool),
    [replacedTool],
  );
  const gainNoConfidencePct = useMemo(
    () => clamp(perceivedProductivityGainPct - gainReductionPoints, 0, 100),
    [perceivedProductivityGainPct, gainReductionPoints],
  );
  const gainEffectivePct = useMemo(
    () => clamp(gainNoConfidencePct * confidenceMult, 0, 100),
    [gainNoConfidencePct, confidenceMult],
  );

  const currentSeatMonthlyPrice = useMemo(() => {
    return currentPlan === "teams" ? CURSOR_TEAMS_PRICE_MONTHLY : enterpriseSeatPriceMonthly;
  }, [currentPlan, enterpriseSeatPriceMonthly]);

  const currentSeatMonthlyPriceAfterBilling = useMemo(() => {
    return currentSeatMonthlyPrice * annualBillingPriceMult;
  }, [currentSeatMonthlyPrice, annualBillingPriceMult]);

  // Tab 1: Current ROI
  const tab1 = useMemo(() => {
    const annualSpend = currentSeats * currentSeatMonthlyPriceAfterBilling * 12;
    const hourlyRate = salaryAnnual / WORK_HOURS_PER_YEAR;

    // Interpreting the spec literally: adoption rate weights expected coding time per seat.
    const annualCodingHoursPerActiveUser = WORK_HOURS_PER_YEAR * (codingTimePct / 100) * (adoptionRatePct / 100);
    const hoursSavedPerActiveUserPerYear =
      annualCodingHoursPerActiveUser * (gainEffectivePct / 100);

    const totalHoursSavedAcrossAllActiveUsers = hoursSavedPerActiveUserPerYear * currentSeats;
    const annualValueSaved = totalHoursSavedAcrossAllActiveUsers * hourlyRate;

    const netRoi = annualValueSaved - annualSpend;
    const roiMultiple = annualSpend > 0 ? annualValueSaved / annualSpend : 0;

    return {
      annualSpend,
      hourlyRate,
      annualCodingHoursPerActiveUser,
      hoursSavedPerActiveUserPerYear,
      totalHoursSavedAcrossAllActiveUsers: totalHoursSavedAcrossAllActiveUsers,
      annualValueSaved,
      netRoi,
      roiMultiple,
    };
  }, [
    annualBillingPriceMult,
    currentSeats,
    currentSeatMonthlyPriceAfterBilling,
    salaryAnnual,
    codingTimePct,
    adoptionRatePct,
    gainEffectivePct,
  ]);

  // Tab 2: Expansion
  const tab2 = useMemo(() => {
    const newTeamHourlyRate = newTeamSalaryAnnual / WORK_HOURS_PER_YEAR;

    const newMonthlyCost = newSeats * currentSeatMonthlyPriceAfterBilling;
    const additionalAnnualCost = newMonthlyCost * 12;

    const existingMonthlyValue = tab1.annualValueSaved / 12;
    const existingMonthlyCost = tab1.annualSpend / 12;

    const ramp = clamp(rampMonths, 1, 3);

    const getNewAdoptionPct = (m: number) => {
      // m in 1..12
      if (m <= 6) {
        const t = m / 6;
        return newTeamInitialAdoptionPct + (newTeamAdoptionAt6Pct - newTeamInitialAdoptionPct) * t;
      }
      const t = (m - 6) / 6;
      return newTeamAdoptionAt6Pct + (newTeamAdoptionAt12Pct - newTeamAdoptionAt6Pct) * t;
    };

    const getProductivityRampFactor = (m: number) => {
      // reach full productivity gain at rampMonths
      return clamp(m / ramp, 0, 1);
    };

    const months = Array.from({ length: 13 }, (_, i) => i); // 0..12
    const rows = months.map((m) => {
      const cumulativeNewCost = newMonthlyCost * m;

      let cumulativeNewSavings = 0;
      for (let mm = 1; mm <= m; mm++) {
        const adoptionPct = getNewAdoptionPct(mm);
        const rampFactor = getProductivityRampFactor(mm);
        const effectiveGainPct = gainEffectivePct * rampFactor;

        const monthlyHoursSavedPerSeat =
          (WORK_HOURS_PER_YEAR / 12) * (codingTimePct / 100) * (adoptionPct / 100) * (effectiveGainPct / 100);

        const monthlyValueSaved = monthlyHoursSavedPerSeat * newTeamHourlyRate * newSeats;
        cumulativeNewSavings += monthlyValueSaved;
      }

      const combinedCost = existingMonthlyCost * m + cumulativeNewCost;
      const combinedValue = existingMonthlyValue * m + cumulativeNewSavings;
      const combinedRoiMultiple = combinedCost > 0 ? combinedValue / combinedCost : 0;

      return {
        month: m,
        cumulativeNewCost,
        cumulativeNewSavings,
        combinedRoiMultiple,
      };
    });

    const atMonth = (mm: number) => rows.find((r) => r.month === mm)!;
    const savingsM3 = atMonth(3).cumulativeNewSavings;
    const savingsM6 = atMonth(6).cumulativeNewSavings;
    const savingsM12 = atMonth(12).cumulativeNewSavings;

    const breakevenMonth = (() => {
      for (const r of rows) {
        if (r.month === 0) continue;
        if (r.cumulativeNewSavings >= r.cumulativeNewCost && r.cumulativeNewCost > 0) return r.month;
      }
      return null;
    })();

    const combinedRoiAt12 = atMonth(12).combinedRoiMultiple;
    const baseRoiAt12 = tab1.roiMultiple;

    const newValueWithin12Months = savingsM12;

    return {
      newMonthlyCost,
      additionalAnnualCost,
      rows,
      savingsM3,
      savingsM6,
      savingsM12,
      breakevenMonth,
      combinedRoiAt12,
      baseRoiAt12,
      newValueWithin12Months,
    };
  }, [
    newTeamSalaryAnnual,
    newSeats,
    currentSeatMonthlyPriceAfterBilling,
    tab1.annualValueSaved,
    tab1.annualSpend,
    tab1.roiMultiple,
    rampMonths,
    newTeamInitialAdoptionPct,
    newTeamAdoptionAt6Pct,
    newTeamAdoptionAt12Pct,
    gainEffectivePct,
    codingTimePct,
    yearSafe(currentSeats), // keep memo stable with shared input
  ]);

  // A dummy function to prevent lint warnings about exhaustive deps; value is unused.
  function yearSafe(v: number) {
    return safeNumber(v, 0);
  }

  // Tab 3: SKU Upsell
  const tab3 = useMemo(() => {
    const hourlyRate = tab1.hourlyRate;
    const annualCodingHoursPerActiveUser =
      WORK_HOURS_PER_YEAR * (codingTimePct / 100) * (adoptionRatePct / 100);

    const discount = annualBillingPriceMult;

    const baseGainPct = gainEffectivePct;
    const baseGainNoConfidence = gainNoConfidencePct;

    const proPlusAdditionalRelativeBoost = 0.125; // model as mid-point of 10-15%
    const proUltraAdditionalRelativeBoost = 0.20; // model as 20% additional boost

    const gainProPlusEffectivePct = clamp(
      clamp(baseGainNoConfidence * (1 + proPlusAdditionalRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );
    const gainUltraEffectivePct = clamp(
      clamp(baseGainNoConfidence * (1 + proUltraAdditionalRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );

    // Teams -> Enterprise: only cost delta (benefits are operational, not modeled as extra coding productivity)
    const enterpriseUpgradeDeltaMonthly = Math.max(
      0,
      enterpriseUpgradeSeatPriceMonthly * discount - CURSOR_TEAMS_PRICE_MONTHLY * discount,
    );
    const enterpriseAdditionalAnnualInvestment =
      toggleTeamsToEnterprise && currentPlan === "teams"
        ? currentSeats * enterpriseUpgradeDeltaMonthly * 12
        : toggleTeamsToEnterprise && currentPlan === "enterprise"
          ? 0
          : 0;

    const enterpriseAdditionalAnnualValue = 0;

    // Pro -> Pro+
    const proPlusIncrementalMonthly = Math.max(
      0,
      (CURSOR_PRO_PLUS_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * discount,
    );
    const proPlusAdditionalAnnualInvestment =
      toggleProToProPlus ? proPlusUsers * proPlusIncrementalMonthly * 12 : 0;

    const baseHoursSavedPerSeatAnnual =
      annualCodingHoursPerActiveUser * (baseGainPct / 100);
    const proPlusHoursSavedPerSeatAnnual =
      annualCodingHoursPerActiveUser * (gainProPlusEffectivePct / 100);
    const proPlusAdditionalAnnualValue = toggleProToProPlus
      ? proPlusUsers * (proPlusHoursSavedPerSeatAnnual - baseHoursSavedPerSeatAnnual) * hourlyRate
      : 0;

    // Pro -> Ultra
    const proUltraIncrementalMonthly = Math.max(
      0,
      (CURSOR_ULTRA_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * discount,
    );
    const proUltraAdditionalAnnualInvestment =
      toggleProToUltra ? proUltraUsers * proUltraIncrementalMonthly * 12 : 0;

    const ultraHoursSavedPerSeatAnnual =
      annualCodingHoursPerActiveUser * (gainUltraEffectivePct / 100);
    const proUltraAdditionalAnnualValue = toggleProToUltra
      ? proUltraUsers * (ultraHoursSavedPerSeatAnnual - baseHoursSavedPerSeatAnnual) * hourlyRate
      : 0;

    // Bugbot add-on
    const bugbotIncrementalMonthly = BUGBOT_PRICE_MONTHLY * discount;
    const bugbotAnnualCost = toggleTeamsToEnterprise || toggleProToProPlus || toggleProToUltra || bugbotSeats > 0
      ? bugbotSeats * bugbotIncrementalMonthly * 12
      : bugbotSeats * bugbotIncrementalMonthly * 12;

    // Confidence affects estimate strength for productivity-related time savings.
    const effectiveReviewReductionPct = clamp(bugbotReviewTimeReductionPct * confidenceMult, 0, 100);
    const baselineCodeReviewHoursPerDevPerWeek = 4; // assumed baseline average review time
    const hoursSavedPerDevPerWeek = baselineCodeReviewHoursPerDevPerWeek * (effectiveReviewReductionPct / 100);
    const totalAnnualReviewHoursSaved = bugbotSeats * hoursSavedPerDevPerWeek * 52;
    const bugbotAnnualValue = totalAnnualReviewHoursSaved * hourlyRate;

    const combinedAdditionalAnnualInvestment =
      enterpriseAdditionalAnnualInvestment +
      proPlusAdditionalAnnualInvestment +
      proUltraAdditionalAnnualInvestment +
      bugbotAnnualCost;

    const combinedAdditionalAnnualValue =
      enterpriseAdditionalAnnualValue +
      proPlusAdditionalAnnualValue +
      proUltraAdditionalAnnualValue +
      bugbotAnnualValue;

    const baseAnnualInvestment = tab1.annualSpend;
    const baseAnnualValue = tab1.annualValueSaved;

    const combinedAnnualInvestment = baseAnnualInvestment + combinedAdditionalAnnualInvestment;
    const combinedAnnualValue = baseAnnualValue + combinedAdditionalAnnualValue;
    const combinedNet = combinedAnnualValue - combinedAnnualInvestment;
    const combinedRoiMultiple = combinedAnnualInvestment > 0 ? combinedAnnualValue / combinedAnnualInvestment : 0;

    return {
      // Enterprise
      enterpriseAdditionalAnnualInvestment,
      enterpriseAdditionalAnnualValue,

      // Pro+
      proPlusAdditionalAnnualInvestment,
      proPlusAdditionalAnnualValue,
      gainProPlusEffectivePct,

      // Ultra
      proUltraAdditionalAnnualInvestment,
      proUltraAdditionalAnnualValue,
      gainUltraEffectivePct,

      // Bugbot
      bugbotAnnualCost,
      hoursSavedPerDevPerWeek,
      totalAnnualReviewHoursSaved,
      bugbotAnnualValue,

      // Combined
      combinedAdditionalAnnualInvestment,
      combinedAdditionalAnnualValue,
      combinedAnnualInvestment,
      combinedAnnualValue,
      combinedNet,
      combinedRoiMultiple,

      // For transparency
      proPlusAdditionalRelativeBoost,
      proUltraAdditionalRelativeBoost,
      baselineCodeReviewHoursPerDevPerWeek,
    };
  }, [
    tab1.hourlyRate,
    tab1.annualSpend,
    tab1.annualValueSaved,
    codingTimePct,
    adoptionRatePct,
    annualBillingPriceMult,
    gainEffectivePct,
    gainNoConfidencePct,
    confidenceMult,
    toggleTeamsToEnterprise,
    currentPlan,
    currentSeats,
    enterpriseUpgradeSeatPriceMonthly,
    toggleProToProPlus,
    proPlusUsers,
    toggleProToUltra,
    proUltraUsers,
    bugbotSeats,
    bugbotReviewTimeReductionPct,
  ]);

  const tabTitle = useMemo(() => {
    return `Cursor Account Intelligence — ${customerName}`;
  }, [customerName]);

  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  const summaryText = useMemo(() => {
    const modeLabel = estimateMode === "conservative" ? "Conservative" : estimateMode === "aggressive" ? "Aggressive" : "Moderate";
    const billingLabel = billingCadence === "annual" ? "Annual billing (20% off)" : "Monthly billing";

    if (tab === "roi") {
      const roiMultiple = tab1.roiMultiple;
      const sentence = `${customerName}'s ${currentSeats} Cursor seats are generating an estimated ${formatUSD(tab1.annualValueSaved)} in annual productivity value against a ${formatUSD(
        tab1.annualSpend,
      )} investment — a ${roiMultiple.toFixed(1)}x return.`;
      return [
        `Cursor Account Intelligence (${modeLabel}; ${billingLabel})`,
        "",
        sentence,
        "",
        `Effective hourly rate: ${formatUSD(tab1.hourlyRate, 2)} (salary / ${WORK_HOURS_PER_YEAR}h)`,
        `Annual coding hours per active user: ${formatInt(tab1.annualCodingHoursPerActiveUser)}h`,
        `Hours saved per active user / year: ${formatInt(tab1.hoursSavedPerActiveUserPerYear)}h`,
        `Total hours saved / year: ${formatInt(tab1.totalHoursSavedAcrossAllActiveUsers)}h`,
        `Net ROI: ${formatUSD(tab1.netRoi)} (${tab1.netRoi >= 0 ? "+" : ""}${(tab1.annualSpend > 0 ? ((tab1.netRoi / tab1.annualSpend) * 100) : 0).toFixed(1)}% of spend)`,
      ].join("\n");
    }

    if (tab === "expansion") {
      const breakeven = tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`;
      const sentence = `Adding ${newSeats} seats for ${customerName}'s ${expansionTeamLabel} would cost ${formatUSD(tab2.additionalAnnualCost)} / year and is projected to generate ${formatUSD(
        tab2.newValueWithin12Months,
      )} in value within 12 months. Breakeven is expected at ${breakeven}. Combined account ROI would increase from ${tab2.baseRoiAt12.toFixed(1)}x to ${tab2.combinedRoiAt12.toFixed(
        1,
      )}x.`;
      return [
        `Cursor Account Intelligence — Team Expansion (${modeLabel}; ${billingLabel})`,
        "",
        sentence,
        "",
        `Projected new-team savings:`,
        `Month 3: ${formatUSD(tab2.savingsM3)}`,
        `Month 6: ${formatUSD(tab2.savingsM6)}`,
        `Month 12: ${formatUSD(tab2.savingsM12)}`,
      ].join("\n");
    }

    // upsell
    const actions: string[] = [];
    if (toggleTeamsToEnterprise) actions.push("Enterprise upgrade");
    if (toggleProToProPlus) actions.push(`moving ${proPlusUsers} Pro power users to Pro+`);
    if (toggleProToUltra) actions.push(`moving ${proUltraUsers} Pro users to Ultra`);
    if (bugbotSeats > 0) actions.push(`adding Bugbot for ${bugbotSeats} developers`);

    const investmentDelta = tab3.combinedAdditionalAnnualInvestment;
    const valueDelta = tab3.combinedAdditionalAnnualValue;

    const sentence = `Upgrading ${customerName} via ${actions.join(", ")} would increase annual investment by ${formatUSD(
      investmentDelta,
    )} while generating an estimated ${formatUSD(valueDelta)} in additional value. Combined ROI impact: ${tab3.combinedRoiMultiple.toFixed(1)}x overall ROI multiple (incremental net: ${formatUSD(
      tab3.combinedNet,
    )}).`;

    return [
      `Cursor Account Intelligence — SKU Upsell (${modeLabel}; ${billingLabel})`,
      "",
      sentence,
      "",
      `Additional annual investment breakdown:`,
      `Enterprise (Teams -> Enterprise): ${formatUSD(tab3.enterpriseAdditionalAnnualInvestment)}`,
      `Pro -> Pro+: ${formatUSD(tab3.proPlusAdditionalAnnualInvestment)} (effective productivity gain: ${tab3.gainProPlusEffectivePct.toFixed(
        1,
      )}% vs base ${gainEffectivePct.toFixed(1)}%)`,
      `Pro -> Ultra: ${formatUSD(tab3.proUltraAdditionalAnnualInvestment)} (effective productivity gain: ${tab3.gainUltraEffectivePct.toFixed(1)}% vs base ${gainEffectivePct.toFixed(
        1,
      )}%)`,
      `Bugbot: ${formatUSD(tab3.bugbotAnnualCost)} (value: ${formatUSD(tab3.bugbotAnnualValue)})`,
    ].join("\n");
  }, [
    tab,
    tab1,
    tab2,
    tab3,
    estimateMode,
    billingCadence,
    customerName,
    currentSeats,
    gainEffectivePct,
    newSeats,
    expansionTeamLabel,
    toggleTeamsToEnterprise,
    toggleProToProPlus,
    proPlusUsers,
    toggleProToUltra,
    proUltraUsers,
    bugbotSeats,
  ]);

  async function copySummary() {
    try {
      await copyTextToClipboard(summaryText);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = summaryText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyState("ok");
        window.setTimeout(() => setCopyState("idle"), 1200);
      } catch {
        setCopyState("fail");
        window.setTimeout(() => setCopyState("idle"), 1600);
      }
    }
  }

  const confidenceOptions = useMemo(
    () => [
      { value: "conservative" as const, label: "Conservative" },
      { value: "moderate" as const, label: "Moderate" },
      { value: "aggressive" as const, label: "Aggressive" },
    ],
    [],
  );

  const billingOptions = useMemo(
    () => [
      { value: "monthly" as const, label: "Monthly" },
      { value: "annual" as const, label: "Annual (20% off)" },
    ],
    [],
  );

  const netTone = tab1.netRoi >= 0 ? "good" : "bad";

  const barChartData = useMemo(() => {
    return [
      {
        name: "Year 1",
        cursorInvestment: tab1.annualSpend,
        timeValueSaved: tab1.annualValueSaved,
      },
    ];
  }, [tab1.annualSpend, tab1.annualValueSaved]);

  const newSeatsChartBreakevenMonth = tab2.breakevenMonth;

  const assumptionsTab1 = useMemo(() => {
    return buildAssumptionsFooter([
      `${WORK_HOURS_PER_YEAR} working hours/year`,
      "productivity gain applies only to coding time",
      "adoption rate weights expected coding time per seat (expected value model)",
      `productivity gain reduced vs "${replacedTool}" by ${gainReductionPoints} points`,
      `confidence mode multiplies productivity gains by ${confidenceMult}`,
    ]);
  }, [
      replacedTool,
      gainReductionPoints,
      confidenceMult,
    ]);

  const assumptionsTab2 = useMemo(() => {
    return buildAssumptionsFooter([
      "new-team adoption ramps linearly to targets at 6 and 12 months",
      "productivity gain ramps to full over the selected 1–3 month period",
      `confidence mode multiplies productivity gains by ${confidenceMult}`,
      `base productivity gain is ${gainNoConfidencePct.toFixed(1)}% (before confidence) and ${gainEffectivePct.toFixed(1)}% (effective)`,
      "existing account savings are assumed constant across the year",
    ]);
  }, [confidenceMult, gainNoConfidencePct, gainEffectivePct]);

  const assumptionsTab3 = useMemo(() => {
    return buildAssumptionsFooter([
      "Enterprise upgrade models cost only (operational benefits listed, not converted into productivity delta)",
      "Pro+ productivity boost modeled as 12.5% relative additional gain (mid-point of 10–15%)",
      "Ultra productivity boost modeled as 20% relative additional gain",
      `Bugbot review-time baseline assumed ${tab3.baselineCodeReviewHoursPerDevPerWeek} hours/dev/week`,
      `Bugbot time savings reduction is multiplied by confidence (${confidenceMult})`,
    ]);
  }, [tab3.baselineCodeReviewHoursPerDevPerWeek, confidenceMult]);

  const Header = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500/30 via-fuchsia-500/15 to-cyan-500/20 shadow-glow" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cursor Account Intelligence</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          A data-dense, client-ready ROI model for Cursor deployment QBRs.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <div className="w-full sm:w-[440px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-400 mb-1">Estimate confidence</div>
              <SegmentedControl<EstimateMode>
                value={estimateMode}
                onChange={setEstimateMode}
                options={confidenceOptions}
                ariaLabel="Estimate confidence"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Billing</div>
              <SegmentedControl<BillingCadence>
                value={billingCadence}
                onChange={setBillingCadence}
                options={billingOptions}
                ariaLabel="Billing cadence"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 w-full sm:w-auto">
          <div className="text-xs text-slate-400">Export</div>
          <button
            type="button"
            onClick={copySummary}
            className="mt-2 w-full sm:w-44 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
            aria-label="Copy Summary"
          >
            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy Summary"}
          </button>
          <div className="mt-1 text-xs text-slate-400">Clipboard-ready for email/Slack</div>
        </div>
      </div>
    </header>
  );

  const Tabs = (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "roi" as const, label: "Current ROI" },
              { key: "expansion" as const, label: "Team Expansion" },
              { key: "upsell" as const, label: "SKU Upsell" },
            ] as Array<{ key: TabKey; label: string }>
          ).map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border-brand-400/40 bg-gradient-to-r from-brand-500/20 to-fuchsia-500/10 text-slate-100 shadow-glow"
                    : "border-white/10 bg-white/5 text-slate-300 hover:text-slate-100",
                ].join(" ")}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs text-slate-400">Current account</div>
          <div className="mt-1 text-sm font-semibold text-slate-100">
            {customerName} · {currentSeats} seats ·{" "}
            {currentPlan === "teams" ? "Teams" : "Enterprise"}
          </div>
        </div>
      </div>
    </div>
  );

  const CurrentROI = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="text-base font-semibold text-slate-100">Inputs</div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-200">Customer name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Customer name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-200">Current Cursor seats</div>
                <div className="text-xs text-slate-400 mt-1">Licenses currently active in this account</div>
              </div>
              <div className="text-sm font-semibold text-brand-100">{currentSeats}</div>
            </div>
            <div className="mt-3">
              <StepNumber
                value={currentSeats}
                onChange={setCurrentSeats}
                min={1}
                max={5000}
                step={1}
                ariaLabel="Cursor seats"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Current plan</label>
            <select
              value={currentPlan}
              onChange={(e) => setCurrentPlan(e.target.value as CurrentPlan)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Current plan"
            >
              <option value="teams">Teams at $40/user/month</option>
              <option value="enterprise">Enterprise (custom per-seat price)</option>
            </select>
            {currentPlan === "enterprise" ? (
              <div className="mt-4">
                <Slider
                  value={enterpriseSeatPriceMonthly}
                  min={30}
                  max={200}
                  step={1}
                  label="Enterprise per-seat price"
                  unit="/mo"
                  onChange={setEnterpriseSeatPriceMonthly}
                  ariaLabel="Enterprise per-seat monthly price"
                  minLabel="$30"
                  maxLabel="$200"
                />
              </div>
            ) : null}
          </div>

          <Slider
            value={salaryAnnual}
            min={80_000}
            max={400_000}
            step={5000}
            label="Average developer salary"
            unit="/yr"
            onChange={setSalaryAnnual}
            ariaLabel="Average developer salary"
            minLabel="$80k"
            maxLabel="$400k"
          />

          <Slider
            value={codingTimePct}
            min={10}
            max={80}
            step={1}
            label="% of dev time spent coding"
            unit="%"
            onChange={setCodingTimePct}
            ariaLabel="Coding time percentage"
            minLabel="10%"
            maxLabel="80%"
          />

          <Slider
            value={adoptionRatePct}
            min={20}
            max={100}
            step={1}
            label="Average adoption rate (weekly)"
            unit="%"
            onChange={setAdoptionRatePct}
            ariaLabel="Adoption rate"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={perceivedProductivityGainPct}
            min={10}
            max={55}
            step={1}
            label="Perceived productivity gain"
            unit="%"
            onChange={setPerceivedProductivityGainPct}
            ariaLabel="Perceived productivity gain"
            minLabel="10%"
            maxLabel="55%"
          />

          <div>
            <label className="text-sm font-medium text-slate-200">Current AI tool replaced</label>
            <select
              value={replacedTool}
              onChange={(e) => setReplacedTool(e.target.value as AICodingTool)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Current AI tool replaced"
            >
              <option value="None">None</option>
              <option value="GitHub Copilot">GitHub Copilot</option>
              <option value="Other">Other</option>
            </select>
            <div className="mt-2 text-xs text-slate-400">
              Incremental gain adjustment: subtract <span className="text-slate-200 font-semibold">{gainReductionPoints}</span>{" "}
              percentage points from the perceived gain.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Estimated ROI summary</div>
            <div className="mt-2 text-sm text-slate-200 leading-relaxed">
              {customerName}'s {currentSeats} Cursor seats are generating an estimated{" "}
              <span className="text-emerald-300 font-semibold">{formatUSD(tab1.annualValueSaved)}</span>{" "}
              in annual productivity value against a{" "}
              <span className="text-slate-50 font-semibold">{formatUSD(tab1.annualSpend)}</span>{" "}
              investment —{" "}
              <span className={tab1.roiMultiple >= 1 ? "text-emerald-300" : "text-rose-300"} style={{ fontWeight: 700 }}>
                {tab1.roiMultiple.toFixed(1)}x
              </span>{" "}
              return.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Effective hourly rate per developer"
              value={formatUSD(tab1.hourlyRate, 2)}
              sub={`Salary / ${WORK_HOURS_PER_YEAR}h`}
              tone="neutral"
            />
            <MetricCard
              label="Annual coding hours per active user"
              value={`${formatInt(tab1.annualCodingHoursPerActiveUser)}h`}
              sub={`Coding% × adoption%`}
              tone="neutral"
            />
            <MetricCard
              label="Hours saved per active user per year"
              value={`${formatInt(tab1.hoursSavedPerActiveUserPerYear)}h`}
              sub={`Applied productivity gain`}
              tone="neutral"
            />

            <MetricCard
              label="Total hours saved across all active users"
              value={`${formatInt(tab1.totalHoursSavedAcrossAllActiveUsers)}h`}
              sub={`${currentSeats} seats`}
              tone="neutral"
            />
            <MetricCard
              label="Dollar value of time saved"
              value={formatUSD(tab1.annualValueSaved)}
              sub="Annual value saved"
              tone="good"
            />

            <MetricCard
              hero
              label="Net ROI"
              value={`${tab1.netRoi >= 0 ? "+" : ""}${formatUSD(tab1.netRoi)}`}
              sub={`ROI multiple: ${tab1.roiMultiple.toFixed(1)}x`}
              tone={netTone}
            />
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-200">
              Annual Cursor spend: <span className="font-semibold">{formatUSD(tab1.annualSpend)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Modeled as {billingCadence === "annual" ? "annual billing (20% discount applied to per-seat monthly pricing)" : "monthly billing"}.
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Investment vs. time value</div>
                <div className="text-xs text-slate-400">Annual Cursor cost vs. annual value of saved engineering time</div>
              </div>
            </div>

            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 16, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                    formatter={(v: unknown) => formatUSD(Number(v))}
                    labelFormatter={() => ""}
                    cursor={{ fill: "rgba(99,102,241,0.10)" }}
                  />
                  <Bar
                    dataKey="cursorInvestment"
                    name="Cursor annual investment"
                    fill="rgba(99, 102, 241, 0.65)"
                    radius={[14, 14, 14, 14]}
                    barSize={64}
                  />
                  <Bar
                    dataKey="timeValueSaved"
                    name="Value of time saved"
                    fill="rgba(16, 185, 129, 0.75)"
                    radius={[14, 14, 14, 14]}
                    barSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab1}
          </div>
        </div>
      </section>
    </div>
  );

  const TeamExpansion = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="text-base font-semibold text-slate-100">Inputs</div>

        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-100">Base account (from Tab 1)</div>
            <div className="mt-2 text-xs text-slate-400">
              These feed the existing savings curve and the productivity gain assumptions.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-400">Current seats</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{currentSeats}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Current plan</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {currentPlan === "teams" ? "Teams ($40/user/mo)" : `Enterprise ($${enterpriseSeatPriceMonthly}/user/mo)`}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">% coding time</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{codingTimePct}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Adoption (existing)</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{adoptionRatePct}% weekly</div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Expansion team name (for summary)</label>
            <input
              type="text"
              value={expansionTeamLabel}
              onChange={(e) => setExpansionTeamLabel(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Expansion team label"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-200">Number of new seats to add</div>
                <div className="text-xs text-slate-400 mt-1">Added on the same plan as the current account</div>
              </div>
              <div className="text-sm font-semibold text-brand-100">{newSeats}</div>
            </div>
            <div className="mt-3">
              <StepNumber value={newSeats} onChange={setNewSeats} min={1} max={5000} ariaLabel="New seats" />
            </div>
          </div>

          <Slider
            value={newTeamInitialAdoptionPct}
            min={20}
            max={100}
            step={1}
            label="Expected initial adoption (new teams)"
            unit="%"
            onChange={setNewTeamInitialAdoptionPct}
            ariaLabel="New team initial adoption"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamAdoptionAt6Pct}
            min={20}
            max={100}
            step={1}
            label="Expected adoption at 6 months"
            unit="%"
            onChange={setNewTeamAdoptionAt6Pct}
            ariaLabel="New team adoption at 6 months"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamAdoptionAt12Pct}
            min={20}
            max={100}
            step={1}
            label="Expected adoption at 12 months"
            unit="%"
            onChange={setNewTeamAdoptionAt12Pct}
            ariaLabel="New team adoption at 12 months"
            minLabel="20%"
            maxLabel="100%"
          />

          <Slider
            value={newTeamSalaryAnnual}
            min={80_000}
            max={400_000}
            step={5000}
            label="New team's average salary"
            unit="/yr"
            onChange={setNewTeamSalaryAnnual}
            ariaLabel="New team salary"
            minLabel="$80k"
            maxLabel="$400k"
          />

          <div>
            <label className="text-sm font-medium text-slate-200">Ramp time to full productivity gain</label>
            <select
              value={rampMonths}
              onChange={(e) => setRampMonths(clamp(Number(e.target.value), 1, 3))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
              aria-label="Productivity ramp time"
            >
              <option value={1}>1 month</option>
              <option value={2}>2 months</option>
              <option value={3}>3 months</option>
            </select>
            <div className="mt-2 text-xs text-slate-400">
              Productivity gain is assumed to ramp linearly from 0 to full over this period.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Projected expansion economics</div>
            <div className="mt-2 text-sm text-slate-200 leading-relaxed">
              Adding {newSeats} seats for {customerName}'s{" "}
              <span className="font-semibold">{expansionTeamLabel}</span> would cost{" "}
              <span className="text-slate-50 font-semibold">{formatUSD(tab2.additionalAnnualCost)}</span>{" "}
              / year and is projected to generate{" "}
              <span className="text-emerald-300 font-semibold">{formatUSD(tab2.newValueWithin12Months)}</span>{" "}
              in value within 12 months. Breakeven is expected at{" "}
              <span className={tab2.breakevenMonth === null ? "text-slate-300" : "text-emerald-300 font-semibold"}>
                {tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`}
              </span>
              . Combined account ROI would increase from {tab2.baseRoiAt12.toFixed(1)}x to{" "}
              {tab2.combinedRoiAt12.toFixed(1)}x.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              label="Additional annual cost (new seats)"
              value={formatUSD(tab2.additionalAnnualCost)}
              sub={`${newSeats} seats · plan matches current account`}
              tone="neutral"
            />
            <MetricCard
              label="Projected savings at Month 6"
              value={formatUSD(tab2.savingsM6)}
              sub="Cumulative new-team savings"
              tone="good"
            />
            <MetricCard
              label="Time to breakeven (new seats)"
              value={tab2.breakevenMonth === null ? "—" : `Month ${tab2.breakevenMonth}`}
              sub="When cumulative savings exceed cost"
              tone={tab2.breakevenMonth === null ? "neutral" : "good"}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">New-team savings checkpoints</div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 3</div>
                <div className="text-sm text-emerald-300">{formatUSD(tab2.savingsM3)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 6</div>
                <div className="text-sm text-emerald-300">{formatUSD(tab2.savingsM6)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Month 12</div>
                <div className="text-sm text-emerald-300">{formatUSD(tab2.savingsM12)}</div>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Cumulative cost vs. value</div>
                <div className="text-xs text-slate-400">New seats (cost & savings) plus combined ROI over time</div>
              </div>
            </div>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={tab2.rows}
                  margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Months", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatUSD(v, 0)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}x`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                    formatter={(v: unknown, n: string) => {
                      const num = Number(v);
                      if (n.toLowerCase().includes("roi")) return `${num.toFixed(1)}x`;
                      return formatUSD(num);
                    }}
                    labelFormatter={(label) => `Month ${label}`}
                  />

                  {newSeatsChartBreakevenMonth !== null ? (
                    <ReferenceLine
                      x={newSeatsChartBreakevenMonth}
                      stroke="rgba(52,211,153,0.5)"
                      strokeDasharray="4 4"
                      label={{
                        position: "top",
                        value: `Breakeven`,
                        fill: "rgba(52,211,153,0.9)",
                        fontSize: 12,
                      }}
                    />
                  ) : null}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeNewCost"
                    name="Cumulative cost (new)"
                    stroke="rgba(99, 102, 241, 0.75)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeNewSavings"
                    name="Cumulative savings (new)"
                    stroke="rgba(16, 185, 129, 0.85)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="combinedRoiMultiple"
                    name="Combined ROI multiple"
                    stroke="rgba(59, 130, 246, 0.9)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab2}
          </div>
        </div>
      </section>
    </div>
  );

  const Upsell = (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6 lg:col-span-2">
        <div className="text-base font-semibold text-slate-100">SKU Upsell Modeling</div>

        <div className="mt-5 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Section A: Plan Upgrade Modeling</div>
                <div className="mt-1 text-xs text-slate-400">
                  Toggle scenarios on/off to add their incremental cost + value to the bottom summary.
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Productivity gain modeled vs. the same Cursor incremental gain baseline.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Teams -> Enterprise */}
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Teams → Enterprise</div>
                    <div className="text-xs text-slate-400 mt-1">Negotiated per-seat pricing</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleTeamsToEnterprise}
                      onChange={(e) => setToggleTeamsToEnterprise(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Teams to Enterprise"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">New Enterprise per-seat price</div>
                  <input
                    type="number"
                    value={enterpriseUpgradeSeatPriceMonthly}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setEnterpriseUpgradeSeatPriceMonthly(clamp(next, 30, 300));
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
                    aria-label="Enterprise upgrade per-seat price"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Default: $60/user/month. Annual billing toggle applies discount to the effective per-seat price.
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Benefits (not fully modeled)</div>
                  <div className="mt-2 space-y-1">
                    <div>• Pooled usage across org</div>
                    <div>• SAML/SSO</div>
                    <div>• Invoice billing</div>
                    <div>• Dedicated support</div>
                    <div>• Admin analytics dashboard</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.enterpriseAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Note: pooled usage can reduce waste from underutilizing individual credit pools.
                  </div>
                </div>
              </div>

              {/* Pro -> Pro+ */}
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Pro → Pro+</div>
                    <div className="text-xs text-slate-400 mt-1">Power users</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleProToProPlus}
                      onChange={(e) => setToggleProToProPlus(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Pro to Pro+"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">Users to upgrade</div>
                  <StepNumber
                    value={proPlusUsers}
                    onChange={setProPlusUsers}
                    min={0}
                    max={5000}
                    step={1}
                    ariaLabel="Pro+ users"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Price delta assumed: $40/user/month incremental ({formatUSD(CURSOR_PRO_PRICE_MONTHLY)}/mo → {formatUSD(CURSOR_PRO_PLUS_PRICE_MONTHLY)}/mo).
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.proPlusAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Estimated additional productivity boost modeled as +{(tab3.proPlusAdditionalRelativeBoost * 100).toFixed(1)}% relative for upgraded users.
                  </div>
                </div>
              </div>

              {/* Pro -> Ultra */}
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Pro → Ultra</div>
                    <div className="text-xs text-slate-400 mt-1">Heaviest users</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={toggleProToUltra}
                      onChange={(e) => setToggleProToUltra(e.target.checked)}
                      className="accent-brand-500"
                      aria-label="Toggle Pro to Ultra"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">Users to upgrade</div>
                  <StepNumber
                    value={proUltraUsers}
                    onChange={setProUltraUsers}
                    min={0}
                    max={5000}
                    step={1}
                    ariaLabel="Ultra users"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Price delta assumed: $180/user/month incremental ({formatUSD(CURSOR_PRO_PRICE_MONTHLY)}/mo → {formatUSD(CURSOR_ULTRA_PRICE_MONTHLY)}/mo).
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">Additional annual investment</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatUSD(tab3.proUltraAdditionalAnnualInvestment)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Estimated productivity boost modeled as +{(tab3.proUltraAdditionalRelativeBoost * 100).toFixed(0)}% relative for upgraded users.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Section B: Add-on — Bugbot</div>
                <div className="mt-1 text-xs text-slate-400">Estimate review time saved due to automated bug detection & review</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                <div className="text-xs text-slate-400">Number of Bugbot seats</div>
                <div className="mt-3">
                  <StepNumber value={bugbotSeats} onChange={setBugbotSeats} min={0} max={5000} ariaLabel="Bugbot seats" />
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Price: $40/user/month (annual billing discount applies)
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4 lg:col-span-2">
                <Slider
                  value={bugbotReviewTimeReductionPct}
                  min={10}
                  max={50}
                  step={1}
                  label="Estimated reduction in code review time"
                  unit="%"
                  onChange={setBugbotReviewTimeReductionPct}
                  ariaLabel="Bugbot review time reduction"
                  minLabel="10%"
                  maxLabel="50%"
                />

                <div className="mt-4 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Benefits</div>
                  <div className="mt-2 space-y-1">
                    <div>• AI code review on GitHub PRs</div>
                    <div>• Automated bug detection</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="Annual Bugbot cost"
                value={formatUSD(tab3.bugbotAnnualCost)}
                sub={`${bugbotSeats} seats × $${BUGBOT_PRICE_MONTHLY}/mo`}
              />
              <MetricCard
                label="Hours saved per developer per week"
                value={`${tab3.hoursSavedPerDevPerWeek.toFixed(1)}h`}
                sub="Review time saved"
                tone="neutral"
              />
              <MetricCard
                label="Annual review hours saved"
                value={`${formatInt(tab3.totalAnnualReviewHoursSaved)}h`}
                sub="Bugbot-scoped review time"
                tone="good"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400">Dollar value of review time saved</div>
              <div className="mt-1 text-sm font-semibold text-emerald-300">{formatUSD(tab3.bugbotAnnualValue)}</div>
              <div className="mt-2 text-[11px] text-slate-400">
                Modeled as review hours saved × blended hourly rate (salary / {WORK_HOURS_PER_YEAR}h). Confidence mode scales the time-savings estimate.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#070813]/60 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-base font-semibold text-slate-100">Section C: Combined Upsell Summary</div>
                <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                  Upgrading {customerName} via{" "}
                  <span className="font-semibold">
                    {[
                      toggleTeamsToEnterprise ? "Enterprise" : null,
                      toggleProToProPlus ? `Pro+ (${proPlusUsers} power users)` : null,
                      toggleProToUltra ? `Ultra (${proUltraUsers} users)` : null,
                      bugbotSeats > 0 ? `Bugbot (${bugbotSeats} developers)` : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "no changes selected"}
                  </span>{" "}
                  would increase annual investment by{" "}
                  <span className="text-slate-50 font-semibold">{formatUSD(tab3.combinedAdditionalAnnualInvestment)}</span>{" "}
                  while generating an estimated{" "}
                  <span className="text-emerald-300 font-semibold">{formatUSD(tab3.combinedAdditionalAnnualValue)}</span>{" "}
                  in additional value.
                </div>
              </div>

              <div className="w-full md:w-[380px]">
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-400">Combined ROI impact</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-300">
                      {tab3.combinedRoiMultiple.toFixed(1)}x overall ROI multiple
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      Combined net (value − investment):{" "}
                      <span className={tab3.combinedNet >= 0 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
                        {tab3.combinedNet >= 0 ? "+" : ""}
                        {formatUSD(tab3.combinedNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard
                label="Additional annual investment"
                value={formatUSD(tab3.combinedAdditionalAnnualInvestment)}
                sub="All enabled toggles + Bugbot"
                tone="neutral"
              />
              <MetricCard
                label="Additional annual value generated"
                value={formatUSD(tab3.combinedAdditionalAnnualValue)}
                sub="Incremental value only"
                tone="good"
              />
              <MetricCard
                hero
                label="Combined annual ROI multiple"
                value={`${tab3.combinedRoiMultiple.toFixed(1)}x`}
                sub={`Base ROI: ${tab1.roiMultiple.toFixed(1)}x`}
                tone={tab3.combinedRoiMultiple >= 1 ? "good" : "bad"}
              />
              <MetricCard
                label="Combined annual net ROI"
                value={`${tab3.combinedNet >= 0 ? "+" : ""}${formatUSD(tab3.combinedNet)}`}
                sub={`Base annual net: ${formatUSD(tab1.netRoi)}`}
                tone={tab3.combinedNet >= 0 ? "good" : "bad"}
              />
            </div>
          </div>

          <div className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab3}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#05060b] via-[#0a0b10] to-[#070813]" />
        <div aria-hidden="true" className="absolute -top-36 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
          {Header}
          {Tabs}

          <div className="mt-1">
            <div className="text-xs text-slate-400 mb-3">
              {tabTitle}
            </div>
            {tab === "roi" ? CurrentROI : tab === "expansion" ? TeamExpansion : Upsell}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type PrimaryStack =
  | "Python"
  | "JavaScript/TypeScript"
  | "Java"
  | "C++"
  | "Go"
  | "Rust"
  | "Other";

type AICodingTool = "None" | "GitHub Copilot" | "Other AI tool";
type EstimateMode = "conservative" | "moderate" | "aggressive";

const WORK_HOURS_PER_YEAR = 2080;
const CURSOR_PRICE_MONTHLY_USD = 40; // Cursor pricing can change; UI notes this below.

const formatUSD = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatUSD2 = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatInt = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

function useCountUp(target: number, durationMs = 650) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = value;
    const delta = target - startValue;
    const start = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const next = startValue + delta * easeOutCubic(t);
      setValue(next);

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function stackDisplayName(stack: PrimaryStack) {
  switch (stack) {
    case "JavaScript/TypeScript":
      return "TypeScript";
    default:
      return stack;
  }
}

function productivityGainPctFromTool(tool: AICodingTool) {
  switch (tool) {
    case "None":
      return 35;
    case "GitHub Copilot":
      return 15;
    case "Other AI tool":
      return 20;
  }
}

function estimateModeMultiplier(mode: EstimateMode) {
  switch (mode) {
    case "conservative":
      return 0.6;
    case "aggressive":
      return 1.4;
    case "moderate":
    default:
      return 1;
  }
}

function buildShareText(args: {
  teamSize: number;
  stack: PrimaryStack;
  aiTool: AICodingTool;
  estimateMode: EstimateMode;
  salaryAnnual: number;
  codeTimePercentage: number;
  hoursSavedPerDevPerWeek: number;
  totalHoursSavedPerYear: number;
  annualValueSaved: number;
  annualCursorCost: number;
  netRoi: number;
  roiPercentage: number;
}) {
  const modeLabel =
    args.estimateMode === "conservative"
      ? "Conservative"
      : args.estimateMode === "aggressive"
        ? "Aggressive"
        : "Moderate";

  const stackName = stackDisplayName(args.stack);
  const aiToolLabel = args.aiTool === "Other AI tool" ? "Other AI tool" : args.aiTool;

  return [
    `Cursor ROI Calculator (${modeLabel})`,
    ``,
    `For your ${stackName} team of ${args.teamSize} (avg salary ${formatUSD2(args.salaryAnnual)}; ${args.codeTimePercentage}% of time coding)`,
    `starting from ${aiToolLabel}, you could save ~${formatInt(args.totalHoursSavedPerYear)} engineering hours/year.`,
    ``,
    `Annual value of time saved: ${formatUSD(args.annualValueSaved)}`,
    `Annual Cursor investment: ${formatUSD(args.annualCursorCost)}`,
    `Net annual ROI: ${formatUSD(args.netRoi)} (${args.roiPercentage >= 0 ? "+" : ""}${Math.round(
      args.roiPercentage,
    ).toLocaleString()}%)`,
    ``,
    `Assumptions: ${WORK_HOURS_PER_YEAR} working hours/year; productivity gain applied only to coding time.`,
  ].join("\n");
}

function SegmentedControl(props: {
  value: EstimateMode;
  onChange: (m: EstimateMode) => void;
}) {
  const options: Array<{ value: EstimateMode; label: string }> = [
    { value: "conservative", label: "Conservative" },
    { value: "moderate", label: "Moderate" },
    { value: "aggressive", label: "Aggressive" },
  ];

  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
      {options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => props.onChange(opt.value)}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-r from-brand-500/25 to-fuchsia-500/20 text-slate-50 shadow-glow"
                : "text-slate-300 hover:text-slate-100",
            ].join(" ")}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard(props: {
  label: string;
  valueNode: React.ReactNode;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
  hero?: boolean;
}) {
  const toneStyles =
    props.tone === "good"
      ? "text-emerald-400"
      : props.tone === "bad"
        ? "text-rose-400"
        : "text-slate-50";

  return (
    <div
      className={[
        "relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm transition-all duration-300 sm:p-5",
      ].join(" ")}
    >
      {props.hero ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
        >
          <div className="absolute -top-20 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/30 via-fuchsia-500/10 to-cyan-500/30 blur-3xl" />
        </div>
      ) : null}

      <div className="relative">
        <div className="text-sm text-slate-300">{props.label}</div>
        <div
          className={[
            // Keep all metric values visually the same size; clamp prevents clipping on narrow cards.
            "mt-2 whitespace-nowrap font-semibold tracking-tight transition-all duration-300 leading-none text-[clamp(1.15rem,2.9vw,2.05rem)]",
            toneStyles,
            props.hero ? "drop-shadow-[0_0_22px_rgba(99,102,241,0.35)]" : "",
          ].join(" ")}
        >
          {props.valueNode}
        </div>
        {props.sub ? <div className="mt-1 text-sm text-slate-400">{props.sub}</div> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [teamSize, setTeamSize] = useState(10);
  const [salaryAnnual, setSalaryAnnual] = useState(150_000);
  const [primaryStack, setPrimaryStack] = useState<PrimaryStack>("JavaScript/TypeScript");
  const [aiCodingTool, setAICodingTool] = useState<AICodingTool>("None");
  const [codeTimePercentage, setCodeTimePercentage] = useState(40);
  const [estimateMode, setEstimateMode] = useState<EstimateMode>("moderate");

  const baseProductivityGainPct = useMemo(
    () => productivityGainPctFromTool(aiCodingTool),
    [aiCodingTool],
  );

  const effectiveProductivityGainPct = useMemo(() => {
    const mult = estimateModeMultiplier(estimateMode);
    return clamp(baseProductivityGainPct * mult, 0, 100);
  }, [baseProductivityGainPct, estimateMode]);

  const calculations = useMemo(() => {
    const hourlyRate = salaryAnnual / WORK_HOURS_PER_YEAR;
    const annualCodingHoursPerDev =
      WORK_HOURS_PER_YEAR * (codeTimePercentage / 100);
    const hoursSavedPerDevPerYear =
      annualCodingHoursPerDev * (effectiveProductivityGainPct / 100);
    const hoursSavedPerDevPerWeek = hoursSavedPerDevPerYear / 52;
    const totalHoursSavedPerYear = hoursSavedPerDevPerYear * teamSize;
    const annualValueSaved = totalHoursSavedPerYear * hourlyRate;
    const annualCursorCost =
      teamSize * CURSOR_PRICE_MONTHLY_USD * 12;
    const netRoi = annualValueSaved - annualCursorCost;
    const roiPercentage =
      annualCursorCost > 0 ? (netRoi / annualCursorCost) * 100 : 0;

    return {
      hourlyRate,
      annualCodingHoursPerDev,
      hoursSavedPerDevPerWeek,
      totalHoursSavedPerYear,
      annualValueSaved,
      annualCursorCost,
      netRoi,
      roiPercentage,
    };
  }, [
    salaryAnnual,
    codeTimePercentage,
    effectiveProductivityGainPct,
    teamSize,
  ]);

  const animatedHoursSavedPerDevPerWeek = useCountUp(
    calculations.hoursSavedPerDevPerWeek,
  );
  const animatedTotalHoursSavedPerYear = useCountUp(
    calculations.totalHoursSavedPerYear,
  );
  const animatedAnnualValueSaved = useCountUp(calculations.annualValueSaved);
  const animatedAnnualCursorCost = useCountUp(calculations.annualCursorCost);
  const animatedNetRoi = useCountUp(calculations.netRoi);
  const animatedRoiPercentage = useCountUp(calculations.roiPercentage, 500);

  const stackName = stackDisplayName(primaryStack);

  const chartData = useMemo(
    () => [
      { name: "Annual", cursorCost: calculations.annualCursorCost, timeSavings: calculations.annualValueSaved },
    ],
    [calculations.annualCursorCost, calculations.annualValueSaved],
  );

  const netIsPositive = calculations.netRoi >= 0;
  const netTone = netIsPositive ? "good" : "bad";

  const summaryText = useMemo(() => {
    return buildShareText({
      teamSize,
      stack: primaryStack,
      aiTool: aiCodingTool,
      estimateMode,
      salaryAnnual,
      codeTimePercentage,
      hoursSavedPerDevPerWeek: calculations.hoursSavedPerDevPerWeek,
      totalHoursSavedPerYear: calculations.totalHoursSavedPerYear,
      annualValueSaved: calculations.annualValueSaved,
      annualCursorCost: calculations.annualCursorCost,
      netRoi: calculations.netRoi,
      roiPercentage: calculations.roiPercentage,
    });
  }, [
    teamSize,
    primaryStack,
    aiCodingTool,
    estimateMode,
    salaryAnnual,
    codeTimePercentage,
    calculations,
  ]);

  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  const hoursSavedPerDevPerWeekText = `${animatedHoursSavedPerDevPerWeek.toFixed(
    1,
  )} hrs/week`;
  const totalAnnualHoursSavedText = `${Math.round(
    animatedTotalHoursSavedPerYear,
  ).toLocaleString()} hrs`;
  const annualValueSavedText = formatUSD(animatedAnnualValueSaved);
  const annualCursorCostText = formatUSD(animatedAnnualCursorCost);
  const netRoiText = `${netIsPositive ? "+" : ""}${formatUSD(animatedNetRoi)}`;
  const roiPercentageRounded = Math.round(animatedRoiPercentage);
  const roiPercentageText = `${roiPercentageRounded.toLocaleString()}%`;

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1400);
    } catch {
      // Fallback for environments without clipboard permissions.
      try {
        const ta = document.createElement("textarea");
        ta.value = summaryText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyState("ok");
        window.setTimeout(() => setCopyState("idle"), 1400);
      } catch {
        setCopyState("fail");
        window.setTimeout(() => setCopyState("idle"), 1600);
      }
    }
  }

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#05060b] via-[#0a0b10] to-[#070813]"
        />

        <div
          aria-hidden="true"
          className="absolute -top-36 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500/30 via-fuchsia-500/15 to-cyan-500/20 shadow-glow" />
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Cursor ROI Calculator
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                See how much your engineering team could save with AI-assisted development.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">Estimated Cursor price</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                $40/user/month <span className="text-slate-400">(Teams)</span>
              </div>
            </div>
          </header>

          <main className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Inputs
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-200">
                    Team Size
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                      onClick={() => setTeamSize((v) => clamp(v - 1, 1, 500))}
                      aria-label="Decrease team size"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={500}
                      step={1}
                      value={teamSize}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next)) setTeamSize(clamp(next, 1, 500));
                      }}
                      className="h-10 flex-1 rounded-xl border border-white/10 bg-[#0a0b10] px-3 text-lg text-slate-50 outline-none transition focus:border-brand-400/40"
                      aria-label="Team size"
                    />
                    <button
                      type="button"
                      className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                      onClick={() => setTeamSize((v) => clamp(v + 1, 1, 500))}
                      aria-label="Increase team size"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Range: 1–500
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-200">
                      Average Developer Salary (USD)
                    </label>
                    <div className="text-sm font-semibold text-brand-100">
                      {formatUSD2(salaryAnnual)}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={60_000}
                    max={350_000}
                    step={5_000}
                    value={salaryAnnual}
                    onChange={(e) => setSalaryAnnual(Number(e.target.value))}
                    className="mt-3 w-full accent-brand-500"
                    aria-label="Average developer salary"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>$60k</span>
                    <span>$350k</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">
                    Primary Stack
                  </label>
                  <select
                    value={primaryStack}
                    onChange={(e) => setPrimaryStack(e.target.value as PrimaryStack)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0b10] px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-brand-400/40"
                    aria-label="Primary stack"
                  >
                    <option>Python</option>
                    <option>JavaScript/TypeScript</option>
                    <option>Java</option>
                    <option>C++</option>
                    <option>Go</option>
                    <option>Rust</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Current AI Coding Tool
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {(["None", "GitHub Copilot", "Other AI tool"] as AICodingTool[]).map(
                      (opt) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
                        >
                          <input
                            type="radio"
                            name="aiTool"
                            value={opt}
                            checked={aiCodingTool === opt}
                            onChange={() => setAICodingTool(opt)}
                          />
                          <span className="text-sm text-slate-100">{opt}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-200">
                      % of Time Writing/Editing Code
                    </label>
                    <div className="text-sm font-semibold text-slate-100">
                      {codeTimePercentage}%
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    step={1}
                    value={codeTimePercentage}
                    onChange={(e) => setCodeTimePercentage(Number(e.target.value))}
                    className="mt-3 w-full accent-brand-500"
                    aria-label="Percentage of time writing/editing code"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>10%</span>
                    <span>80%</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-medium text-slate-400">
                    Productivity model
                  </div>
                  <div className="mt-1 text-sm text-slate-100">
                    Base gain: <span className="font-semibold">{baseProductivityGainPct}%</span> (from{" "}
                    <span className="font-semibold">{aiCodingTool}</span>){" "}
                    · Applied only to coding time.
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Effective gain with mode:{" "}
                    <span className="text-slate-200 font-semibold">
                      {effectiveProductivityGainPct.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}%
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-100">
                    Estimate Mode
                  </div>
                  <div className="mt-2">
                    <SegmentedControl value={estimateMode} onChange={setEstimateMode} />
                  </div>
                </div>
                <div className="sm:w-44">
                  <button
                    type="button"
                    onClick={copyResults}
                    className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                    aria-label="Copy results"
                  >
                    {copyState === "ok"
                      ? "Copied"
                      : copyState === "fail"
                        ? "Copy failed"
                        : "Copy Results"}
                  </button>
                  <div className="mt-2 text-xs text-slate-400">
                    Clipboard-ready summary
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label="Hours Saved Per Developer Per Week"
                  valueNode={hoursSavedPerDevPerWeekText}
                  sub="Scope: only coding time"
                  tone="neutral"
                />
                <MetricCard
                  label="Total Annual Hours Saved"
                  valueNode={totalAnnualHoursSavedText}
                  sub={`${teamSize} developers`}
                  tone="neutral"
                />
                <MetricCard
                  label="Annual Value of Time Saved"
                  valueNode={annualValueSavedText}
                  sub="Time value = hours × blended hourly rate"
                  tone="good"
                />
                <MetricCard
                  label="Annual Cursor Investment"
                  valueNode={annualCursorCostText}
                  sub="Teams plan pricing used"
                  tone="neutral"
                />

                <MetricCard
                  hero
                  label="Net Annual ROI"
                  valueNode={netRoiText}
                  sub={`${calculations.roiPercentage >= 0 ? "+" : ""}${Math.round(
                    calculations.roiPercentage,
                  ).toLocaleString()}% return`}
                  tone={netTone}
                />
                <MetricCard
                  label="ROI Percentage"
                  valueNode={roiPercentageText}
                  sub={netIsPositive ? "Positive ROI" : "Cost exceeds estimated value"}
                  tone={netIsPositive ? "good" : "bad"}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-200">
                  By investing <span className="font-semibold">{formatUSD(calculations.annualCursorCost)}</span>{" "}
                  in Cursor for your <span className="font-semibold">{stackName}</span> team of{" "}
                  <span className="font-semibold">{teamSize}</span>, you could reclaim{" "}
                  <span className="font-semibold">{formatInt(calculations.totalHoursSavedPerYear)}</span>{" "}
                  engineering hours worth{" "}
                  <span className="font-semibold text-emerald-300">{formatUSD(calculations.annualValueSaved)}</span>{" "}
                  annually.
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">The “aha moment”</div>
                    <div className="text-xs text-slate-400">
                      Cursor cost vs annual time savings value
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.96)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                        }}
                        formatter={(v: unknown) => formatUSD(Number(v))}
                        labelFormatter={() => ""}
                        cursor={{ fill: "rgba(99,102,241,0.10)" }}
                      />
                      <Bar
                        dataKey="cursorCost"
                        name="Annual Cursor Cost"
                        fill="rgba(99, 102, 241, 0.65)"
                        radius={[14, 14, 14, 14]}
                        barSize={64}
                      />
                      <Bar
                        dataKey="timeSavings"
                        name="Annual Time Savings Value"
                        fill="rgba(16, 185, 129, 0.75)"
                        radius={[14, 14, 14, 14]}
                        barSize={64}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </main>

          <footer className="mt-8">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="text-xs text-slate-400">
                Methodology: Productivity estimates based on published research on AI-assisted coding tools, including studies showing 30–55% task completion speed improvements. Actual results vary by team, codebase, and workflow. Calculations assume{" "}
                {WORK_HOURS_PER_YEAR} working hours/year. Cursor pricing based on publicly available plan information (used here: $40/user/month; pricing estimated — check{" "}
                <a
                  className="text-brand-200 underline decoration-brand-200/40 underline-offset-2"
                  href="https://www.cursor.com/en/pricing"
                  target="_blank"
                  rel="noreferrer"
                >
                  cursor.com
                </a>{" "}
                for current plans).
              </div>
              <div className="absolute bottom-3 right-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0a0b10]/70 px-3 py-1 text-[11px] font-semibold text-slate-200 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-brand-400" />
                  Built on Cursor
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

