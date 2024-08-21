const socket = io();
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const seekBar = document.getElementById('seekBar');
const uploadInput = document.getElementById('uploadInput');
const uploadBtn = document.getElementById('uploadBtn');

playBtn.addEventListener('click', () => {
    audio.play();
    socket.emit('play');
});

pauseBtn.addEventListener('click', () => {
    audio.pause();
    socket.emit('pause');
});

seekBar.addEventListener('input', () => {
    const seekTime = audio.duration * (seekBar.value / 100);
    audio.currentTime = seekTime;
    socket.emit('seek', seekTime);
});

audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    seekBar.value = progress;
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

socket.on('play', () => {
    audio.play();
});

socket.on('pause', () => {
    audio.pause();
});

socket.on('seek', (time) => {
    audio.currentTime = time;
});

socket.on('newSong', (filename) => {
  audio.src = `/music/${filename}`;
  audio.load();
});