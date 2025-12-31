// Mobile Script - Simplified for PWA
const firebaseConfig = {
    apiKey: "AIzaSyCnG-QCodF4kXpAT7btOe3NKg7JP4F3kKw",
    authDomain: "minecraft-server-472103.firebaseapp.com",
    databaseURL: "https://minecraft-server-472103-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minecraft-server-472103",
    appId: "1:544378525433:web:32e8493487dab0054d3428"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State
let nickname = localStorage.getItem('nickname') || '訪客' + Math.floor(Math.random() * 1000);
let isMusicEnabled = false;

// 1. YouTube API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let musicPlayer, videoPlayer;
let currentMusicState = { videoId: null, status: 'stopped' };

function onYouTubeIframeAPIReady() {
    musicPlayer = new YT.Player('bg-music-player', {
        height: '0', width: '0', videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1, 'loops': 1 },
        events: { 'onReady': () => syncMusic(), 'onStateChange': () => { } }
    });

    videoPlayer = new YT.Player('yt-player-placeholder', {
        height: '100%', width: '100%',
        videoId: 'nzwtqgOXpfA', // Default
        playerVars: { 'autoplay': 0, 'mute': 0, 'controls': 1 },
        events: {
            // Exclusive Audio Logic for Mobile
            'onStateChange': (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                    if (musicPlayer && musicPlayer.pauseVideo) musicPlayer.pauseVideo();
                } else if (e.data === YT.PlayerState.PAUSED) {
                    if (isMusicEnabled && currentMusicState.status === 'playing') musicPlayer.playVideo();
                }
            }
        }
    });
}

// 2. Music Sync
database.ref('admin/music').on('value', (s) => {
    const data = s.val();
    if (data) {
        currentMusicState = data;
        syncMusic();
    }
});

function syncMusic() {
    if (!musicPlayer || !musicPlayer.loadVideoById) return;
    if (currentMusicState.videoId) {
        let cur = musicPlayer.getVideoData();
        if (!cur || cur.video_id !== currentMusicState.videoId)
            musicPlayer.loadVideoById(currentMusicState.videoId);
    }

    if (currentMusicState.status === 'playing' && isMusicEnabled) {
        musicPlayer.playVideo();
    } else {
        musicPlayer.pauseVideo();
    }
}

// Music UI
document.getElementById('music-toggle-btn').onclick = function () {
    isMusicEnabled = !isMusicEnabled;
    this.innerText = isMusicEnabled ? "🔊 音樂開啟" : "🔇 音樂關閉";
    this.classList.toggle('active', isMusicEnabled);
    if (isMusicEnabled) {
        document.getElementById('music-prompt').style.display = 'none';
        syncMusic();
    } else {
        musicPlayer.pauseVideo();
    }
};
document.getElementById('music-prompt').onclick = function () {
    document.getElementById('music-toggle-btn').click();
};

// 3. Video Sync
database.ref('admin/video').on('value', (s) => {
    if (s.val() && s.val().videoId && videoPlayer && videoPlayer.loadVideoById) {
        videoPlayer.loadVideoById(s.val().videoId);
    }
});

// 4. Countdown
function updateCountdown() {
    const target = new Date((new Date().getFullYear() + 1) + "-01-01T00:00:00+08:00").getTime();
    const diff = target - new Date().getTime();
    if (diff <= 0) {
        document.body.classList.add('celebrate');
        // Simple firework trigger could go here
        return;
    }
    const d = Math.floor(diff / (86400000));
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('days').innerText = String(d).padStart(2, '0');
    document.getElementById('hours').innerText = String(h).padStart(2, '0');
    document.getElementById('minutes').innerText = String(m).padStart(2, '0');
    document.getElementById('seconds').innerText = String(s).padStart(2, '0');
}
setInterval(updateCountdown, 1000);

// 5. Chat & Nickname
const messagesRef = database.ref('messages');
const chatList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    messagesRef.push({ nickname, text, timestamp: firebase.database.ServerValue.TIMESTAMP });
    chatInput.value = '';
}
sendBtn.onclick = sendMessage;

messagesRef.limitToLast(50).on('child_added', (s) => {
    const data = s.val();
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `
        <div class="avatar">${data.nickname[0]}</div>
        <div class="msg-body">
            <span class="username">${data.nickname}</span>
            <div class="msg-text">${data.text.replace(/</g, '&lt;')}</div>
        </div>
    `;
    chatList.appendChild(div);
    chatList.scrollTop = chatList.scrollHeight;
});

// Nickname UI
const nickDisplay = document.getElementById('current-nickname');
nickDisplay.innerText = nickname;
document.getElementById('nickname-btn').onclick = () => document.getElementById('nickname-modal').style.display = 'flex';
document.getElementById('save-nickname-btn').onclick = () => {
    const v = document.getElementById('nickname-input').value;
    if (v) { nickname = v; localStorage.setItem('nickname', v); nickDisplay.innerText = v; document.getElementById('nickname-modal').style.display = 'none'; }
};

// Video Toggle Support
const loadVid = (id) => { if (videoPlayer && videoPlayer.loadVideoById) videoPlayer.loadVideoById(id); };

document.getElementById('btn-default-vid').onclick = () => loadVid('nzwtqgOXpfA');
document.getElementById('btn-backup-vid').onclick = () => loadVid('1jnde6OlFwk');
document.getElementById('btn-changhua').onclick = () => loadVid('Fua-K7Yjydw');
document.getElementById('btn-101').onclick = () => loadVid('peujXnf_QjY');
document.getElementById('btn-lihpao').onclick = () => loadVid('WWr8TgTlzXw');

// 6. Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    }
});
