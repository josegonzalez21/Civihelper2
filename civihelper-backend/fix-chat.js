// fix-chat.js
import { prisma } from './src/lib/prisma.js';

async function fixChat() {
  console.log('🔧 Creando conversación con tu usuario...\n');

  try {
    // Buscar tu usuario
    const myUser = await prisma.user.findUnique({
      where: { email: 'jjkjosehhh@gmail.com' },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!myUser) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Tu usuario:', myUser.name, '(', myUser.email, ')');
    console.log('   ID:', myUser.id, '\n');

    // Buscar otro usuario
    const otherUser = await prisma.user.findFirst({
      where: { id: { not: myUser.id } },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!otherUser) {
      console.log('❌ No hay otro usuario');
      return;
    }

    console.log('✅ Otro usuario:', otherUser.name, '(', otherUser.email, ')');
    console.log('   ID:', otherUser.id, '\n');

    // Determinar roles
    const clientId = myUser.role === 'PROVIDER' ? otherUser.id : myUser.id;
    const providerId = myUser.role === 'PROVIDER' ? myUser.id : otherUser.id;

    console.log('📝 Creando conversación...\n');

    // Limpiar conversaciones anteriores
    await prisma.message.deleteMany({
      where: {
        conversation: {
          OR: [
            { clientId, providerId },
            { clientId: providerId, providerId: clientId },
          ],
        },
      },
    });

    await prisma.conversation.deleteMany({
      where: {
        OR: [
          { clientId, providerId },
          { clientId: providerId, providerId: clientId },
        ],
      },
    });

    // Crear conversación
    const conversation = await prisma.conversation.create({
      data: { clientId, providerId },
    });

    console.log('✅ Conversación creada:', conversation.id, '\n');

    // Crear mensajes
    console.log('💬 Creando mensajes...');
    const messages = [
      { senderId: providerId, content: '¡Hola! ¿En qué puedo ayudarte?' },
      { senderId: clientId, content: 'Hola, necesito información sobre tus servicios.' },
      { senderId: providerId, content: 'Claro, con gusto te ayudo.' },
      { senderId: clientId, content: '¿Tienes disponibilidad esta semana?' },
      { senderId: providerId, content: 'Sí, tengo disponibilidad. Te envío horarios.' },
    ];

    for (const msg of messages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: msg.senderId,
          content: msg.content,
          type: 'TEXT',
        },
      });
      console.log('   ✅', msg.content);
      await new Promise(r => setTimeout(r, 100));
    }

    const lastMsg = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: lastMsg.createdAt,
        lastMessageText: lastMsg.content,
      },
    });

    console.log('\n🎉 ¡Listo! Ve a la app y refresca el tab Mensajes\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixChat();