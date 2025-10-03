// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("▶ Iniciando seed…");

  // 0) Usuario base (admin-like para pruebas)
  const email = "admin@civihelper.test";
  const password = await bcrypt.hash("CiviHelper#2025", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin Demo",
      email,
      password,
      role: "ADMIN",
    },
  });
  console.log("✔ Usuario:", user.email);

  // 1) Categoría raíz
  const category = await prisma.category.upsert({
    where: { // unique([name, parentId]) → usa compound key virtual con findFirst + create
      // upsert por compuesta no es directo; hacemos fallback manual
      id: "ignore" // placeholder, no se usa
    },
    update: {},
    create: {
      name: "Servicios del Hogar",
      imageUrl: "/uploads/demo/cat-home.jpg",
      imageThumbUrl: "/uploads/demo/cat-home-thumb.jpg",
      isActive: true,
      sector: "OTHER",
    },
  }).catch(async () => {
    const found = await prisma.category.findFirst({
      where: { name: "Servicios del Hogar", parentId: null },
    });
    return found ?? prisma.category.create({
      data: {
        name: "Servicios del Hogar",
        imageUrl: "/uploads/demo/cat-home.jpg",
        imageThumbUrl: "/uploads/demo/cat-home-thumb.jpg",
        isActive: true,
        sector: "OTHER",
      },
    });
  });
  console.log("✔ Categoría:", category.name);

  // 2) ServiceType
  const stName = "Plomería";
  const serviceType = await prisma.serviceType.upsert({
    where: { name: stName },
    update: {},
    create: {
      name: stName,
      description: "Servicios de plomería y gasfitería",
      imageUrl: "/uploads/demo/st-plumbing.png",
      isActive: true,
      categoryId: category.id,
    },
  });
  console.log("✔ ServiceType:", serviceType.name);

  // 3) Servicio publicado con portada
  const serviceTitle = "Instalación de grifería";
  // Evita única compuesta (title, providerId)
  const service = await prisma.service.upsert({
    where: {
      // No hay unique directo en (title, providerId) para upsert, hacemos fallback:
      id: "ignore",
    },
    update: {},
    create: {
      title: serviceTitle,
      description: "Instalación profesional de grifería y sellos. Garantía 90 días.",
      priceFrom: 25000,
      city: "Santiago",
      providerId: user.id, // usando el usuario admin como proveedor demo
      categoryId: category.id,
      serviceTypeId: serviceType.id,
      adminCreated: true,
      status: "PUBLISHED",
      coverUrl: "/uploads/demo/service-cover.jpg",
      coverThumbUrl: "/uploads/demo/service-cover-thumb.jpg",
    },
  }).catch(async () => {
    const found = await prisma.service.findFirst({
      where: { title: serviceTitle, providerId: user.id },
    });
    return found ?? prisma.service.create({
      data: {
        title: serviceTitle,
        description: "Instalación profesional de grifería y sellos. Garantía 90 días.",
        priceFrom: 25000,
        city: "Santiago",
        providerId: user.id,
        categoryId: category.id,
        serviceTypeId: serviceType.id,
        adminCreated: true,
        status: "PUBLISHED",
        coverUrl: "/uploads/demo/service-cover.jpg",
        coverThumbUrl: "/uploads/demo/service-cover-thumb.jpg",
      },
    });
  });
  console.log("✔ Service:", service.title);

  // 4) Imagen adicional del servicio (opcional)
  await prisma.serviceImage.createMany({
    data: [
      { serviceId: service.id, url: "/uploads/demo/service1.jpg", thumbUrl: "/uploads/demo/service1-thumb.jpg" },
      { serviceId: service.id, url: "/uploads/demo/service2.jpg", thumbUrl: "/uploads/demo/service2-thumb.jpg" },
    ],
    skipDuplicates: true,
  });

  // 5) Reseña única por usuario/servicio
  const existingReview = await prisma.review.findUnique({
    where: { userId_serviceId: { userId: user.id, serviceId: service.id } },
  }).catch(() => null);
  if (!existingReview) {
    await prisma.review.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      },
    });
  }
  console.log("✔ Review creada/asegurada");

  // 6) Favorite (único por usuario/servicio)
  const fav = await prisma.favorite.upsert({
    where: {
      userId_serviceId: { userId: user.id, serviceId: service.id },
    },
    update: {},
    create: {
      userId: user.id,
      serviceId: service.id,
    },
  });
  console.log("✔ Favorite:", fav.id);

  console.log("✅ Seed finalizado.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
