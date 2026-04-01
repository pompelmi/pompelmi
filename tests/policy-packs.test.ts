import { describe, expect, it } from "vitest";
import { getPolicyPack, POLICY_PACKS } from "../src/policy-packs";

describe("getPolicyPack", () => {
  it("returns the matching built-in policy pack", () => {
    expect(getPolicyPack("strict-public-upload")).toBe(POLICY_PACKS["strict-public-upload"]);
  });

  it("throws a helpful error for unknown policy pack names", () => {
    try {
      getPolicyPack("not-a-pack" as never);
      throw new Error("Expected getPolicyPack to throw for unknown policy pack name");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("Unknown policy pack: 'not-a-pack'");
      expect(message).toContain("Valid names:");
      for (const name of Object.keys(POLICY_PACKS)) {
        expect(message).toContain(name);
      }
    }
  });
});
