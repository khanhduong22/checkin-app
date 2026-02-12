
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const tasks = [
  {
    name: "Làm sản phẩm mới hoàn toàn (1 biến thể)",
    unit: "sản phẩm",
    baseReward: 50000,
    description: "Đăng trên sapo và 3 sàn, đầy đủ 9 ảnh, mô tả đầy đủ 3 ý, ảnh dưới mô tả, điền hết thuộc tính, sku chuẩn. SP ko quá 1 tuần."
  },
  {
    name: "Phụ phí biến thể (SP mới từ 2 biến thể)",
    unit: "biến thể",
    baseReward: 5000,
    description: "Cộng thêm cho mỗi biến thể (từ biến thể thứ 2 trở đi)."
  },
  {
    name: "Đăng bài FB",
    unit: "bài đăng",
    baseReward: 5000,
    description: "Đăng ít nhất 6 ảnh (hoặc kèm cap/hashtag). Nếu đăng video thì tính riêng."
  },
  {
    name: "Edit video 1688 & thêm vào SP",
    unit: "video",
    baseReward: 15000,
    description: "Video rõ nét, ko mờ, phải add vào link sản phẩm."
  },
  {
    name: "Tự quay video & edit & thêm vào SP",
    unit: "video",
    baseReward: 30000,
    description: "Video ít nhất 20s, tự quay, add vào sản phẩm."
  },
  {
    name: "Bỏ thêm biến thể vào Sapo/Sàn",
    unit: "biến thể",
    baseReward: 5000,
    description: "Liên kết sau khi thêm sản phẩm."
  },
  {
    name: "Thay hết hình trong 1 sản phẩm",
    unit: "sản phẩm",
    baseReward: 50000,
    description: "Thay trên Sapo và 3 sàn TMĐT."
  },
  {
    name: "Trả lời tin nhắn (Sàn/FB/Zalo)",
    unit: "tin nhắn",
    baseReward: 1000,
    description: "Tính theo lượt khách nhắn lại. Không áp dụng khi làm ở quán."
  },
  {
    name: "Thêm SP đã có trên Sapo lên Sàn (1 biến thể)",
    unit: "sản phẩm",
    baseReward: 30000,
    description: "Đầy đủ info, ko copy hình/tiêu đề shop khác."
  },
  {
    name: "Phụ phí thêm SP lên Sàn (>2 biến thể)",
    unit: "biến thể",
    baseReward: 3000,
    description: "Cộng thêm chênh lệch cho SP đã có trên Sapo."
  },
  {
    name: "Làm Banner dài",
    unit: "banner",
    baseReward: 20000,
    description: "Đúng concept từng shop."
  }
]

async function main() {
  console.log(`Start seeding tasks...`)
  for (const t of tasks) {
    const task = await prisma.taskDefinition.create({
      data: {
        name: t.name,
        unit: t.unit,
        baseReward: t.baseReward,
        description: t.description,
        active: true
      }
    })
    console.log(`Created task with id: ${task.id}`)
  }
  console.log(`Seeding finished.`)
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
