"use strict";
// Setup canvas and variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
// Load background and player images
const bgImage = new Image();
bgImage.src = "imagenes/fondo oficina2.png";
const playerIdleImg = new Image();
playerIdleImg.src = "imagenes/Caja_archivo.png";
const playerRunFrames = Array.from({ length: 8 }, (_, index) => {
    const frame = new Image();
    frame.src = `imagenes/Animacion caja/Caja-${index + 1}.png`;
    return frame;
});
function createImageAsset(src) {
    const img = new Image();
    img.src = src;
    return img;
}
function pickRandomImage(pool) {
    if (pool.length === 0)
        return null;
    return pool[Math.floor(Math.random() * pool.length)];
}
const positiveObjectImages = [
    createImageAsset("imagenes/Clip mariposa.png"),
    createImageAsset("imagenes/Clip.png"),
    createImageAsset("imagenes/Despachador.png"),
    createImageAsset("imagenes/Estrella.png"),
    createImageAsset("imagenes/folder.png"),
    createImageAsset("imagenes/Hoja blanca.png"),
    createImageAsset("imagenes/Nube.png"),
    createImageAsset("imagenes/regla.png"),
    createImageAsset("imagenes/Sobre.png")
];
const negativeObjectImages = [
    createImageAsset("imagenes/Pin.png"),
    createImageAsset("imagenes/Rayo.png"),
    createImageAsset("imagenes/sacapuntas.png"),
    createImageAsset("imagenes/Tijeras.png"),
    createImageAsset("imagenes/viruta de lapiz.png")
];
const clockObjectImage = createImageAsset("imagenes/Reloj.png");
let scoreElement = document.getElementById("score");
let timerElement = document.getElementById("timer");
let highScoreElement = document.getElementById("high-score");
let finalHighScoreElement = document.getElementById("final-high-score");
let finalScoreElement = document.getElementById("final-score");
let initialsInput = document.getElementById("initials-input");
let saveScoreButton = document.getElementById("save-score-button");
let arcadeBody = document.getElementById("arcade-body");
let gameOverPhaseTimeoutId = null;
const playerWidth = 120;
const playerHeight = 110;
const objectWidth = 64;
const objectHeight = 64;
let gameSpeed = 1; // Multiplier for difficulty levels
const roundDurationSec = 30;
const arcadeScoresKey = "arcadeScores";
const maxArcadeEntries = 10;
let pendingArcadeScore = null;
function normalizeInitials(value) {
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned.slice(0, 30) : "Anónimo";
}
function loadArcadeScores() {
    const raw = localStorage.getItem(arcadeScoresKey);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (_a) {
        return [];
    }
}
function saveArcadeScores(entries) {
    localStorage.setItem(arcadeScoresKey, JSON.stringify(entries));
}
function renderArcadeScores() {
    arcadeBody.innerHTML = "";
    const entries = loadArcadeScores();
    if (entries.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan=\"3\">No scores yet</td>";
        arcadeBody.appendChild(row);
        return;
    }
    entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${index + 1}</td><td>${entry.initials}</td><td>${entry.score}</td>`;
        arcadeBody.appendChild(row);
    });
}
function savePendingArcadeScore() {
    if (!pendingArcadeScore)
        return;
    const initials = normalizeInitials(initialsInput.value);
    const entries = loadArcadeScores();
    entries.push({
        initials,
        score: pendingArcadeScore.score,
        createdAt: Date.now()
    });
    entries.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return a.createdAt - b.createdAt;
    });
    saveArcadeScores(entries.slice(0, maxArcadeEntries));
    pendingArcadeScore = null;
    saveScoreButton.disabled = true;
    renderArcadeScores();
}
// Sound effects
const goldenSound = document.getElementById("golden-sound");
const bombSound = document.getElementById("bomb-sound");
const catchSound = document.getElementById("catch-sound");
const missSound = document.getElementById("miss-sound");
const gameOverSound = document.getElementById("game-over-sound");
// Player class
class Player {
    constructor() {
        this.movingLeft = false;
        this.movingRight = false;
        this.facingDirection = 1;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.frameDurationMs = 55;
        this.runFrameCount = 8;
        this.runPhase = 0;
        this.tilt = 0;
        this.bobOffset = 0;
        this.visualScaleX = 1;
        this.visualScaleY = 1;
        this.x = canvas.width / 2 - playerWidth / 2;
        this.y = canvas.height - playerHeight - 40;
        this.speed = Math.max(6, Math.floor(window.innerWidth * 0.0019)) * gameSpeed;
    }
    moveLeft() {
        this.x = Math.max(0, this.x - this.speed);
        this.facingDirection = -1;
    }
    moveRight() {
        this.x = Math.min(canvas.width - playerWidth, this.x + this.speed);
        this.facingDirection = 1;
    }
    canUseSpriteAnimation() {
        return playerRunFrames.length >= this.runFrameCount &&
            playerRunFrames.every((frame) => frame.complete && frame.naturalWidth > 0 && frame.naturalHeight > 0);
    }
    updateFrameAnimation(isMoving) {
        if (!isMoving) {
            this.currentFrame = 0;
            this.lastFrameTime = performance.now();
            return;
        }
        const now = performance.now();
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = now;
        }
        if (now - this.lastFrameTime >= this.frameDurationMs) {
            this.currentFrame = (this.currentFrame + 1) % this.runFrameCount;
            this.lastFrameTime = now;
        }
    }
    update() {
        const isMoving = this.movingLeft !== this.movingRight;
        if (this.movingLeft)
            this.moveLeft();
        if (this.movingRight)
            this.moveRight();
        // Mantiene la barra en el piso visual incluso si cambia el tamano de ventana.
        this.y = canvas.height - playerHeight - 40;
        if (this.canUseSpriteAnimation()) {
            this.updateFrameAnimation(isMoving);
            return;
        }
        if (isMoving) {
            this.runPhase += 0.35;
            this.bobOffset = Math.sin(this.runPhase) * 5;
            this.visualScaleY = 1 + Math.abs(Math.sin(this.runPhase)) * 0.1;
            this.visualScaleX = 1 - Math.abs(Math.sin(this.runPhase)) * 0.07;
            const targetTilt = this.movingLeft ? -0.1 : 0.1;
            this.tilt += (targetTilt - this.tilt) * 0.25;
        }
        else {
            this.bobOffset *= 0.8;
            this.visualScaleX += (1 - this.visualScaleX) * 0.2;
            this.visualScaleY += (1 - this.visualScaleY) * 0.2;
            this.tilt *= 0.75;
        }
    }
    draw() {
        if (this.canUseSpriteAnimation()) {
            const frameImg = playerRunFrames[this.currentFrame] || playerRunFrames[0];
            const centerX = this.x + playerWidth / 2;
            const centerY = this.y + playerHeight / 2;
            ctx.save();
            ctx.translate(centerX, centerY);
            if (this.facingDirection === -1) {
                ctx.scale(-1, 1);
            }
            ctx.drawImage(frameImg, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
            ctx.restore();
            return;
        }
        // Animacion procedural: inclinacion + rebote + compresion para simular carrera.
        const centerX = this.x + playerWidth / 2;
        const centerY = this.y + playerHeight / 2 + this.bobOffset;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.tilt);
        ctx.scale(this.visualScaleX, this.visualScaleY);
        if (playerIdleImg.complete && playerIdleImg.naturalWidth > 0) {
            ctx.drawImage(playerIdleImg, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
        }
        else {
            ctx.fillStyle = "#1f4d7a";
            ctx.fillRect(-playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
        }
        ctx.restore();
    }
}
class FallingObject {
    constructor(initialSpeed, points = 1, spritePool = positiveObjectImages, fallbackColor = "red") {
        this.x = Math.random() * (canvas.width - objectWidth);
        this.y = -objectHeight;
        this.speed = initialSpeed * gameSpeed;
        this.points = points;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() * 0.08 + 0.03) * (Math.random() < 0.5 ? -1 : 1);
        this.sprite = pickRandomImage(spritePool);
        this.fallbackColor = fallbackColor;
    }
    fall() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + objectWidth / 2, this.y + objectHeight / 2);
        ctx.rotate(this.rotation);
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(this.sprite, -objectWidth / 2, -objectHeight / 2, objectWidth, objectHeight);
        }
        else {
            ctx.fillStyle = this.fallbackColor;
            ctx.fillRect(-objectWidth / 2, -objectHeight / 2, objectWidth, objectHeight);
        }
        ctx.restore();
    }
    isCaught(player) {
        return (this.y + objectHeight > player.y &&
            this.x < player.x + playerWidth &&
            this.x + objectWidth > player.x);
    }
    isOutOfBounds() {
        return this.y > canvas.height;
    }
    applyEffect(game) {
        game.score += this.points;
        catchSound.play().catch(() => { }); // Play catch sound for normal objects
    }
}
// Special object classes: GoldenObject and BombObject
class GoldenObject extends FallingObject {
    constructor() {
        super(Math.random() * 1 + 1.5, 5, positiveObjectImages, "gold"); // 5 points for GoldenObject, caida lenta
    }
    applyEffect(game) {
        game.score += this.points;
        goldenSound.play().catch(() => { }); // Play golden sound
    }
}
class BombObject extends FallingObject {
    constructor(speed = Math.random() * 2 + 3) {
        super(speed, -3, negativeObjectImages, "black"); // -3 points for BombObject, caida rapida
    }
    applyEffect(game) {
        game.score += this.points;
        bombSound.play().catch(() => { }); // Play bomb sound
    }
}
class BadObject extends FallingObject {
    constructor(speed = Math.random() * 2 + 3) {
        super(speed, -1, negativeObjectImages, "#6b0000"); // -1 punto, caida rapida
    }
    applyEffect(game) {
        game.score += this.points;
        bombSound.play().catch(() => { });
    }
}
class ClockObject extends FallingObject {
    constructor() {
        super(Math.random() * 1 + 1.5, 1, [clockObjectImage], "#1d4ed8"); // caida lenta
    }
    applyEffect(game) {
        game.score += this.points;
        game.addExtraTime(5);
        catchSound.play().catch(() => { });
    }
}
// Game class with high score, sound effects, and difficulty
class Game {
    constructor() {
        this.player = new Player();
        this.fallingObjects = [];
        this.score = 0;
        this.gameOver = false;
        this.difficultyMultiplier = 1;
        this.highScore = this.loadHighScore();
        this.lastSpawnTime = performance.now();
        this.minSpawnIntervalMs = 650;
        this.startTimeMs = performance.now();
        this.roundDurationMs = roundDurationSec * 1000;
        this.timeLeftSec = roundDurationSec;
        this.initEventListeners();
        this.displayHighScore();
        timerElement.textContent = this.timeLeftSec.toString();
    }
    initEventListeners() {
        window.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft")
                this.player.movingLeft = true;
            if (event.key === "ArrowRight")
                this.player.movingRight = true;
        });
        window.addEventListener("keyup", (event) => {
            if (event.key === "ArrowLeft")
                this.player.movingLeft = false;
            if (event.key === "ArrowRight")
                this.player.movingRight = false;
        });
    }
    spawnRandomObject() {
        const rand = Math.random();
        // Velocidad lenta para positivos (sin multiplicador de dificultad).
        const slowSpeed = Math.random() * 1 + 1.5;
        // Velocidad rapida para negativos (escala con dificultad).
        const fastSpeed = this.difficultyMultiplier * (Math.random() * 2 + 3);
        if (rand < 0.001) {
            this.fallingObjects.push(new GoldenObject());
        }
        else if (rand < 0.002) {
            this.fallingObjects.push(new BombObject(fastSpeed));
        }
        else if (rand < 0.03) {
            // Reloj raro: +10s de tiempo al atraparlo.
            this.fallingObjects.push(new ClockObject());
        }
        else if (rand < 0.48) {
            // Mayor frecuencia de objetos negativos (~45%).
            this.fallingObjects.push(new BadObject(fastSpeed));
        }
        else {
            this.fallingObjects.push(new FallingObject(slowSpeed));
        }
    }
    createObject(currentTime) {
        const forcedSpawn = currentTime - this.lastSpawnTime >= this.minSpawnIntervalMs;
        const randomSpawn = Math.random() < 0.05;
        if (forcedSpawn || randomSpawn) {
            this.spawnRandomObject();
            this.lastSpawnTime = currentTime;
        }
    }
    increaseDifficulty() {
        if (this.score % 5 === 0 && this.score !== 0) {
            this.difficultyMultiplier += 0.2;
        }
    }
    addExtraTime(seconds) {
        this.roundDurationMs += seconds * 1000;
        const now = performance.now();
        const remainingMs = Math.max(0, this.roundDurationMs - (now - this.startTimeMs));
        this.timeLeftSec = Math.ceil(remainingMs / 1000);
        timerElement.textContent = this.timeLeftSec.toString();
    }
    finishRound() {
        this.gameOver = true;
        this.checkHighScore();
        gameOverSound.play().catch(() => { });
        pendingArcadeScore = { score: this.score };
        finalScoreElement.textContent = this.score.toString();
        initialsInput.value = "";
        saveScoreButton.disabled = false;
        renderArcadeScores();
    }
    update() {
        const now = performance.now();
        const elapsed = now - this.startTimeMs;
        const remainingMs = Math.max(0, this.roundDurationMs - elapsed);
        const nextTimeLeft = Math.ceil(remainingMs / 1000);
        if (nextTimeLeft !== this.timeLeftSec) {
            this.timeLeftSec = nextTimeLeft;
            timerElement.textContent = this.timeLeftSec.toString();
        }
        if (remainingMs <= 0) {
            timerElement.textContent = "0";
            this.finishRound();
            return;
        }
        this.player.update();
        this.fallingObjects.forEach((obj, index) => {
            obj.fall();
            if (obj.isCaught(this.player)) {
                obj.applyEffect(this);
                this.fallingObjects.splice(index, 1);
                scoreElement.textContent = this.score.toString();
                this.increaseDifficulty();
            }
            else if (obj.isOutOfBounds()) {
                this.fallingObjects.splice(index, 1);
                missSound.play().catch(() => { }); // Play miss sound
            }
        });
        this.createObject(now);
    }
    draw() {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.player.draw();
        this.fallingObjects.forEach((obj) => {
            obj.draw();
        });
    }
    run() {
        if (!this.gameOver) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.run());
        }
        else {
            this.showGameOverScreen();
        }
    }
    loadHighScore() {
        return parseInt(localStorage.getItem("highScore") || "0", 10);
    }
    saveHighScore() {
        localStorage.setItem("highScore", this.highScore.toString());
    }
    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        this.displayHighScore();
    }
    displayHighScore() {
        highScoreElement.textContent = this.highScore.toString();
        finalHighScoreElement.textContent = this.highScore.toString();
    }
    showGameOverScreen() {
        const gameOverScreen = document.getElementById("game-over-screen");
        if (gameOverPhaseTimeoutId !== null) {
            clearTimeout(gameOverPhaseTimeoutId);
            gameOverPhaseTimeoutId = null;
        }
        gameOverScreen.style.display = "block";
        gameOverScreen.classList.remove("visible", "phase-details");
        gameOverScreen.classList.add("phase-image");
        void gameOverScreen.offsetWidth;
        gameOverScreen.classList.add("visible");
        gameOverPhaseTimeoutId = window.setTimeout(() => {
            gameOverScreen.classList.remove("phase-image");
            gameOverScreen.classList.add("phase-details");
            gameOverPhaseTimeoutId = null;
        }, 2000);
    }
}
// Game initialization (hard mode only)
window.addEventListener("DOMContentLoaded", () => {
    // Reinicia una vez el ranking guardado para empezar desde cero.
    if (localStorage.getItem("arcadeScoresReset_v1") !== "1") {
        localStorage.removeItem(arcadeScoresKey);
        localStorage.setItem("arcadeScoresReset_v1", "1");
    }
    const gameOverScreen = document.getElementById("game-over-screen");
    if (gameOverScreen) {
        gameOverScreen.style.display = "none";
        gameOverScreen.classList.remove("visible", "phase-image", "phase-details");
    }
    timerElement.textContent = roundDurationSec.toString();
    renderArcadeScores();
    startGame();
});
function startGame() {
    gameSpeed = 2;
    const gameOverScreen = document.getElementById("game-over-screen");
    if (gameOverPhaseTimeoutId !== null) {
        clearTimeout(gameOverPhaseTimeoutId);
        gameOverPhaseTimeoutId = null;
    }
    gameOverScreen.style.display = "none";
    gameOverScreen.classList.remove("visible", "phase-image", "phase-details");
    scoreElement.textContent = "0";
    timerElement.textContent = roundDurationSec.toString();
    pendingArcadeScore = null;
    const game = new Game();
    game.run();
}
saveScoreButton.addEventListener("click", () => {
    savePendingArcadeScore();
});
initialsInput.addEventListener("input", () => {
    if (initialsInput.value.length > 30) {
        initialsInput.value = initialsInput.value.slice(0, 30);
    }
});
initialsInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        savePendingArcadeScore();
    }
});
document.getElementById("restart-button").addEventListener("click", () => {
    startGame();
});
