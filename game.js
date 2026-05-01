const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let WIDTH, HEIGHT;
let gameState = 'start';
let score = 0;
let highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
let lives = 3;
let gameSpeed = 6;
let dayNightCycle = 0;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    switch(type) {
        case 'jump':
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'hit':
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
            break;
        case 'score':
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
            break;
        case 'gameOver':
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
            break;
    }
}

class Dino {
    constructor() {
        this.width = 60;
        this.height = 70;
        this.x = 100;
        this.y = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isDucking = false;
        this.gravity = 0.6;
        this.jumpPower = -15;
        this.frameCount = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
    }

    update(groundY) {
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        if (this.y >= groundY - this.height) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }

        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        this.frameCount++;
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = this.jumpPower;
            this.isJumping = true;
            playSound('jump');
        }
    }

    draw(ctx, groundY) {
        ctx.save();
        
        if (this.invincible && Math.floor(this.frameCount / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const x = this.x;
        const y = this.y;
        
        ctx.fillStyle = '#4a4a4a';
        
        ctx.fillRect(x + 10, y + 15, 40, 40);
        
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x + 35, y + 5, 25, 30);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 45, y + 12, 8, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 48, y + 15, 3, 3);
        
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(x + 55, y + 22, 8, 5);
        
        ctx.fillStyle = '#4a4a4a';
        if (!this.isJumping) {
            const legOffset = Math.sin(this.frameCount * 0.3) * 5;
            ctx.fillRect(x + 15, y + 55, 10, 15 + legOffset);
            ctx.fillRect(x + 35, y + 55, 10, 15 - legOffset);
        } else {
            ctx.fillRect(x + 15, y + 55, 10, 10);
            ctx.fillRect(x + 35, y + 55, 10, 10);
        }
        
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(x, y + 25, 12, 8);
        
        ctx.fillStyle = '#4a4a4a';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 15 + i * 12, y + 10, 6, 6);
        }
        
        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x + 10,
            y: this.y + 5,
            width: this.width - 20,
            height: this.height - 10
        };
    }
}

class Obstacle {
    constructor(x, groundY, type) {
        this.x = x;
        this.type = type;
        this.passed = false;
        
        if (type === 'cactus') {
            this.width = 30 + Math.random() * 20;
            this.height = 50 + Math.random() * 20;
            this.y = groundY - this.height;
        } else {
            this.width = 40;
            this.height = 30;
            this.y = groundY - 80 - Math.random() * 60;
            this.frameCount = 0;
        }
    }

    update(speed) {
        this.x -= speed;
        if (this.type === 'bird') {
            this.frameCount++;
        }
    }

    draw(ctx) {
        if (this.type === 'cactus') {
            ctx.fillStyle = '#2d5a27';
            
            ctx.fillRect(this.x + this.width * 0.35, this.y, this.width * 0.3, this.height);
            
            if (this.width > 35) {
                ctx.fillRect(this.x, this.y + this.height * 0.3, this.width * 0.35, this.width * 0.2);
                ctx.fillRect(this.x, this.y + this.height * 0.3, this.width * 0.15, this.width * 0.35);
            }
            if (this.width > 40) {
                ctx.fillRect(this.x + this.width * 0.65, this.y + this.height * 0.5, this.width * 0.35, this.width * 0.2);
                ctx.fillRect(this.x + this.width * 0.85, this.y + this.height * 0.5, this.width * 0.15, this.width * 0.35);
            }
            
            ctx.fillStyle = '#1e3d1a';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(this.x + this.width * 0.4 + i * 5, this.y + 5 + i * 10, 3, 5);
            }
        } else {
            const wingOffset = Math.sin(this.frameCount * 0.3) * 8;
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(this.x + 10, this.y + 10, 20, 15);
            
            ctx.fillStyle = '#a0522d';
            ctx.fillRect(this.x + 25, this.y + 8, 15, 12);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x + 32, this.y + 10, 5, 5);
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + 34, this.y + 12, 2, 2);
            
            ctx.fillStyle = '#ffa500';
            ctx.fillRect(this.x + 38, this.y + 13, 8, 4);
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(this.x + 12, this.y + 5 - wingOffset, 15, 8);
            ctx.fillRect(this.x + 12, this.y + 22 + wingOffset, 15, 8);
        }
    }

    getBounds() {
        if (this.type === 'cactus') {
            return {
                x: this.x + 5,
                y: this.y + 5,
                width: this.width - 10,
                height: this.height - 5
            };
        } else {
            return {
                x: this.x + 8,
                y: this.y + 5,
                width: this.width - 16,
                height: this.height - 10
            };
        }
    }
}

class Cloud {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = 1 + Math.random() * 0.5;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx, isNight) {
        ctx.fillStyle = isNight ? '#444466' : '#ffffff';
        ctx.globalAlpha = isNight ? 0.7 : 0.9;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.8, this.y - this.size * 0.3, this.size * 0.7, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 1.5, this.y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
}

class Ground {
    constructor(groundY) {
        this.groundY = groundY;
        this.offset = 0;
        this.segments = [];
        
        for (let i = 0; i < 50; i++) {
            this.segments.push({
                x: i * 40,
                height: Math.random() * 10
            });
        }
    }

    update(speed) {
        this.offset += speed;
        if (this.offset >= 40) {
            this.offset = 0;
            this.segments.shift();
            this.segments.push({
                x: this.segments[this.segments.length - 1].x + 40,
                height: Math.random() * 10
            });
        }
    }

    draw(ctx, WIDTH, isNight) {
        ctx.fillStyle = isNight ? '#3d3d5c' : '#8B7355';
        ctx.fillRect(0, this.groundY, WIDTH, HEIGHT - this.groundY);
        
        ctx.fillStyle = isNight ? '#4d4d6c' : '#a08060';
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            ctx.fillRect(seg.x - this.offset, this.groundY - seg.height, 35, 5);
        }
        
        ctx.fillStyle = isNight ? '#5d5d7c' : '#6B8E23';
        for (let i = 0; i < WIDTH; i += 20) {
            if (Math.sin(i * 0.1 + this.offset * 0.1) > 0) {
                ctx.fillRect(i, this.groundY - 8, 3, 8);
            }
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

let dino;
let obstacles = [];
let clouds = [];
let ground;
let lastObstacleTime = 0;
let frameCount = 0;

function resizeCanvas() {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    if (ground) {
        ground.groundY = HEIGHT - 100;
    }
}

function initGame() {
    resizeCanvas();
    
    dino = new Dino();
    obstacles = [];
    clouds = [];
    ground = new Ground(HEIGHT - 100);
    score = 0;
    lives = 3;
    gameSpeed = 6;
    dayNightCycle = 0;
    lastObstacleTime = 0;
    frameCount = 0;
    
    for (let i = 0; i < 5; i++) {
        clouds.push(new Cloud(
            Math.random() * WIDTH,
            50 + Math.random() * 100,
            20 + Math.random() * 20
        ));
    }
    
    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    document.getElementById('lives').textContent = hearts || '💔';
}

function spawnObstacle() {
    const type = Math.random() > 0.7 ? 'bird' : 'cactus';
    obstacles.push(new Obstacle(WIDTH + 50, HEIGHT - 100, type));
}

function gameLoop() {
    if (gameState !== 'playing') {
        drawBackground();
        if (gameState === 'paused') {
            drawGame();
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    frameCount++;
    dayNightCycle += 0.0001;

    score++;
    if (score % 100 === 0) {
        playSound('score');
    }
    if (score % 500 === 0) {
        gameSpeed += 0.5;
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoHighScore', highScore);
    }

    if (frameCount - lastObstacleTime > 80 + Math.random() * 60) {
        spawnObstacle();
        lastObstacleTime = frameCount;
    }

    dino.update(HEIGHT - 100);

    obstacles.forEach(obs => obs.update(gameSpeed));
    obstacles = obstacles.filter(obs => obs.x > -100);

    clouds.forEach(cloud => cloud.update());
    clouds = clouds.filter(cloud => cloud.x > -100);
    if (clouds.length < 5 && Math.random() < 0.01) {
        clouds.push(new Cloud(WIDTH + 50, 50 + Math.random() * 100, 20 + Math.random() * 20));
    }

    ground.update(gameSpeed);

    if (!dino.invincible) {
        for (const obs of obstacles) {
            if (checkCollision(dino.getBounds(), obs.getBounds())) {
                lives--;
                playSound('hit');
                
                if (lives <= 0) {
                    gameOver();
                } else {
                    dino.invincible = true;
                    dino.invincibleTimer = 120;
                }
                break;
            }
        }
    }

    obstacles.forEach(obs => {
        if (!obs.passed && obs.x + obs.width < dino.x) {
            obs.passed = true;
        }
    });

    updateUI();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function drawBackground() {
    const isNight = Math.sin(dayNightCycle * Math.PI) < 0;
    
    if (isNight) {
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#0a0a20');
        gradient.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 137) % WIDTH;
            const y = (i * 97) % (HEIGHT * 0.5);
            const size = 1 + (i % 3);
            ctx.globalAlpha = 0.3 + Math.sin(frameCount * 0.05 + i) * 0.3;
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const sunMoonX = WIDTH * 0.8;
    const sunMoonY = 80 + Math.sin(dayNightCycle * Math.PI) * 30;
    
    if (isNight) {
        ctx.fillStyle = '#f0f0e0';
        ctx.beginPath();
        ctx.arc(sunMoonX, sunMoonY, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a20';
        ctx.beginPath();
        ctx.arc(sunMoonX + 10, sunMoonY - 5, 30, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sunMoonX, sunMoonY, 40, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGame() {
    const isNight = Math.sin(dayNightCycle * Math.PI) < 0;
    
    drawBackground();
    
    clouds.forEach(cloud => cloud.draw(ctx, isNight));
    
    if (ground) {
        ground.draw(ctx, WIDTH, isNight);
    }
    
    obstacles.forEach(obs => obs.draw(ctx));
    
    if (dino) {
        dino.draw(ctx, HEIGHT - 100);
    }
}

function startGame() {
    initAudio();
    initGame();
    gameState = 'playing';
    document.getElementById('startScreen').classList.add('hidden');
    gameLoop();
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pauseScreen').classList.remove('hidden');
    }
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pauseScreen').classList.add('hidden');
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    playSound('gameOver');
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScore').textContent = highScore;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    initGame();
    gameState = 'playing';
    gameLoop();
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('restartFromPauseBtn').addEventListener('click', restartGame);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'playing') {
            dino.jump();
        } else if (gameState === 'gameOver') {
            restartGame();
        }
    } else if (e.code === 'Escape') {
        if (gameState === 'playing') {
            pauseGame();
        } else if (gameState === 'paused') {
            resumeGame();
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
        dino.jump();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        dino.jump();
    }
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
document.getElementById('highScore').textContent = highScore;
drawBackground();
gameLoop();