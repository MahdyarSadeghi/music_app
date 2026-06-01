// ─── State ───────────────────────────────────────────────
let songs = [];
let currentIndex = -1;
let isDragging = false;

// ─── DOM refs ────────────────────────────────────────────
const audio         = document.getElementById('audioEl');
const playBtn       = document.getElementById('playBtn');
const playIcon      = document.getElementById('playIcon');
const pauseIcon     = document.getElementById('pauseIcon');
const prevBtn       = document.getElementById('prevBtn');
const nextBtn       = document.getElementById('nextBtn');
const progressBar   = document.getElementById('progressBar');
const progressFill  = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const currentTime   = document.getElementById('currentTime');
const totalTime     = document.getElementById('totalTime');
const volumeSlider  = document.getElementById('volumeSlider');
const playerTitle   = document.getElementById('playerTitle');
const playerArtist  = document.getElementById('playerArtist');
const playerCover   = document.getElementById('playerCover');
const songsGrid     = document.getElementById('songsGrid');
const trackList     = document.getElementById('trackList');
const libraryList   = document.getElementById('libraryList');
const searchResults = document.getElementById('searchResults');
const searchInput   = document.getElementById('searchInput');
const sidebarSongs  = document.getElementById('sidebarPlaylists');
const modalOverlay  = document.getElementById('modalOverlay');
const uploadForm    = document.getElementById('uploadForm');
const uploadMsg     = document.getElementById('uploadMsg');
const uploadBtn     = document.getElementById('uploadBtn');
const audioFile     = document.getElementById('audioFile');
const fileDropLabel = document.getElementById('fileDropLabel');

// ─── Navigation ──────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const sec = item.dataset.section;
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${sec}`).classList.add('active');
    if (sec === 'search') searchInput.focus();
  });
});

// ─── Modal ───────────────────────────────────────────────
document.getElementById('openUploadModal').addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('uploadTrigger').addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('closeModal').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });

audioFile.addEventListener('change', () => {
  fileDropLabel.textContent = audioFile.files[0]?.name || 'فایل MP3 را اینجا بکشید یا کلیک کنید';
});

// ─── Upload ──────────────────────────────────────────────
uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title  = document.getElementById('titleInput').value.trim();
  const artist = document.getElementById('artistInput').value.trim();
  const file   = audioFile.files[0];
  if (!title || !artist || !file) return;

  const fd = new FormData();
  fd.append('title', title);
  fd.append('artist', artist);
  fd.append('file', file);

  uploadBtn.disabled = true;
  uploadMsg.className = 'upload-msg';
  uploadMsg.textContent = 'در حال آپلود...';

  try {
    const res  = await fetch('/songs', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      uploadMsg.textContent = '✓ آهنگ آپلود شد';
      uploadForm.reset();
      fileDropLabel.textContent = 'فایل MP3 را اینجا بکشید یا کلیک کنید';
      setTimeout(() => modalOverlay.classList.remove('open'), 800);
      await loadSongs();
    } else {
      uploadMsg.className = 'upload-msg error';
      uploadMsg.textContent = data.detail || 'خطا در آپلود';
    }
  } catch {
    uploadMsg.className = 'upload-msg error';
    uploadMsg.textContent = 'خطا در اتصال به سرور';
  } finally {
    uploadBtn.disabled = false;
  }
});

// ─── Load & Render ───────────────────────────────────────
async function loadSongs() {
  const res = await fetch('/songs');
  songs = await res.json();
  renderGrid();
  renderTrackList(trackList, songs);
  renderTrackList(libraryList, songs);
  renderSidebar();
}

function renderGrid() {
  if (songs.length === 0) {
    songsGrid.innerHTML = '<p style="color:var(--text3);font-size:.85rem">هنوز آهنگی آپلود نشده</p>';
    return;
  }
  songsGrid.innerHTML = songs.slice(0, 8).map((s, i) => `
    <div class="song-card ${i === currentIndex ? 'active' : ''}" data-index="${i}">
      <div class="card-cover ${i === currentIndex ? 'playing' : ''}">
        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        <div class="card-play">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card-title">${s.title}</div>
      <div class="card-artist">${s.artist}</div>
    </div>
  `).join('');
  songsGrid.querySelectorAll('.song-card').forEach(card => {
    card.addEventListener('click', () => playSong(parseInt(card.dataset.index)));
  });
}

function renderTrackList(container, list) {
  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:.5rem">هنوز آهنگی آپلود نشده</p>';
    return;
  }
  container.innerHTML = list.map((s, i) => {
    const globalIdx = songs.indexOf(s);
    return `
    <div class="track-item ${globalIdx === currentIndex ? 'active' : ''}" data-index="${globalIdx}">
      <div class="track-num">${globalIdx === currentIndex ? '▶' : i + 1}</div>
      <div class="track-info">
        <div class="track-title">${s.title}</div>
        <div class="track-artist">${s.artist}</div>
      </div>
      <div class="track-actions">
        <button class="track-del" data-id="${s.id}" title="حذف">✕</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.track-del')) return;
      playSong(parseInt(item.dataset.index));
    });
  });
  container.querySelectorAll('.track-del').forEach(btn => {
    btn.addEventListener('click', () => deleteSong(parseInt(btn.dataset.id)));
  });
}

function renderSidebar() {
  sidebarSongs.innerHTML = songs.map((s, i) => `
    <span class="sidebar-song-item ${i === currentIndex ? 'active' : ''}" data-index="${i}">${s.title}</span>
  `).join('');
  sidebarSongs.querySelectorAll('.sidebar-song-item').forEach(item => {
    item.addEventListener('click', () => playSong(parseInt(item.dataset.index)));
  });
}

// ─── Playback ────────────────────────────────────────────
function playSong(index) {
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  const s = songs[index];
  audio.src = `/audio/${s.filename}`;
  audio.play();
  playerTitle.textContent = s.title;
  playerArtist.textContent = s.artist;
  playerCover.classList.add('playing');
  renderGrid();
  renderTrackList(trackList, songs);
  renderTrackList(libraryList, songs);
  renderSidebar();
  // re-run search if open
  if (searchInput.value) doSearch(searchInput.value);
}

prevBtn.addEventListener('click', () => { if (currentIndex > 0) playSong(currentIndex - 1); });
nextBtn.addEventListener('click', () => { if (currentIndex < songs.length - 1) playSong(currentIndex + 1); });

audio.addEventListener('ended', () => {
  if (currentIndex < songs.length - 1) playSong(currentIndex + 1);
});

playBtn.addEventListener('click', () => {
  if (audio.paused) audio.play(); else audio.pause();
});

audio.addEventListener('play', () => {
  playIcon.style.display = 'none';
  pauseIcon.style.display = '';
});
audio.addEventListener('pause', () => {
  playIcon.style.display = '';
  pauseIcon.style.display = 'none';
});

// ─── Progress ────────────────────────────────────────────
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

audio.addEventListener('timeupdate', () => {
  if (isDragging || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${pct}%`;
  progressThumb.style.left = `${pct}%`;
  currentTime.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  totalTime.textContent = formatTime(audio.duration);
});

progressBar.addEventListener('click', e => seek(e));
progressBar.addEventListener('mousedown', () => { isDragging = true; });
document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  seek(e);
});
document.addEventListener('mouseup', () => { isDragging = false; });

function seek(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
  progressFill.style.width = `${pct * 100}%`;
  progressThumb.style.left = `${pct * 100}%`;
}

// ─── Volume ──────────────────────────────────────────────
audio.volume = volumeSlider.value;
volumeSlider.addEventListener('input', () => { audio.volume = volumeSlider.value; });

// ─── Search ──────────────────────────────────────────────
searchInput.addEventListener('input', e => doSearch(e.target.value));

function doSearch(q) {
  const filtered = q.trim()
    ? songs.filter(s => s.title.includes(q) || s.artist.includes(q))
    : songs;
  renderTrackList(searchResults, filtered);
}

// ─── Delete ──────────────────────────────────────────────
async function deleteSong(id) {
  if (!confirm('حذف شود؟')) return;
  await fetch(`/songs/${id}`, { method: 'DELETE' });
  if (songs[currentIndex]?.id === id) {
    audio.pause();
    audio.src = '';
    currentIndex = -1;
    playerTitle.textContent = '—';
    playerArtist.textContent = '—';
    playerCover.classList.remove('playing');
  }
  await loadSongs();
}

// ─── Init ────────────────────────────────────────────────
loadSongs();
