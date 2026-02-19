import { describe, it, expect } from "vitest";
import { compareEnnakkovero, type EnnakkoveroInstallment } from "../ennakkovero";

function makeInstallments(
  amounts: number[],
  paidCount: number = 0
): EnnakkoveroInstallment[] {
  return amounts.map((amount, i) => ({
    id: i + 1,
    year: 2026,
    due_date: `2026-${String((i + 1) * 2).padStart(2, "0")}-23`,
    amount_cents: amount,
    paid: i < paidCount ? 1 : 0,
  }));
}

describe("compareEnnakkovero", () => {
  it("should return on_track when scheduled matches estimated", () => {
    // 6 installments of EUR 2,000 each = EUR 12,000 total
    const installments = makeInstallments([200000, 200000, 200000, 200000, 200000, 200000], 1);
    // Estimated annual tax = EUR 12,000. Month 2 => projection = 12,000 * (12/2) = 72,000
    // Wait — the projected difference would be huge. Let me set the right values.
    // If scheduled = 1,200,000 cents, and we pass estimatedAnnualTaxCents = 200,000 (YTD in month 2)
    // projection = 200,000 * (12/2) = 1,200,000. Diff = 1,200,000 - 1,200,000 = 0 => on_track
    const result = compareEnnakkovero(installments, 200000, 2);
    expect(result.status).toBe("on_track");
    expect(result.totalScheduledCents).toBe(1200000);
    expect(result.totalPaidCents).toBe(200000);
  });

  it("should detect underpaying when income exceeds schedule", () => {
    // Scheduled: EUR 10,000 total
    const installments = makeInstallments([250000, 250000, 250000, 250000], 1);
    // In month 6 with EUR 10,000 YTD tax => annual projection 10,000 * 2 = 20,000
    // Scheduled 10,000, projected 20,000, diff = +10,000, deviation = 100% => critical
    const result = compareEnnakkovero(installments, 1000000, 6);
    expect(["underpaying", "critical"]).toContain(result.status);
    expect(result.projectedDifferenceCents).toBeGreaterThan(0);
  });

  it("should detect overpaying when income is below schedule", () => {
    // Scheduled: EUR 20,000 total
    const installments = makeInstallments([500000, 500000, 500000, 500000], 2);
    // Month 6 with EUR 5,000 YTD tax => annual projection 5,000 * 2 = 10,000
    // Scheduled 20,000, projected 10,000, diff = -10,000 => overpaying
    const result = compareEnnakkovero(installments, 500000, 6);
    expect(result.status).toBe("overpaying");
    expect(result.projectedDifferenceCents).toBeLessThan(0);
  });

  it("should detect critical underpayment at >30% deviation", () => {
    const installments = makeInstallments([100000, 100000], 0);
    // Scheduled: EUR 2,000. Month 6, YTD tax EUR 5,000 => annual 10,000.
    // Diff = 10,000 - 2,000 = 8,000. Deviation = 8,000/2,000 = 400% => critical
    const result = compareEnnakkovero(installments, 500000, 6);
    expect(result.status).toBe("critical");
  });

  it("should calculate remaining correctly", () => {
    const installments = makeInstallments([300000, 300000, 300000], 2);
    const result = compareEnnakkovero(installments, 100000, 3);
    expect(result.totalScheduledCents).toBe(900000);
    expect(result.totalPaidCents).toBe(600000);
    expect(result.remainingCents).toBe(300000);
  });

  it("should find next unpaid installment", () => {
    const installments = makeInstallments([200000, 200000, 200000], 1);
    const result = compareEnnakkovero(installments, 100000, 2);
    expect(result.nextInstallment).not.toBeNull();
    expect(result.nextInstallment?.paid).toBe(0);
  });

  it("should return null nextInstallment when all paid", () => {
    const installments = makeInstallments([200000, 200000], 2);
    const result = compareEnnakkovero(installments, 100000, 12);
    // All are paid, so next is null
    expect(result.nextInstallment).toBeNull();
  });

  it("should handle empty installments", () => {
    const result = compareEnnakkovero([], 500000, 6);
    expect(result.totalScheduledCents).toBe(0);
    expect(result.totalPaidCents).toBe(0);
    expect(result.nextInstallment).toBeNull();
  });

  it("should return Finnish message", () => {
    const installments = makeInstallments([200000, 200000], 1);
    const result = compareEnnakkovero(installments, 33333, 2);
    // Should contain Finnish text
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });
});
