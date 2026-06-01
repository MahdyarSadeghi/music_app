const audioPlayer = document.getElementById('audioPlayer');
const playerSection = document.getElementById('playerSection');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const songList = document.getElementById('songList');
const uploadForm = document.getElementById('uploadForm');
const uploadMsg = document.getElementById('uploadMsg');
const uploadBtn = document.getElementById('uploadBtn');
const audioFileInput = document.getElementById('audioFile');
const fileLabel = document.getElementById('fileLabel');

let currentId = null;

audioFileInput.addEventListener('change', () => {
  fileLabel.textContent = audioFileInput.files[0]?.name || 'انتخاب فایل MP3';
});

async function loadSongs() {
  const res = await fetch('/songs');
  const songs = await res.json();
  renderSongs(songs);
}

function renderSongs(songs) {
  if (songs.length === 0) {
    songList.innerHTML = '<p class="empty">هنوز آهنگی آپلود نشده</p>';
    return;
  }
  songList.innerHTML = songs.map(s => `
    <div class="song-item ${s.id === currentId ? 'active' : ''}" data-id="${s.id}" data-title="${s.title}" data-artist="${s.artist}" data-file="${s.filename}">
      <span class="song-play-icon">${s.id === currentId ? '▶' : '♪'}</span>
      <div class="song-meta">
        <div class="song-name">${s.title}</div>
        <div class="song-artist-name">${s.artist}</div>
      </div>
      <button class="delete-btn" onclick="deleteSong(event, ${s.id})">حذف</button>
    </div>
  `).join('');

  songList.querySelectorAll('.song-item').forEach(item => {
    item.addEventListener('click', () => playSong(
      parseInt(item.dataset.id),
      item.dataset.title,
      item.dataset.artist,
      item.dataset.file,
    ));
  });
}

function playSong(id, title, artist, filename) {
  currentId = id;
  playerTitle.textContent = title;
  playerArtist.textContent = artist;
  audioPlayer.src = `/audio/${filename}`;
  audioPlayer.play();
  playerSection.style.display = 'block';
  loadSongs();
}

async function deleteSong(event, id) {
  event.stopPropagation();
  if (!confirm('آیا مطمئنی؟')) return;
  await fetch(`/songs/${id}`, { method: 'DELETE' });
  if (currentId === id) {
    audioPlayer.pause();
    playerSection.style.display = 'none';
    currentId = null;
  }
  loadSongs();
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const file = audioFileInput.files[0];

  if (!title || !artist || !file) return;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('file', file);

  uploadBtn.disabled = true;
  uploadMsg.className = 'msg';
  uploadMsg.textContent = 'در حال آپلود...';

  try {
    const res = await fetch('/songs', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      uploadMsg.textContent = data.message;
      uploadForm.reset();
      fileLabel.textContent = 'انتخاب فایل MP3';
      loadSongs();
    } else {
      uploadMsg.className = 'msg error';
      uploadMsg.textContent = data.detail || 'خطا در آپلود';
    }
  } catch {
    uploadMsg.className = 'msg error';
    uploadMsg.textContent = 'خطا در اتصال به سرور';
  } finally {
    uploadBtn.disabled = false;
  }
});

loadSongs();
