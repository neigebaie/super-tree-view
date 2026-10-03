import { describe, expect, it } from "vitest";
import { computeRange, scrollTopFor, splitHighlight } from "../src";

describe("computeRange", () => {
  it("returns the visible window plus overscan", () => {
    expect(computeRange(100_000, 32, 3200, 320, 5)).toEqual({ start: 95, end: 116 });
    expect(computeRange(100_000, 32, 0, 320, 5)).toEqual({ start: 0, end: 16 });
    expect(computeRange(10, 32, 0, 3200, 5)).toEqual({ start: 0, end: 10 });
    expect(computeRange(0, 32, 0, 320)).toEqual({ start: 0, end: 0 });
  });
});

describe("scrollTopFor", () => {
  it("scrolls the minimum amount", () => {
    expect(scrollTopFor(5, 32, 0, 320)).toBeNull();
    expect(scrollTopFor(20, 32, 0, 320)).toBe(21 * 32 - 320);
    expect(scrollTopFor(2, 32, 320, 320)).toBe(64);
  });
});

describe("splitHighlight", () => {
  it("splits around case-insensitive matches", () => {
    expect(splitHighlight("Newton's Law of law", "LAW")).toEqual([
      { text: "Newton's ", match: false },
      { text: "Law", match: true },
      { text: " of ", match: false },
      { text: "law", match: true },
    ]);
    expect(splitHighlight("abc", "")).toEqual([{ text: "abc", match: false }]);
  });
});
