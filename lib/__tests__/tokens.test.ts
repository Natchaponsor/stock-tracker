import { describe, expect, it } from "vitest";
import { parseTokenBlock, token } from "../server/tokens";

describe("parseTokenBlock", () => {
  it("reads the custom properties of one block only", () => {
    const css = `:root {\n  --a: #111;\n  --b: 4px;\n}\n:root[data-theme="dark"] {\n  --a: #222;\n}`;
    expect(parseTokenBlock(css, ":root")).toEqual({ a: "#111", b: "4px" });
    expect(parseTokenBlock(css, ':root[data-theme="dark"]')).toEqual({ a: "#222" });
  });
});

describe("token", () => {
  it("reads light and dark values from the real tokens.css", () => {
    expect(token("ocean-500")).toBe("#0a5bc4");
    expect(token("surface-card", "dark")).toBe("#141e2e");
    // Values only defined once fall back to the shared :root value in dark.
    expect(token("ocean-500", "dark")).toBe("#0a5bc4");
  });

  it("fails loudly on an unknown name", () => {
    expect(() => token("not-a-token")).toThrow(/not-a-token/);
  });
});
