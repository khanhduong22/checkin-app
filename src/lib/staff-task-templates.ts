import { normalizeVietnamese } from "./utils";

export interface TaskSuggestion {
  title: string;
  description: string;
  source: "template" | "history";
  badgeLabel?: string;
}

export const DEFAULT_STAFF_TASK_TEMPLATES: TaskSuggestion[] = [
  {
    title: "Đăng bài fb, ins, thread",
    description: "Đăng bài viết mới lên Facebook, Instagram và Threads theo lịch định kỳ, cập nhật thông tin sản phẩm và tương tác với khách hàng.",
    source: "template",
    badgeLabel: "Mẫu phổ biến",
  },
  {
    title: "Live stream 2 buổi",
    description: "Thực hiện livestream bán hàng và tương tác với khách hàng tối thiểu 2 buổi trong tuần theo khung giờ quy định.",
    source: "template",
    badgeLabel: "Mẫu phổ biến",
  },
  {
    title: "Làm video",
    description: "Tạo và dựng video ngắn (TikTok / Reels / Shorts) giới thiệu sản phẩm, cập nhật xu hướng mới và gắn link sản phẩm.",
    source: "template",
    badgeLabel: "Mẫu phổ biến",
  },
  {
    title: "Đăng story",
    description: "Đăng story hằng ngày cập nhật hình ảnh sản phẩm, hoạt động tại shop và tương tác với khách hàng.",
    source: "template",
    badgeLabel: "Mẫu phổ biến",
  },
  {
    title: "Đăng kí chương trình khuyến mãi",
    description: "Đăng ký các chương trình khuyến mãi, flash sale, thiết lập mã voucher giảm giá trên các kênh và sàn thương mại điện tử.",
    source: "template",
    badgeLabel: "Mẫu phổ biến",
  },
];

/**
 * Combines default templates and historical task records into a unique list of suggestions.
 */
export function getMergedTaskSuggestions(
  pastTasks: Array<{ title: string; description?: string | null }>
): TaskSuggestion[] {
  const map = new Map<string, TaskSuggestion>();

  // 1. Add default templates
  for (const t of DEFAULT_STAFF_TASK_TEMPLATES) {
    const key = normalizeVietnamese(t.title);
    map.set(key, t);
  }

  // 2. Add history tasks (if not present, or enhance description)
  for (const pt of pastTasks) {
    if (!pt.title || !pt.title.trim()) continue;
    const cleanTitle = pt.title.trim();
    const key = normalizeVietnamese(cleanTitle);
    const desc = pt.description ? pt.description.trim() : "";

    if (!map.has(key)) {
      map.set(key, {
        title: cleanTitle,
        description: desc,
        source: "history",
        badgeLabel: "Từ task cũ",
      });
    } else if (desc && !map.get(key)!.description) {
      // If template had empty description but history has one
      const existing = map.get(key)!;
      existing.description = desc;
    }
  }

  return Array.from(map.values());
}

/**
 * Filters task suggestions based on user query (accent-insensitive, case-insensitive, fuzzy).
 */
export function filterTaskSuggestions(
  suggestions: TaskSuggestion[],
  query: string
): TaskSuggestion[] {
  const normQuery = normalizeVietnamese(query);
  if (!normQuery) {
    return suggestions;
  }

  // Split query into tokens to support multi-word search
  const tokens = normQuery.split(/\s+/).filter(Boolean);

  return suggestions.filter(item => {
    const normTitle = normalizeVietnamese(item.title);
    const normDesc = normalizeVietnamese(item.description);

    // Matches if all query tokens appear in title OR description
    return tokens.every(token => normTitle.includes(token) || normDesc.includes(token));
  });
}
