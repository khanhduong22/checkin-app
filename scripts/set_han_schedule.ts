import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const year = 2026;
    
    // 1. Tìm user Hân
    const han = await prisma.user.findFirst({
        where: {
            name: {
                contains: 'Hân',
                mode: 'insensitive'
            }
        }
    });

    if (!han) {
        console.log("❌ Không tìm thấy nhân viên Hân trong CSDL!");
        return;
    }
    
    console.log(`✅ Đã tìm thấy: ${han.name} (ID: ${han.id})`);

    // 2. Lấy danh sách ngày lễ trong năm 2026
    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
            }
        }
    });

    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
    console.log(`✅ Tìm thấy ${holidayDates.size} ngày lễ trong năm ${year}`);

    // 3. Xóa các ca cũ của Hân trong năm 2026 (tránh trùng lặp)
    const deleted = await prisma.workShift.deleteMany({
        where: {
            userId: han.id,
            start: {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
            }
        }
    });
    console.log(`✅ Đã xóa ${deleted.count} ca làm việc cũ trong năm ${year}`);

    // 4. Tạo ca làm việc mới
    const shiftsToCreate = [];
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T00:00:00.000Z`);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Lấy thứ trong tuần (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const dayOfWeek = d.getDay();
        const dateString = d.toISOString().split('T')[0];

        // Nếu là T2 đến T7 (1 -> 6) và KHÔNG phải ngày lễ
        if (dayOfWeek >= 1 && dayOfWeek <= 6 && !holidayDates.has(dateString)) {
            // Ca 8h - 16h (Giờ VN = UTC+7) => Start = 01:00 UTC, End = 09:00 UTC
            const shiftStart = new Date(d);
            shiftStart.setUTCHours(1, 0, 0, 0); // 8h sáng VN
            
            const shiftEnd = new Date(d);
            shiftEnd.setUTCHours(9, 0, 0, 0); // 16h chiều VN

            shiftsToCreate.push({
                userId: han.id,
                start: shiftStart,
                end: shiftEnd,
                status: "APPROVED",
                shiftType: "FIXED",
                isOpenForSwap: false
            });
        }
    }

    // 5. Insert vào DB
    if (shiftsToCreate.length > 0) {
        const result = await prisma.workShift.createMany({
            data: shiftsToCreate
        });
        console.log(`✈️  Thành công! Đã lên lịch tự động ${result.count} ca làm việc cho Hân (từ T2-T7, 8h-16h) cho năm ${year}.`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
