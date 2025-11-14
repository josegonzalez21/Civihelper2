// test-chat.js
// Ejecutar: node test-chat.js
import { prisma } from './src/lib/prisma.js';

async function testChatSystem() {
  console.log('🧪 Probando sistema de chat...\n');

  try {
    // 1. Verificar tablas
    console.log('1️⃣ Verificando tablas...');
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();
    console.log(`   ✅ Conversaciones: ${conversationCount}`);
    console.log(`   ✅ Mensajes: ${messageCount}\n`);

    // 2. Obtener usuarios de prueba
    console.log('2️⃣ Buscando usuarios...');
    const users = await prisma.user.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true },
    });

    if (users.length < 2) {
      console.log('   ⚠️  Se necesitan al menos 2 usuarios.');
      console.log('   Creando usuarios de prueba...\n');
      
      // Crear usuarios de prueba si no existen
      const user1 = await prisma.user.create({
        data: {
          name: 'Cliente Demo',
          email: 'cliente@demo.com',
          password: 'password123',
          role: 'CLIENT',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          name: 'Proveedor Demo',
          email: 'proveedor@demo.com',
          password: 'password123',
          role: 'PROVIDER',
        },
      });

      users.push(user1, user2);
    }

    const [client, provider] = users;
    console.log(`   ✅ Cliente: ${client.name} (${client.email})`);
    console.log(`   ✅ Proveedor: ${provider.name} (${provider.email})\n`);

    // 3. Crear conversación de prueba
    console.log('3️⃣ Creando conversación de prueba...');
    
    // Verificar si ya existe
    let conversation = await prisma.conversation.findFirst({
      where: {
        clientId: client.id,
        providerId: provider.id,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          clientId: client.id,
          providerId: provider.id,
        },
      });
      console.log(`   ✅ Conversación creada: ${conversation.id}\n`);
    } else {
      console.log(`   ℹ️  Conversación ya existe: ${conversation.id}\n`);
    }

    // 4. Crear mensajes de prueba
    console.log('4️⃣ Creando mensajes de prueba...');
    
    const testMessages = [
      {
        senderId: provider.id,
        content: '¡Hola! Bienvenido a mi servicio. ¿En qué puedo ayudarte?',
      },
      {
        senderId: client.id,
        content: 'Hola, necesito información sobre tus servicios disponibles.',
      },
      {
        senderId: provider.id,
        content: 'Claro, con gusto te ayudo. Tengo disponibilidad esta semana.',
      },
      {
        senderId: client.id,
        content: '¿Cuánto costaría el servicio?',
      },
      {
        senderId: provider.id,
        content: 'El precio varía según tus necesidades. ¿Hablamos por llamada para darte un presupuesto exacto?',
      },
    ];

    for (const msg of testMessages) {
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: msg.senderId,
          content: msg.content,
          type: 'TEXT',
        },
      });
      console.log(`   ✅ Mensaje creado: "${msg.content.substring(0, 50)}..."`);
      
      // Pequeña pausa para que las fechas sean diferentes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. Actualizar conversación con último mensaje
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: lastMessage.createdAt,
        lastMessageText: lastMessage.content,
      },
    });

    console.log('\n✅ ¡Sistema de chat funcionando correctamente!\n');
    console.log('📋 Resumen:');
    console.log(`   - Conversación ID: ${conversation.id}`);
    console.log(`   - Total de mensajes: ${testMessages.length}`);
    console.log(`   - Última actualización: ${lastMessage.createdAt.toLocaleString()}\n`);

    console.log('🎯 Próximo paso: Abre la app y ve al tab "Mensajes"');
    console.log(`   - Usuario cliente: ${client.email}`);
    console.log(`   - Usuario proveedor: ${provider.email}\n`);

    // 6. Mostrar IDs para testing
    console.log('🔑 IDs para testing:');
    console.log(`   Client ID: ${client.id}`);
    console.log(`   Provider ID: ${provider.id}`);
    console.log(`   Conversation ID: ${conversation.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testChatSystem();