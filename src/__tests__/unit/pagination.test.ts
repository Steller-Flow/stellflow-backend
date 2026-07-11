import { describe, it, expect } from "vitest";
import { getPaginationParams, getPaginationMeta, getSkipTake } from "../../utils/pagination.js";

describe("Pagination Utils", () => {
  describe("getPaginationParams", () => {
    it("should return defaults for empty query", () => {
      const result = getPaginationParams({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it("should parse page and limit from query", () => {
      const result = getPaginationParams({ page: "3", limit: "50" });
      expect(result).toEqual({ page: 3, limit: 50 });
    });

    it("should enforce minimum page of 1", () => {
      const result = getPaginationParams({ page: "0" });
      expect(result.page).toBe(1);
    });

    it("should enforce negative page to 1", () => {
      const result = getPaginationParams({ page: "-5" });
      expect(result.page).toBe(1);
    });

    it("should enforce maximum limit of 100", () => {
      const result = getPaginationParams({ limit: "200" });
      expect(result.limit).toBe(100);
    });

    it("should default limit to 20 for zero value", () => {
      const result = getPaginationParams({ limit: "0" });
      expect(result.limit).toBe(20);
    });

    it("should handle non-numeric strings", () => {
      const result = getPaginationParams({ page: "abc", limit: "xyz" });
      expect(result).toEqual({ page: 1, limit: 20 });
    });
  });

  describe("getPaginationMeta", () => {
    it("should calculate correct total pages", () => {
      const result = getPaginationMeta(1, 10, 55);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 55,
        totalPages: 6,
      });
    });

    it("should handle exact division", () => {
      const result = getPaginationMeta(2, 10, 20);
      expect(result.totalPages).toBe(2);
    });

    it("should handle zero total", () => {
      const result = getPaginationMeta(1, 20, 0);
      expect(result.totalPages).toBe(0);
    });

    it("should handle single item", () => {
      const result = getPaginationMeta(1, 20, 1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getSkipTake", () => {
    it("should calculate skip for first page", () => {
      const result = getSkipTake(1, 20);
      expect(result).toEqual({ skip: 0, take: 20 });
    });

    it("should calculate skip for second page", () => {
      const result = getSkipTake(2, 20);
      expect(result).toEqual({ skip: 20, take: 20 });
    });

    it("should calculate skip for third page with custom limit", () => {
      const result = getSkipTake(3, 10);
      expect(result).toEqual({ skip: 20, take: 10 });
    });
  });
});
