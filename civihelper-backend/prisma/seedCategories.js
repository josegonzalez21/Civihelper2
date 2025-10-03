// prisma/seedCategories.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const base = [
  "Plomería",
  "Electricidad",
  "Carpintería",
  "Gasfitería",
  "Pintura",
  "Aseo",
  "Cerrajería",
  "Jardinería",
  "Tecnología",
  "Transporte",
];

async function main() {
  for (const name of base) {
    try {
      await prisma.category.create({ data: { name } });
      console.log("✓", name);
    } catch (e) {
      if (e?.code === "P2002") {
        console.log("• (ya existe)", name);
      } else {
        console.error("x", name, e);
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
