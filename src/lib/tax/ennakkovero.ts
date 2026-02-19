/**
 * Ennakkovero (prepayment tax) comparison logic.
 *
 * Compares the Vero-assigned prepayment schedule against
 * actual income trajectory to detect under/overpayment risk.
 */

export interface EnnakkoveroInstallment {
  id: number;
  year: number;
  due_date: string;
  amount_cents: number;
  paid: number;
}

export interface EnnakkoveroComparison {
  /** Total annual prepayment scheduled by Vero */
  totalScheduledCents: number;
  /** Total already paid */
  totalPaidCents: number;
  /** Remaining to pay */
  remainingCents: number;
  /** Estimated actual tax based on current income trajectory */
  estimatedActualTaxCents: number;
  /** Difference: positive = will owe back-tax, negative = overpaying */
  projectedDifferenceCents: number;
  /** Risk level */
  status: "on_track" | "underpaying" | "overpaying" | "critical";
  /** Human-readable message */
  message: string;
  /** Next upcoming installment */
  nextInstallment: EnnakkoveroInstallment | null;
}

export function compareEnnakkovero(
  installments: EnnakkoveroInstallment[],
  estimatedAnnualTaxCents: number,
  currentMonth: number // 1-12
): EnnakkoveroComparison {
  const totalScheduled = installments.reduce((sum, i) => sum + i.amount_cents, 0);
  const totalPaid = installments.filter((i) => i.paid).reduce((sum, i) => sum + i.amount_cents, 0);
  const remaining = totalScheduled - totalPaid;

  // Project annual tax from YTD trajectory
  // If we're in month 2 with X income, annual estimate = X * (12/2)
  const projectionFactor = currentMonth > 0 ? 12 / currentMonth : 12;
  const projectedAnnualTax = Math.round(estimatedAnnualTaxCents * projectionFactor);

  const difference = projectedAnnualTax - totalScheduled;

  // Thresholds: >15% deviation is concerning, >30% is critical
  const deviationPct = totalScheduled > 0 ? Math.abs(difference) / totalScheduled : 0;

  let status: EnnakkoveroComparison["status"];
  let message: string;

  if (deviationPct < 0.1) {
    status = "on_track";
    message = "Ennakkovero on aikataulussa. Ei tarvetta muutoksille.";
  } else if (difference > 0 && deviationPct >= 0.3) {
    status = "critical";
    message = `Tulosi ylittavat ennakkoveropaatoksen ${(deviationPct * 100).toFixed(0)}%. Paivita ennakkovero OmaVerossa valttaaksesi jaannoksen ja korot (8% viivastyskorko).`;
  } else if (difference > 0) {
    status = "underpaying";
    message = `Tulosi ovat ${(deviationPct * 100).toFixed(0)}% yli ennakkoveropaatoksen. Harkitse ennakkoveron korotusta OmaVerossa.`;
  } else {
    status = "overpaying";
    message = `Tulosi ovat ${(deviationPct * 100).toFixed(0)}% alle ennakkoveropaatoksen. Voit hakea ennakkoveron alentamista OmaVerosta.`;
  }

  const now = new Date().toISOString().split("T")[0];
  const nextInstallment = installments
    .filter((i) => !i.paid && i.due_date >= now)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] || null;

  return {
    totalScheduledCents: totalScheduled,
    totalPaidCents: totalPaid,
    remainingCents: remaining,
    estimatedActualTaxCents: projectedAnnualTax,
    projectedDifferenceCents: difference,
    status,
    message,
    nextInstallment,
  };
}
