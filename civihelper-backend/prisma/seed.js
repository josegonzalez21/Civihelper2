// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo de Civihelper...');

  // 1) password
  const passwordHash = await bcrypt.hash('copo1515', 10);

  // 2) usuarios base
  const [admin, providerUser, client] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'joseadmin@gmail.com' },
      update: {},
      create: {
        name: 'Jose Admin',
        email: 'joseadmin@gmail.com',
        role: 'ADMIN',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'joseprovider@gmail.com' },
      update: {},
      create: {
        name: 'Jose Provider',
        email: 'joseprovider@gmail.com',
        role: 'PROVIDER',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'joseuser@gmail.com' },
      update: {},
      create: {
        name: 'Jose User',
        email: 'joseuser@gmail.com',
        role: 'CLIENT',
        passwordHash,
      },
    }),
  ]);

  console.log('✅ Usuarios listos');

  // 3) provider ligado al user provider
  await prisma.provider.upsert({
    where: {
      // porque tu modelo tiene @@unique([type, oauthId])
      type_oauthId: {
        type: 'GOOGLE',
        oauthId: providerUser.id,
      },
    },
    update: {},
    create: {
      userId: providerUser.id,
      type: 'GOOGLE',
      oauthId: providerUser.id,
    },
  });

  console.log('✅ Provider creado');

  // 4) categorías base
  await prisma.category.createMany({
    data: [
      { name: 'Hogar', sector: 'PRIVATE' },
      { name: 'Educación', sector: 'EDUCATION' },
      { name: 'Salud', sector: 'HEALTH' },
    ],
    skipDuplicates: true,
  });

  // buscamos la categoría "Hogar" para usar su id
  const hogar = await prisma.category.findFirst({
    where: { name: 'Hogar' },
  });

  console.log('✅ Categorías listas');

  // 5) tipo de servicio
  const serviceType = await prisma.serviceType.upsert({
    where: { name: 'Reparación' },
    update: {},
    create: {
      name: 'Reparación',
      description: 'Servicios generales de mantenimiento y reparación.',
    },
  });

  console.log('✅ ServiceType listo');

  // 6) servicio de ejemplo
  const service = await prisma.service.upsert({
    where: {
      // 👇 este nombre viene de tu schema: name: "service_title_provider_unique"
      service_title_provider_unique: {
        title: 'Servicio de Limpieza',
        providerId: providerUser.id,
      },
    },
    update: {},
    create: {
      title: 'Servicio de Limpieza',
      description: 'Limpieza general de casas y departamentos.',
      priceFrom: 25000,
      city: 'Santiago',
      providerId: providerUser.id,
      categoryId: hogar?.id ?? null,
      serviceTypeId: serviceType.id,
      status: 'PUBLISHED',
      coverUrl: 'https://via.placeholder.com/400x250.png?text=Limpieza',
    },
  });

  console.log('✅ Servicio creado');

  // 7) imagen del servicio
  await prisma.serviceImage.create({
    data: {
      serviceId: service.id,
      url: 'https://via.placeholder.com/400x250.png?text=Imagen+1',
      thumbUrl: 'https://via.placeholder.com/150x100.png?text=Thumb',
    },
  });

  console.log('✅ Imagen del servicio creada');

  // 8) promoción
  await prisma.promotion.create({
    data: {
      title: 'Descuento en Limpieza',
      imageKey: 'https://via.placeholder.com/800x400.png?text=Promo+Limpieza',
      serviceId: service.id,
      categoryId: hogar?.id ?? null,
      isActive: true,
      startsAt: new Date(),
    },
  });

  console.log('✅ Promoción creada');

  // 9) review del cliente
  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Excelente servicio.',
      userId: client.id,
      serviceId: service.id,
    },
  });

  console.log('🎉 Seed completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
