const socket = io();
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const seekBar = document.getElementById('seekBar');
const resyncBtn = document.getElementById('resyncBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdInput = document.getElementById('roomIdInput');
const webrtcStatus = document.getElementById('webrtc-status');
const uploadInput = document.getElementById('uploadInput');
const uploadBtn = document.getElementById('uploadBtn');

let currentRoomId;
let lastSyncTime = 0;
const syncInterval = 5000; // Sync every 5 seconds

createRoomBtn.addEventListener('click', () => {
  const roomId = uuidv4();
  currentRoomId = roomId;
  socket.emit('join-room', roomId);
  webrtcStatus.textContent = `Room ID: ${roomId}`;
});

joinRoomBtn.addEventListener('click', () => {
  const roomId = roomIdInput.value;
  currentRoomId = roomId;
  socket.emit('join-room', roomId);
  webrtcStatus.textContent = `Joined room: ${roomId}`;
});

playBtn.addEventListener('click', () => {
  socket.emit('play', currentRoomId);
});

pauseBtn.addEventListener('click', () => {
  socket.emit('pause', currentRoomId);
});

seekBar.addEventListener('change', () => {
  const seekTime = audio.duration * (seekBar.value / 100);
  socket.emit('seek', seekTime, currentRoomId);
});

resyncBtn.addEventListener('click', () => {
  requestSync();
});

uploadBtn.addEventListener('click', () => {
  const file = uploadInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append('song', file);

    fetch('/upload', {
      method: 'POST',
      body: formData
    })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      socket.emit('newSong', file.name);
    })
    .catch(error => {
      console.error('Error uploading file:', error);
    });
  }
});

function requestSync() {
  socket.emit('sync-request', currentRoomId);
}

socket.on('audio-state', (state) => {
  updateAudioState(state);
});

socket.on('play', (state) => {
  updateAudioState(state);
  audio.play().catch(e => console.error("Error playing audio:", e));
});

socket.on('pause', (state) => {
  updateAudioState(state);
  audio.pause();
});

socket.on('seek', (state) => {
  updateAudioState(state);
});

function adjustPlaybackRateSmoothly(targetTime) {
    const timeDifference = targetTime - audio.currentTime;
    const adjustmentFactor = 0.2; // Adjust this value to control the correction smoothness
  
    if (Math.abs(timeDifference) > 0.05) { // Only adjust if the difference is significant
      audio.playbackRate = 1 + (timeDifference * adjustmentFactor);
    } else {
      audio.playbackRate = 1;
    }
  }
  
  socket.on('sync-response', (state) => {
    if (isFinite(state.currentTime) && state.currentTime >= 0 && state.currentTime <= audio.duration) {
      adjustPlaybackRateSmoothly(state.currentTime);
    }
  });
  

socket.on('newSong', (filename) => {
  audio.src = `/music/${filename}`;
  audio.load();
  audio.play();
});

function updateAudioState(state) {
  if (isFinite(state.currentTime) && state.currentTime >= 0 && state.currentTime <= audio.duration) {
    audio.currentTime = state.currentTime;
  }
  if (state.paused) {
    audio.pause();
  } else {
    audio.play().catch(e => console.error("Error playing audio:", e));
  }
  seekBar.value = (audio.currentTime / audio.duration) * 100;
}

setInterval(() => {
  if (!audio.paused && Date.now() - lastSyncTime > syncInterval) {
    requestSync();
    lastSyncTime = Date.now();
  }
}, 1000);

audio.addEventListener('timeupdate', () => {
  seekBar.value = (audio.currentTime / audio.duration) * 100;
});