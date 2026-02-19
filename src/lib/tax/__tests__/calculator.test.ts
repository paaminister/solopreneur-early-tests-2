import { describe, it, expect } from "vitest";
import { calculateTax, MUNICIPAL_TAX_RATES, DEFAULT_CHURCH_TAX_RATE } from "../calculator";

describe("calculateTax", () => {
  const defaultParams = {
    municipalTaxRate: MUNICIPAL_TAX_RATES.Helsinki, // 0.185
    churchTaxRate: DEFAULT_CHURCH_TAX_RATE, // 0.01
    applyEntrepreneurDeduction: true,
    yelContributionCents: 1708000, // EUR 17,080
  };

  it("should return zero tax for zero income", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 0,
    });
    expect(result.totalTaxCents).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.stateTaxCents).toBe(0);
    expect(result.municipalTaxCents).toBe(0);
    expect(result.churchTaxCents).toBe(0);
  });

  it("should return zero tax for negative income", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: -500000,
    });
    expect(result.totalTaxCents).toBe(0);
  });

  it("should calculate 5% yrittajavahennys", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000, // EUR 100,000
    });
    expect(result.entrepreneurDeductionCents).toBe(500000); // 5% of 100,000 = 5,000
  });

  it("should NOT apply yrittajavahennys when disabled", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000,
      applyEntrepreneurDeduction: false,
    });
    expect(result.entrepreneurDeductionCents).toBe(0);
  });

  it("should deduct YEL from taxable income", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000, // EUR 100,000
      yelContributionCents: 1708000, // EUR 17,080
    });
    // Deductions = YEL 17,080 + Yrittäjävähennys 5,000 = 22,080
    // Taxable = 100,000 - 22,080 = 77,920
    expect(result.deductionsCents).toBe(2208000);
    expect(result.taxableIncomeCents).toBe(7792000);
  });

  it("should have progressive state tax — higher income = higher rate", () => {
    const lowIncome = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 5000000, // EUR 50,000
    });
    const highIncome = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 15000000, // EUR 150,000
    });
    expect(highIncome.effectiveRate).toBeGreaterThan(lowIncome.effectiveRate);
  });

  it("should calculate Helsinki municipal tax at 18.5%", () => {
    const result = calculateTax({
      earnedIncomeCents: 10000000,
      municipalTaxRate: 0.185,
      churchTaxRate: 0,
      applyEntrepreneurDeduction: false,
      yelContributionCents: 0,
    });
    // Taxable = 100,000. Municipal = 100,000 * 0.185 = 18,500
    expect(result.municipalTaxCents).toBe(1850000);
  });

  it("should add church tax when rate > 0", () => {
    const withChurch = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000,
    });
    const withoutChurch = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000,
      churchTaxRate: 0,
    });
    expect(withChurch.totalTaxCents).toBeGreaterThan(withoutChurch.totalTaxCents);
    expect(withChurch.churchTaxCents).toBeGreaterThan(0);
    expect(withoutChurch.churchTaxCents).toBe(0);
  });

  it("should calculate correct marginal rate", () => {
    // With taxable income in bracket 3 (30,500 - 50,400), state rate = 17.64%
    // Plus municipal 18.5% + church 1% = 37.14% marginal
    const result = calculateTax({
      earnedIncomeCents: 5000000, // EUR 50,000
      municipalTaxRate: 0.185,
      churchTaxRate: 0.01,
      applyEntrepreneurDeduction: false,
      yelContributionCents: 0,
    });
    // Taxable = 50,000. In bracket 50,400+ => rate 0.2132
    // But 50,000 < 50,400, so still in bracket 30,500-50,400 => rate 0.1764
    // Marginal = 0.1764 + 0.185 + 0.01 = 0.3714
    expect(result.marginalRate).toBeCloseTo(0.3714, 3);
  });

  it("should handle typical solo doctor income (~EUR 70,000)", () => {
    const result = calculateTax({
      earnedIncomeCents: 7000000,
      municipalTaxRate: MUNICIPAL_TAX_RATES.Helsinki,
      churchTaxRate: DEFAULT_CHURCH_TAX_RATE,
      applyEntrepreneurDeduction: true,
      yelContributionCents: 1708000,
    });
    // Should produce a reasonable effective rate (15-30%)
    expect(result.effectiveRate).toBeGreaterThan(0.10);
    expect(result.effectiveRate).toBeLessThan(0.35);
    expect(result.totalTaxCents).toBeGreaterThan(0);
  });

  it("should produce higher tax for Rovaniemi vs Espoo", () => {
    const espoo = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000,
      municipalTaxRate: MUNICIPAL_TAX_RATES.Espoo, // 17.75%
    });
    const rovaniemi = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 10000000,
      municipalTaxRate: MUNICIPAL_TAX_RATES.Rovaniemi, // 21.75%
    });
    expect(rovaniemi.totalTaxCents).toBeGreaterThan(espoo.totalTaxCents);
  });

  it("should return all fields in the result", () => {
    const result = calculateTax({
      ...defaultParams,
      earnedIncomeCents: 5000000,
    });
    expect(result).toHaveProperty("grossIncomeCents");
    expect(result).toHaveProperty("deductionsCents");
    expect(result).toHaveProperty("taxableIncomeCents");
    expect(result).toHaveProperty("entrepreneurDeductionCents");
    expect(result).toHaveProperty("stateTaxCents");
    expect(result).toHaveProperty("municipalTaxCents");
    expect(result).toHaveProperty("churchTaxCents");
    expect(result).toHaveProperty("totalTaxCents");
    expect(result).toHaveProperty("effectiveRate");
    expect(result).toHaveProperty("marginalRate");
  });
});
