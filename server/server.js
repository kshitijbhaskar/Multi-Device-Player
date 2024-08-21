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

// Store connected clients
const clients = new Set();

io.on('connection', (socket) => {
  console.log('New client connected');
  clients.add(socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clients.delete(socket);
  });

  socket.on('play', () => {
    io.emit('play');
  });

  socket.on('pause', () => {
    io.emit('pause');
  });

  socket.on('seek', (time) => {
    io.emit('seek', time);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});