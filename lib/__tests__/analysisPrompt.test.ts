import { describe, expect, it } from "vitest";
import { actionNeedsStock, buildAnalysisPrompt } from "../analysisPrompt";

describe("actionNeedsStock", () => {
  it("is false for market-wide actions", () => {
    expect(actionNeedsStock("Market Performance")).toBe(false);
    expect(actionNeedsStock("Sector Rotation")).toBe(false);
  });

  it("is true for stock-specific actions", () => {
    expect(actionNeedsStock("Technical Analysis")).toBe(true);
    expect(actionNeedsStock("Fundamental Analysis")).toBe(true);
    expect(actionNeedsStock("Stock Performance")).toBe(true);
  });
});

describe("buildAnalysisPrompt", () => {
  it("includes the stock and market for a technical analysis", () => {
    const prompt = buildAnalysisPrompt({ action: "Technical Analysis", market: "Korea (KOSPI)", stock: "005930" });
    expect(prompt).toContain("/stock-analysis");
    expect(prompt).toContain("005930");
    expect(prompt).toContain("Korea (KOSPI)");
  });

  it("trims whitespace from the stock symbol", () => {
    const prompt = buildAnalysisPrompt({ action: "Stock Performance", market: "Japan (Nikkei)", stock: "  7203  " });
    expect(prompt).toContain("7203 in");
  });

  it("omits any stock reference for Market Performance", () => {
    const prompt = buildAnalysisPrompt({ action: "Market Performance", market: "Thailand (SET)", stock: "" });
    expect(prompt).toContain("Thailand (SET)");
    expect(prompt).not.toContain("undefined");
  });

  it("asks for both leading and lagging sectors on Sector Rotation", () => {
    const prompt = buildAnalysisPrompt({ action: "Sector Rotation", market: "Korea (KOSPI)", stock: "" });
    expect(prompt.toLowerCase()).toContain("outstanding");
    expect(prompt.toLowerCase()).toContain("underperforming");
  });
});
