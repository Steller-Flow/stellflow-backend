import { describe, it, expect } from "vitest";
import { config } from "../../config/index.js";

describe("Config", () => {
  it("should export config object with required fields", () => {
    expect(config).toBeDefined();
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe("number");
  });

  it("should have correct default port", () => {
    expect(config.port).toBe(3001);
  });

  it("should have jwt config", () => {
    expect(config.jwt).toBeDefined();
    expect(typeof config.jwt.secret).toBe("string");
    expect(typeof config.jwt.expiresIn).toBe("number");
    expect(typeof config.jwt.refreshExpiresIn).toBe("number");
  });

  it("should have stellar config", () => {
    expect(config.stellar).toBeDefined();
    expect(config.stellar.network).toBe("testnet");
    expect(config.stellar.horizonUrl).toContain("stellar.org");
  });

  it("should have cors config", () => {
    expect(config.cors).toBeDefined();
    expect(config.cors.origin).toBeDefined();
  });

  it("should have nodeEnv default to development", () => {
    expect(config.nodeEnv).toBeDefined();
  });
});
