import { describe, it, expect } from "vitest";
import {
  calculateYel,
  YEL_RATE_2026,
  YEL_NEW_ENTREPRENEUR_DISCOUNT,
  YEL_MIN_INCOME_CENTS,
  YEL_MAX_INCOME_CENTS,
} from "../yel";

describe("calculateYel", () => {
  it("should calculate YEL at 24.4% base rate", () => {
    const result = calculateYel({
      yelIncomeCents: 7000000, // EUR 70,000
      isNewEntrepreneur: false,
    });
    // 70,000 * 0.244 = 17,080
    expect(result.annualContributionCents).toBe(1708000);
    expect(result.effectiveRate).toBe(YEL_RATE_2026);
    expect(result.discountRate).toBe(0);
  });

  it("should apply 22% new entrepreneur discount", () => {
    const result = calculateYel({
      yelIncomeCents: 7000000, // EUR 70,000
      isNewEntrepreneur: true,
    });
    // Effective rate = 24.4% * (1 - 0.22) = 24.4% * 0.78 = 19.032%
    const expectedRate = YEL_RATE_2026 * (1 - YEL_NEW_ENTREPRENEUR_DISCOUNT);
    expect(result.effectiveRate).toBeCloseTo(expectedRate, 4);
    expect(result.discountRate).toBe(YEL_NEW_ENTREPRENEUR_DISCOUNT);
    // 70,000 * 0.19032 = 13,322.40 => 1332240
    expect(result.annualContributionCents).toBe(1332240);
  });

  it("should clamp to minimum YEL income", () => {
    const result = calculateYel({
      yelIncomeCents: 100000, // EUR 1,000 — below minimum
      isNewEntrepreneur: false,
    });
    expect(result.yelIncomeCents).toBe(YEL_MIN_INCOME_CENTS);
    // Min income EUR 9,423.09 * 0.244 = ~2,299.23
    const expectedContribution = Math.round(YEL_MIN_INCOME_CENTS * YEL_RATE_2026);
    expect(result.annualContributionCents).toBe(expectedContribution);
  });

  it("should clamp to maximum YEL income", () => {
    const result = calculateYel({
      yelIncomeCents: 50000000, // EUR 500,000 — above maximum
      isNewEntrepreneur: false,
    });
    expect(result.yelIncomeCents).toBe(YEL_MAX_INCOME_CENTS);
    const expectedContribution = Math.round(YEL_MAX_INCOME_CENTS * YEL_RATE_2026);
    expect(result.annualContributionCents).toBe(expectedContribution);
  });

  it("should calculate monthly as annual / 12 (rounded)", () => {
    const result = calculateYel({
      yelIncomeCents: 7000000,
      isNewEntrepreneur: false,
    });
    expect(result.monthlyContributionCents).toBe(
      Math.round(result.annualContributionCents / 12)
    );
  });

  it("should calculate pension accrual at 1.5%", () => {
    const result = calculateYel({
      yelIncomeCents: 7000000,
      isNewEntrepreneur: false,
    });
    // 70,000 * 0.015 = 1,050 EUR = 105000 cents
    expect(result.annualPensionAccrualCents).toBe(105000);
  });

  it("should produce lower contribution for new entrepreneur", () => {
    const regular = calculateYel({ yelIncomeCents: 7000000, isNewEntrepreneur: false });
    const newEntr = calculateYel({ yelIncomeCents: 7000000, isNewEntrepreneur: true });
    expect(newEntr.annualContributionCents).toBeLessThan(regular.annualContributionCents);
  });

  it("should return all fields", () => {
    const result = calculateYel({ yelIncomeCents: 7000000, isNewEntrepreneur: false });
    expect(result).toHaveProperty("yelIncomeCents");
    expect(result).toHaveProperty("baseRate");
    expect(result).toHaveProperty("discountRate");
    expect(result).toHaveProperty("effectiveRate");
    expect(result).toHaveProperty("annualContributionCents");
    expect(result).toHaveProperty("monthlyContributionCents");
    expect(result).toHaveProperty("annualPensionAccrualCents");
  });
});
