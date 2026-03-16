/**
 * Script: seed-all-business-rules.ts
 * Mục đích: Seed TOÀN BỘ business rules của hệ thống Checkin App vào database cho AI RAG
 * Chạy: npx tsx scripts/seed-all-business-rules.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================
// ĐỊNH NGHĨA TẤT CẢ DOCUMENT
// ============================================================
const DOCUMENTS = [
    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/check-in-checkout",
        title: "Quy trình Check-in / Check-out",
        content: `# Quy trình Check-in / Check-out

## Điều kiện để Check-in
Nhân viên chỉ được Check-in khi:
1. Kết nối đúng mạng Wi-Fi văn phòng (IP phải nằm trong danh sách IP cho phép).
2. Chưa có lượt Check-in nào đang mở (phải Check-out lượt trước thì mới Check-in tiếp được).

Nếu IP không hợp lệ, hệ thống sẽ báo lỗi: "IP không hợp lệ, vui lòng kết nối Wi-Fi văn phòng."

## Quy trình Check-out
- Không thể Check-out nếu chưa Check-in.
- Ca làm việc phải kéo dài ít nhất 1 giờ mới được Check-out. Nếu chưa đủ 1 giờ, hệ thống sẽ báo số phút còn lại cần chờ.
- Nếu checkout trước giờ kết thúc ca 15 phút trở lên → hệ thống xử lý như "Về sớm":
  - Nếu có nhập lý do → tự động tạo yêu cầu "About Sớm" (trạng thái Đang chờ duyệt).
  - Nếu không có lý do → ghi nhận là "Về sớm không lý do".

## Ghi chú (Note)
Nhân viên có thể nhập ghi chú khi Check-in hoặc Check-out. Ghi chú được lưu lại và hiển thị trong bảng chấm công.

## Làm việc tại nhà (WFH)
- Nhân viên đã được duyệt WFH không cần Check-in qua IP.
- Nếu ngày đó có WFH được duyệt và không có checkin thực tế, hệ thống tự ghi nhận 8 giờ công.
- Nếu vừa WFH vừa checkin thực tế, giờ thực tế được tính (WFH không cộng thêm).

## Admin chấm công hộ
Admin có quyền chấm công hộ nhân viên bằng cách nhập ngày, giờ check-in và giờ check-out thủ công. Thao tác này sẽ xóa dữ liệu checkin cũ của ngày đó và tạo lại mới.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/phat-di-tre",
        title: "Quy tắc phạt đi trễ (Late Penalty)",
        content: `# Quy tắc phạt đi trễ (Late Penalty)

## Áp dụng cho ai
Quy tắc phạt đi trễ CHỈ áp dụng cho nhân viên Full-time (toàn thời gian). Nhân viên Part-time không bị phạt đi trễ.

## Thế nào là đi trễ
Nhân viên được coi là đi trễ nếu thời gian check-in đầu tiên trong ngày trễ hơn giờ bắt đầu ca làm (có khoảng buffer nhỏ). Ca thường bắt đầu lúc 9:00 sáng (UTC+7).

## Bảng phạt theo số lần đi trễ trong tháng
- 1 lần, 2 lần, 3 lần: Không bị phạt gì cả.
- 4 lần: Bị trừ 1 giờ lương.
- 5 lần: Bị trừ 2 giờ lương.
- 6 lần: Bị trừ 3 giờ lương.
- n lần (với n >= 4): Bị trừ (n - 3) giờ lương.

Công thức: số giờ phạt = số lần đi trễ - 3 (chỉ áp dụng khi >= 4 lần).

## Tính số tiền bị trừ
Số tiền trừ = Số giờ bị phạt × Dynamic Hourly Rate.
Dynamic Hourly Rate = Lương tháng ÷ Số ngày chuẩn trong tháng ÷ 8.

## Ví dụ cụ thể
- Đi trễ 3 lần: không bị trừ tiền.
- Đi trễ 4 lần: bị trừ 1 giờ lương.
- Đi trễ 6 lần: bị trừ 3 giờ lương.
- Đi trễ 10 lần: bị trừ 7 giờ lương.

## Theo tháng
Số lần đi trễ được đếm trong phạm vi từng tháng và tự động reset về 0 vào đầu tháng mới.

## Xem thông tin phạt
Nhân viên xem số lần đi trễ và số tiền bị trừ trong phần chi tiết bảng lương tháng đó.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "luong/tinh-luong-full-time",
        title: "Tính lương nhân viên Full-time (Toàn thời gian)",
        content: `# Tính lương nhân viên Full-time

## Cấu trúc lương
Nhân viên Full-time có lương cứng hàng tháng (monthlySalary).

## Công thức tính lương cơ bản

### Số ngày chuẩn (standardDays)
standardDays = Tổng số ngày trong tháng - Số ngày Chủ nhật trong tháng.
Ví dụ: Tháng 3/2026 có 31 ngày, 5 ngày Chủ nhật → standardDays = 26.

### Lương ngày (dailySalary)
dailySalary = monthlySalary ÷ standardDays

### Dynamic Hourly Rate
dynamicHourlyRate = dailySalary ÷ 8

### Lương theo giờ làm từng ngày
Daily salary = hours_worked × dynamicHourlyRate × multiplier (hệ số ngày lễ nếu có).
Full-time được tính tối đa 8 giờ/ngày (giờ làm thêm ngoài 8h không được tính thêm lương).

## Tính khấu trừ nghỉ phép
Mỗi ngày nghỉ phép đã duyệt sẽ bị trừ 1 ngày lương: deduction = leaveCount × dailySalary.

## Tổng lương tháng (baseSalary)
baseSalary = Tổng lương các ngày đã chấm công (sau khi tính theo giờ làm thực tế).

## Projected Salary (lương dự kiến cuối tháng)
projectedSalary = monthlySalary + totalAdjustments - latePenaltyAmount
(Dùng lương cứng làm gốc, cộng/trừ các điều chỉnh và phạt đi trễ)

## Các khoản cộng/trừ
- totalAdjustments: Tổng các khoản điều chỉnh (thưởng/phạt) trong tháng.
- latePenaltyAmount: Tiền phạt đi trễ.

## Lương thực nhận
totalSalary = baseSalary + totalAdjustments - latePenaltyAmount
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "luong/tinh-luong-part-time",
        title: "Tính lương nhân viên Part-time (Bán thời gian)",
        content: `# Tính lương nhân viên Part-time

## Cấu trúc lương
Nhân viên Part-time được trả lương theo số giờ làm thực tế với mức lương giờ cố định (hourlyRate).

## Công thức
Lương ngày = giờ làm thực × hourlyRate × multiplier (hệ số ngày lễ nếu có).
Không có giới hạn 8 giờ/ngày như Full-time — giờ thêm vẫn được tính.

## Không áp dụng
- Không có lương cứng hàng tháng.
- Không bị trừ lương do nghỉ phép (chỉ không được công giờ khi không làm).
- Không bị phạt đi trễ.

## Tổng lương tháng
baseSalary = Tổng lương tất cả các ngày đã chấm công.
totalSalary = baseSalary + totalAdjustments.

## Ngày lễ (Holiday)
Cả Full-time và Part-time đều được nhân hệ số ngày lễ (multiplier). Ví dụ: ngày lễ có multiplier = 2 thì lương ngày đó nhân đôi.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "luong/chot-luong",
        title: "Chốt lương tháng (Lock Payroll)",
        content: `# Chốt lương tháng (Lock Payroll)

## Các trạng thái của kỳ lương
Mỗi tháng có một PayrollPeriod với trạng thái:
- OPEN: Đang trong kỳ, dữ liệu vẫn thay đổi theo checkin thực tế.
- CLOSED: Admin đã đóng kỳ lương. Payslip (bảng lương chi tiết) sẽ được tạo snapshot tại thời điểm này.
- LOCKED: Đã xác nhận và khóa hoàn toàn.

## Snapshot lương (Payslip)
Khi Admin chốt lương, hệ thống tạo bản ghi Payslip lưu toàn bộ dữ liệu tính lương tại thời điểm đó (số giờ, hourlyRate, các khoản điều chỉnh, bonus tháng, latePenaltyAmount, v.v.).

## Xem lương đã chốt
Sau khi lương được chốt, nhân viên xem lương từ Payslip (snapshot đã lưu), KHÔNG phải tính lại live từ checkin. Đây là lý do tại sao lương hiển thị không thay đổi dù có checkin mới.

## Bonus tháng (bonusPercent)
Admin có thể thiết lập % bonus cho từng tháng áp dụng cho một loại nhân viên cụ thể (FULL_TIME hoặc PART_TIME hoặc cả hai). Ví dụ: bonus 10% cho tất cả PART_TIME tháng 3.

## Gửi email lương
Admin có thể gửi email thông báo bảng lương cho từng nhân viên sau khi chốt.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/nghi-phep",
        title: "Quy trình xin nghỉ phép (Leave Request)",
        content: `# Quy trình xin nghỉ phép

## Các loại yêu cầu
- LEAVE: Nghỉ phép cả ngày.
- WFH: Làm việc tại nhà.
- EARLY_LEAVE: Về sớm.

## Trạng thái yêu cầu
- PENDING: Đang chờ duyệt.
- APPROVED: Đã được duyệt.
- REJECTED: Bị từ chối.

## Nghỉ phép (LEAVE)
- Nhân viên gửi yêu cầu → Admin duyệt.
- Khi được duyệt: ngày đó được tính vào daysWorked, nhưng bị trừ dailySalary (Full-time bị trừ 1 ngày lương cứng cho mỗi ngày nghỉ được duyệt).
- Nghỉ phép được duyệt KHÔNG làm gián đoạn streak.

## WFH
- Khi được duyệt: nếu ngày đó không có checkin, hệ thống tự ghi nhận 8 giờ công và hiển thị "Làm việc từ xa (WFH)".

## Về sớm (EARLY_LEAVE)
- Khi checkin và checkout trước giờ kết thúc ca 15 phút, hệ thống tự nhận "Về sớm" và tạo yêu cầu.
- Nếu được duyệt: giờ công tính đủ đến hết ca (giống như không bị trừ giờ vì về sớm).
- Nếu PENDING (chưa duyệt): hiển thị "(Xin về sớm - Đang chờ duyệt)".
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/streak",
        title: "Hệ thống Streak (Chuỗi ngày đi làm đúng giờ)",
        content: `# Hệ thống Streak

## Streak là gì
Streak là số ngày liên tiếp nhân viên đi làm đúng giờ, không bỏ lỡ ngày nào.

## Điều kiện duy trì streak
- Mỗi ngày làm việc (thứ Hai đến thứ Bảy): phải checkin trước giờ bắt đầu ca (8:30 + buffer).
- Ngày Chủ nhật: được bỏ qua, không tính vào streak.
- Ngày nghỉ phép được duyệt: không phá streak, được tính như ngày liên tục.

## Làm mất streak
- Đi trễ (checkin sau 8:30 + buffer) → Streak về 0 ngay lập tức trong ngày đó.
- Không checkin và không có nghỉ phép được duyệt → Streak bị phá.

## Cách tính streak
1. Kiểm tra hôm nay trước: nếu checkin hôm nay đúng giờ → +1. Nếu đi trễ → return 0.
2. Quét ngược về quá khứ tối đa 30 ngày làm việc.
3. Mỗi ngày làm việc: nếu có checkin đúng giờ hoặc có nghỉ phép được duyệt → tiếp tục +1, nếu không → dừng.

## Hiển thị
Streak hiển thị trên Dashboard của nhân viên dưới dạng "🔥 X ngày liên tiếp".
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/sinh-nhat",
        title: "Bonus sinh nhật (Birthday Bonus)",
        content: `# Bonus sinh nhật (Birthday Bonus)

## Tính năng
Hệ thống tự động phát hiện ngày sinh nhật của nhân viên và hiển thị lời chúc kèm thông báo bonus trên dashboard.

## Cách hoạt động
- Admin thiết lập ngày sinh nhật (birthday) cho từng nhân viên trong phần quản lý nhân sự.
- Vào đúng ngày sinh nhật, dashboard của nhân viên sẽ hiển thị thông báo chúc mừng đặc biệt.

## Bonus sinh nhật
- Khoản bonus sinh nhật (thường là 100.000đ) được thêm vào dưới dạng PayrollAdjustment cho nhân viên trong ngày sinh nhật.
- Admin cần thiết lập hoặc hệ thống tự động tạo khoản điều chỉnh này.

## Lưu ý
- Nếu nhân viên không nhận được bonus sinh nhật, cần kiểm tra xem ngày sinh nhật đã được nhập đúng chưa.
- Bonus sinh nhật được ghi nhận vào mục "Điều chỉnh lương" (adjustments) của tháng đó.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/ip-restriction",
        title: "Cấu hình IP và kiểm soát check-in theo vị trí",
        content: `# Cấu hình IP - Kiểm soát Check-in theo vị trí

## Mục đích
Đảm bảo nhân viên chỉ check-in khi có mặt tại văn phòng bằng cách kiểm tra địa chỉ IP.

## Cách hoạt động
- Admin vào phần "Cấu hình IP" để thêm các IP prefix được phép (ví dụ: "192.168.1." để cho phép toàn bộ dải 192.168.1.x).
- Khi nhân viên check-in, hệ thống lấy IP thực từ header X-Forwarded-For và so sánh với danh sách cho phép.
- Nếu IP khớp → check-in thành công.
- Nếu IP không khớp → báo lỗi "IP không hợp lệ, vui lòng kết nối Wi-Fi văn phòng."

## Môi trường Development
Trong môi trường development (NODE_ENV=development), nếu danh sách IP trắng trống thì localhost được tự động cho phép. Trong production, danh sách rỗng có nghĩa là KHÔNG ai được check-in.

## Quản lý danh sách IP
Admin thêm IP prefix và gắn nhãn (label) mô tả. Ví dụ: prefix "10.0.0." với nhãn "Văn phòng tầng 2". Admin cũng có thể xóa IP khỏi danh sách bất cứ lúc nào.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/vong-quay-may-man",
        title: "Vòng quay may mắn (Lucky Wheel)",
        content: `# Vòng quay may mắn (Lucky Wheel)

## Tính năng
Nhân viên có thể quay vòng may mắn để nhận phần thưởng ngẫu nhiên.

## Cách hoạt động
- Admin tạo các giải thưởng (LuckyWheelPrize) với thông tin: tên, mô tả, loại (PHYSICAL/CASH), số lượng, số lượng còn lại, xác suất trúng.
- Mỗi giải thưởng có xác suất (probability) riêng, tổng xác suất các giải nên bằng 100%.
- Khi nhân viên quay, hệ thống chọn ngẫu nhiên dựa theo xác suất và ghi lại lịch sử (LuckyWheelHistory).

## Quản lý (Admin)
- Admin vào "Quản lý vòng quay" để thêm, sửa, xóa giải thưởng.
- Quản lý số lượng còn lại của từng giải.
- Xem lịch sử các lần quay.

## Điều kiện quay
Hệ thống có thể giới hạn số lần quay. Lịch sử các lần quay được lưu để tránh quay lại.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/ca-lam-viec",
        title: "Ca làm việc (Work Shift)",
        content: `# Ca làm việc (Work Shift)

## Ca mặc định Full-time
Khi chuyển nhân viên sang Full-time, hệ thống tự động tạo ca làm việc 9:00–17:00 (UTC+7) cho tất cả các ngày từ thứ Hai đến thứ Bảy, kéo dài 3 tháng tới.

## Ca tùy chỉnh
Admin có thể tạo/chỉnh sửa ca làm việc riêng cho từng nhân viên.

## Ảnh hưởng của ca làm
- Giờ check-in sớm hơn giờ bắt đầu ca được tính từ giờ bắt đầu ca (không tính giờ sớm hơn).
- Giờ checkout được so sánh với giờ kết thúc ca để xác định "Về sớm".
- Đi đúng giờ/trễ được tính dựa trên giờ bắt đầu ca.

## Trạng thái
Mỗi ca có trạng thái mặc định là APPROVED. Có thể thiết lập isOpenForSwap để cho phép đổi ca giữa nhân viên.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/nhan-su",
        title: "Quản lý nhân sự (Employee Management)",
        content: `# Quản lý nhân sự

## Thêm nhân viên mới
Admin thêm nhân viên với thông tin: Tên, Email, Loại hợp đồng (FULL_TIME/PART_TIME), Lương giờ (hourlyRate), Lương cứng tháng (monthlySalary).
Email phải là duy nhất — nếu email đã tồn tại sẽ báo lỗi.

## Phân quyền
- USER: Nhân viên thường, chỉ xem thông tin của bản thân.
- ADMIN: Quản trị viên, có toàn quyền trên hệ thống.

## Cập nhật thông tin
Admin có thể cập nhật: Tên, Lương giờ, Lương cứng, Loại hợp đồng, Quyền hạn, Ngày sinh nhật, Ngày bắt đầu làm.

## Ngày đặc biệt
- birthday: Ngày sinh nhật, dùng để hiển thị chúc mừng và tính bonus sinh nhật.
- startDate: Ngày bắt đầu làm việc, dùng để hiển thị thâm niên.

## Xóa nhân viên
Admin có thể xóa nhân viên. Thao tác này xóa cascade toàn bộ dữ liệu liên quan (checkin, ca làm, yêu cầu, v.v.).

## Điều chỉnh lương (Adjustments)
Admin có thể thêm khoản điều chỉnh lương (cộng hoặc trừ) cho nhân viên với lý do cụ thể. Khoản này sẽ được cộng/trừ vào lương tháng.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "quy-tac/ngay-le",
        title: "Ngày lễ và hệ số nhân lương (Holiday Multiplier)",
        content: `# Ngày lễ và hệ số nhân lương

## Cấu hình ngày lễ
Admin cấu hình danh sách ngày lễ với: ngày, tên ngày lễ, hệ số nhân (multiplier).

## Hệ số nhân
- multiplier = 1.0: Ngày bình thường.
- multiplier = 2.0: Ngày lễ, lương nhân đôi.
- multiplier = 3.0: Ngày lễ lớn, lương nhân ba.

## Ảnh hưởng lên lương
Mỗi ngày đi làm đúng vào ngày lễ: lương ngày đó = giờ làm × hourlyRate × multiplier.
Áp dụng cho cả Full-time và Part-time.

## Lưu ý
Ngày lễ được lưu theo ngày cụ thể (unique). Mỗi ngày chỉ có một mức hệ số.
`,
    },

    // ─────────────────────────────────────────────────────────
    {
        path: "he-thong/tong-quan",
        title: "Tổng quan hệ thống Checkin App",
        content: `# Tổng quan hệ thống Checkin App của LimArt

## Mục đích
Checkin App là hệ thống quản lý chấm công và tính lương nội bộ của công ty LimArt.

## Các tính năng chính
1. **Chấm công**: Check-in/Check-out theo IP Wi-Fi văn phòng.
2. **Quản lý lịch làm**: Ca làm việc, WFH, nghỉ phép.
3. **Tính lương tự động**: Theo giờ thực tế (Part-time) hoặc lương cứng (Full-time).
4. **Phạt đi trễ**: Từ lần thứ 4 trở đi bị trừ lương lũy tiến.
5. **Streak**: Theo dõi chuỗi ngày đúng giờ.
6. **Vòng quay may mắn**: Tính năng giải trí cho nhân viên.
7. **Thông báo sinh nhật**: Chúc mừng và bonus sinh nhật.
8. **Bảng lương**: Admin chốt lương hàng tháng, gửi email thông báo.
9. **Bảng thành tích**: Theo dõi hiệu suất và khen thưởng.
10. **Quản lý tác vụ**: Marketplace tasks cho nhân viên.
11. **AI Trợ giúp**: Trợ lý AI nội bộ trả lời câu hỏi về hệ thống.

## Loại nhân viên
- **FULL_TIME**: Nhân viên toàn thời gian, lương cứng hàng tháng, ca làm từ 9–17h, áp dụng phạt đi trễ.
- **PART_TIME**: Nhân viên bán thời gian, lương theo giờ, không phạt đi trễ, không có lương cứng.

## Timezone
Toàn bộ hệ thống sử dụng múi giờ Việt Nam UTC+7. Các mốc thời gian được lưu dạng UTC trong database nhưng hiển thị theo VN timezone.
`,
    },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

async function generateEmbedding(text: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return `[${result.embedding.values.join(",")}]`;
}

function chunkText(text: string, maxSize = 900): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = "";
    for (const para of paragraphs) {
        if ((current + "\n\n" + para).length > maxSize && current) {
            chunks.push(current.trim());
            current = para;
        } else {
            current = current ? current + "\n\n" + para : para;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log(`🚀 Bắt đầu seed ${DOCUMENTS.length} tài liệu vào AI database...\n`);

    for (let i = 0; i < DOCUMENTS.length; i++) {
        const doc = DOCUMENTS[i];
        console.log(`[${i + 1}/${DOCUMENTS.length}] 📄 "${doc.title}"`);

        // Upsert Document
        const existing = await prisma.$queryRaw`
      SELECT id FROM "Document" WHERE path = ${doc.path}
    `;

        let docId: string;
        if (existing.length > 0) {
            docId = existing[0].id;
            await prisma.$executeRaw`
        UPDATE "Document" SET title = ${doc.title}, content = ${doc.content}, "updatedAt" = NOW()
        WHERE id = ${docId}
      `;
            console.log(`   → Cập nhật document hiện có.`);
        } else {
            const created = await prisma.$queryRaw`
        INSERT INTO "Document" (id, path, title, content, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${doc.path}, ${doc.title}, ${doc.content}, NOW(), NOW())
        RETURNING id
      `;
            docId = created[0].id;
            console.log(`   → Tạo document mới.`);
        }

        // Delete old chunks
        await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${docId}`;

        // Create chunks with embeddings
        const chunks = chunkText(doc.content);
        console.log(`   → ${chunks.length} chunk(s), đang tạo embeddings...`);

        for (let j = 0; j < chunks.length; j++) {
            const content = chunks[j];
            const embedding = await generateEmbedding(content);
            await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "createdAt")
        VALUES (gen_random_uuid()::text, ${docId}, ${content}, ${embedding}::vector, NOW())
      `;
            process.stdout.write(`   ✅ Chunk ${j + 1}/${chunks.length} `);
        }
        console.log("\n");
    }

    console.log("🎉 Hoàn tất! AI assistant đã sẵn sàng trả lời đầy đủ về hệ thống Checkin App.");
    await prisma.$disconnect();
}

main().catch(async (err) => {
    console.error("❌ Lỗi:", err.message || err);
    await prisma.$disconnect();
    process.exit(1);
});
