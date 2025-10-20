const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const exphbs = require('express-handlebars');

const cors = require('cors');


const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = ['http://localhost:5173', 'https://rudless.com', 'https://web.rudless.com'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

// Middleware principal
app.use(cors(corsOptions));

// Répondre aux requêtes OPTIONS (préflight)
app.options('*', cors(corsOptions));


const mailRoutes = require('./routes/mailRoutes');


app.engine('handlebars', exphbs.engine({ defaultLayout: false }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use('/mdp', mailRoutes);

const streams = {};


const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*', 
    credentials: true,
  },
});

// === Routes HTTP ===
app.get('/', (req, res) => {
  res.send('Bienvenue sur RudChat !');
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/public', express.static(path.join(__dirname, 'public')));

// === Socket.IO ===
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Utilisateur connecté : ${socket.id}`);

  // === Lier socket à l'utilisateur ===
  socket.on('join-user', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`[Socket.IO] ${socket.id} rejoint la room de l'utilisateur ${userId}`);
    }
  });

  // === Chat Privé ===
socket.on('send-private-message', ({ toUserId, fromUserId, message }) => {
  const payload = {
    sender: fromUserId,
    recipient: toUserId,
    content: message,
    time: new Date().toLocaleTimeString(),
    avatar: null
  };

  io.to(toUserId.toString()).emit('receive-private-message', payload);
  io.to(fromUserId.toString()).emit('receive-private-message', payload);

  console.log(`[Message Privé] ${fromUserId} → ${toUserId} : ${message}`);
});

// Broadcast simple sans userId
socket.on('broadcast-message', (message) => {
  const payload = {
    content: message,
    time: new Date().toLocaleTimeString(),
  };
  io.emit('receive-broadcast-message', payload);
  console.log(`[Broadcast] Message global : ${message}`);
});



  // === Notifications ===
  socket.on('new-notification', ({ toUserId }) => {
    io.to(toUserId.toString()).emit('new-notification');
  });

  // === Amis ===
  socket.on('update-amis', (data) => {
    if (data?.toUserId) {
      io.to(data.toUserId.toString()).emit('update-amis');
    } else {
      io.emit('update-amis');
    }
  });

  // === Chat public (ancien) ===
  socket.on('new-message', (msg) => {
    socket.broadcast.emit('new-message', msg);
  });

  // === Commentaires ===
  socket.on('new-comment', (comment) => {
    io.emit('new-comment', comment);
  });

  // === Suppression / édition de message ===
  socket.on('delete-message', () => {
    io.emit('delete-message');
  });

  socket.on('edit-message', (content) => {
    io.emit('edit-message', content);
  });

  // === WebRTC (optionnel) ===
  socket.on('start-stream', (_, callback) => {
    const streamId = uuidv4();
    streams[streamId] = socket.id;
    socket.join(streamId);
    callback(streamId);
  });

  socket.on('join-stream', ({ streamId }) => {
    const streamerId = streams[streamId];
    if (streamerId) {
      io.to(streamerId).emit('viewer-connected', socket.id);
    }
  });

  socket.on('send-offer', (data) => {
    io.to(data.to).emit('send-offer', { ...data, from: socket.id });
  });

  socket.on('send-answer', (data) => {
    io.to(data.to).emit('send-answer', { ...data, from: socket.id });
  });

  socket.on('send-ice-candidate', (data) => {
    io.to(data.to).emit('send-ice-candidate', data);
  });

  socket.on('stop-stream', (streamId) => {
    delete streams[streamId];
  });

  // === Déconnexion ===
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Déconnecté : ${socket.id}`);
  });

  // === Gestion des erreurs ===
  socket.on('error', (error) => {
    console.error('[Socket.IO] Erreur :', error);
  });
});

// === Lancement du serveur ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});
