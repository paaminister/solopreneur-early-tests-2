import { describe, it, expect } from "vitest";
import { generateForm5 } from "../form5";

describe("generateForm5", () => {
  it("should calculate revenue from income transactions", () => {
    const result = generateForm5([
      { type: "income", amount_cents: 500000, category: "clinic_income", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "income", amount_cents: 200000, category: "other_income", depreciation_years: null, depreciation_remaining_cents: null },
    ]);
    expect(result.revenue).toBe(700000);
  });

  it("should categorize YEL as yelPremiums (not otherExpenses)", () => {
    const result = generateForm5([
      { type: "income", amount_cents: 1000000, category: "clinic_income", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 170800, category: "yel", depreciation_years: null, depreciation_remaining_cents: null },
    ]);
    expect(result.yelPremiums).toBe(170800);
    expect(result.otherExpenses).toBe(0);
  });

  it("should put regular expenses in otherExpenses", () => {
    const result = generateForm5([
      { type: "expense", amount_cents: 50000, category: "potilasvakuutus", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 30000, category: "matkakulut", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 20000, category: "puhelin_netti", depreciation_years: null, depreciation_remaining_cents: null },
    ]);
    expect(result.otherExpenses).toBe(100000);
  });

  it("should depreciate equipment > EUR 1,200 using 25% reducing balance", () => {
    const result = generateForm5([
      {
        type: "expense",
        amount_cents: 250000, // EUR 2,500 MacBook
        category: "laitteet",
        depreciation_years: 3,
        depreciation_remaining_cents: 250000,
      },
    ]);
    // 25% of 250000 = 62500
    expect(result.depreciation).toBe(62500);
    expect(result.otherExpenses).toBe(0); // NOT in otherExpenses
    expect(result.depreciationDetails).toHaveLength(1);
    expect(result.depreciationDetails[0].annualDepreciationCents).toBe(62500);
  });

  it("should expense small equipment immediately", () => {
    const result = generateForm5([
      {
        type: "expense",
        amount_cents: 50000, // EUR 500 — below EUR 1,200 threshold
        category: "laitteet",
        depreciation_years: null,
        depreciation_remaining_cents: null,
      },
    ]);
    expect(result.depreciation).toBe(0);
    expect(result.otherExpenses).toBe(50000);
    expect(result.depreciationDetails).toHaveLength(0);
  });

  it("should handle large equipment without depreciation_years set", () => {
    const result = generateForm5([
      {
        type: "expense",
        amount_cents: 200000, // EUR 2,000 — above threshold but no depreciation fields
        category: "laitteet",
        depreciation_years: null,
        depreciation_remaining_cents: null,
      },
    ]);
    // Should auto-depreciate: 25% of 200000 = 50000
    expect(result.depreciation).toBe(50000);
    expect(result.depreciationDetails).toHaveLength(1);
    expect(result.depreciationDetails[0].depreciationYears).toBe(3); // default
  });

  it("should calculate operatingProfit correctly with depreciation", () => {
    const result = generateForm5([
      { type: "income", amount_cents: 1000000, category: "clinic_income", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 50000, category: "potilasvakuutus", depreciation_years: null, depreciation_remaining_cents: null },
      {
        type: "expense",
        amount_cents: 200000,
        category: "laitteet",
        depreciation_years: 3,
        depreciation_remaining_cents: 200000,
      },
    ]);
    // Revenue: 1,000,000
    // Other expenses: 50,000
    // Depreciation: 25% of 200,000 = 50,000
    // Operating profit: 1,000,000 - 50,000 - 50,000 = 900,000
    expect(result.operatingProfit).toBe(900000);
  });

  it("should track expense breakdown by category", () => {
    const result = generateForm5([
      { type: "expense", amount_cents: 50000, category: "potilasvakuutus", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 30000, category: "potilasvakuutus", depreciation_years: null, depreciation_remaining_cents: null },
      { type: "expense", amount_cents: 20000, category: "matkakulut", depreciation_years: null, depreciation_remaining_cents: null },
    ]);
    expect(result.expenseBreakdown.potilasvakuutus).toBe(80000);
    expect(result.expenseBreakdown.matkakulut).toBe(20000);
  });

  it("should handle empty transactions", () => {
    const result = generateForm5([]);
    expect(result.revenue).toBe(0);
    expect(result.otherExpenses).toBe(0);
    expect(result.depreciation).toBe(0);
    expect(result.operatingProfit).toBe(0);
    expect(result.businessResult).toBe(0);
  });

  it("should use depreciation_remaining_cents (not original amount) for depreciation calc", () => {
    const result = generateForm5([
      {
        type: "expense",
        amount_cents: 250000, // original EUR 2,500
        category: "laitteet",
        depreciation_years: 3,
        depreciation_remaining_cents: 187500, // After 1 year: 250000 - 62500 = 187500
      },
    ]);
    // 25% of remaining 187500 = 46875
    expect(result.depreciation).toBe(46875);
    expect(result.depreciationDetails[0].remainingCents).toBe(187500);
    expect(result.depreciationDetails[0].originalAmountCents).toBe(250000);
  });
});
