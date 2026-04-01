import { describe, expect, it } from "vitest";
import { getPolicyPack, POLICY_PACKS } from "../src/policy-packs";

describe("getPolicyPack", () => {
  it("returns the matching built-in policy pack", () => {
    expect(getPolicyPack("strict-public-upload")).toBe(POLICY_PACKS["strict-public-upload"]);
  });

  it("throws a helpful error for unknown policy pack names", () => {
    expect(() => getPolicyPack("not-a-pack" as never)).toThrowError(
      "Unknown policy pack: 'not-a-pack'. Valid names: documents-only, images-only, strict-public-upload, conservative-default, archives",
    );
  });
});
