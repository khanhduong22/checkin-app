const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPrizes() {
  await prisma.luckyWheelPrize.deleteMany();

  const prizes = [
    {
      name: "Thưởng nóng 20k",
      description: "Cộng vào lương",
      type: "MONEY",
      quantity: 50,
      remaining: 50,
      probability: 20,
      value: 20000,
      active: true
    },
    {
      name: "Thưởng nóng 50k",
      description: "Lộc lá đầu tháng",
      type: "MONEY",
      quantity: 10,
      remaining: 10,
      probability: 5,
      value: 50000,
      active: true
    },
    {
      name: "Gấu bông LimArt",
      description: "Quà hiện vật",
      type: "PHYSICAL",
      quantity: 5,
      remaining: 5,
      probability: 10,
      value: 0,
      active: true
    },
    {
      name: "Voucher Coffee",
      description: "Gift Voucher",
      type: "PHYSICAL",
      quantity: 20,
      remaining: 20,
      probability: 15,
      value: 0,
      active: true
    },
    {
      name: "Thêm 1 lượt quay",
      description: "May mắn lần sau",
      type: "ONE_MORE_TURN",
      quantity: 100,
      remaining: 100,
      probability: 10,
      value: 0,
      active: true
    },
    // --- FUN TITLES ---
    {
        name: "Danh hiệu: Chiến thần Deadline",
        description: "Deadline dí không chết",
        type: "TITLE",
        quantity: 5,
        remaining: 5,
        probability: 1, 
        value: 0,
        active: true
    },
    {
        name: "Danh hiệu: Đại gia Trà sữa",
        description: "Bao nuôi cả công ty",
        type: "TITLE",
        quantity: 5,
        remaining: 5,
        probability: 1, 
        value: 0,
        active: true
    },
    {
        name: "Danh hiệu: Dũng sĩ Diệt mồi",
        description: "Kẻ hủy diệt snack văn phòng",
        type: "TITLE",
        quantity: 5,
        remaining: 5,
        probability: 1, 
        value: 0,
        active: true
    },
    {
        name: "Danh hiệu: Cây hài Nhân gian",
        description: "Gánh hài cả team",
        type: "TITLE",
        quantity: 5,
        remaining: 5,
        probability: 1, 
        value: 0,
        active: true
    },
    {
        name: "Danh hiệu: Thánh Ngủ Gật",
        description: "Ngủ mọi lúc mọi nơi",
        type: "TITLE",
        quantity: 5,
        remaining: 5,
        probability: 1, 
        value: 0,
        active: true
    },
    {
        name: "Danh hiệu: Bàn tay vàng",
        description: "Huyền thoại gacha",
        type: "TITLE",
        quantity: 1,
        remaining: 1,
        probability: 1, 
        value: 0,
        active: true
    },
    // --- REMAINDER ---
    {
      name: "Chúc may mắn lần sau",
      description: "Trượt rồi",
      type: "BETTER_LUCK_NEXT_TIME",
      quantity: 9999,
      remaining: 9999,
      probability: 34, // Math balanced
      value: 0,
      active: true
    }
  ];

  for (const prize of prizes) {
    await prisma.luckyWheelPrize.create({ data: prize });
    console.log(`Created: ${prize.name}`);
  }
}

seedPrizes()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
