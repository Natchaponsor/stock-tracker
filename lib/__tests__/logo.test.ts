import { describe, expect, it } from "vitest";
import { isAllowedLogoUrl, isLogoSymbol, logoSrc } from "../logo";

describe("isLogoSymbol", () => {
  it("accepts ordinary and class-share tickers", () => {
    for (const s of ["AAPL", "NVDA", "BRK.B", "BF-B", "7203", "A"]) expect(isLogoSymbol(s)).toBe(true);
  });

  it("rejects anything that is not a plain uppercase ticker", () => {
    for (const s of ["", "aapl", ".AAPL", "AAPL/../x", "A B", "TOOLONGTICKER1", "AAPL&token=x"]) {
      expect(isLogoSymbol(s)).toBe(false);
    }
  });
});

describe("isAllowedLogoUrl", () => {
  it("allows Finnhub's own image hosts over HTTPS", () => {
    expect(isAllowedLogoUrl("https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/MRVL.png")).toBe(true);
    expect(isAllowedLogoUrl("https://finnhub.io/logo.png")).toBe(true);
  });

  it("refuses other hosts, look-alikes, plain HTTP and junk", () => {
    expect(isAllowedLogoUrl("https://evil.example/logo.png")).toBe(false);
    expect(isAllowedLogoUrl("https://finnhub.io.evil.example/logo.png")).toBe(false);
    expect(isAllowedLogoUrl("https://notfinnhub.io/logo.png")).toBe(false);
    expect(isAllowedLogoUrl("http://static2.finnhub.io/logo.png")).toBe(false);
    expect(isAllowedLogoUrl("not a url")).toBe(false);
    expect(isAllowedLogoUrl("")).toBe(false);
  });
});

describe("logoSrc", () => {
  it("points at the app's own route and escapes the symbol", () => {
    expect(logoSrc("BRK.B")).toBe("/api/logo?symbol=BRK.B");
    expect(logoSrc("A&B")).toBe("/api/logo?symbol=A%26B");
  });
});
