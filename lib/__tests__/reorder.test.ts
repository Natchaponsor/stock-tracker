import { describe, expect, it } from "vitest";
import { moveKey, orderByKeys } from "../reorder";

const items = [{ s: "AAPL" }, { s: "NVDA" }, { s: "PLTR" }, { s: "COST" }];
const key = (i: { s: string }) => i.s;

describe("orderByKeys", () => {
  it("reorders items to match the given keys", () => {
    expect(orderByKeys(items, ["COST", "AAPL", "PLTR", "NVDA"], key).map(key)).toEqual(["COST", "AAPL", "PLTR", "NVDA"]);
  });

  it("keeps items missing from the ordering at the end, in their original order", () => {
    expect(orderByKeys(items, ["PLTR"], key).map(key)).toEqual(["PLTR", "AAPL", "NVDA", "COST"]);
  });

  it("ignores unknown and duplicated keys rather than dropping or duplicating items", () => {
    const result = orderByKeys(items, ["ZZZZ", "NVDA", "NVDA", "AAPL"], key).map(key);
    expect(result).toEqual(["NVDA", "AAPL", "PLTR", "COST"]);
    expect(result).toHaveLength(items.length);
  });
});

describe("moveKey", () => {
  const keys = ["AAPL", "NVDA", "PLTR", "COST"];

  it("moves a key up or down by one", () => {
    expect(moveKey(keys, "PLTR", -1)).toEqual(["AAPL", "PLTR", "NVDA", "COST"]);
    expect(moveKey(keys, "AAPL", 1)).toEqual(["NVDA", "AAPL", "PLTR", "COST"]);
  });

  it("clamps at the ends", () => {
    expect(moveKey(keys, "AAPL", -1)).toBe(keys);
    expect(moveKey(keys, "COST", 1)).toBe(keys);
    expect(moveKey(keys, "NVDA", 10)).toEqual(["AAPL", "PLTR", "COST", "NVDA"]);
  });

  it("returns the list unchanged for an unknown key", () => {
    expect(moveKey(keys, "MSFT", 1)).toBe(keys);
  });
});
