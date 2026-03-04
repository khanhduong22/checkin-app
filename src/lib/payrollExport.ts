/**
 * Payroll XLSX Export Utility
 * Supports:
 * - Full payroll export (Sheet 1: summary, Sheet 2..N: per-employee daily details)
 * - Single-employee export (Sheet 1: summary card, Sheet 2: daily details)
 */
import * as XLSX from 'xlsx';

const VND = (n: number) => Math.round(n);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollExportUser {
  name: string;
  email: string;
  stats: {
    employmentType: string;
    daysWorked: number;
    standardDays?: number;
    leaveCount: number;
    totalHours: number;
    baseSalary: number;
    bonusAmount?: number;
    bonusPercent?: number;
    totalAdjustments: number;
    totalSalary: number;
    finalNet?: number;
    adjustments?: Array<{ date: string | Date; reason: string; amount: number }>;
    dailyDetails?: Array<{
      date: string;
      checkIn: Date | null;
      checkOut: Date | null;
      hours: number;
      salary: number;
      isValid: boolean;
      shift?: string;
      error?: string;
    }>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (d: Date | null) => {
  if (!d) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(d));
};

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });


/**
 * Apply Excel number format '#,##0' (e.g. 71,577) to all numeric cells
 * in the given 0-based column indices, skipping the header rows.
 */
function applyNumberFormat(ws: XLSX.WorkSheet, colIndices: number[], skipRows: number) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r + skipRows; R <= range.e.r; R++) {
    for (const C of colIndices) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && cell.t === 'n') {
        cell.z = '#,##0';
      }
    }
  }
}


// ─── Sheet builders ───────────────────────────────────────────────────────────

/**
 * Build summary sheet (all employees)
 */
function buildSummarySheet(
  users: PayrollExportUser[],
  month: number,
  year: number,
  isClosed: boolean,
  bonusPercent: number,
  bonusTargets: string[]
): XLSX.WorkSheet {
  const title = `Tháng ${month}/${year}${isClosed ? ' (Đã chốt)' : ' (Tạm tính)'}`;

  const headers = [
    'Tên', 'Email', 'Loại HĐ', 'Ngày công', 'Nghỉ phép', 'Giờ làm (h)',
    'Lương cứng (VND)', 'Thưởng tháng (VND)', 'Thưởng/Phạt (VND)', 'Thực lãnh (VND)'
  ];

  const rows = users.map(u => {
    const shouldApply = !isClosed && bonusTargets.includes(u.stats.employmentType);
    const bonusAmt = isClosed
      ? VND(u.stats.bonusAmount || 0)
      : VND(shouldApply ? (u.stats.baseSalary * bonusPercent / 100) : 0);
    const finalNet = isClosed
      ? VND(u.stats.finalNet ?? u.stats.totalSalary)
      : VND(u.stats.totalSalary + bonusAmt);
    const daysCellVal = u.stats.standardDays
      ? `${u.stats.daysWorked}/${u.stats.standardDays}`
      : u.stats.daysWorked;

    return [
      u.name,
      u.email,
      u.stats.employmentType,
      daysCellVal,
      u.stats.leaveCount || 0,
      parseFloat(u.stats.totalHours.toFixed(1)),
      VND(u.stats.baseSalary),
      bonusAmt,
      VND(u.stats.totalAdjustments),
      finalNet,
    ];
  });

  // Totals row
  const totalFinalNet = users.reduce((sum, u) => {
    const shouldApply = !isClosed && bonusTargets.includes(u.stats.employmentType);
    const bonusAmt = isClosed
      ? VND(u.stats.bonusAmount || 0)
      : VND(shouldApply ? (u.stats.baseSalary * bonusPercent / 100) : 0);
    return sum + (isClosed ? VND(u.stats.finalNet ?? u.stats.totalSalary) : VND(u.stats.totalSalary + bonusAmt));
  }, 0);

  const totalRow = [
    `Tổng (${users.length} NV)`, '', '', '', '',
    parseFloat(users.reduce((s, u) => s + u.stats.totalHours, 0).toFixed(1)),
    VND(users.reduce((s, u) => s + u.stats.baseSalary, 0)),
    VND(users.reduce((s, u) => {
      const should = !isClosed && bonusTargets.includes(u.stats.employmentType);
      return s + (isClosed ? (u.stats.bonusAmount || 0) : (should ? u.stats.baseSalary * bonusPercent / 100 : 0));
    }, 0)),
    VND(users.reduce((s, u) => s + u.stats.totalAdjustments, 0)),
    totalFinalNet,
  ];

  const sheetData = [
    [`Bảng lương - ${title}`],
    [],
    headers,
    ...rows,
    [],
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];

  // Apply #,##0 format to salary columns (G=6, H=7, I=8, J=9), skip 3 header rows
  applyNumberFormat(ws, [6, 7, 8, 9], 3);

  return ws;
}

/**
 * Build per-employee detail sheet
 */
function buildEmployeeDetailSheet(
  user: PayrollExportUser,
  month: number,
  year: number,
  isClosed: boolean,
  bonusPercent: number,
  bonusTargets: string[]
): XLSX.WorkSheet {
  const shouldApplyBonus = !isClosed && bonusTargets.includes(user.stats.employmentType);
  const bonusAmt = isClosed
    ? VND(user.stats.bonusAmount || 0)
    : VND(shouldApplyBonus ? (user.stats.baseSalary * bonusPercent / 100) : 0);
  const finalNet = isClosed
    ? VND(user.stats.finalNet ?? user.stats.totalSalary)
    : VND(user.stats.totalSalary + bonusAmt);

  const summarySection = [
    [`Phiếu lương - ${user.name}`],
    [`Tháng ${month}/${year} | ${user.email} | Loại HĐ: ${user.stats.employmentType}`],
    [],
    ['Lương cứng (VND)', VND(user.stats.baseSalary)],
    ['Thưởng tháng (VND)', bonusAmt],
    ['Thưởng/Phạt (VND)', VND(user.stats.totalAdjustments)],
    ['Thực lãnh (VND)', finalNet],
    ['Tổng giờ làm', parseFloat(user.stats.totalHours.toFixed(1))],
    ['Ngày công', user.stats.standardDays ? `${user.stats.daysWorked}/${user.stats.standardDays}` : user.stats.daysWorked],
    ['Nghỉ phép', user.stats.leaveCount || 0],
    [],
  ];

  // Daily detail section
  const hasDaily = user.stats.dailyDetails && user.stats.dailyDetails.length > 0;
  const dailyHeaders = ['Ngày', 'Ca', 'Giờ vào', 'Giờ ra', 'Số giờ', 'Lương ngày (VND)', 'Ghi chú'];

  const dailyRows = hasDaily
    ? user.stats.dailyDetails!
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => [
        fmtDate(d.date),
        d.shift || 'Ngoài lịch',
        fmtTime(d.checkIn),
        fmtTime(d.checkOut),
        d.hours > 0 ? parseFloat(d.hours.toFixed(1)) : 0,
        d.salary > 0 ? VND(d.salary) : 0,
        d.error || (d.isValid ? '' : 'Không hợp lệ'),
      ])
    : [['Không có dữ liệu chấm công']];

  const adjustmentSection: any[][] = [
    [],
    ['Lịch sử Thưởng/Phạt'],
    ['Ngày', 'Lý do', 'Số tiền (VND)'],
    ...((user.stats.adjustments || []).map(a => [
      fmtDate(a.date),
      a.reason,
      VND(a.amount),
    ])),
  ];
  if (!user.stats.adjustments || user.stats.adjustments.length === 0) {
    adjustmentSection.push(['Không có dữ liệu']);
  }

  const sheetData = [
    ...summarySection,
    ['Chi tiết chấm công'],
    dailyHeaders,
    ...dailyRows,
    ...adjustmentSection,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    { wch: 8 }, { wch: 20 }, { wch: 25 }
  ];

  // Summary section: col B (index 1) has VND values, skip 3 header rows (title, subtitle, blank)
  applyNumberFormat(ws, [1], 3);
  // Daily detail section: col F (index 5) = salary, starts after ~11 summary rows
  // Apply broadly to col 1 and col 5 across entire sheet — safe since only numbers get formatted
  applyNumberFormat(ws, [5], 10);
  // Adjustments section col 2 (index 2) = amount
  applyNumberFormat(ws, [2], 10);

  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export full payroll: Sheet 1 summary + one sheet per employee with daily details.
 */
export function exportFullPayrollXLSX(
  users: PayrollExportUser[],
  month: number,
  year: number,
  isClosed: boolean,
  bonusPercent: number,
  bonusTargets: string[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryWs = buildSummarySheet(users, month, year, isClosed, bonusPercent, bonusTargets);
  XLSX.utils.book_append_sheet(wb, summaryWs, `Tổng hợp ${month}-${year}`);

  // Sheet per employee
  for (const user of users) {
    const ws = buildEmployeeDetailSheet(user, month, year, isClosed, bonusPercent, bonusTargets);
    // Sheet name max 31 chars, no special chars
    const sheetName = (user.name || 'NV').replace(/[\\/:?*[\]]/g, '').slice(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `bang_luong_${month}_${year}.xlsx`);
}

/**
 * Export single-employee payroll slip.
 */
export function exportSingleEmployeeXLSX(
  user: PayrollExportUser,
  month: number,
  year: number,
  isClosed: boolean,
  bonusPercent: number = 0,
  bonusTargets: string[] = []
) {
  const wb = XLSX.utils.book_new();

  const ws = buildEmployeeDetailSheet(user, month, year, isClosed, bonusPercent, bonusTargets);
  XLSX.utils.book_append_sheet(wb, ws, `Phiếu lương`);

  const safeName = (user.name || 'NV').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').slice(0, 20);
  XLSX.writeFile(wb, `phieu_luong_${safeName}_${month}_${year}.xlsx`);
}
