const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../music/'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve music files
app.use('/music', express.static(path.join(__dirname, '../music')));

// Handle file upload
app.post('/upload', upload.single('song'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  console.log(`File uploaded: ${req.file.filename}`);
  res.send(`File uploaded: ${req.file.filename}`);
  io.emit('newSong', req.file.filename);
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (roomId) => {
    console.log(`User joined room ${roomId}`);
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        audioState: {
          paused: true,
          currentTime: 0,
          lastUpdateTime: Date.now()
        },
        clients: []
      };
    }

    rooms[roomId].clients.push(socket.id);

    // Send current audio state and clock time to the new client
    socket.emit('audio-state', rooms[roomId].audioState);
  });


  socket.on('play', (roomId) => {
    console.log('Received play event');
    if (rooms[roomId]) {
      rooms[roomId].audioState.paused = false;
      rooms[roomId].audioState.lastUpdateTime = Date.now();
      io.to(roomId).emit('play', rooms[roomId].audioState);
    }
  });

  socket.on('pause', (roomId) => {
    console.log('Received pause event');
    if (rooms[roomId]) {
      rooms[roomId].audioState.paused = true;
      rooms[roomId].audioState.lastUpdateTime = Date.now();
      io.to(roomId).emit('pause', rooms[roomId].audioState);
    }
  });

  socket.on('seek', (time, roomId) => {
    console.log(`Received seek event to time: ${time}`);
    if (rooms[roomId]) {
      rooms[roomId].audioState.currentTime = time;
      rooms[roomId].audioState.lastUpdateTime = Date.now();
      io.to(roomId).emit('seek', rooms[roomId].audioState);
    }
  });

  socket.on('sync-request', (roomId) => {
    if (rooms[roomId]) {
      const elapsedTimeSinceUpdate = Math.max(0, Date.now() - rooms[roomId].audioState.lastUpdateTime) / 1000;
      const currentTime = rooms[roomId].audioState.paused
        ? rooms[roomId].audioState.currentTime
        : rooms[roomId].audioState.currentTime + elapsedTimeSinceUpdate;
  
      // Adjust for average network latency, assuming you have a way to measure it
      const averageLatencyInSeconds = 0.1; // Example value, measure and adjust accordingly
      const adjustedCurrentTime = currentTime + averageLatencyInSeconds;
  
      socket.emit('sync-response', {
        ...rooms[roomId].audioState,
        currentTime: adjustedCurrentTime
      });
    }
  });
  

  socket.on('disconnect', () => {
    console.log('user disconnected');
    for (const roomId in rooms) {
      rooms[roomId].clients = rooms[roomId].clients.filter(clientId => clientId !== socket.id);
      if (rooms[roomId].clients.length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});