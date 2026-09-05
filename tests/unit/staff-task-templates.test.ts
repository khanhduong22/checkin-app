import { describe, it, expect } from "vitest";
import {
  DEFAULT_STAFF_TASK_TEMPLATES,
  getMergedTaskSuggestions,
  filterTaskSuggestions,
  findBestMatchingTemplate,
} from "@/lib/staff-task-templates";

describe("Staff Task Templates & Suggestions", () => {
  describe("DEFAULT_STAFF_TASK_TEMPLATES", () => {
    it("contains essential preset templates", () => {
      const titles = DEFAULT_STAFF_TASK_TEMPLATES.map(t => t.title.toLowerCase());
      expect(titles.some(t => t.includes("đăng bài"))).toBe(true);
      expect(titles.some(t => t.includes("live stream"))).toBe(true);
      expect(titles.some(t => t.includes("làm video"))).toBe(true);
      expect(titles.some(t => t.includes("đăng story"))).toBe(true);
      expect(titles.some(t => t.includes("đăng kí chương trình"))).toBe(true);
    });
  });

  describe("getMergedTaskSuggestions()", () => {
    it("includes default templates when past tasks are empty", () => {
      const merged = getMergedTaskSuggestions([]);
      expect(merged.length).toBeGreaterThanOrEqual(DEFAULT_STAFF_TASK_TEMPLATES.length);
      expect(merged.every(t => t.source === "template")).toBe(true);
    });

    it("merges past unique tasks into suggestions", () => {
      const pastTasks = [
        { title: "Kiểm tra tồn kho kệ A", description: "Đếm số lượng áo thun trên kệ A" },
        { title: "Đăng bài fb, ins, thread", description: "Custom description" }, // duplicate of preset
        { title: "   ", description: "empty title" },
      ];

      const merged = getMergedTaskSuggestions(pastTasks);
      const inventoryTask = merged.find(t => t.title === "Kiểm tra tồn kho kệ A");
      expect(inventoryTask).toBeDefined();
      expect(inventoryTask?.source).toBe("history");
      expect(inventoryTask?.description).toBe("Đếm số lượng áo thun trên kệ A");

      // Preset is kept and not duplicated
      const fbTasks = merged.filter(t => t.title.toLowerCase().includes("đăng bài"));
      expect(fbTasks).toHaveLength(1);
    });

    it("populates description if existing template has empty description", () => {
      // Create a scenario where a preset has empty description
      const originalPresetDesc = DEFAULT_STAFF_TASK_TEMPLATES[0].description;
      DEFAULT_STAFF_TASK_TEMPLATES[0].description = "";
      try {
        const pastTasks = [{ title: DEFAULT_STAFF_TASK_TEMPLATES[0].title, description: "New custom detail" }];
        const merged = getMergedTaskSuggestions(pastTasks);
        expect(merged[0].description).toBe("New custom detail");
      } finally {
        DEFAULT_STAFF_TASK_TEMPLATES[0].description = originalPresetDesc;
      }
    });
  });

  describe("filterTaskSuggestions()", () => {
    const sampleSuggestions = getMergedTaskSuggestions([
      { title: "Tạo banner chương trình 8/3", description: "Thiết kế banner khuyến mãi 8/3" },
      { title: "Đăng kí gian hàng Shopee Mall", description: "Nộp hồ sơ duyệt Shopee Mall" },
    ]);

    it("returns all suggestions when query is empty", () => {
      const results = filterTaskSuggestions(sampleSuggestions, "");
      expect(results).toHaveLength(sampleSuggestions.length);
    });

    it("matches 'đăng bài' (with or without accents)", () => {
      const resWithAccents = filterTaskSuggestions(sampleSuggestions, "đăng bài");
      const resWithoutAccents = filterTaskSuggestions(sampleSuggestions, "dang bai");
      expect(resWithAccents.length).toBeGreaterThan(0);
      expect(resWithAccents.map(r => r.title)).toEqual(resWithoutAccents.map(r => r.title));
    });

    it("matches 'live' for livestream task", () => {
      const results = filterTaskSuggestions(sampleSuggestions, "live");
      expect(results.some(r => r.title.toLowerCase().includes("live stream"))).toBe(true);
    });

    it("matches 'tạo' for video and banner creation", () => {
      const results = filterTaskSuggestions(sampleSuggestions, "tạo");
      expect(results.some(r => r.title.toLowerCase().includes("làm video") || r.description.toLowerCase().includes("tạo"))).toBe(true);
      expect(results.some(r => r.title.toLowerCase().includes("tạo banner"))).toBe(true);
    });

    it("matches 'đăng kí' or 'dang ki' for promotion registration", () => {
      const res1 = filterTaskSuggestions(sampleSuggestions, "đăng kí");
      const res2 = filterTaskSuggestions(sampleSuggestions, "dang ki");
      expect(res1.length).toBeGreaterThan(0);
      expect(res1.some(r => r.title.toLowerCase().includes("đăng kí"))).toBe(true);
      expect(res2.some(r => r.title.toLowerCase().includes("đăng kí"))).toBe(true);
    });

    it("returns empty array for queries matching nothing", () => {
      const results = filterTaskSuggestions(sampleSuggestions, "xyz_not_exist_query_123");
      expect(results).toHaveLength(0);
    });
  });

  describe("findBestMatchingTemplate()", () => {
    const suggestions = getMergedTaskSuggestions([]);

    it("returns null for empty or single char query", () => {
      expect(findBestMatchingTemplate(suggestions, "")).toBeNull();
      expect(findBestMatchingTemplate(suggestions, "a")).toBeNull();
    });

    it("matches 'Đăng bài' or 'dang bai' directly", () => {
      const match = findBestMatchingTemplate(suggestions, "Đăng bài");
      expect(match).toBeDefined();
      expect(match?.title).toContain("Đăng bài");
      expect(match?.description).toContain("Facebook");
    });

    it("matches 'live' for livestream template", () => {
      const match = findBestMatchingTemplate(suggestions, "live");
      expect(match).toBeDefined();
      expect(match?.title).toContain("Live stream");
    });

    it("matches 'tạo' / 'làm video' for video template", () => {
      const match = findBestMatchingTemplate(suggestions, "tạo");
      expect(match).toBeDefined();
      expect(match?.title).toBe("Làm video");
    });

    it("matches 'đăng kí' for promotion template", () => {
      const match = findBestMatchingTemplate(suggestions, "đăng kí");
      expect(match).toBeDefined();
      expect(match?.title).toContain("Đăng kí chương trình");
    });
  });
});
