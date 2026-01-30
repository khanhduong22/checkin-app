
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu...')

  // 1. Tạo User mới (Hoặc update nếu đã có email)
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Nhân viên Mẫu',
      image: 'https://github.com/shadcn.png',
      role: 'USER',
      hourlyRate: 50000, // 50k/giờ
    },
  })

  console.log(`👤 User: ${user.name} (${user.id})`)

  // 2. Xóa dữ liệu cũ của user này để tránh trùng lặp
  await prisma.checkIn.deleteMany({ where: { userId: user.id } })
  await prisma.workShift.deleteMany({ where: { userId: user.id } })

  // 3. Tạo dữ liệu chấm công cho tháng 1/2026
  const daysInMonth = 31
  const checkIns = []

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(2026, 0, i) // Tháng 1 (index 0), năm 2026
    const dayOfWeek = date.getDay()

    // Bỏ qua Chủ Nhật (0) 
    if (dayOfWeek === 0) continue

    // Random giờ check-in: 7:45 - 8:15
    const checkInTime = new Date(date)
    checkInTime.setHours(7, 45 + Math.floor(Math.random() * 30), 0)

    // Random giờ check-out: 17:00 - 17:45
    // Thỉnh thoảng về sớm (16:00) hoặc tăng ca (19:00)
    const checkOutTime = new Date(date)
    const rand = Math.random()
    if (rand > 0.9) {
      checkOutTime.setHours(19, 0, 0) // OT
    } else if (rand < 0.1) {
      checkOutTime.setHours(16, 0, 0) // Về sớm
    } else {
      checkOutTime.setHours(17, 0 + Math.floor(Math.random() * 45), 0)
    }

    // Thêm check-in
    checkIns.push({
      userId: user.id,
      type: 'checkin',
      timestamp: checkInTime,
      ipAddress: '192.168.1.100',
    })

    // Thêm check-out
    checkIns.push({
      userId: user.id,
      type: 'checkout',
      timestamp: checkOutTime,
      ipAddress: '192.168.1.100',
    })
  }

  await prisma.checkIn.createMany({ data: checkIns })
  console.log(`✅ Đã tạo ${checkIns.length} lượt chấm công mẫu.`)

  // 4. Tạo ca làm việc (Shift)
  const shifts = []
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(2026, 0, i)
    if (date.getDay() === 0) continue

    const start = new Date(2026, 0, i, 8, 0, 0)
    const end = new Date(2026, 0, i, 17, 0, 0)
    shifts.push({
      userId: user.id,
      start: start,
      end: end,
      // shift: 'FULL' // optional
    })
  }

  // Lưu ý: WorkShift có unique constraint nên dùng createMany cẩn thận, 
  // nhưng ở trên ta đã deleteMany rồi nên OK.
  await prisma.workShift.createMany({ data: shifts })
  console.log(`✅ Đã tạo ${shifts.length} ca làm việc mẫu.`)

  console.log('🎉 Hoàn tất! Vào App kiểm tra ngay.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
