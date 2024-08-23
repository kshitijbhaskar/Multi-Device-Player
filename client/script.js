const socket = io();
let player;
let currentRoomId;
let isLeader = false;
let isSeeking = false;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '360',
    width: '640',
    videoId: '',
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'enablejsapi': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  console.log('Player is ready');
}

function onPlayerStateChange(event) {
  if (isLeader && !isSeeking) {
    socket.emit('update-state', {
      videoState: event.data,
      currentTime: player.getCurrentTime()
    }, currentRoomId);
  }
}

document.getElementById('createRoomBtn').addEventListener('click', () => {
  const roomId = Math.random().toString(36).substring(7);
  joinRoom(roomId);
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomIdInput').value;
  joinRoom(roomId);
});

function joinRoom(roomId) {
  currentRoomId = roomId;
  socket.emit('join-room', roomId);
  document.getElementById('roomInfo').textContent = `Room: ${roomId}`;
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const videoId = prompt("Enter YouTube Video ID:");
  if (videoId) {
    socket.emit('new-video', videoId, currentRoomId);
  }
});

socket.on('role-assign', (leader) => {
  isLeader = leader;
  console.log(`You are ${leader ? 'the leader' : 'a follower'}`);
});

socket.on('state-update', (state) => {
  if (!isLeader) {
    isSeeking = true;
    if (state.videoState === YT.PlayerState.PLAYING) {
      player.playVideo();
    } else if (state.videoState === YT.PlayerState.PAUSED) {
      player.pauseVideo();
    }
    player.seekTo(state.currentTime, true);
    setTimeout(() => { isSeeking = false; }, 1000);
  }
});

socket.on('new-video', (videoId) => {
  player.loadVideoById({
    videoId: videoId,
    suggestedQuality: 'default'
  });
});

// Periodically update state if leader
setInterval(() => {
  if (isLeader && player && player.getPlayerState) {
    socket.emit('update-state', {
      videoState: player.getPlayerState(),
      currentTime: player.getCurrentTime()
    }, currentRoomId);
  }
}, 1000);