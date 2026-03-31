import { describe, expect, it } from "vitest";
import * as pkg from "../src";

describe("smoke", () => {
  it("package loads", () => {
    expect(pkg).toBeTruthy();
  });
});
