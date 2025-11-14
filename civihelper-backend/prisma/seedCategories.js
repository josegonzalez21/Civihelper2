// prisma/seedCategories.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Asegura una categoría raíz (parentId = null) por nombre.
 * Si ya existe, la retorna tal cual; si no, la crea.
 * Puedes extenderla con sector/isActive o imágenes demo si quieres.
 */
async function ensureRootCategory(name, { sector = "OTHER", isActive = true, imageUrl = null, imageThumbUrl = null } = {}) {
  const found = await prisma.category.findFirst({
    where: { name: String(name), parentId: null },
    select: { id: true, name: true },
  });
  if (found) return found;

  return prisma.category.create({
    data: {
      name: String(name),
      parentId: null,
      sector,
      isActive,
      imageUrl,
      imageThumbUrl,
    },
    select: { id: true, name: true },
  });
}

/** Lista base de categorías raíz a crear (ajústala a tu gusto). */
const ROOT_CATEGORIES = [
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
  console.log("▶ Sembrando categorías raíz…");

  // Si quieres agregar sector/imagenes por categoría, usa un map:
  // const configPorNombre = {
  //   "Plomería": { sector: "OTHER", imageUrl: "/uploads/demo/plomeria.png" },
  //   ...
  // };

  const results = await Promise.allSettled(
    ROOT_CATEGORIES.map((name) =>
      ensureRootCategory(name /*, configPorNombre[name] */)
    )
  );

  let created = 0;
  let existing = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      // Si el ensureRootCategory creó o encontró indistintamente,
      // no sabemos si existía; para log más fino, podrías hacer 2 pasos:
      // aquí lo contamos como "asegurado".
      existing += 1;
      console.log("✔ Asegurada:", r.value.name);
    } else {
      console.error("✖ Error asegurando categoría:", r.reason?.message || r.reason);
    }
  }

  console.log(`✅ Seed de categorías completado. Total aseguradas: ${existing}, nuevas (aprox): ${created}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
