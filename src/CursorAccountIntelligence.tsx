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
const ANNUAL_BILLING_DISCOUNT = 0.2; // 20% off annual billing

// Pricing reference (monthly, per seat or per user)
const CURSOR_TEAMS_PRICE_MONTHLY = 40;
const CURSOR_PRO_PRICE_MONTHLY = 20;
const CURSOR_PRO_PLUS_PRICE_MONTHLY = 60;
const CURSOR_ULTRA_PRICE_MONTHLY = 200;
const CURSOR_ENTERPRISE_DEFAULT_PRICE_MONTHLY = 60; // tool default (custom in real life)

const BUGBOT_PRICE_MONTHLY = 40;
const BUGBOT_BASE_REVIEW_HOURS_PER_DEV_PER_WEEK = 4; // assumption for time-saved model

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
      return 10;
    case "Other":
      return 5;
    case "None":
    default:
      return 0;
  }
}

function SegmentedControl<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={props.ariaLabel}
      className="flex w-full min-w-0 flex-row rounded-xl border border-white/10 bg-white/5 p-1"
    >
      {props.options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => props.onChange(opt.value)}
            className={[
              "min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium leading-tight transition-all duration-200 sm:px-3 sm:text-sm",
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

/** Primary figure + label below; value size is identical on every card at each breakpoint. */
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

  // Fixed steps (no clamp) — identical on every card: compact phones/tablets, larger from lg up (~1024px+).
  const valueTypography =
    "text-2xl font-bold tabular-nums tracking-tight leading-none lg:text-3xl";

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-5">
      {props.hero ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-20 left-1/2 h-64 w-[min(100vw,32rem)] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/30 via-fuchsia-500/10 to-cyan-500/30 blur-3xl" />
        </div>
      ) : null}

      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Metric value — same font size on every card; nowrap + horizontal scroll if needed (no mid-string wrap) */}
        <div className="min-w-0 shrink-0 overflow-x-auto overscroll-x-contain">
          <p
            className={[
              valueTypography,
              "whitespace-nowrap",
              toneStyles,
              props.hero ? "drop-shadow-[0_0_22px_rgba(99,102,241,0.35)]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={props.value}
          >
            {props.value}
          </p>
        </div>

        {/* Label + sub — wrap only at word boundaries */}
        <div className="mt-3 min-w-0 flex-1 sm:mt-4">
          <p className="text-pretty text-sm font-medium leading-snug text-slate-400 hyphens-none break-normal">
            {props.label}
          </p>
          {props.sub ? (
            <p className="mt-2 text-pretty text-xs leading-snug text-slate-500 hyphens-none break-normal">
              {props.sub}
            </p>
          ) : null}
        </div>
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

function buildAssumptions(lines: string[]) {
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

export default function CursorAccountIntelligence() {
  const [tab, setTab] = useState<TabKey>("roi");

  // Global features
  const [estimateMode, setEstimateMode] = useState<EstimateMode>("moderate");
  const [billingCadence, setBillingCadence] = useState<BillingCadence>("annual");
  const confidenceMult = useMemo(() => estimateModeMultiplier(estimateMode), [estimateMode]);
  const annualPriceMultiplier = billingCadence === "annual" ? 1 - ANNUAL_BILLING_DISCOUNT : 1;

  // Shared account inputs (Tab 1 -> Tab 2 persistence)
  const [customerName, setCustomerName] = useState<string>("Acme Corp");
  const [currentSeats, setCurrentSeats] = useState<number>(50);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>("teams");
  const [enterpriseSeatPriceMonthly, setEnterpriseSeatPriceMonthly] = useState<number>(
    CURSOR_ENTERPRISE_DEFAULT_PRICE_MONTHLY,
  );
  const [salaryAnnual, setSalaryAnnual] = useState<number>(165_000);
  const [codingTimePct, setCodingTimePct] = useState<number>(40);
  const [adoptionRatePct, setAdoptionRatePct] = useState<number>(70);
  const [perceivedProductivityGainPct, setPerceivedProductivityGainPct] = useState<number>(30);
  const [replacedTool, setReplacedTool] = useState<AICodingTool>("None");

  // Tab 2: Team Expansion
  const [expansionTeamLabel, setExpansionTeamLabel] = useState<string>("Platform Engineering team");
  const [newSeats, setNewSeats] = useState<number>(25);
  const [newTeamInitialAdoptionPct, setNewTeamInitialAdoptionPct] = useState<number>(50);
  const [newTeamAdoptionAt6Pct, setNewTeamAdoptionAt6Pct] = useState<number>(75);
  const [newTeamAdoptionAt12Pct, setNewTeamAdoptionAt12Pct] = useState<number>(85);
  const [newTeamSalaryAnnual, setNewTeamSalaryAnnual] = useState<number>(165_000);
  const [rampMonths, setRampMonths] = useState<number>(2); // 1-3

  // Tab 3: SKU Upsell
  const [toggleTeamsToEnterprise, setToggleTeamsToEnterprise] = useState<boolean>(false);
  const [enterpriseUpgradeSeatPriceMonthly, setEnterpriseUpgradeSeatPriceMonthly] = useState<number>(
    CURSOR_ENTERPRISE_DEFAULT_PRICE_MONTHLY,
  );
  const [toggleProToProPlus, setToggleProToProPlus] = useState<boolean>(false);
  const [proPlusUsers, setProPlusUsers] = useState<number>(10);
  const [toggleProToUltra, setToggleProToUltra] = useState<boolean>(false);
  const [proUltraUsers, setProUltraUsers] = useState<number>(3);

  const [bugbotSeats, setBugbotSeats] = useState<number>(20);
  const [bugbotReviewTimeReductionPct, setBugbotReviewTimeReductionPct] = useState<number>(30);

  const gainReductionPoints = useMemo(
    () => replacedToolProductivityReductionPoints(replacedTool),
    [replacedTool],
  );

  const gainNoConfidencePct = useMemo(
    () => clamp(perceivedProductivityGainPct - gainReductionPoints, 0, 100),
    [perceivedProductivityGainPct, gainReductionPoints],
  );

  const gainEffectivePct = useMemo(() => clamp(gainNoConfidencePct * confidenceMult, 0, 100), [gainNoConfidencePct, confidenceMult]);

  const currentSeatMonthlyPrice = useMemo(() => {
    return currentPlan === "teams" ? CURSOR_TEAMS_PRICE_MONTHLY : enterpriseSeatPriceMonthly;
  }, [currentPlan, enterpriseSeatPriceMonthly]);

  const currentSeatMonthlyPriceAfterBilling = useMemo(
    () => currentSeatMonthlyPrice * annualPriceMultiplier,
    [currentSeatMonthlyPrice, annualPriceMultiplier],
  );

  const tab1 = useMemo(() => {
    const annualSpend = currentSeats * currentSeatMonthlyPriceAfterBilling * 12;
    const hourlyRate = salaryAnnual / WORK_HOURS_PER_YEAR;

    // Spec formula includes adoption as a weighting.
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
    const ramp = clamp(rampMonths, 1, 3);

    const newMonthlyCost = newSeats * currentSeatMonthlyPriceAfterBilling;
    const additionalAnnualCost = newMonthlyCost * 12;

    const existingMonthlyValue = tab1.annualValueSaved / 12;
    const existingMonthlyCost = tab1.annualSpend / 12;

    const newTeamHourlyRate = newTeamSalaryAnnual / WORK_HOURS_PER_YEAR;

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

    const at = (m: number) => rows.find((r) => r.month === m)!;

    const savingsM3 = at(3).cumulativeNewSavings;
    const savingsM6 = at(6).cumulativeNewSavings;
    const savingsM12 = at(12).cumulativeNewSavings;

    const breakevenMonth = (() => {
      for (const r of rows) {
        if (r.month === 0) continue;
        if (r.cumulativeNewCost > 0 && r.cumulativeNewSavings >= r.cumulativeNewCost) return r.month;
      }
      return null;
    })();

    return {
      additionalAnnualCost,
      savingsM3,
      savingsM6,
      savingsM12,
      breakevenMonth,
      rows,
      combinedRoiAt12: at(12).combinedRoiMultiple,
      baseRoiAt12: tab1.roiMultiple,
      newValueWithin12Months: savingsM12,
    };
  }, [
    rampMonths,
    newSeats,
    currentSeatMonthlyPriceAfterBilling,
    tab1.annualValueSaved,
    tab1.annualSpend,
    tab1.roiMultiple,
    newTeamSalaryAnnual,
    newTeamInitialAdoptionPct,
    newTeamAdoptionAt6Pct,
    newTeamAdoptionAt12Pct,
    codingTimePct,
    gainEffectivePct,
  ]);

  const tab3 = useMemo(() => {
    const hourlyRate = tab1.hourlyRate;
    const annualCodingHoursPerActiveUser =
      WORK_HOURS_PER_YEAR * (codingTimePct / 100) * (adoptionRatePct / 100);

    const baseGainEffectivePct = gainEffectivePct;

    const proPlusRelativeBoost = 0.125; // 10-15% midpoint
    const proUltraRelativeBoost = 0.2; // 20%

    const gainProPlusEffectivePct = clamp(
      clamp(gainNoConfidencePct * (1 + proPlusRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );
    const gainUltraEffectivePct = clamp(
      clamp(gainNoConfidencePct * (1 + proUltraRelativeBoost), 0, 100) * confidenceMult,
      0,
      100,
    );

    const teamsMonthlyAfterBilling = CURSOR_TEAMS_PRICE_MONTHLY * annualPriceMultiplier;
    const bugbotMonthlyAfterBilling = BUGBOT_PRICE_MONTHLY * annualPriceMultiplier;

    // Enterprise upgrade: cost delta only (operational benefits listed separately).
    const enterpriseCostDeltaMonthlyPerSeat = Math.max(
      0,
      enterpriseUpgradeSeatPriceMonthly * annualPriceMultiplier - teamsMonthlyAfterBilling,
    );
    const enterpriseAdditionalAnnualInvestment =
      toggleTeamsToEnterprise && currentPlan === "teams"
        ? currentSeats * enterpriseCostDeltaMonthlyPerSeat * 12
        : 0;

    const enterpriseAdditionalAnnualValue = 0;

    // Pro -> Pro+
    const proPlusDeltaMonthlyPerSeat =
      (CURSOR_PRO_PLUS_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * annualPriceMultiplier;
    const proPlusAdditionalAnnualInvestment = toggleProToProPlus ? proPlusUsers * proPlusDeltaMonthlyPerSeat * 12 : 0;
    const proPlusDeltaGainPct = gainProPlusEffectivePct - baseGainEffectivePct;
    const proPlusAdditionalAnnualValue = toggleProToProPlus
      ? proPlusUsers *
        annualCodingHoursPerActiveUser *
        (proPlusDeltaGainPct / 100) *
        hourlyRate
      : 0;

    // Pro -> Ultra
    const proUltraDeltaMonthlyPerSeat =
      (CURSOR_ULTRA_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY) * annualPriceMultiplier;
    const proUltraAdditionalAnnualInvestment = toggleProToUltra ? proUltraUsers * proUltraDeltaMonthlyPerSeat * 12 : 0;
    const proUltraDeltaGainPct = gainUltraEffectivePct - baseGainEffectivePct;
    const proUltraAdditionalAnnualValue = toggleProToUltra
      ? proUltraUsers *
        annualCodingHoursPerActiveUser *
        (proUltraDeltaGainPct / 100) *
        hourlyRate
      : 0;

    // Bugbot add-on
    const bugbotAnnualCost = bugbotSeats * bugbotMonthlyAfterBilling * 12;
    const effectiveReviewReductionPct = clamp(bugbotReviewTimeReductionPct * confidenceMult, 0, 100);
    const hoursSavedPerDevPerWeek = BUGBOT_BASE_REVIEW_HOURS_PER_DEV_PER_WEEK * (effectiveReviewReductionPct / 100);
    const totalAnnualReviewHoursSaved = bugbotSeats * hoursSavedPerDevPerWeek * 52;
    const bugbotAnnualValue = totalAnnualReviewHoursSaved * hourlyRate;

    const combinedAdditionalAnnualInvestment =
      enterpriseAdditionalAnnualInvestment +
      proPlusAdditionalAnnualInvestment +
      proUltraAdditionalAnnualInvestment +
      bugbotAnnualCost;
    const combinedAdditionalAnnualValue =
      enterpriseAdditionalAnnualValue + proPlusAdditionalAnnualValue + proUltraAdditionalAnnualValue + bugbotAnnualValue;

    const combinedAnnualInvestment = tab1.annualSpend + combinedAdditionalAnnualInvestment;
    const combinedAnnualValue = tab1.annualValueSaved + combinedAdditionalAnnualValue;
    const combinedNet = combinedAnnualValue - combinedAnnualInvestment;
    const combinedRoiMultiple = combinedAnnualInvestment > 0 ? combinedAnnualValue / combinedAnnualInvestment : 0;

    return {
      // enterprise
      enterpriseAdditionalAnnualInvestment,
      enterpriseAdditionalAnnualValue,
      // pro+
      proPlusAdditionalAnnualInvestment,
      proPlusAdditionalAnnualValue,
      gainProPlusEffectivePct,
      // ultra
      proUltraAdditionalAnnualInvestment,
      proUltraAdditionalAnnualValue,
      gainUltraEffectivePct,
      // bugbot
      bugbotAnnualCost,
      hoursSavedPerDevPerWeek,
      totalAnnualReviewHoursSaved,
      bugbotAnnualValue,
      // combined
      combinedAdditionalAnnualInvestment,
      combinedAdditionalAnnualValue,
      combinedAnnualInvestment,
      combinedAnnualValue,
      combinedNet,
      combinedRoiMultiple,
      proPlusRelativeBoost,
      proUltraRelativeBoost,
      baseGainEffectivePct,
    };
  }, [
    tab1.hourlyRate,
    tab1.annualSpend,
    tab1.annualValueSaved,
    codingTimePct,
    adoptionRatePct,
    gainEffectivePct,
    gainNoConfidencePct,
    confidenceMult,
    annualPriceMultiplier,
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

  const summaryText = useMemo(() => {
    const modeLabel =
      estimateMode === "conservative" ? "Conservative" : estimateMode === "aggressive" ? "Aggressive" : "Moderate";
    const billingLabel = billingCadence === "annual" ? "Annual billing (20% off)" : "Monthly billing";

    if (tab === "roi") {
      return [
        `Cursor Account Intelligence (${modeLabel}; ${billingLabel})`,
        "",
        `${customerName}'s ${currentSeats} Cursor seats are generating an estimated ${formatUSD(tab1.annualValueSaved)} in annual productivity value against a ${formatUSD(
          tab1.annualSpend,
        )} investment — a ${tab1.roiMultiple.toFixed(1)}x return.`,
        `Net ROI: ${formatUSD(tab1.netRoi)}.`,
        `Annual coding hours per active user: ${formatInt(tab1.annualCodingHoursPerActiveUser)}h.`,
        `Hours saved per active user / year: ${formatInt(tab1.hoursSavedPerActiveUserPerYear)}h.`,
        "",
        `Assumptions: ${WORK_HOURS_PER_YEAR} working hours/year; productivity gain applied only to coding time; adoption rate weights expected coding time per seat.`,
      ].join("\n");
    }

    if (tab === "expansion") {
      const breakeven =
        tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`;
      return [
        `Cursor Account Intelligence — Team Expansion (${modeLabel}; ${billingLabel})`,
        "",
        `Adding ${newSeats} seats for ${customerName}'s ${expansionTeamLabel} would cost ${formatUSD(tab2.additionalAnnualCost)} / year and is projected to generate ${formatUSD(
          tab2.newValueWithin12Months,
        )} in value within 12 months.`,
        `Breakeven is expected at ${breakeven}.`,
        `Combined account ROI would increase from ${tab2.baseRoiAt12.toFixed(1)}x to ${tab2.combinedRoiAt12.toFixed(1)}x.`,
        "",
        `Savings checkpoints: Month 3 ${formatUSD(tab2.savingsM3)}, Month 6 ${formatUSD(tab2.savingsM6)}, Month 12 ${formatUSD(tab2.savingsM12)}.`,
        `Assumptions: new-team adoption ramps linearly to targets at 6/12 months; productivity gain ramps from 0 to full over ${rampMonths} month(s).`,
      ].join("\n");
    }

    // upsell
    const actions: string[] = [];
    if (toggleTeamsToEnterprise && currentPlan === "teams") actions.push("Teams -> Enterprise");
    if (toggleProToProPlus) actions.push(`Pro -> Pro+ (${proPlusUsers} users)`);
    if (toggleProToUltra) actions.push(`Pro -> Ultra (${proUltraUsers} users)`);
    if (bugbotSeats > 0) actions.push(`Bugbot (${bugbotSeats} developers)`);

    const actionText = actions.length ? actions.join(", ") : "no changes selected";

    return [
      `Cursor Account Intelligence — SKU Upsell (${modeLabel}; ${billingLabel})`,
      "",
      `Upgrading ${customerName} via ${actionText} would increase annual investment by ${formatUSD(tab3.combinedAdditionalAnnualInvestment)} while generating an estimated ${formatUSD(
        tab3.combinedAdditionalAnnualValue,
      )} in additional value.`,
      `Combined ROI impact: ${tab3.combinedRoiMultiple.toFixed(1)}x overall ROI multiple (incremental net: ${formatUSD(tab3.combinedNet)}).`,
      "",
      `Assumptions: Pro+ adds +${(tab3.proPlusRelativeBoost * 100).toFixed(1)}% relative gain; Ultra adds +${(tab3.proUltraRelativeBoost * 100).toFixed(0)}% relative gain; Bugbot saves ${BUGBOT_BASE_REVIEW_HOURS_PER_DEV_PER_WEEK}h/dev/week baseline review time with confidence scaling.`,
    ].join("\n");
  }, [
    tab,
    estimateMode,
    billingCadence,
    customerName,
    currentSeats,
    tab1,
    tab2,
    tab3,
    newSeats,
    expansionTeamLabel,
    rampMonths,
    toggleTeamsToEnterprise,
    currentPlan,
    toggleProToProPlus,
    proPlusUsers,
    toggleProToUltra,
    proUltraUsers,
    bugbotSeats,
  ]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1200);
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
        window.setTimeout(() => setCopyState("idle"), 1200);
      } catch {
        setCopyState("fail");
        window.setTimeout(() => setCopyState("idle"), 1600);
      }
    }
  };

  const barChartData = useMemo(() => {
    return [
      {
        name: "Year 1",
        cursorInvestment: tab1.annualSpend,
        timeValueSaved: tab1.annualValueSaved,
      },
    ];
  }, [tab1.annualSpend, tab1.annualValueSaved]);

  const assumptionsTab1 = useMemo(() => {
    return buildAssumptions([
      `${WORK_HOURS_PER_YEAR} working hours/year`,
      "productivity gain applies only to coding time",
      `adoption rate weights expected coding time per seat (adoption: ${adoptionRatePct}%)`,
      `productivity gain reduced vs "${replacedTool}" by ${gainReductionPoints} points`,
      `confidence multiplies productivity gain by ${confidenceMult}`,
    ]);
  }, [adoptionRatePct, replacedTool, gainReductionPoints, confidenceMult]);

  const assumptionsTab2 = useMemo(() => {
    return buildAssumptions([
      "new-team adoption ramps linearly to targets at 6 and 12 months",
      `productivity gain ramps from 0 to full over ${rampMonths} month(s)`,
      `confidence multiplies productivity gain by ${confidenceMult}`,
      "existing account savings are assumed constant across the year",
    ]);
  }, [rampMonths, confidenceMult]);

  const assumptionsTab3 = useMemo(() => {
    return buildAssumptions([
      "Enterprise upgrade models cost only (operational benefits listed, not converted into coding productivity delta)",
      `${WORK_HOURS_PER_YEAR} working hours/year for coding time value`,
      "productivity gain applied only to coding time (coding% controls the modeled hours)",
      `Pro+ modeled as +${(0.125 * 100).toFixed(1)}% relative additional gain for upgraded power users`,
      `Ultra modeled as +${(0.2 * 100).toFixed(0)}% relative additional gain for upgraded heaviest users`,
      `Bugbot baseline assumed ${BUGBOT_BASE_REVIEW_HOURS_PER_DEV_PER_WEEK}h/dev/week of review time`,
      `Bugbot time-savings reduction is multiplied by confidence (${confidenceMult})`,
    ]);
  }, [confidenceMult]);

  const tabTitle = `Cursor Account Intelligence — ${customerName}`;

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#05060b] via-[#0a0b10] to-[#070813]" />
        <div
          aria-hidden="true"
          className="absolute -top-36 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3">
            <div>
              <div className="inline-flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500/30 via-fuchsia-500/15 to-cyan-500/20 shadow-glow" />
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cursor Account Intelligence</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Internal QBR ROI modeling for Cursor AI deployment managers (client-side only).
              </p>
            </div>
          </header>

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

            </div>
          </div>

          <div className="mt-2">
            <div className="text-xs text-slate-400 mb-3">{tabTitle}</div>
            {tab === "roi" ? (
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
                          <div className="mt-1 text-xs text-slate-400">Licenses actively used in this account</div>
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
                      label="% of dev time spent coding"
                      unit="%"
                      onChange={setCodingTimePct}
                      ariaLabel="Dev time coding percentage"
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
                        aria-label="Current AI tool Cursor replaced"
                      >
                        <option value="None">None</option>
                        <option value="GitHub Copilot">GitHub Copilot</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="mt-2 text-xs text-slate-400">
                        Productivity gain adjustment: subtract{" "}
                        <span className="text-slate-200 font-semibold">{gainReductionPoints}</span> percentage points.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="text-base font-semibold text-slate-100">Dynamic summary</div>
                      <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                        {customerName}'s {currentSeats} Cursor seats are generating an estimated{" "}
                        <span className="text-emerald-300 font-semibold">{formatUSD(tab1.annualValueSaved)}</span> in annual
                        productivity value against a{" "}
                        <span className="text-slate-50 font-semibold">{formatUSD(tab1.annualSpend)}</span> investment —{" "}
                        <span className={tab1.roiMultiple >= 1 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
                          {tab1.roiMultiple.toFixed(1)}x
                        </span>{" "}
                        return.
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="mb-1 text-xs text-slate-400">Estimate confidence</div>
                        <SegmentedControl<EstimateMode>
                          value={estimateMode}
                          onChange={setEstimateMode}
                          options={[
                            { value: "conservative", label: "Conservative" },
                            { value: "moderate", label: "Moderate" },
                            { value: "aggressive", label: "Aggressive" },
                          ]}
                          ariaLabel="Estimate confidence"
                        />
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="mb-1 text-xs text-slate-400">Billing</div>
                          <SegmentedControl<BillingCadence>
                            value={billingCadence}
                            onChange={setBillingCadence}
                            options={[
                              { value: "monthly", label: "Monthly" },
                              { value: "annual", label: "Annual (20% off)" },
                            ]}
                            ariaLabel="Billing cadence"
                          />
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-slate-400">Export</div>
                          <button
                            type="button"
                            onClick={copySummary}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                            aria-label="Copy Summary"
                          >
                            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy Summary"}
                          </button>
                          <div className="mt-1 text-xs text-slate-400">Clipboard-ready for email/Slack</div>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 lg:col-span-1">
                          <div className="text-xs text-slate-400">Customer</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">
                            {customerName} · {currentSeats} seats · {currentPlan === "teams" ? "Teams" : "Enterprise"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Annual Cursor spend"
                        value={formatUSD(tab1.annualSpend)}
                        sub={`${currentSeats} seats × ${formatUSD(currentSeatMonthlyPriceAfterBilling, 0)}/mo × 12`}
                      />
                      <MetricCard
                        label="Effective hourly rate per developer"
                        value={formatUSD(tab1.hourlyRate, 2)}
                        sub={`Salary / ${WORK_HOURS_PER_YEAR}h`}
                      />
                      <MetricCard
                        label="Annual coding hours per active user"
                        value={`${formatInt(tab1.annualCodingHoursPerActiveUser)}h`}
                        sub={`Coding% × adoption%`}
                      />
                      <MetricCard
                        label="Hours saved per active user per year"
                        value={`${formatInt(tab1.hoursSavedPerActiveUserPerYear)}h`}
                        sub="Coding hours × productivity gain"
                      />
                      <MetricCard
                        label="Total hours saved across all active users"
                        value={`${formatInt(tab1.totalHoursSavedAcrossAllActiveUsers)}h`}
                        sub={`${currentSeats} seats`}
                      />
                      <MetricCard
                        label="Dollar value of time saved"
                        value={formatUSD(tab1.annualValueSaved)}
                        sub="Annual productivity value"
                        tone="good"
                      />
                      <MetricCard
                        label="ROI multiple"
                        value={`${tab1.roiMultiple.toFixed(1)}x`}
                        sub="Annual value / annual investment"
                        tone={tab1.roiMultiple >= 1 ? "good" : "bad"}
                      />
                      <MetricCard
                        hero
                        label="Net ROI"
                        value={`${tab1.netRoi >= 0 ? "+" : ""}${formatUSD(tab1.netRoi)}`}
                        sub={`ROI multiple: ${tab1.roiMultiple.toFixed(1)}x`}
                        tone={tab1.netRoi >= 0 ? "good" : "bad"}
                      />
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">Cursor annual investment vs value saved</div>
                          <div className="text-xs text-slate-400">Annual cost vs annual productivity value</div>
                        </div>
                      </div>
                      <div className="mt-4 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 14, right: 16, bottom: 0, left: 8 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.96)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 12,
                              }}
                              formatter={(v: unknown) => formatUSD(Number(v))}
                              labelFormatter={() => ""}
                            />
                            <Bar dataKey="cursorInvestment" name="Cursor annual investment" fill="rgba(99, 102, 241, 0.65)" radius={[14, 14, 14, 14]} barSize={64} />
                            <Bar dataKey="timeValueSaved" name="Annual value of time saved" fill="rgba(16, 185, 129, 0.75)" radius={[14, 14, 14, 14]} barSize={64} />
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
            ) : tab === "expansion" ? (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
                  <div className="text-base font-semibold text-slate-100">Inputs</div>

                  <div className="mt-5 space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-slate-100">Base account (from Tab 1)</div>
                      <div className="mt-2 text-xs text-slate-400">Existing savings curve uses Tab 1 coding/adoption/productivity assumptions.</div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-slate-400">Current seats</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">{currentSeats}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Current plan</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">
                            {currentPlan === "teams" ? `Teams ($${CURSOR_TEAMS_PRICE_MONTHLY}/mo)` : `Enterprise ($${enterpriseSeatPriceMonthly}/mo)`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Coding time</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">{codingTimePct}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Existing adoption</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">{adoptionRatePct}% weekly</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-200">Team name (for summary)</label>
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
                          <div className="mt-1 text-xs text-slate-400">Added on the same plan as current account</div>
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
                      ariaLabel="New team initial adoption"
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
                      ariaLabel="New team adoption at 6 months"
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
                        Productivity gain ramps linearly from 0 to full over {rampMonths} month(s).
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="text-base font-semibold text-slate-100">Dynamic summary</div>
                      <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                        Adding {newSeats} seats for {customerName}'s <span className="font-semibold">{expansionTeamLabel}</span> would cost{" "}
                        <span className="text-slate-50 font-semibold">{formatUSD(tab2.additionalAnnualCost)}</span> / year and is projected to generate{" "}
                        <span className="text-emerald-300 font-semibold">{formatUSD(tab2.newValueWithin12Months)}</span> in value within 12 months.
                        Breakeven is expected at{" "}
                        <span className={tab2.breakevenMonth === null ? "text-slate-300" : "text-emerald-300 font-semibold"}>
                          {tab2.breakevenMonth === null ? "not reached in 12 months" : `month ${tab2.breakevenMonth}`}
                        </span>
                        . Combined account ROI would increase from{" "}
                        <span className="font-semibold">{tab2.baseRoiAt12.toFixed(1)}x</span> to{" "}
                        <span className="font-semibold">{tab2.combinedRoiAt12.toFixed(1)}x</span>.
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="mb-1 text-xs text-slate-400">Estimate confidence</div>
                        <SegmentedControl<EstimateMode>
                          value={estimateMode}
                          onChange={setEstimateMode}
                          options={[
                            { value: "conservative", label: "Conservative" },
                            { value: "moderate", label: "Moderate" },
                            { value: "aggressive", label: "Aggressive" },
                          ]}
                          ariaLabel="Estimate confidence"
                        />
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="mb-1 text-xs text-slate-400">Billing</div>
                          <SegmentedControl<BillingCadence>
                            value={billingCadence}
                            onChange={setBillingCadence}
                            options={[
                              { value: "monthly", label: "Monthly" },
                              { value: "annual", label: "Annual (20% off)" },
                            ]}
                            ariaLabel="Billing cadence"
                          />
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-slate-400">Export</div>
                          <button
                            type="button"
                            onClick={copySummary}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                            aria-label="Copy Summary"
                          >
                            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy Summary"}
                          </button>
                          <div className="mt-1 text-xs text-slate-400">Clipboard-ready for email/Slack</div>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 lg:col-span-1">
                          <div className="text-xs text-slate-400">Customer</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">
                            {customerName} · {currentSeats} seats · {currentPlan === "teams" ? "Teams" : "Enterprise"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Additional annual cost for new seats" value={formatUSD(tab2.additionalAnnualCost)} sub={`${newSeats} seats`} />
                      <MetricCard label="Projected savings at Month 6" value={formatUSD(tab2.savingsM6)} sub="Cumulative new-team savings" tone="good" />
                      <MetricCard
                        label="Time to breakeven"
                        value={tab2.breakevenMonth === null ? "—" : `Month ${tab2.breakevenMonth}`}
                        sub="When cumulative savings exceed cumulative cost"
                        tone={tab2.breakevenMonth === null ? "neutral" : "good"}
                      />
                      <MetricCard
                        label="Combined ROI at Month 12"
                        value={`${tab2.combinedRoiAt12.toFixed(1)}x`}
                        sub={`Base: ${tab2.baseRoiAt12.toFixed(1)}x`}
                        tone={tab2.combinedRoiAt12 >= 1 ? "good" : "bad"}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-400">Projected savings checkpoints</div>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">Month 3</div>
                          <div className="mt-1 text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM3)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100">Month 6</div>
                          <div className="mt-1 text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM6)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100">Month 12</div>
                          <div className="mt-1 text-sm font-semibold text-emerald-300">{formatUSD(tab2.savingsM12)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-3xl border border-white/10 bg-[#070813]/60 p-4">
                      <div className="text-sm font-semibold text-slate-100">Cumulative cost vs value (12 months)</div>
                      <div className="mt-1 text-xs text-slate-400">New seats: cumulative cost and savings. Combined ROI: ROI multiple over time.</div>
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
                              formatter={(v: unknown, name: unknown) => {
                                const num = Number(v);
                                const nameStr = typeof name === "string" ? name : String(name ?? "");
                                if (nameStr.toLowerCase().includes("roi")) {
                                  return `${Number.isFinite(num) ? num.toFixed(1) : "—"}x`;
                                }
                                return Number.isFinite(num) ? formatUSD(num) : String(v ?? "");
                              }}
                              labelFormatter={(label) => `Month ${label}`}
                            />

                            {tab2.breakevenMonth !== null ? (
                              <ReferenceLine
                                yAxisId="left"
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
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6 lg:col-span-2">
                  <div className="text-base font-semibold text-slate-100">SKU Upsell Modeling</div>

                  <div className="mt-5 space-y-6">
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="mb-1 text-xs text-slate-400">Estimate confidence</div>
                        <SegmentedControl<EstimateMode>
                          value={estimateMode}
                          onChange={setEstimateMode}
                          options={[
                            { value: "conservative", label: "Conservative" },
                            { value: "moderate", label: "Moderate" },
                            { value: "aggressive", label: "Aggressive" },
                          ]}
                          ariaLabel="Estimate confidence"
                        />
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="mb-1 text-xs text-slate-400">Billing</div>
                          <SegmentedControl<BillingCadence>
                            value={billingCadence}
                            onChange={setBillingCadence}
                            options={[
                              { value: "monthly", label: "Monthly" },
                              { value: "annual", label: "Annual (20% off)" },
                            ]}
                            ariaLabel="Billing cadence"
                          />
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-slate-400">Export</div>
                          <button
                            type="button"
                            onClick={copySummary}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                            aria-label="Copy Summary"
                          >
                            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy Summary"}
                          </button>
                          <div className="mt-1 text-xs text-slate-400">Clipboard-ready for email/Slack</div>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 lg:col-span-1">
                          <div className="text-xs text-slate-400">Customer</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">
                            {customerName} · {currentSeats} seats · {currentPlan === "teams" ? "Teams" : "Enterprise"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-slate-100">Section A: Plan Upgrade Modeling</div>
                      <div className="mt-1 text-xs text-slate-400">Toggle scenarios to model incremental cost and productivity value.</div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* Teams to Enterprise */}
                        <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">Teams to Enterprise</div>
                              <div className="text-xs text-slate-400 mt-1">Pooled usage / admin features</div>
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
                            <div className="text-xs text-slate-400">Enterprise per-seat price</div>
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
                              Default: $60/user/month. Note: only incremental cost is modeled here.
                            </div>
                          </div>

                          <div className="mt-4 text-xs text-slate-300">
                            <div className="font-semibold text-slate-100">Benefits (highlight only)</div>
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
                              Pooled usage can reduce waste from underutilizing individual credit pools.
                            </div>
                          </div>
                        </div>

                        {/* Pro to Pro+ */}
                        <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">Pro to Pro+</div>
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
                            <div className="mt-2">
                              <StepNumber value={proPlusUsers} onChange={setProPlusUsers} min={0} max={5000} ariaLabel="Pro+ users" />
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              Price delta assumed: +${(CURSOR_PRO_PLUS_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY).toFixed(0)}/mo incremental.
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-slate-400">Additional annual investment</div>
                            <div className="mt-1 text-sm font-semibold text-emerald-300">
                              {formatUSD(tab3.proPlusAdditionalAnnualInvestment)}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-400">
                              Additional productivity boost modeled as +{(tab3.proPlusRelativeBoost * 100).toFixed(1)}% relative for upgraded users.
                            </div>
                            <div className="mt-2 text-[11px] text-slate-400">
                              Estimated incremental productivity value: <span className="text-slate-200 font-semibold">{formatUSD(tab3.proPlusAdditionalAnnualValue)}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Effective gain moves from {tab3.baseGainEffectivePct.toFixed(1)}% to {tab3.gainProPlusEffectivePct.toFixed(1)}% (+
                              {(tab3.gainProPlusEffectivePct - tab3.baseGainEffectivePct).toFixed(1)} pts).
                            </div>
                          </div>
                        </div>

                        {/* Pro to Ultra */}
                        <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">Pro to Ultra</div>
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
                            <div className="mt-2">
                              <StepNumber value={proUltraUsers} onChange={setProUltraUsers} min={0} max={5000} ariaLabel="Ultra users" />
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              Price delta assumed: +${(CURSOR_ULTRA_PRICE_MONTHLY - CURSOR_PRO_PRICE_MONTHLY).toFixed(0)}/mo incremental.
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-slate-400">Additional annual investment</div>
                            <div className="mt-1 text-sm font-semibold text-emerald-300">
                              {formatUSD(tab3.proUltraAdditionalAnnualInvestment)}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-400">
                              Productivity boost modeled as +{(tab3.proUltraRelativeBoost * 100).toFixed(0)}% relative for upgraded users.
                            </div>
                            <div className="mt-2 text-[11px] text-slate-400">
                              Estimated incremental productivity value: <span className="text-slate-200 font-semibold">{formatUSD(tab3.proUltraAdditionalAnnualValue)}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Effective gain moves from {tab3.baseGainEffectivePct.toFixed(1)}% to {tab3.gainUltraEffectivePct.toFixed(1)}% (+
                              {(tab3.gainUltraEffectivePct - tab3.baseGainEffectivePct).toFixed(1)} pts).
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bugbot */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-slate-100">Section B: Add-on (Bugbot)</div>
                      <div className="mt-1 text-xs text-slate-400">Modeled as saved code review time on PRs.</div>

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-[#0a0b10]/60 p-4">
                          <div className="text-xs text-slate-400">Number of Bugbot seats</div>
                          <div className="mt-3">
                            <StepNumber value={bugbotSeats} onChange={setBugbotSeats} min={0} max={5000} ariaLabel="Bugbot seats" />
                          </div>
                          <div className="mt-2 text-xs text-slate-400">Price: ${BUGBOT_PRICE_MONTHLY}/user/month (discount applied per billing toggle)</div>
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
                            ariaLabel="Bugbot code review reduction"
                            minLabel="10%"
                            maxLabel="50%"
                          />
                          <div className="mt-4 text-xs text-slate-300">
                            <div className="font-semibold text-slate-100">Benefits (highlight only)</div>
                            <div className="mt-2 space-y-1">
                              <div>• AI code review on GitHub PRs</div>
                              <div>• Automated bug detection</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-3">
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
                      </div>
                    </div>

                    {/* Combined summary */}
                    <div className="rounded-3xl border border-white/10 bg-[#070813]/60 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-base font-semibold text-slate-100">Section C: Combined Upsell Summary</div>
                          <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                            Upgrading {customerName} via{" "}
                            <span className="font-semibold">
                              {[
                                toggleTeamsToEnterprise && currentPlan === "teams" ? "Enterprise" : null,
                                toggleProToProPlus ? `Pro+ (${proPlusUsers} users)` : null,
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

                        <div className="w-full min-w-0 shrink-0 md:max-w-sm">
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

                      <div className="mt-5 grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Total additional annual investment" value={formatUSD(tab3.combinedAdditionalAnnualInvestment)} sub="Enabled toggles + Bugbot" />
                        <MetricCard label="Total additional annual value generated" value={formatUSD(tab3.combinedAdditionalAnnualValue)} sub="Incremental value only" tone="good" />
                        <MetricCard hero label="Combined annual ROI multiple" value={`${tab3.combinedRoiMultiple.toFixed(1)}x`} sub={`Base ROI: ${tab1.roiMultiple.toFixed(1)}x`} tone={tab3.combinedRoiMultiple >= 1 ? "good" : "bad"} />
                        <MetricCard label="Combined annual net ROI" value={`${tab3.combinedNet >= 0 ? "+" : ""}${formatUSD(tab3.combinedNet)}`} sub={`Base annual net: ${formatUSD(tab1.netRoi)}`} tone={tab3.combinedNet >= 0 ? "good" : "bad"} />
                      </div>

                      <div className="mt-3 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Assumptions:</span> {assumptionsTab3}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

