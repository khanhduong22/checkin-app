---
name: playwright-e2e-testing
description: Complete end-to-end (E2E) testing workflow with Playwright, including headless browser test execution, form validation guardrails, full CRUD lifecycle, video recording, automatic Google Drive upload via rclone, and instant Slack notifications.
---

# Skill: Playwright E2E Testing

## Purpose
Automate high-confidence, full-lifecycle browser testing with Playwright, complete with video recording and cloud reporting. Every admin/client feature must be verified against runtime UI/DOM, validation guardrails, **downstream side-effect sinks**, and persistent database state before human review.

> **Nguyên tắc số 1 của skill này**: Scaffolding (config, POM, fixtures, helper) **đã tồn tại thật trong repository** của dự án. Skill này KHÔNG chứa bản copy tĩnh của chúng — copy sẽ drift và sai. Luôn chủ động discover và `Read` file thật trước khi viết spec mới.

---

## 1. Nguồn sự thật: Discover & đọc code thật trong repository

Trước khi viết hoặc chạy bất kỳ E2E spec nào, agent phải thực hiện discovery cấu trúc Playwright thực tế của dự án (thường nằm ở root hoặc trong thư mục frontend / admin UI package, ví dụ `playwright.config.{ts,js}`):

| Bạn cần | Discover & đọc file thật trong repo | Export / vai trò chính |
|---|---|---|
| Cấu hình runner, project, video | `playwright.config.{ts,js}` | `defineConfig` (`setup` → `e2e-authenticated` / projects) |
| Login 1 lần, lưu session | `**/setup/auth.setup.{ts,js}` | storageState → file session cache (vd: `.auth/admin.json`) |
| Inject POM vào spec | `**/fixtures/index.{ts,js}` | `test`, `expect`, custom typed fixtures |
| Helper chung cho POM | `**/pages/base.page.{ts,js}` | `goto`, `recordPause`, `waitForToast`, `confirmModal`, `cancelModal` |
| Nhịp video cho người xem | `**/utils/video-helper.{ts,js}` | `recordPause(page, ms)` |
| Banner + modal tổng kết trong video | `**/utils/video-telemetry.{ts,js}` | `showStepBanner`, `removeStepBanner`, `showSummaryModal` |
| Verify CSV / file export + preview | `**/utils/csv-preview.{ts,js}` | `validateAndPreviewCsv`, validation helpers |
| Locator dùng chung | `**/utils/selectors.{ts,js}` | `SELECTORS` / central locator maps |

> [!WARNING]
> **Không bao giờ tự viết lại `playwright.config.ts`, `base.page.ts`, hay bất kỳ file scaffolding nào.** Kiểm tra repository trước để tái sử dụng file đang chạy được. Ghi đè bằng một phiên bản "chuẩn" trong đầu sẽ phá suite hiện tại. Cần thêm hành vi → mở rộng file thật.

### Cấu trúc thư mục tiêu chuẩn (Archetype)

```text
<ui-package-or-root>/
├── playwright.config.{ts,js}       # Multi-project: setup → e2e-authenticated
└── e2e/
    ├── .auth/                      # [Gitignored] session cache (admin.json, user.json)
    ├── setup/auth.setup.ts         # Login 1 lần, dump storageState
    ├── fixtures/index.ts           # test.extend inject POM đã typed
    ├── pages/                      # POM: base.page.ts + feature domain pages
    ├── specs/                      # Spec theo feature / domain module
    └── utils/                      # video-helper, video-telemetry, csv-preview, selectors
```

POM và spec mới đặt theo domain sẵn có của dự án. Thêm fixture mới → khai báo trong file fixtures tương ứng (vd: `e2e/fixtures/index.ts`).

> [!IMPORTANT]
> `playwright.config.{ts,js}` thường route spec bằng `testMatch` regex hoặc thư mục cố định. Khi tạo thư mục spec ở domain mới, luôn kiểm tra spec mới thực sự được runner pick up (`npx playwright test --list`).

---

## 2. Bước 0 BẮT BUỘC: Side-Effect Discovery (trước khi viết spec)

Đây là bước hay bị bỏ nhất, và là lý do "E2E pass" nhưng production vẫn vỡ.

**Vấn đề**: rule "phải verify email/notification downstream" là rule *có điều kiện* — "nếu action gửi mail thì...". Nhưng khi viết spec cho một feature, agent **không biết** action đó có phát sinh side-effect hay không. Không biết thì không verify, rồi tick "N/A" một cách thành thật. Rule không sai; thiếu **bước đi tìm**.

### 2.1. Quy trình truy vết 5 Universal Sink Layers (chạy TRƯỚC khi viết dòng spec đầu tiên)

Với mỗi action sắp test (create/update/delete/moderate/ban/publish...), truy ngược kiến trúc downstream qua 5 tầng sink phổ quát:

```text
1. Event Bus / Emitters      Domain Events emitted (EventBus, EventEmitter, Kafka/RabbitMQ/Redis dispatchers)
2. Database Listeners        Event listeners, subscribers, background workers ghi nhận audit logs / DB notifications
3. Mail Sinks (SMTP)         Transactional mailers gửi email thật → SMTP / Mailpit (vd: http://localhost:8025)
4. Realtime / WebSockets     Gateway / Socket emit live update tới client → UI notification bells / toasts
5. Public Feed / Cache       Cache invalidation hoặc public read-model views (public feed, active catalog, client views)
```

Lệnh truy vết nhanh trong codebase backend:

```bash
# 1. Action này có bắn domain event / bus message nào không?
grep -rn "emit(\|dispatch(\|publish(\|Event\." src/ --include="*.ts" | grep -i "<entity>"

# 2. Event đó có listener/subscriber nào bắt, và fan-out đi đâu?
grep -rn "@OnEvent\|@Subscribe\|addEventListener" src/ --include="*.ts"

# 3. Có gửi mail trực tiếp hoặc qua queue không?
grep -rln "sendMail\|mailer\|smtp\|notificationService" src/ --include="*.ts"

# 4. Có push realtime websocket không?
grep -rn "gateway\|socket\.emit\|server\.to\|@WebSocketGateway" src/ --include="*.ts"
```

Hoặc dùng `codebase-memory-mcp`: `trace_path(function_name="<serviceMethod>", direction="outward")` để thấy toàn bộ fan-out.

### 2.2. Sink Inventory — bảng bắt buộc điền trước khi viết spec

Kết quả bước 2.1 phải được ghi thành bảng, đính kèm trong PR:

| Action | Sink phát hiện được | Verify trong video | Nếu N/A: lý do |
|---|---|---|---|
| `POST /items` | không có event | — | Không có event emitter cho `ITEM.CREATED` |
| `PUT /users/:id/ban` | `USER.BANNED` → mail + noti | Mailpit + User Notification Bell | — |
| `PUT /posts/:id/hide` | `POST.MODERATED` → noti + public feed | Bell + Public feed URL | — |

> [!IMPORTANT]
> **"N/A" chỉ hợp lệ khi đã chạy bước 2.1 và ghi được lý do cụ thể.** Tick N/A mà không có dòng truy vết tương ứng = chưa làm bước 0, và PR bị chặn.

---

## 3. Testing Philosophy: 4-Layer Pyramid

1. **Layer 1 — Smoke & Navigation**: page load, nav link, SideNav active state.
2. **Layer 2 — Full Lifecycle CRUD** (kịch bản lõi):
   - *Phase 1 — Validation Guardrail*: submit form rỗng, assert inline error, verify **ZERO** request gửi xuống backend.
   - *Phase 2 — Create*: điền hợp lệ, submit, assert modal đóng + toast + item hiện trên UI.
   - *Phase 3 — Update*: mở edit modal đã prefill, sửa, lưu, assert UI cập nhật ngay.
   - *Phase 4 — Delete*: trigger xóa, assert confirm dialog, xác nhận, assert item biến mất.
   - *Phase 5 — Persistence*: reload (`page.reload()`), quay lại, assert DB đã lưu đúng state.
3. **Layer 3 — RBAC Matrix**: chạy lại Layer 2 với `storageState` theo từng role (`admin.json`, `moderator.json`, `viewer.json`); assert nút Add/Edit/Delete bị ẩn hoặc disable với role không đủ quyền.
4. **Layer 4 — Closed-Loop Downstream Verification** — với mọi sink tìm được ở §2:

> [!IMPORTANT]
> **Dừng ở toast nội bộ của UI là chưa đóng vòng lặp. Mock downstream cũng không tính.** Video phải thực sự điều hướng sang hệ thống nhận, trong cùng một session ghi hình:
> - **Sink A — Email (Mailpit `http://localhost:8025` hoặc mail dev server)**: mở đúng mail vừa đến, assert subject, kiểm tra HTML template có branding, verify link động (vd token reset/kích hoạt tài khoản).
> - **Sink B — In-App Notification (Client Web UI)**: đăng nhập đúng user nhận, assert badge `NotificationBell` tăng, mở notification panel, click item, assert điều hướng đúng route và unread giảm.
> - **Sink C — Public Feed / Read Model (Client Web UI)**: sau khi admin ẩn/xóa/khóa/lưu trữ, vào view/feed công khai assert nội dung đã bị loại khỏi hiển thị.
>
> Bất kỳ client web nào dùng để quan sát downstream verification là **read-only** — chỉ chạy và quan sát, tuyệt đối không sửa/commit code trong đó.

---

## 4. Two-Dimensional Completeness: Full Flow × Full Option Matrix

### 4.1. Bẫy "Flow-Only"
Nhiều engineer và AI agent verify được flow chạy từ đầu đến cuối (Navigate ➔ Modal ➔ Fill ➔ Submit ➔ Table ➔ Delete), không lỗi, rồi tuyên bố "100% E2E verified". Nhưng trong flow đó họ chỉ chọn **một option tùy ý** (tạo với category đầu tiên, đổi role thành `ADMIN` và bỏ qua `MODERATOR`).

**Hệ quả thật đã gặp**: chỉ test 2/3 role (`ADMIN`, `USER`) khiến `MODERATOR` lọt lưới. Lên production, chọn option đó là `400 Bad Request` ngay vì Prisma enum ở backend thiếu giá trị.

Ba nhóm lỗi hay lọt theo cách này:
1. **Schema & serialization mismatch** — enum chưa test fail validation giữa Strapi plugin, NestJS gateway và PostgreSQL enum.
2. **UI rendering crash** — badge, màu, icon, nút gated theo role gắn với option chưa verify sẽ throw runtime error hoặc render rỗng.
3. **Silent logic/permission bug** — transition guard đúng với state phổ biến, vỡ ở state trung gian.

### 4.2. Hai chiều trực giao

```
┌────────────────────────────────────┬────────────────────────────────────┐
│   CHIỀU 1: FLOW COVERAGE           │   CHIỀU 2: OPTION COVERAGE         │
│   (hành trình ngang)               │   (không gian state/option dọc)    │
├────────────────────────────────────┼────────────────────────────────────┤
│ • Điều hướng tới trang feature     │ • 100% giá trị Enum (role, status) │
│ • Mở Create / Edit drawer          │ • 100% lựa chọn Select dropdown    │
│ • Điền và submit form              │ • 100% option Radio group          │
│ • Trigger action lifecycle         │ • 100% tab filter trên listing     │
│ • Xử lý confirm dialog             │ • 100% mốc thời hạn moderation     │
│ • Assert toast & notification      │ • 100% trường search / sort        │
│ • Cleanup & xóa                    │ • 100% nhánh quyết định của dialog │
└────────────────────────────────────┴────────────────────────────────────┘
```

> [!IMPORTANT]
> **Suite phủ 100% flow nhưng chỉ 30% option là INCOMPLETE và bị chặn ship.**

### 4.3. Zero-Skipped-Option Rule

> [!IMPORTANT]
> Với **BẤT KỲ** enum, select, radio group, segmented button, hay state machine đa lựa chọn — role & RBAC, entity status, privacy scope, action duration, tab filter, nhánh quyết định của modal:
> 1. **Mọi option ($N$/$N$, 100%) phải được test và assert tường minh.**
> 2. **Test một tập con ($N-1$/$N$) là VI PHẠM.**
> 3. Mỗi option phải assert đủ 5 tầng:
>    - **DOM**: option có mặt, click được, label đúng.
>    - **Network payload**: request gửi lên chứa đúng giá trị enum.
>    - **Server response**: HTTP 200/201 và entity trả về mang đúng giá trị.
>    - **UI reflection**: badge/tag/trạng thái cập nhật ngay.
>    - **DB persistence**: `page.reload()` xong state vẫn đúng.

### 4.4. Ba pattern triển khai

**Pattern A — Vòng lặp chuyển trạng thái tuần tự** (khi một entity đổi option qua toàn bộ vòng đời):

```typescript
export const USER_ROLES = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'MODERATOR', label: 'Kiểm duyệt viên' },
  { value: 'MEMBER', label: 'Thành viên' },
] as const;

// ❌ CẤM: chỉ test ADMIN → MEMBER rồi bỏ qua MODERATOR
// ✅ CHUẨN: lặp hết mọi role, không bỏ option nào
for (const role of USER_ROLES) {
  await userListPage.openChangeRoleModal(targetUserEmail);
  await userModalsPage.selectRole(role.value);

  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/users') && r.status() === 200),
    userModalsPage.submitRoleChange(),
  ]);
  expect((await response.json()).data.role).toBe(role.value);

  await userListPage.waitForToast(/cập nhật vai trò thành công/i);
  await userListPage.expectUserRoleBadge(targetUserEmail, role.label);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await userListPage.expectUserRoleBadge(targetUserEmail, role.label);
}
```

**Pattern B — Ma trận tạo mới parametrized** (khi entity được tạo với nhiều biến thể enum):

```typescript
export const GROUP_PRIVACY_VARIANTS = [
  { value: 'PUBLIC', label: 'Công khai' },
  { value: 'PRIVATE', label: 'Riêng tư' },
  { value: 'RESTRICTED', label: 'Hạn chế' },
] as const;

for (const variant of GROUP_PRIVACY_VARIANTS) {
  test(`tạo nhóm với privacy: ${variant.value}`, async ({ groupListPage, groupModalPage, page }) => {
    const groupName = `E2E ${variant.value} Group ${Date.now()}`;
    await groupListPage.navigate();
    await groupListPage.clickCreateGroup();
    await groupModalPage.fillForm({ name: groupName, privacy: variant.value });

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/community/groups') && r.status() === 201),
      groupModalPage.submit(),
    ]);
    expect((await response.json()).data.privacy).toBe(variant.value);

    await groupListPage.waitForToast(/tạo nhóm thành công/i);
    await groupListPage.expectGroupPrivacyBadge(groupName, variant.label);
  });
}
```

**Pattern C — Assert DOM có đủ option** (chạy trước khi tương tác với dropdown/radio enum):

```typescript
async expectExhaustiveEnumOptions(
  trigger: Locator,
  expected: Array<{ value: string; label: string }>,
): Promise<void> {
  await trigger.click();
  const options = this.page.getByRole('option');
  await expect(options).toHaveCount(expected.length);           // đủ số lượng
  for (const opt of expected) {
    await expect(options.filter({ hasText: opt.label })).toBeVisible();
  }
}
```

---

## 5. Best Practices & Modal Scoping

1. **Accessible role selector**: ưu tiên `page.getByRole('button', { name: ... })` hơn text lỏng hay CSS selector.
2. **Modal scoping guardrail**: scope nút trong modal bằng `page.getByRole('dialog')` / `getByRole('alertdialog')` để tránh `strict mode violation` khi nhiều nút trùng label ("Hủy", "Lưu").
3. **Explicit timeout**: spec lifecycle nhiều bước phải đặt `test.setTimeout(60000)`.
4. **Zero raw selector trong spec**: mọi locator nằm trong POM. Spec phải đọc như một câu chuyện nghiệp vụ bằng tiếng Việt/Anh.
5. **Nhịp video**: chèn `recordPause(1500)` giữa các chuyển trạng thái quan trọng — headless chạy 10-50ms/action, không pause thì video vô dụng với người xem.
6. **Telemetry trong video**: dùng `showStepBanner` trước mỗi bước và `showSummaryModal` trước khi đóng browser (xem `e2e/utils/video-telemetry.ts`). Chuẩn bắt buộc: banner nổi top-center `STEP X: [ACTION]` có màu badge riêng, subtitle ngữ cảnh và dừng 1.5s; modal tổng kết full-screen (frosted glass) hiển thị task ID, trạng thái `✓ 100% VERIFIED`, các bản ghi đã lưu DB và trạng thái các kênh gửi, giữ 4.5s trước khi đóng browser.
7. **Credentials**: lấy từ env (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` hoặc tương đương). Không hardcode password trong spec, POM, hay tài liệu.

---

## 6. Cloud Reporting Workflow

`notify-slack.sh` reads `SLACK_WEBHOOK_URL` from the environment or from
`~/.config/agent-harness/secrets.env` (override with `AGENT_HARNESS_SECRETS`).
A webhook is a credential — never write it into a tracked file. With the
variable unset the script prints where it looked and exits 0, so a run without
Slack configured still succeeds.

```bash
# 1. Upload video lên Google Drive (rclone → ${E2E_GDRIVE_REMOTE:-gdrive:E2E-Reports}/YYYY-MM-DD/)
./scripts/upload-e2e-video.sh <path-to-video.webm> "<Task-Name>"

# 2. Bắn Slack handover
./scripts/notify-slack.sh \
  "<Task Name>" "<GitHub PR URL>" "<Status Details>" \
  "<Google Drive Video URL>" "<Issue Info>" "<Flow Steps>"
```

---

## 7. Verification Checklist Before Handover

- [ ] **Sink Inventory (§2.2) đã điền xong** — mọi action đều đã truy vết 5 sink layers (domain events / listeners / email / realtime / feed); mỗi dòng có verification step hoặc lý do N/A cụ thể. *(Không điều kiện — luôn phải có bảng này.)*
- [ ] Mọi sink trong bảng đã được verify thật trong video (Mailpit / NotificationBell / public feed), không mock, không dừng ở toast nội bộ UI.
- [ ] Playwright suite pass 100% (`npx playwright test`).
- [ ] Spec mới thực sự được `testMatch` pick up (`npx playwright test --list`).
- [ ] `setup` sinh `.auth/admin.json`, `e2e-authenticated` tái sử dụng được.
- [ ] Spec dùng POM qua `fixtures/index.ts`, không có raw CSS selector.
- [ ] Two-Dimensional Completeness: 100% flow **và** 100% option của mọi enum/select/radio/tab (Zero-Skipped-Option Rule).
- [ ] Export file/dữ liệu: verify UTF-8 BOM và render preview modal ≥ 4s.
- [ ] `recordPause(1500)` đặt giữa các chuyển trạng thái quan trọng.
- [ ] `showStepBanner` mỗi bước + `showSummaryModal` cuối run.
- [ ] Video 1800x1200, đã upload Google Drive và link share công khai còn sống.
- [ ] Slack đã nhận: issue info, PR link, video URL, breakdown các bước.
