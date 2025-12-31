/* ========== Firebase Init ========== */
const firebaseConfig = {
    apiKey: "AIzaSyCnG-QCodF4kXpAT7btOe3NKg7JP4F3kKw",
    authDomain: "minecraft-server-472103.firebaseapp.com",
    databaseURL: "https://minecraft-server-472103-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minecraft-server-472103",
    storageBucket: "minecraft-server-472103.firebasestorage.app",
    messagingSenderId: "544378525433",
    appId: "1:544378525433:web:32e8493487dab0054d3428",
    measurementId: "G-RM0QEWX4MY"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ========== State & Config ========== */
let nickname = localStorage.getItem('nickname') || '訪客' + Math.floor(Math.random() * 1000);
let isCelebrated = false;

// Default Streams
const defaultStreams = [
    { name: "🔴 網站預設 (Admin)", id: "admin_default" }, // Special ID
    { name: "📺 台北跨年晚會", id: "1jnde6OlFwk" },
    { name: "🥚 彰化田中跨年", id: "Fua-K7Yjydw" },
    { name: "🏙️ 中天 101 直播", id: "peujXnf_QjY" },
    { name: "🎡 麗寶樂園跨年", id: "WWr8TgTlzXw" },
    { name: "🐘 象山看 101", id: "z_fY1pj1VBw" }
];

/* ========== YouTube Iframe API ========== */
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let musicPlayer;
let videoPlayer;
let musicReady = false;
let videoReady = false;
let currentMusicState = { videoId: null, status: 'stopped' };
let isMusicEnabled = false;
let lastAdminVideoId = 'nzwtqgOXpfA'; // Fallback

function onYouTubeIframeAPIReady() {
    // 1. Background Music
    musicPlayer = new YT.Player('bg-music-player', {
        height: '0', width: '0', videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1, 'loops': 1 },
        events: { 'onReady': onMusicPlayerReady, 'onStateChange': onMusicStateChange }
    });

    // 2. Main Live Stream
    if (document.getElementById('yt-player-placeholder')) {
        videoPlayer = new YT.Player('yt-player-placeholder', {
            height: '100%', width: '100%',
            videoId: 'nzwtqgOXpfA', // Initial placeholder
            playerVars: { 'autoplay': 0, 'mute': 0, 'controls': 1 },
            events: { 'onReady': onVideoPlayerReady, 'onStateChange': onVideoStateChange }
        });
    }
}

/* --- Music Player Handlers --- */
function onMusicPlayerReady(event) {
    musicReady = true;
    syncMusicState();
}
function onMusicStateChange(event) { }

/* --- Video Player Handlers --- */
function onVideoPlayerReady(event) {
    videoReady = true;
    // Load initial selection logic
    const sel = document.getElementById('stream-select');
    if (sel && sel.value === 'admin_default') {
        videoPlayer.loadVideoById(lastAdminVideoId);
    }
}

function onVideoStateChange(event) {
    // Exclusive Audio Logic
    if (event.data === YT.PlayerState.PLAYING) {
        if (musicPlayer && typeof musicPlayer.pauseVideo === 'function') {
            musicPlayer.pauseVideo();
            showToast("🔕 背景音樂已暫停 (觀看直播中)");
        }
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        if (currentMusicState.status === 'playing' && isMusicEnabled) {
            musicPlayer.playVideo();
            showToast("🎵 背景音樂已恢復");
        }
    }
}

/* ========== Music Sync & Toggle Logic ========== */
const musicRef = database.ref('admin/music');
const videoRef = database.ref('admin/video');
const musicPrompt = document.getElementById('music-prompt');
const musicToggleBtn = document.getElementById('music-toggle-btn');
const streamSelect = document.getElementById('stream-select');

// ... (Toggle Logic omitted for brevity, keeping existing) ...
musicToggleBtn.addEventListener('click', () => {
    isMusicEnabled = !isMusicEnabled;
    updateMusicToggleUI();
    if (isMusicEnabled) {
        if (currentMusicState.status === 'playing') {
            const vs = videoPlayer && typeof videoPlayer.getPlayerState === 'function' ? videoPlayer.getPlayerState() : -1;
            if (vs !== 1) { musicPlayer.playVideo(); musicPlayer.unMute(); }
        }
    } else { musicPlayer.pauseVideo(); }
});

function updateMusicToggleUI() {
    if (isMusicEnabled) {
        musicToggleBtn.innerHTML = "🔊 音樂開啟";
        musicToggleBtn.classList.add('active');
        musicPrompt.style.display = 'none';
    } else {
        musicToggleBtn.innerHTML = "🔇 音樂關閉";
        musicToggleBtn.classList.remove('active');
    }
}

musicRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        currentMusicState = data;
        if (musicReady) syncMusicState();
    }
});

function syncMusicState() {
    if (!currentMusicState.videoId) return;
    const currentData = musicPlayer.getVideoData();
    if (currentData && currentData.video_id !== currentMusicState.videoId) {
        musicPlayer.loadVideoById(currentMusicState.videoId);
    }
    if (currentMusicState.status === 'playing' && isMusicEnabled) {
        const vs = videoPlayer && typeof videoPlayer.getPlayerState === 'function' ? videoPlayer.getPlayerState() : -1;
        if (vs !== 1) musicPlayer.playVideo();
    } else if (currentMusicState.status === 'paused' || currentMusicState.status === 'stopped') {
        musicPlayer.pauseVideo();
    }
}

musicPrompt.addEventListener('click', () => { isMusicEnabled = true; updateMusicToggleUI(); if (currentMusicState.status === 'playing') musicPlayer.playVideo(); });

// Video Background Sync
videoRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.videoId) {
        lastAdminVideoId = data.videoId;
        // Only update player if user is on 'admin_default'
        if (streamSelect && streamSelect.value === 'admin_default') {
            if (videoPlayer && typeof videoPlayer.loadVideoById === 'function') {
                videoPlayer.loadVideoById(lastAdminVideoId);
            }
        }
    }
});

// Stream Select Change
if (streamSelect) {
    streamSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (videoPlayer && videoPlayer.loadVideoById) {
            if (val === 'admin_default') {
                videoPlayer.loadVideoById(lastAdminVideoId);
                showToast("🔴 切換至網站預設直播");
            } else {
                videoPlayer.loadVideoById(val);
                showToast("📺 切換直播頻道");
            }
        }
    });
}

/* ========== Chat Logic (Buttons & Send) ========== */
const messagesRef = database.ref('messages');
const chatList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function sendMessage() {
    const text = chatInput.value.trim();
    if (text !== '') {
        // Check for test command
        if (text === '/test-newyear') {
            celebrate(); // Trigger animation locally
            chatInput.value = '';
            showToast("🎆 測試動畫已啟動！");
            return;
        }

        messagesRef.push({
            nickname: nickname,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        chatInput.value = '';
    }
}

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
if (sendBtn) sendBtn.addEventListener('click', sendMessage);

// Receive Messages
let isFirstLoad = true;
messagesRef.limitToLast(100).on('child_added', (snapshot) => {
    const data = snapshot.val();
    addMessageToUI(data);
    if (!isFirstLoad) {
        chatList.scrollTop = chatList.scrollHeight;
    }
});
messagesRef.limitToLast(1).once('value', () => {
    isFirstLoad = false;
    setTimeout(() => chatList.scrollTop = chatList.scrollHeight, 200);
});

function addMessageToUI(data) {
    const div = document.createElement('div');
    div.className = 'message';

    const letter = data.nickname.charAt(0).toUpperCase();
    const date = new Date(data.timestamp);
    const timeStr = date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');

    div.innerHTML = `
    <div class="avatar">${letter}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="username">${escapeHtml(data.nickname)}</span>
        <span class="timestamp">${timeStr}</span>
      </div>
      <div class="text">${escapeHtml(data.text)}</div>
    </div>
  `;
    chatList.appendChild(div);
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ========== Draggable Video Logic ========== */
const videoContainer = document.getElementById('video-container');
const dragHandle = document.getElementById('drag-handle');

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

if (dragHandle) {
    dragHandle.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);
}

function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target.closest('.channel-select')) return; // Allow interaction with select
    isDragging = true;
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, videoContainer);
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

/* ========== Helper Toast ========== */
function showToast(msg) {
    const div = document.createElement('div');
    div.innerText = msg;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.background = 'rgba(0,0,0,0.8)';
    div.style.color = '#fff';
    div.style.padding = '10px 20px';
    div.style.borderRadius = '20px';
    div.style.zIndex = '9999';
    div.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 2.5s forwards';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
// Add styles handled in CSS or dynamic style tag already

/* ========== Nickname System ========== */
const nicknameModal = document.getElementById('nickname-modal');
const nicknameInput = document.getElementById('nickname-input');
const saveNicknameBtn = document.getElementById('save-nickname-btn');
const nicknameDisplay = document.getElementById('current-nickname');

nicknameDisplay.innerText = nickname;

document.querySelector('.nickname-btn').addEventListener('click', () => {
    nicknameInput.value = nickname;
    nicknameModal.style.display = 'flex';
});

saveNicknameBtn.addEventListener('click', () => {
    const newName = nicknameInput.value.trim();
    if (newName) {
        nickname = newName;
        localStorage.setItem('nickname', nickname);
        nicknameDisplay.innerText = nickname;
        nicknameModal.style.display = 'none';
    }
});
nicknameModal.addEventListener('click', (e) => {
    if (e.target === nicknameModal) nicknameModal.style.display = 'none';
});

/* ========== YouTube Live Stream Selector ========== */
// const streamSelect = document.getElementById('stream-select'); defined above

defaultStreams.forEach(stream => {
    const opt = document.createElement('option');
    opt.value = stream.id;
    opt.innerText = stream.name;
    streamSelect.appendChild(opt);
});

streamSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (videoPlayer && typeof videoPlayer.loadVideoById === 'function') {
        videoPlayer.loadVideoById(id);
    }
});

/* ========== Countdown Logic (Restored) ========== */
function getTargetTime() {
    const now = new Date();
    const year = now.getFullYear();
    // Logic: Target next Jan 1st.
    const targetDate = new Date(`${year + 1}-01-01T00:00:00+08:00`);
    return targetDate.getTime();
}

function updateCountdown() {
    const target = getTargetTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
        if (!isCelebrated && typeof celebrate === 'function') celebrate();
        const els = ['days', 'hours', 'minutes', 'seconds'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = "00";
        });
        return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const elDays = document.getElementById('days');
    const elHours = document.getElementById('hours');
    const elMinutes = document.getElementById('minutes');
    const elSeconds = document.getElementById('seconds');

    if (elDays) elDays.innerText = String(d).padStart(2, '0');
    if (elHours) elHours.innerText = String(h).padStart(2, '0');
    if (elMinutes) elMinutes.innerText = String(m).padStart(2, '0');
    if (elSeconds) elSeconds.innerText = String(s).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

/* ========== Quick Video Toggle (User Request) ========== */
/* ========== Celebration & Fireworks ========== */
const sounds = [
    new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'),
    new Audio('https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg')
];

function celebrate() {
    isCelebrated = true;
    document.body.classList.add('celebrate');
    document.querySelector('.title').innerText = "HAPPY NEW YEAR 2026!";
    startFireworks();
    sounds.forEach(s => s.play().catch(console.error));
    spawnMemes();
}

/* ========== Fireworks Logic (Canvas) ========== */
const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 };
        this.alpha = 1;
        this.friction = 0.95;
        this.gravity = 0.05;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
    }
}

function startFireworks() {
    animateFireworks();
    setInterval(() => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height / 2);
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        for (let i = 0; i < 50; i++) { particles.push(new Particle(x, y, color)); }
    }, 800);
}

function animateFireworks() {
    requestAnimationFrame(animateFireworks);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
        if (p.alpha > 0) { p.update(); p.draw(); }
        else { particles.splice(index, 1); }
    });
}

function spawnMemes() {
    setInterval(() => {
        const el = document.createElement('div');
        el.innerText = ['🎉', '🐲', '🧨', '🧧', '2026'][Math.floor(Math.random() * 5)];
        el.style.position = 'absolute';
        el.style.left = Math.random() * 90 + '%';
        el.style.top = Math.random() * 90 + '%';
        el.style.fontSize = '3rem';
        el.style.animation = 'floatUp 3s ease-out';
        el.style.zIndex = 5;
        document.querySelector('.main-content').appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }, 500);

    // Check if style exists, if not add it
    if (!document.getElementById('meme-style')) {
        const style = document.createElement('style');
        style.id = 'meme-style';
        style.innerHTML = `
          @keyframes floatUp {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            50% { opacity: 1; transform: translateY(-50px) scale(1.2); }
            100% { transform: translateY(-100px) scale(1); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
    }
}

