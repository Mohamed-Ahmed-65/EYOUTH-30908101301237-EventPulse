const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const Event = require('../models/Event');
const Message = require('../models/Message');

function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(async (socket, next) => {
    const raw =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');

    if (!raw) return next();

    try {
      const payload = jwt.verify(raw, process.env.JWT_SECRET);
      const userId = payload.userId || payload.id;
      const user = await User.findById(userId).select('-password');
      if (user) socket.user = user;
      next();
    } catch (_err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinRoom', (eventId) => {
      if (!eventId) return;
      socket.join(String(eventId));
    });

    socket.on('leaveRoom', (eventId) => {
      if (!eventId) return;
      socket.leave(String(eventId));
    });

    socket.on('announce', async (payload = {}, ack) => {
      const fail = (message) => {
        const err = { message };
        socket.emit('announceError', err);
        if (typeof ack === 'function') ack(err);
      };

      if (!socket.user || socket.user.role !== 'admin') {
        return fail('Only admins can broadcast announcements');
      }

      const eventId = payload.eventId;
      const text = typeof payload.text === 'string' ? payload.text.trim() : '';
      if (!eventId || !text) {
        return fail('eventId and text are required');
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return fail('Event not found');
      }

      const message = await Message.create({
        event: eventId,
        sender: socket.user._id,
        text,
      });

      const body = {
        _id: message._id,
        event: String(eventId),
        sender: {
          _id: socket.user._id,
          email: socket.user.email,
          role: socket.user.role,
        },
        text: message.text,
        createdAt: message.createdAt,
      };

      io.to(String(eventId)).emit('announcement', body);
      if (typeof ack === 'function') ack({ ok: true, announcement: body });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = attachSocket;
