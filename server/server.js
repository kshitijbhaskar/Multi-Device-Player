const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (roomId) => {
    console.log(`User joined room ${roomId}`);
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        leader: socket.id,
        currentVideoId: null,
        clients: []
      };
    }

    rooms[roomId].clients.push(socket.id);

    // Inform the client if they are the leader
    socket.emit('role-assign', socket.id === rooms[roomId].leader);

    // Send current video to the new client
    if (rooms[roomId].currentVideoId) {
      socket.emit('new-video', rooms[roomId].currentVideoId);
    }
  });

  socket.on('update-state', (state, roomId) => {
    if (rooms[roomId] && socket.id === rooms[roomId].leader) {
      socket.to(roomId).emit('state-update', state);
    }
  });

  socket.on('new-video', (videoId, roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].currentVideoId = videoId;
      io.to(roomId).emit('new-video', videoId);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    for (const roomId in rooms) {
      rooms[roomId].clients = rooms[roomId].clients.filter(clientId => clientId !== socket.id);
      if (rooms[roomId].clients.length === 0) {
        delete rooms[roomId];
      } else if (socket.id === rooms[roomId].leader) {
        // Assign new leader
        rooms[roomId].leader = rooms[roomId].clients[0];
        io.to(rooms[roomId].leader).emit('role-assign', true);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});