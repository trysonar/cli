import { describe, it, expect } from "vitest";
import { formatJson } from "./json.js";

describe("formatJson", () => {
  it("formats object with 2-space indentation", () => {
    const result = formatJson({ data: [1, 2, 3] });
    expect(result).toBe(JSON.stringify({ data: [1, 2, 3] }, null, 2));
  });

  it("formats nested objects", () => {
    const input = {
      data: {
        id: "abc",
        nested: { key: "value" },
      },
    };
    const result = formatJson(input);
    expect(result).toContain('"id": "abc"');
    expect(result).toContain('"key": "value"');
  });

  it("formats null", () => {
    expect(formatJson(null)).toBe("null");
  });

  it("formats arrays", () => {
    const result = formatJson([1, 2, 3]);
    expect(JSON.parse(result)).toEqual([1, 2, 3]);
  });
});
