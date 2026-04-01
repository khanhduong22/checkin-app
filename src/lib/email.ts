import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY chưa được cấu hình trong .env");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_NAME = process.env.APP_NAME || "LimArt";
const PAYSLIP_CC = ["dung.do.vcr@gmail.com", "khanhdev4@gmail.com"];

export type PayslipEmailData = {
  employeeName: string;
  employeeEmail: string;
  month: number;
  year: number;
  stats: {
    totalHours?: number;
    hourlyRate?: number;
    baseSalary?: number;
    monthlySalary?: number;
    employmentType?: string;
    totalTaskIncome?: number;
    totalAdjustments?: number;
    netSalary?: number;
    bonusAmount?: number;
    lateCount?: number;
    latePenaltyHours?: number;
    latePenaltyAmount?: number;
  };
};

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "đ";
}

function buildPayslipHtml(data: PayslipEmailData): string {
  const { employeeName, month, year, stats } = data;
  const {
    totalHours = 0,
    hourlyRate = 0,
    monthlySalary = 0,
    employmentType = "PART_TIME",
    totalTaskIncome = 0,
    totalAdjustments = 0,
    netSalary = 0,
    bonusAmount = 0,
    lateCount = 0,
    latePenaltyHours = 0,
    latePenaltyAmount = 0,
  } = stats;

  const isFullTime = employmentType === "FULL_TIME";

  const rows = isFullTime
    ? `
    <tr><td>Lương tháng (cố định)</td><td align="right"><b>${formatVND(monthlySalary)}</b></td></tr>
    ${bonusAmount ? `<tr><td>Thưởng KPI / tháng</td><td align="right" style="color:#16a34a">+${formatVND(bonusAmount)}</td></tr>` : ""}
  `
    : `
    <tr><td>Tổng giờ làm việc</td><td align="right">${totalHours.toFixed(1)}h</td></tr>
    <tr><td>Đơn giá / giờ</td><td align="right">${formatVND(hourlyRate)}</td></tr>
    <tr><td>Lương tính theo giờ</td><td align="right"><b>${formatVND(totalHours * hourlyRate)}</b></td></tr>
  `;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phiếu lương tháng ${month}/${year}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:-0.5px;">${APP_NAME}</h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Phiếu Lương — Tháng ${month}/${year}</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">Xin chào <b>${employeeName}</b>,</p>
            <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
              Dưới đây là chi tiết phiếu lương của bạn tháng <b>${month}/${year}</b>. Vui lòng liên hệ admin nếu có thắc mắc.
            </p>
          </td>
        </tr>

        <!-- Salary Table -->
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
              <thead>
                <tr style="background:#e2e8f0;">
                  <th style="padding:10px 16px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Khoản mục</th>
                  <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Số tiền</th>
                </tr>
              </thead>
              <tbody style="font-size:14px;color:#374151;">
                ${rows}
                ${bonusAmount > 0 ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px 16px;font-weight:600;">🎁 Thưởng tháng</td><td align="right" style="padding:10px 16px;color:#059669;font-weight:600;">+${formatVND(bonusAmount)}</td></tr>` : ""}
                ${totalTaskIncome ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px 16px;">Thu nhập WFH / Task</td><td align="right" style="padding:10px 16px;color:#16a34a">+${formatVND(totalTaskIncome)}</td></tr>` : ""}
                ${totalAdjustments !== 0 ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px 16px;">Điều chỉnh</td><td align="right" style="padding:10px 16px;color:${totalAdjustments > 0 ? "#16a34a" : "#dc2626"}">${totalAdjustments > 0 ? "+" : ""}${formatVND(totalAdjustments)}</td></tr>` : ""}
                ${latePenaltyAmount > 0 ? `<tr style="border-top:1px solid #e2e8f0;background:#fff5f5;"><td style="padding:10px 16px;color:#dc2626;">⚠️ Phạt đi trễ (${lateCount} lần, trừ ${latePenaltyHours}h)</td><td align="right" style="padding:10px 16px;color:#dc2626;font-weight:600;">-${formatVND(latePenaltyAmount)}</td></tr>` : ""}
              </tbody>
              <tfoot>
                <tr style="background:#1e293b;">
                  <td style="padding:14px 16px;color:#fff;font-weight:700;font-size:15px;">TỔNG THỰC NHẬN</td>
                  <td style="padding:14px 16px;color:#4ade80;font-weight:700;font-size:17px;text-align:right;">${formatVND(netSalary)}</td>
                </tr>
              </tfoot>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Email này được gửi tự động từ hệ thống ${APP_NAME}.<br/>
              Vui lòng không reply trực tiếp email này.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPayslipEmail(data: PayslipEmailData) {
  const html = buildPayslipHtml(data);

  const result = await getResend().emails.send({
    from: `${APP_NAME} <${FROM}>`,
    to: data.employeeEmail,
    cc: PAYSLIP_CC.filter(e => e !== data.employeeEmail),
    subject: `[${APP_NAME}] Phiếu lương tháng ${data.month}/${data.year} — ${data.employeeName}`,
    html,
  });

  return result;
}
