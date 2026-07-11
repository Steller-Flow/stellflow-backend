import { describe, it, expect } from "vitest";
import { sanitizeString, sanitizeUrl } from "../../middleware/sanitize.js";

describe("Sanitize Middleware", () => {
  describe("sanitizeString", () => {
    it("should remove HTML tags", () => {
      const result = sanitizeString("<script>alert('xss')</script>Hello");
      expect(result).toBe("Hello");
      expect(result).not.toContain("<script>");
    });

    it("should remove nested HTML tags", () => {
      const result = sanitizeString("<div><b>Bold</b></div>");
      expect(result).toBe("Bold");
    });

    it("should handle plain text", () => {
      const result = sanitizeString("Hello World");
      expect(result).toBe("Hello World");
    });

    it("should trim whitespace", () => {
      const result = sanitizeString("  Hello  ");
      expect(result).toBe("Hello");
    });

    it("should handle empty string", () => {
      const result = sanitizeString("");
      expect(result).toBe("");
    });

    it("should remove img tags with onerror", () => {
      const result = sanitizeString('<img src=x onerror="alert(1)">');
      expect(result).not.toContain("<img");
      expect(result).not.toContain("onerror");
    });
  });

  describe("sanitizeUrl", () => {
    it("should allow normal URLs", () => {
      const result = sanitizeUrl("https://example.com");
      expect(result).toBe("https://example.com");
    });

    it("should block javascript: URLs", () => {
      const result = sanitizeUrl("javascript:alert('xss')");
      expect(result).toBe("");
    });

    it("should block data: URLs", () => {
      const result = sanitizeUrl("data:text/html,<script>alert('xss')</script>");
      expect(result).toBe("");
    });

    it("should block vbscript: URLs", () => {
      const result = sanitizeUrl("vbscript:MsgBox('xss')");
      expect(result).toBe("");
    });

    it("should block file: URLs", () => {
      const result = sanitizeUrl("file:///etc/passwd");
      expect(result).toBe("");
    });

    it("should trim whitespace from URLs", () => {
      const result = sanitizeUrl("  https://example.com  ");
      expect(result).toBe("https://example.com");
    });

    it("should handle http URLs", () => {
      const result = sanitizeUrl("http://example.com");
      expect(result).toBe("http://example.com");
    });
  });
});
