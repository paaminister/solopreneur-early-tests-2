"use client";

import { useEffect, useState } from "react";
import TaxGauge from "@/components/TaxGauge";

interface TaxEstimate {
  period: string;
  totalIncomeCents: number;
  totalExpensesCents: number;
  yelPaidCents: number;
  netProfitCents: number;
  municipality: string;
  churchMember: boolean;
  yel: {
    yelIncomeCents: number;
    baseRate: number;
    effectiveRate: number;
    annualContributionCents: number;
    monthlyContributionCents: number;
    annualPensionAccrualCents: number;
  };
  tax: {
    grossIncomeCents: number;
    deductionsCents: number;
    taxableIncomeCents: number;
    entrepreneurDeductionCents: number;
    stateTaxCents: number;
    municipalTaxCents: number;
    churchTaxCents: number;
    totalTaxCents: number;
    effectiveRate: number;
    marginalRate: number;
  };
}

interface EnnakkoveroData {
  year: number;
  installments: {
    id: number;
    year: number;
    due_date: string;
    amount_cents: number;
    paid: number;
  }[];
  comparison: {
    status: string;
    totalScheduledCents: number;
    totalPaidCents: number;
    estimatedAnnualTaxCents: number;
    differencePercent: number;
    message: string;
  };
  verokorttiComparison: {
    verokorttiRate: number;
    calculatedEffectiveRate: number;
    difference: number;
    message: string;
  } | null;
}

interface TaxCard {
  id: number;
  year: number;
  card_type: string;
  base_rate_pct: number;
  additional_rate_pct: number | null;
  income_limit_cents: number | null;
  in_ennakkoperintarekisteri: number;
  notes: string | null;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
}

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-green-100 text-green-700 border-green-200",
  overpaying: "bg-blue-100 text-blue-700 border-blue-200",
  underpaying: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export default function TaxPage() {
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null);
  const [ennakkovero, setEnnakkovero] = useState<EnnakkoveroData | null>(null);
  const [taxCards, setTaxCards] = useState<TaxCard[]>([]);
  const [municipality, setMunicipality] = useState("Helsinki");
  const [church, setChurch] = useState(true);

  useEffect(() => {
    fetch(`/api/tax/estimate?municipality=${municipality}&church=${church}`)
      .then((r) => r.json())
      .then(setEstimate);
  }, [municipality, church]);

  useEffect(() => {
    fetch(`/api/tax/ennakkovero?year=2026&municipality=${municipality}`)
      .then((r) => r.json())
      .then(setEnnakkovero);
    fetch("/api/tax/card")
      .then((r) => r.json())
      .then(setTaxCards);
  }, [municipality]);

  if (!estimate) return <p>Loading...</p>;

  const currentCard = taxCards.find((c) => c.year === 2026);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tax Estimator (2026)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Verokortti */}
          {currentCard && (
            <div className="bg-white border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">Verokortti (Tax Card) 2026</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">Card Type</span>
                  <span className="font-medium capitalize">{currentCard.card_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base Rate</span>
                  <span className="font-mono font-medium">{currentCard.base_rate_pct}%</span>
                </div>
                {currentCard.additional_rate_pct && (
                  <>
                    <div>
                      <span className="text-slate-500 block">Additional Rate</span>
                      <span className="font-mono font-medium">{currentCard.additional_rate_pct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Income Limit</span>
                      <span className="font-mono font-medium">
                        {currentCard.income_limit_cents ? formatEur(currentCard.income_limit_cents) : "-"}
                      </span>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <span className="text-slate-500 block">Ennakkoperintarekisteri</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${currentCard.in_ennakkoperintarekisteri ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {currentCard.in_ennakkoperintarekisteri ? "Registered" : "NOT registered"}
                  </span>
                </div>
                {currentCard.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Notes</span>
                    <span className="text-xs text-slate-600">{currentCard.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ennakkovero comparison */}
          {ennakkovero && (
            <div className="bg-white border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">Ennakkovero (Prepayment Tax) 2026</h3>
              {ennakkovero.comparison && (
                <div className={`rounded-lg border p-3 mb-4 text-sm ${STATUS_COLORS[ennakkovero.comparison.status] || "bg-slate-100"}`}>
                  <p className="font-medium">{ennakkovero.comparison.message}</p>
                  <div className="flex gap-6 mt-2 text-xs">
                    <span>Scheduled: {formatEur(ennakkovero.comparison.totalScheduledCents)}</span>
                    <span>Paid: {formatEur(ennakkovero.comparison.totalPaidCents)}</span>
                    <span>Estimated tax: {formatEur(ennakkovero.comparison.estimatedAnnualTaxCents)}</span>
                  </div>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Due Date</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ennakkovero.installments.map((inst) => (
                    <tr key={inst.id} className="border-b">
                      <td className="py-2 pr-4">{inst.due_date}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatEur(inst.amount_cents)}</td>
                      <td className="py-2">
                        {inst.paid ? (
                          <span className="text-green-600 text-xs font-medium">Paid</span>
                        ) : (
                          <span className="text-amber-600 text-xs">Upcoming</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Verokortti vs calculated rate comparison */}
              {ennakkovero.verokorttiComparison && (
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Verokortti vs. Actual Tax Rate</h4>
                  <div className={`rounded-lg border p-3 text-sm ${
                    Math.abs(ennakkovero.verokorttiComparison.difference) <= 2
                      ? "bg-green-50 border-green-200 text-green-700"
                      : ennakkovero.verokorttiComparison.difference > 0
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}>
                    <p>{ennakkovero.verokorttiComparison.message}</p>
                    <div className="flex gap-6 mt-2 text-xs">
                      <span>Verokortti: {ennakkovero.verokorttiComparison.verokorttiRate}%</span>
                      <span>Calculated: {ennakkovero.verokorttiComparison.calculatedEffectiveRate}%</span>
                      <span>Difference: {ennakkovero.verokorttiComparison.difference > 0 ? "+" : ""}{ennakkovero.verokorttiComparison.difference}pp</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Income Summary</h3>
            <TaxGauge label="Gross Income" valueCents={estimate.totalIncomeCents} />
            <TaxGauge label="Business Expenses" valueCents={estimate.totalExpensesCents} />
            <TaxGauge label="Net Profit (Business Result)" valueCents={estimate.netProfitCents} />
          </div>

          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Tax Calculation</h3>
            <TaxGauge label="Gross Earned Income" valueCents={estimate.tax.grossIncomeCents} />
            <TaxGauge label="Yrittajavahennys (5%)" valueCents={estimate.tax.entrepreneurDeductionCents} />
            <TaxGauge label="YEL Deduction" valueCents={estimate.yelPaidCents} />
            <TaxGauge label="Total Deductions" valueCents={estimate.tax.deductionsCents} />
            <TaxGauge label="Taxable Income" valueCents={estimate.tax.taxableIncomeCents} />
            <div className="mt-4 pt-2 border-t">
              <TaxGauge label="State Tax (progressive)" valueCents={estimate.tax.stateTaxCents} rate={estimate.tax.stateTaxCents / Math.max(1, estimate.tax.taxableIncomeCents)} />
              <TaxGauge label={`Municipal Tax (${municipality})`} valueCents={estimate.tax.municipalTaxCents} />
              {church && <TaxGauge label="Church Tax" valueCents={estimate.tax.churchTaxCents} />}
            </div>
            <div className="mt-4 pt-2 border-t-2 border-slate-900">
              <TaxGauge label="Total Tax" valueCents={estimate.tax.totalTaxCents} rate={estimate.tax.effectiveRate} />
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-slate-600">Marginal Rate (next EUR)</span>
                <span className="font-mono font-medium text-amber-600">
                  {(estimate.tax.marginalRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">YEL Pension Insurance</h3>
            <TaxGauge label="Confirmed YEL Income" valueCents={estimate.yel.yelIncomeCents} />
            <TaxGauge label="YEL Rate" valueCents={0} rate={estimate.yel.effectiveRate} />
            <TaxGauge label="Annual YEL Contribution" valueCents={estimate.yel.annualContributionCents} />
            <TaxGauge label="Monthly YEL Contribution" valueCents={estimate.yel.monthlyContributionCents} />
            <TaxGauge label="Annual Pension Accrual (est.)" valueCents={estimate.yel.annualPensionAccrualCents} />
          </div>
        </div>

        <div>
          <div className="bg-white border rounded-lg p-4 sticky top-6">
            <h3 className="font-semibold mb-3">Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 block mb-1">Municipality</label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyvaskyla", "Kuopio", "Lahti", "Rovaniemi"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={church}
                    onChange={(e) => setChurch(e.target.checked)}
                  />
                  Church member (ev.lut.)
                </label>
              </div>
              <div className="pt-3 border-t text-xs text-slate-500">
                <p>Tax brackets: 2026 Finnish state income tax</p>
                <p>Municipal rates: 2026 estimates</p>
                <p>YEL rate: 24.4% (2026)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
