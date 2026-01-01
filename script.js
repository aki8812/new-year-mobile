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
let pendingMusicId = null; // New

function onYouTubeIframeAPIReady() {
    musicPlayer = new YT.Player('bg-music-player', {
        height: '0', width: '0', videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1 },
        events: {
            'onReady': () => syncMusic(),
            'onStateChange': (e) => {
                if (e.data === YT.PlayerState.ENDED) {
                    if (pendingMusicId) {
                        musicPlayer.loadVideoById(pendingMusicId);
                        pendingMusicId = null;
                    } else {
                        musicPlayer.playVideo();
                    }
                }
            }
        }
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

    // ID Sync with Queue
    if (currentMusicState.videoId) {
        let cur = musicPlayer.getVideoData();
        if (!cur || cur.video_id !== currentMusicState.videoId) {
            const state = musicPlayer.getPlayerState();
            if (state === 1) { // Playing
                pendingMusicId = currentMusicState.videoId;
            } else {
                if (isMusicEnabled) {
                    musicPlayer.loadVideoById(currentMusicState.videoId);
                } else {
                    musicPlayer.cueVideoById(currentMusicState.videoId);
                }
                pendingMusicId = null;
            }
        } else {
            if (pendingMusicId === currentMusicState.videoId) pendingMusicId = null;
        }
    }

    if (currentMusicState.status === 'playing' && isMusicEnabled) {
        if (musicPlayer.getPlayerState() !== 1) musicPlayer.playVideo();
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

// Video List & Selector
const mobileStreams = [
    { name: "🔴 網站預設 (Admin)", id: "admin_default" },
    { name: "📺 台北跨年", id: "1jnde6OlFwk" },
    { name: "🥚 彰化跨年", id: "Fua-K7Yjydw" },
    { name: "🏙️ 中天101", id: "peujXnf_QjY" },
    { name: "🎡 麗寶樂園", id: "WWr8TgTlzXw" },
    { name: "🐘 象山 101", id: "z_fY1pj1VBw" }
];

let lastAdminVideoId = 'nzwtqgOXpfA';

const mSel = document.getElementById('stream-select');
if (mSel) {
    mobileStreams.forEach(s => {
        let o = document.createElement('option');
        o.value = s.id; o.innerText = s.name;
        mSel.appendChild(o);
    });
    mSel.onchange = function () {
        if (videoPlayer && videoPlayer.loadVideoById) {
            if (this.value === 'admin_default') videoPlayer.loadVideoById(lastAdminVideoId);
            else videoPlayer.loadVideoById(this.value);
        }
    }
}

// 3. Video Sync (Admin)
database.ref('admin/video').on('value', (s) => {
    if (s.val() && s.val().videoId) {
        lastAdminVideoId = s.val().videoId;
        if (mSel && mSel.value === 'admin_default' && videoPlayer && videoPlayer.loadVideoById) {
            videoPlayer.loadVideoById(lastAdminVideoId);
        }
    }
});

// 4. Countdown
// 4. Countdown & Fireworks (Mobile Optimized)
let fireworksInterval;
let memeInterval;
let isCelebrated = false;

function updateCountdown() {
    const target = new Date((new Date().getFullYear() + 1) + "-01-01T00:00:00+08:00").getTime();
    const diff = target - new Date().getTime();

    if (diff <= 0) {
        if (!isCelebrated) celebrate();
        // Reset counters to 00
        ['days', 'hours', 'minutes', 'seconds'].forEach(id => document.getElementById(id).innerText = "00");
        return;
    }

    const d = Math.floor(diff / (86400000));
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const elDays = document.getElementById('days');
    if (elDays) elDays.innerText = String(d).padStart(2, '0');
    document.getElementById('hours').innerText = String(h).padStart(2, '0');
    document.getElementById('minutes').innerText = String(m).padStart(2, '0');
    document.getElementById('seconds').innerText = String(s).padStart(2, '0');
}
setInterval(updateCountdown, 1000);

// Celebration Logic
function celebrate() {
    isCelebrated = true;
    document.body.classList.add('celebrate');
    // Mobile toast or title update? 
    // Title is likely inside 'home' tab. Let's try to update h2 if exists.
    const h2 = document.querySelector('.countdown-section h2');
    if (h2) h2.innerText = `HAPPY NEW YEAR ${new Date().getFullYear() + 1}!`;

    startFireworks();
    spawnMemes();

    // End after 6 mins
    setTimeout(() => {
        clearInterval(memeInterval);
        clearInterval(fireworksInterval);
    }, 360000);
}

// Fireworks System
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
    constructor(x, y, color, velocityMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        const speed = (Math.random() - 0.5) * 8 * velocityMultiplier;
        this.velocity = { x: speed, y: (Math.random() - 0.5) * 8 * velocityMultiplier };
        this.alpha = 1;
        this.friction = 0.96;
        this.gravity = 0.04;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2, false);
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
        this.alpha -= 0.008;
    }
}

function startFireworks() {
    animateFireworks();
    fireworksInterval = setInterval(() => {
        spawnFireworkBatch(30); // Fewer particles for mobile perf
    }, 800);

    // Grand Finale
    setTimeout(() => {
        clearInterval(fireworksInterval);
        grandFinale();
    }, 360000);
}

function spawnFireworkBatch(count, x, y, velocityMult = 1) {
    const launchX = x !== undefined ? x : Math.random() * canvas.width;
    const launchY = y !== undefined ? y : Math.random() * (canvas.height / 2);
    const color = `hsl(${Math.random() * 360}, 60%, 60%)`;
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(launchX, launchY, color, velocityMult));
    }
}

function grandFinale() {
    // Show toast if possible, or just visual
    // Intense bursts
    let finaleCount = 0;
    const finaleInt = setInterval(() => {
        spawnFireworkBatch(60, canvas.width * 0.5, canvas.height * 0.3, 1.5);
        finaleCount++;
        if (finaleCount > 10) {
            clearInterval(finaleInt);
            setTimeout(() => document.body.classList.remove('celebrate'), 5000);
        }
    }, 500);
}

function animateFireworks() {
    requestAnimationFrame(animateFireworks);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
        if (p.alpha > 0) { p.update(); p.draw(); }
        else { particles.splice(index, 1); }
    });
}

function spawnMemes() {
    memeInterval = setInterval(() => {
        const el = document.createElement('div');
        el.innerText = ['🎉', '🐲', '🧨', '🧧', '✨'][Math.floor(Math.random() * 5)];
        el.style.position = 'absolute';
        el.style.left = Math.random() * 90 + '%';
        el.style.top = Math.random() * 90 + '%';
        el.style.fontSize = '3rem';
        el.style.animation = 'floatUp 3s ease-out';
        el.style.zIndex = 5;
        document.body.appendChild(el); // Append to body for mobile
        setTimeout(() => el.remove(), 3000);
    }, 800); // Slower for mobile

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

// 5. Chat & Nickname
// 5. Chat & Nickname (Pagination Logic)
const messagesRef = database.ref('messages');
const chatList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const appState = {
    messages: new Map(),
    latestMessageTime: 0,
    oldestMessageTime: 0,
    hasMoreOldMessages: true,
    isLoadingMore: false,
    isInitialising: true
};

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    messagesRef.push({ nickname, text, timestamp: firebase.database.ServerValue.TIMESTAMP });
    chatInput.value = '';
}
if (sendBtn) sendBtn.onclick = sendMessage;
if (chatInput) chatInput.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); }

function createMessageElement(key, data) {
    const isSelf = data.nickname === nickname;
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : 'other'}`;
    div.dataset.msgId = key;

    // Time format
    const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="bubble">
            <div class="bubble-head">
                <div class="bubble-name">${data.nickname}</div>
            </div>
            <div class="bubble-text">${data.text.replace(/</g, '&lt;')}</div>
            <div class="bubble-time">${timeStr}</div>
        </div>
    `;
    return div;
}

// Load Initial
async function loadInitialMessages() {
    const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(30).once('value');
    if (snapshot.exists()) {
        let maxTime = 0;
        let minTime = Infinity;
        let count = 0;
        const fragment = document.createDocumentFragment();

        snapshot.forEach(snap => {
            const msg = snap.val();
            if (!appState.messages.has(snap.key)) {
                appState.messages.set(snap.key, msg);
                if (msg.timestamp > maxTime) maxTime = msg.timestamp;
                if (msg.timestamp < minTime) minTime = msg.timestamp;
                fragment.appendChild(createMessageElement(snap.key, msg));
                count++;
            }
        });
        chatList.appendChild(fragment);
        chatList.scrollTop = chatList.scrollHeight;

        appState.latestMessageTime = maxTime + 1;
        appState.oldestMessageTime = minTime;
        appState.hasMoreOldMessages = count === 30;
    } else {
        appState.hasMoreOldMessages = false;
        appState.latestMessageTime = Date.now();
    }
    appState.isInitialising = false;
    startRealtimeListener();
}

function startRealtimeListener() {
    messagesRef.orderByChild('timestamp').startAt(appState.latestMessageTime).on('child_added', (snap) => {
        if (appState.messages.has(snap.key)) return;
        const msg = snap.val();
        appState.messages.set(snap.key, msg);
        appState.latestMessageTime = msg.timestamp;
        const el = createMessageElement(snap.key, msg);
        chatList.appendChild(el);
        chatList.scrollTop = chatList.scrollHeight;
    });
}

// Load More
async function loadMoreMessages() {
    if (appState.isLoadingMore || !appState.hasMoreOldMessages) return;
    appState.isLoadingMore = true;

    const snapshot = await messagesRef.orderByChild('timestamp').endBefore(appState.oldestMessageTime).limitToLast(30).once('value');
    if (snapshot.exists()) {
        const oldScrollHeight = chatList.scrollHeight;
        const oldScrollTop = chatList.scrollTop;
        const fragment = document.createDocumentFragment();

        let minTime = appState.oldestMessageTime;
        let count = 0;
        const newMsgs = [];

        snapshot.forEach(snap => {
            const msg = snap.val();
            if (!appState.messages.has(snap.key)) {
                newMsgs.push({ key: snap.key, msg });
                if (msg.timestamp < minTime) minTime = msg.timestamp;
                count++;
            }
        });

        newMsgs.sort((a, b) => a.msg.timestamp - b.msg.timestamp);
        newMsgs.forEach(item => {
            appState.messages.set(item.key, item.msg);
            fragment.appendChild(createMessageElement(item.key, item.msg));
        });

        chatList.insertBefore(fragment, chatList.firstChild);
        const newScrollHeight = chatList.scrollHeight;
        chatList.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);

        appState.oldestMessageTime = minTime;
        appState.hasMoreOldMessages = count === 30;
    } else {
        appState.hasMoreOldMessages = false;
    }
    appState.isLoadingMore = false;
}

if (chatList) {
    chatList.addEventListener('scroll', () => {
        if (chatList.scrollTop < 50 && !appState.isLoadingMore && !appState.isInitialising) {
            loadMoreMessages();
        }
    });
}

loadInitialMessages();

// Nickname UI
const nickDisplay = document.getElementById('current-nickname');
const nickModal = document.getElementById('nickname-modal');
const nickInput = document.getElementById('nickname-input');
const cancelNickBtn = document.getElementById('cancel-nickname-btn');
const saveNickBtn = document.getElementById('save-nickname-btn');

nickDisplay.innerText = nickname;

document.getElementById('nickname-btn').onclick = () => {
    nickInput.value = nickname;
    nickModal.style.display = 'flex';
};

cancelNickBtn.onclick = () => {
    nickModal.style.display = 'none';
    nickInput.value = nickname;
};

saveNickBtn.onclick = () => {
    const v = nickInput.value.trim();
    if (v) {
        nickname = v;
        localStorage.setItem('nickname', v);
        nickDisplay.innerText = v;
        nickModal.style.display = 'none';
        updateAllMessagesForNickname();
    }
};

// Retroactive Sync & Delete Logic
function updateAllMessagesForNickname() {
    const allMsgs = document.querySelectorAll('.message');
    allMsgs.forEach(div => {
        const bubbleName = div.querySelector('.bubble-name').innerText;
        const isSelf = bubbleName === nickname;

        if (isSelf) {
            div.classList.add('self');
            div.classList.remove('other');
            addDeleteButton(div);
        } else {
            div.classList.add('other');
            div.classList.remove('self');
            const btn = div.querySelector('.delete-btn');
            if (btn) btn.remove();
        }
    });
}

function addDeleteButton(div) {
    if (div.querySelector('.delete-btn')) return;
    const bubble = div.querySelector('.bubble');
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    // Use an icon or text suitable for mobile
    btn.innerHTML = '🗑️';
    btn.onclick = (e) => {
        e.stopPropagation(); // Prevent bubble click if any
        deleteMessage(div.dataset.msgId);
    };
    bubble.appendChild(btn);
}

function deleteMessage(key) {
    if (confirm('刪除此訊息?')) {
        messagesRef.child(key).remove();
    }
}

messagesRef.on('child_removed', (snap) => {
    const key = snap.key;
    if (appState.messages.has(key)) {
        appState.messages.delete(key);
        const el = document.querySelector(`.message[data-msg-id="${key}"]`);
        if (el) el.remove();
    }
});

// 6. Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    }
});
