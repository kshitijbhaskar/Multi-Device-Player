const socket = io();
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const seekBar = document.getElementById('seekBar');

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

socket.on('play', () => {
    audio.play();
});

socket.on('pause', () => {
    audio.pause();
});

socket.on('seek', (time) => {
    audio.currentTime = time;
});