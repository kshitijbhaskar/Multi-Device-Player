const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve static files from the 'music' directory
app.use('/music', express.static(path.join(__dirname, '../music')));

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

// Function to get available songs
function getAvailableSongs() {
    const musicDir = path.join(__dirname, '../music/');
    return fs.readdirSync(musicDir);
}

// Route to upload a new song
app.post('/upload', upload.single('song'), (req, res) => {
    res.send('File uploaded successfully');
});

// Route to fetch available songs
app.get('/available-songs', (req, res) => {
    const songs = getAvailableSongs();
    res.json(songs);
});

// Room management
let rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Create room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = {
                clients: [],
                state: {
                    currentTime: 0,
                    paused: true,
                    currentSong: null
                },
            };
        }

        rooms[roomId].clients.push(socket.id);
        socket.emit('audio-state', rooms[roomId].state);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);

        if (rooms[roomId]) {
            rooms[roomId].clients = rooms[roomId].clients.filter(id => id !== socket.id);
            if (rooms[roomId].clients.length === 0) {
                delete rooms[roomId];
            }
        }
    });

    socket.on('play', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].state.paused = false;
            io.to(roomId).emit('play', rooms[roomId].state);
        }
    });

    socket.on('pause', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].state.paused = true;
            io.to(roomId).emit('pause', rooms[roomId].state);
        }
    });

    socket.on('seek', (seekTime, roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].state.currentTime = seekTime;
            io.to(roomId).emit('seek', rooms[roomId].state);
        }
    });

    socket.on('sync-request', (roomId) => {
        const room = rooms[roomId];
        if (rooms[roomId]) {
            const state = {
                currentTime: room.currentTime,
                paused: room.paused
            };
            socket.to(roomId).emit('sync-response', state);
        }
    });

    socket.on('newSong', (filename, roomId) => {
      if (rooms[roomId]) {
          rooms[roomId].state.currentTime = 0;
          rooms[roomId].state.paused = false;
          rooms[roomId].state.currentSong = filename;
          io.to(roomId).emit('newSong', filename, roomId);
      }
  });

    // Handle ICE candidates and WebRTC signaling
    socket.on('ice-candidate', (roomId, candidate) => {
        console.log(`Received ICE candidate for room ${roomId}`);
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    socket.on('offer', (roomId, offer) => {
        console.log(`Received offer for room ${roomId}`);
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (roomId, answer) => {
        console.log(`Received answer for room ${roomId}`);
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove user from any rooms
        for (let roomId in rooms) {
            rooms[roomId].clients = rooms[roomId].clients.filter(id => id !== socket.id);
            if (rooms[roomId].clients.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});