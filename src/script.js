const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startMenu = document.getElementById("start-menu");
const playButton = document.getElementById("play-button");
const mobileControls = document.getElementById("mobile-controls");
const statusText = document.getElementById("status-text");

// Detect Mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

canvas.width = 600;
canvas.height = 400;

const MAP_SIZE = 2500;
let gameState = "menu";

// Data Pemain
const player = {
    x: 200, y: 200, size: 25, speed: 5,
    hasKey: false, flashlightOn: true
};

// Data Granny
const granny = { x: 1200, y: 1200, size: 30, speed: 2.3 };

// Data Kunci Khas (Lokasi dikekalkan)
const exitKey = { 
    x: 1800, y: 700, 
    size: 15, 
    pickedUp: false,
    bodyColor: "white", // Warna Badan
    glowColor: "red"   // Warna Cahaya
};

// Data Pintu
const exitGate = { x: 2300, y: 2300, size: 100 };

const camera = { x: 0, y: 0 };
const keys = {};

// --- Input Controls ---

// PC Keyboard
window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'o' && gameState === "playing") player.flashlightOn = !player.flashlightOn;
});
window.addEventListener("keyup", (e) => keys[k = e.key.toLowerCase()] = false);

// Setup Mobile Buttons
function setupBtn(id, key) {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        keys[key] = true;
        // Trigger khas untuk O (Lampu)
        if(key === 'o' && gameState === "playing") player.flashlightOn = !player.flashlightOn;
    });
    btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        keys[key] = false;
    });
}

// Hanya setup butang jika di Mobile
if(isMobile) {
    setupBtn("btn-w", "w"); setupBtn("btn-a", "a");
    setupBtn("btn-s", "s"); setupBtn("btn-d", "d");
    setupBtn("btn-o", "o"); setupBtn("btn-e", "e");
}

// Play Button Logic
playButton.addEventListener("click", () => {
    gameState = "playing";
    startMenu.classList.add("hidden");
    // Tunjukkan kawalan mobile jika perlu
    if(isMobile) mobileControls.classList.remove("hidden");
});

// --- Game Logic ---

function update() {
    // Pergerakan Player
    if (keys['w'] && player.y > 0) player.y -= player.speed;
    if (keys['s'] && player.y < MAP_SIZE - player.size) player.y += player.speed;
    if (keys['a'] && player.x > 0) player.x -= player.speed;
    if (keys['d'] && player.x < MAP_SIZE - player.size) player.x += player.speed;

    // Kamera ikut Player
    camera.x = Math.max(0, Math.min(player.x - 300, MAP_SIZE - 600));
    camera.y = Math.max(0, Math.min(player.y - 200, MAP_SIZE - 400));

    // Logic Kutip Kunci
    let distKey = Math.hypot(player.x - exitKey.x, player.y - exitKey.y);
    if (!exitKey.pickedUp && distKey < 30) {
        exitKey.pickedUp = true; 
        player.hasKey = true;
        statusText.innerText = "Kunci Putih Diambil! Cari Pintu (E)";
        statusText.style.color = "lime";
    }

    // Logic Buka Pintu
    if (player.hasKey && keys['e']) {
        let distGate = Math.hypot(player.x - exitGate.x, player.y - exitGate.y);
        if (distGate < 100) {
            alert("TAHNIAH! Anda Berjaya Lari dari Granny!"); 
            resetGame();
        }
    }

    // AI Granny (Mengejar)
    let distGranny = Math.hypot(player.x - granny.x, player.y - granny.y);
    if (distGranny < 700) {
        granny.x += (player.x - granny.x) / distGranny * granny.speed;
        granny.y += (player.y - granny.y) / distGranny * granny.speed;
    }

    // Cek Kalah (Ditangkap)
    if (distGranny < 25) { 
        alert("GRANNY TANGKAP ANDA! Game Over."); 
        resetGame(); 
    }
}

function draw() {
    ctx.clearRect(0, 0, 600, 400);
    
    // --- LAYER 1: DUNIA (DITERJEMAH OLEH KAMERA) ---
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Grid Lantai
    ctx.strokeStyle = "#222";
    for(let i=0; i<MAP_SIZE; i+=150) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MAP_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MAP_SIZE, i); ctx.stroke();
    }

    // Pintu Keluar
    ctx.fillStyle = player.hasKey ? "#050" : "#300"; // Hijau jika ada kunci, merah jika tiada
    ctx.fillRect(exitGate.x, exitGate.y, exitGate.size, exitGate.size);
    ctx.fillStyle = "white"; ctx.fillText("EXIT", exitGate.x+30, exitGate.y+55);

    // LUKIS KUNCI KHAS (Putih + Cahaya Merah)
    if(!exitKey.pickedUp) {
        ctx.save(); // Simpan state sebelum letak glow
        
        // Kesan Cahaya (Glow) Merah
        ctx.shadowBlur = 20;
        ctx.shadowColor = exitKey.glowColor; // Merah
        
        // Badan Kunci Putih
        ctx.fillStyle = exitKey.bodyColor; // Putih
        ctx.beginPath(); 
        ctx.arc(exitKey.x, exitKey.y, exitKey.size, 0, Math.PI*2); 
        ctx.fill();
        
        ctx.restore(); // Reset shadowBlur supaya tidak kacau objek lain
    }

    // Granny (Petak Merah)
    ctx.fillStyle = "red";
    ctx.fillRect(granny.x, granny.y, 30, 30);
    
    ctx.restore(); // Selesai Layer Dunia

    // --- LAYER 2: FOG & PLAYER ---
    drawFog();
    
    // Player (Petak Biru - Dilukis di atas Fog supaya nampak)
    ctx.fillStyle = "#3498db";
    ctx.fillRect(player.x - camera.x, player.y - camera.y, 25, 25);
}

function drawFog() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Kegelapan sederhana
    ctx.fillRect(0, 0, 600, 400);
    
    if (player.flashlightOn) {
        const sX = player.x - camera.x + 12; // Tengah player
        const sY = player.y - camera.y + 12;
        
        const grad = ctx.createRadialGradient(sX, sY, 20, sX, sY, 180);
        grad.addColorStop(0, "rgba(0,0,0,1)"); // Lubang cahaya terang
        grad.addColorStop(1, "rgba(0,0,0,0)"); // Gelap di tepi
        
        ctx.globalCompositeOperation = 'destination-out'; // Potong lubang pada Fog
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(sX, sY, 180, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function resetGame() {
    gameState = "menu";
    player.x = 200; player.y = 200; player.hasKey = false;
    player.flashlightOn = true;
    exitKey.pickedUp = false; granny.x = 1200; granny.y = 1200;
    
    startMenu.classList.remove("hidden");
    mobileControls.classList.add("hidden");
    statusText.innerText = "Misi: Cari Kunci Khas!";
    statusText.style.color = "white";
}

function loop() {
    if (gameState === "playing") { 
        update(); 
        draw(); 
    }
    requestAnimationFrame(loop);
}
loop();