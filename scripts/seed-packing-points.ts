import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const packingTasks = [
  { name: 'Đóng gói: Bảng 40x60', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 50x70', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 60x90', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 40x60', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 50x50', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 50x60', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 50x70', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 60x60', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 60x70', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 60x80', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 60x90', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 70x70', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 70x90', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 70x100', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Toan vẽ 80x100', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Khung viền 30x40', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Khung viền 40x40', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Khung viền 40x50', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Khung viền 40x60', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Khung viền 50x50', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 58x33', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 58x33 kèm phấn', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 46x26,5', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Bảng 46x26,6 kèm phấn', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 2 cái', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 3-4 cái', baseReward: 2, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 5-6 cái', baseReward: 3, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 7-8 cái', baseReward: 4, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 8-9 cái', baseReward: 5, unit: 'điểm' },
  { name: 'Đóng gói: Giá vẽ cao từ 90cm 9-10 cái', baseReward: 6, unit: 'điểm' },
  { name: 'Đóng gói: Khung vintage 40x60', baseReward: 1, unit: 'điểm' },
  { name: 'Đóng gói: Khung căng từ 80cm 3 cái trở lên', baseReward: 1, unit: 'điểm' },
]

async function main() {
  console.log('Seeding packing tasks...')
  for (const t of packingTasks) {
    const existing = await prisma.taskDefinition.findFirst({
      where: { name: t.name }
    })
    if (!existing) {
      await prisma.taskDefinition.create({
        data: {
          name: t.name,
          baseReward: t.baseReward,
          unit: t.unit,
          active: true,
          description: `Ghi nhận đóng gói ${t.name.replace('Đóng gói: ', '')} để tích luỹ ${t.baseReward} điểm.`
        }
      })
      console.log(`Created: ${t.name}`)
    } else {
      console.log(`Already exists: ${t.name}`)
    }
  }
  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
