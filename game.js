// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    TILE_SIZE: 40,
    PLAYER_SPEED: 5,
    TOTAL_MEMORIES: 5
};

// Game State
let gameState = {
    currentScene: 'start',
    memoriesCollected: 0,
    player: null,
    keys: {},
    dialogueQueue: [],
    isDialogueActive: false,
    currentLevel: 0
};

// Input handling
const keys = {};

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = 'right';
        this.frame = 0;
        this.frameTimer = 0;
    }

    update() {
        if (gameState.isDialogueActive) return;

        this.velocityX = 0;
        this.velocityY = 0;

        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.velocityY = -CONFIG.PLAYER_SPEED;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.velocityY = CONFIG.PLAYER_SPEED;
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.velocityX = -CONFIG.PLAYER_SPEED;
            this.direction = 'left';
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.velocityX = CONFIG.PLAYER_SPEED;
            this.direction = 'right';
        }

        // Animate
        if (this.velocityX !== 0 || this.velocityY !== 0) {
            this.frameTimer++;
            if (this.frameTimer > 10) {
                this.frame = (this.frame + 1) % 4;
                this.frameTimer = 0;
            }
        } else {
            this.frame = 0;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Boundary checks
        this.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - this.height, this.y));
    }

    draw(ctx) {
        ctx.save();
        
        // Draw pixel art character
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Body (pink)
        ctx.fillStyle = '#ff6b9d';
        ctx.fillRect(this.x + 8, this.y + 12, 16, 14);
        
        // Head
        ctx.fillStyle = '#ffd1dc';
        ctx.fillRect(this.x + 6, this.y + 4, 20, 12);
        
        // Eyes
        ctx.fillStyle = '#333';
        if (this.direction === 'right') {
            ctx.fillRect(this.x + 18, this.y + 8, 3, 3);
            ctx.fillRect(this.x + 22, this.y + 8, 2, 3);
        } else {
            ctx.fillRect(this.x + 7, this.y + 8, 3, 3);
            ctx.fillRect(this.x + 11, this.y + 8, 2, 3);
        }
        
        // Hair
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x + 4, this.y + 2, 24, 6);
        
        // Legs animation
        ctx.fillStyle = '#4a90e2';
        if (this.frame === 0 || this.frame === 2) {
            ctx.fillRect(this.x + 10, this.y + 26, 5, 6);
            ctx.fillRect(this.x + 17, this.y + 26, 5, 6);
        } else {
            ctx.fillRect(this.x + 9, this.y + 28, 5, 6);
            ctx.fillRect(this.x + 18, this.y + 28, 5, 6);
        }
        
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

// Memory/Collectible class
class Memory {
    constructor(x, y, id, title, text) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.id = id;
        this.title = title;
        this.text = text;
        this.collected = false;
        this.floatOffset = 0;
    }

    update() {
        this.floatOffset = Math.sin(Date.now() / 500) * 5;
    }

    draw(ctx) {
        if (this.collected) return;

        ctx.save();
        const centerY = this.y + this.floatOffset;

        // Draw heart/memory icon
        ctx.fillStyle = '#ff6b9d';
        
        // Heart shape
        const cx = this.x + this.width / 2;
        const cy = centerY + this.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy + 8);
        ctx.bezierCurveTo(cx - 15, cy - 8, cx - 15, cy - 15, cx, cy - 5);
        ctx.bezierCurveTo(cx + 15, cy - 15, cx + 15, cy - 8, cx, cy + 8);
        ctx.fill();

        // Sparkle effect
        ctx.fillStyle = '#fff';
        const sparkle = Math.sin(Date.now() / 200) > 0;
        if (sparkle) {
            ctx.fillRect(cx - 3, cy - 10, 3, 3);
            ctx.fillRect(cx + 5, cy - 5, 2, 2);
        }

        ctx.restore();
    }

    checkCollision(player) {
        if (this.collected) return false;
        
        const pBounds = player.getBounds();
        return pBounds.left < this.x + this.width &&
               pBounds.right > this.x &&
               pBounds.top < this.y + this.height &&
               pBounds.bottom > this.y;
    }
}

// NPC class
class NPC {
    constructor(x, y, name, dialogues, spriteColor = '#4a90e2') {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.name = name;
        this.dialogues = dialogues;
        this.spriteColor = spriteColor;
        this.currentDialogue = 0;
        this.hasSpoken = false;
    }

    draw(ctx) {
        ctx.save();
        
        // Body
        ctx.fillStyle = this.spriteColor;
        ctx.fillRect(this.x + 8, this.y + 12, 16, 14);
        
        // Head
        ctx.fillStyle = '#ffe4c4';
        ctx.fillRect(this.x + 6, this.y + 4, 20, 12);
        
        // Eyes
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 10, this.y + 8, 3, 3);
        ctx.fillRect(this.x + 18, this.y + 8, 3, 3);
        
        // Smile
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + 16, this.y + 12, 4, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        
        // Name tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - 10, this.y - 20, 52, 16);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + 16, this.y - 9);
        
        ctx.restore();
    }

    checkInteraction(player) {
        const pBounds = player.getBounds();
        const distance = Math.sqrt(
            Math.pow((pBounds.left + pBounds.right) / 2 - (this.x + this.width / 2), 2) +
            Math.pow((pBounds.top + pBounds.bottom) / 2 - (this.y + this.height / 2), 2)
        );
        return distance < 50;
    }
}

// Boss class (Overthinking Monster)
class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.defeated = false;
        this.phase = 0;
        this.messages = [
            "What if she says no?",
            "You're overthinking this!",
            "Just be yourself!",
            "She'll love it!"
        ];
    }

    draw(ctx) {
        if (this.defeated) return;

        ctx.save();
        
        // Wobbly monster body
        const wobble = Math.sin(Date.now() / 300) * 5;
        
        ctx.fillStyle = '#6b5b95';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width / 2,
            this.y + this.height / 2 + wobble,
            this.width / 2,
            this.height / 2,
            0, 0, 2 * Math.PI
        );
        ctx.fill();

        // Big worried eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 30 + wobble, 15, 0, 2 * Math.PI);
        ctx.arc(this.x + 55, this.y + 30 + wobble, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 32 + wobble, 8, 0, 2 * Math.PI);
        ctx.arc(this.x + 55, this.y + 32 + wobble, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Worried mouth
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x + 40, this.y + 55 + wobble, 10, Math.PI, 2 * Math.PI);
        ctx.stroke();

        // Speech bubble
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x + 40, this.y - 10 + wobble, 40, 20, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("???", this.x + 40, this.y - 5 + wobble);

        ctx.restore();
    }

    checkInteraction(player) {
        if (this.defeated) return false;
        
        const pBounds = player.getBounds();
        return pBounds.left < this.x + this.width &&
               pBounds.right > this.x &&
               pBounds.top < this.y + this.height &&
               pBounds.bottom > this.y;
    }
}

// Level data
const levels = [
    {
        name: "How We Met",
        background: '#87ceeb',
        playerStart: { x: 50, y: 300 },
        memories: [
            { x: 300, y: 250, title: "The First Day", text: "Remember when we first met? I was so nervous, but you smiled and everything felt okay." },
            { x: 500, y: 350, title: "First Conversation", text: "We talked for hours! I couldn't believe how easy it was to talk to you." }
        ],
        npcs: [
            { x: 600, y: 200, name: "Memory Lane", dialogues: ["This is where our story began...", "Every journey starts with a single step."], color: '#ffb347' }
        ],
        boss: null,
        exit: { x: 750, y: 300, requiresMemories: 2 }
    },
    {
        name: "Funny Moments",
        background: '#98fb98',
        playerStart: { x: 50, y: 300 },
        memories: [
            { x: 250, y: 200, title: "That Time We...", text: "HAHAHA! Remember when that happened? I still laugh thinking about it!" },
            { x: 450, y: 400, title: "Inside Joke #47", text: "You know exactly what this means. Nobody else would understand 😂" }
        ],
        npcs: [
            { x: 350, y: 150, name: "Laugh Track", dialogues: ["Good times, right?", "We've shared so many laughs together."], color: '#90ee90' }
        ],
        boss: null,
        exit: { x: 750, y: 300, requiresMemories: 2 }
    },
    {
        name: "Things I Love",
        background: '#ffb6c1',
        playerStart: { x: 50, y: 300 },
        memories: [
            { x: 200, y: 250, title: "Your Smile", text: "The way your eyes light up when you smile... it's my favorite thing." },
            { x: 400, y: 350, title: "Your Kindness", text: "The way you care about others inspires me every day." },
            { x: 600, y: 200, title: "Your Laugh", text: "Your laugh is literally the best sound in the world." }
        ],
        npcs: [
            { x: 500, y: 450, name: "Heart", dialogues: ["There are so many reasons...", "Each one more special than the last."], color: '#ff69b4' }
        ],
        boss: null,
        exit: { x: 750, y: 300, requiresMemories: 3 }
    },
    {
        name: "The Overthinking Zone",
        background: '#483d8b',
        playerStart: { x: 50, y: 300 },
        memories: [],
        npcs: [],
        boss: { x: 400, y: 250 },
        exit: { x: 750, y: 300, requiresMemories: 0 }
    },
    {
        name: "Reaching You",
        background: '#ffd700',
        playerStart: { x: 50, y: 300 },
        memories: [],
        npcs: [],
        boss: null,
        exit: null,
        finalNPC: { x: 600, y: 300, name: "Her", dialogues: [], color: '#ff69b4' }
    }
];

// Current level objects
let currentMemories = [];
let currentNPCs = [];
let currentBoss = null;
let currentExit = null;
let finalNPC = null;

// Initialize level
function initLevel(levelIndex) {
    if (levelIndex >= levels.length) return;

    const level = levels[levelIndex];
    
    gameState.player = new Player(level.playerStart.x, level.playerStart.y);
    currentMemories = [];
    currentNPCs = [];
    currentBoss = null;
    currentExit = null;
    finalNPC = null;

    // Create memories
    if (level.memories) {
        level.memories.forEach((mem, index) => {
            currentMemories.push(new Memory(
                mem.x, mem.y, 
                `memory_${levelIndex}_${index}`,
                mem.title,
                mem.text
            ));
        });
    }

    // Create NPCs
    if (level.npcs) {
        level.npcs.forEach(npc => {
            currentNPCs.push(new NPC(npc.x, npc.y, npc.name, npc.dialogues, npc.color));
        });
    }

    // Create boss
    if (level.boss) {
        currentBoss = new Boss(level.boss.x, level.boss.y);
    }

    // Create exit
    if (level.exit) {
        currentExit = {
            x: level.exit.x,
            y: level.exit.y,
            width: 40,
            height: 60,
            requiresMemories: level.exit.requiresMemories
        };
    }

    // Create final NPC
    if (level.finalNPC) {
        finalNPC = new NPC(
            level.finalNPC.x, 
            level.finalNPC.y, 
            level.finalNPC.name, 
            level.finalNPC.dialogues,
            level.finalNPC.color
        );
    }
}

// Draw current level
function drawLevel(ctx) {
    const level = levels[gameState.currentLevel];
    
    // Background
    ctx.fillStyle = level.background;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw decorative elements
    drawDecorations(ctx, level);

    // Draw memories
    currentMemories.forEach(memory => {
        memory.update();
        memory.draw(ctx);
    });

    // Draw NPCs
    currentNPCs.forEach(npc => {
        npc.draw(ctx);
    });

    // Draw boss
    if (currentBoss) {
        currentBoss.draw(ctx);
    }

    // Draw exit
    if (currentExit && !isExitUnlocked()) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(currentExit.x, currentExit.y, currentExit.width, currentExit.height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Need ${currentExit.requiresMemories} memories`, currentExit.x + 20, currentExit.y - 10);
    } else if (currentExit) {
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(currentExit.x, currentExit.y, currentExit.width, currentExit.height);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT →', currentExit.x + 20, currentExit.y + 30);
    }

    // Draw final NPC
    if (finalNPC) {
        finalNPC.draw(ctx);
    }
}

// Draw decorations based on level
function drawDecorations(ctx, level) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    if (level.name.includes("Met")) {
        // Clouds for first level
        ctx.beginPath();
        ctx.arc(100, 80, 30, 0, 2 * Math.PI);
        ctx.arc(140, 80, 40, 0, 2 * Math.PI);
        ctx.arc(180, 80, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(500, 100, 30, 0, 2 * Math.PI);
        ctx.arc(540, 100, 40, 0, 2 * Math.PI);
        ctx.fill();
    } else if (level.name.includes("Funny")) {
        // Laugh emojis scattered
        ctx.font = '20px Arial';
        ctx.fillText('😂', 100, 100);
        ctx.fillText('😄', 200, 150);
        ctx.fillText('🤣', 600, 120);
    } else if (level.name.includes("Love")) {
        // Hearts
        ctx.fillStyle = 'rgba(255, 105, 180, 0.4)';
        for (let i = 0; i < 10; i++) {
            const hx = (i * 80) % CONFIG.CANVAS_WIDTH;
            const hy = 50 + (i % 3) * 100;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.bezierCurveTo(hx - 10, hy - 10, hx - 10, hy - 20, hx, hy - 10);
            ctx.bezierCurveTo(hx + 10, hy - 20, hx + 10, hy - 10, hx, hy);
            ctx.fill();
        }
    } else if (level.name.includes("Overthinking")) {
        // Dark clouds
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(200, 150, 50, 0, 2 * Math.PI);
        ctx.arc(400, 100, 60, 0, 2 * Math.PI);
        ctx.arc(600, 150, 50, 0, 2 * Math.PI);
        ctx.fill();
    } else if (level.name.includes("Reaching")) {
        // Golden sparkles
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        for (let i = 0; i < 20; i++) {
            const sx = Math.random() * CONFIG.CANVAS_WIDTH;
            const sy = Math.random() * CONFIG.CANVAS_HEIGHT;
            ctx.fillRect(sx, sy, 3, 3);
        }
    }
}

// Check if exit is unlocked
function isExitUnlocked() {
    if (!currentExit) return false;
    return gameState.memoriesCollected >= currentExit.requiresMemories;
}

// Check collisions and interactions
function checkInteractions() {
    if (gameState.isDialogueActive) return;

    const player = gameState.player;

    // Check memory collection
    currentMemories.forEach(memory => {
        if (memory.checkCollision(player)) {
            memory.collected = true;
            gameState.memoriesCollected++;
            updateMemoryCounter();
            showDialogue([
                { text: `✨ ${memory.title} ✨`, speaker: "" },
                { text: memory.text, speaker: "Memory" }
            ]);
        }
    });

    // Check NPC interaction
    if (keys[' '] || keys['Spacebar']) {
        currentNPCs.forEach(npc => {
            if (npc.checkInteraction(player) && !npc.hasSpoken) {
                npc.hasSpoken = true;
                const dialogues = npc.dialogues.map(d => ({ text: d, speaker: npc.name }));
                showDialogue(dialogues);
            }
        });

        // Check boss interaction
        if (currentBoss && currentBoss.checkInteraction(player)) {
            handleBossEncounter();
        }

        // Check exit
        if (currentExit && isExitUnlocked()) {
            const pBounds = player.getBounds();
            if (pBounds.left < currentExit.x + currentExit.width &&
                pBounds.right > currentExit.x &&
                pBounds.top < currentExit.y + currentExit.height &&
                pBounds.bottom > currentExit.y) {
                nextLevel();
            }
        }

        // Check final NPC
        if (finalNPC) {
            const pBounds = player.getBounds();
            const distance = Math.sqrt(
                Math.pow((pBounds.left + pBounds.right) / 2 - (finalNPC.x + finalNPC.width / 2), 2) +
                Math.pow((pBounds.top + pBounds.bottom) / 2 - (finalNPC.y + finalNPC.height / 2), 2)
            );
            
            if (distance < 50) {
                triggerFinalScene();
            }
        }

        keys[' '] = false;
        keys['Spacebar'] = false;
    }
}

// Handle boss encounter
function handleBossEncounter() {
    const bossMessages = currentBoss.messages.map(msg => ({ 
        text: msg, 
        speaker: "Overthinking Monster" 
    }));
    
    showDialogue(bossMessages, () => {
        currentBoss.defeated = true;
    });
}

// Show dialogue
function showDialogue(dialogues, onComplete = null) {
    gameState.isDialogueActive = true;
    gameState.dialogueQueue = dialogues;
    gameState.currentDialogueIndex = 0;
    gameState.onDialogueComplete = onComplete;
    
    showCurrentDialogue();
}

function showCurrentDialogue() {
    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');
    const continueBtn = document.getElementById('dialogue-continue');
    
    if (gameState.currentDialogueIndex >= gameState.dialogueQueue.length) {
        dialogueBox.classList.add('hidden');
        gameState.isDialogueActive = false;
        if (gameState.onDialogueComplete) {
            gameState.onDialogueComplete();
        }
        return;
    }

    const current = gameState.dialogueQueue[gameState.currentDialogueIndex];
    dialogueText.innerHTML = `<strong>${current.speaker}</strong><br><br>${current.text}`;
    dialogueBox.classList.remove('hidden');
    continueBtn.classList.remove('hidden');
}

function nextDialogue() {
    gameState.currentDialogueIndex++;
    showCurrentDialogue();
}

// Update memory counter
function updateMemoryCounter() {
    document.getElementById('memory-count').textContent = gameState.memoriesCollected;
    document.getElementById('total-memories').textContent = CONFIG.TOTAL_MEMORIES;
}

// Go to next level
function nextLevel() {
    gameState.currentLevel++;
    if (gameState.currentLevel < levels.length) {
        initLevel(gameState.currentLevel);
    }
}

// Trigger final scene
function triggerFinalScene() {
    gameState.isDialogueActive = true;
    
    const finalDialogues = [
        { text: "I've been trying to figure out how to say this...", speaker: "" },
        { text: "So I made an entire game instead.", speaker: "" },
        { text: "Because sometimes words aren't enough.", speaker: "" },
        { text: "What I'm trying to say is...", speaker: "" }
    ];

    showDialogue(finalDialogues, () => {
        showFinalQuestion();
    });
}

// Show final question
function showFinalQuestion() {
    document.getElementById('dialogue-box').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');
    document.getElementById('memory-counter').classList.add('hidden');
}

// Handle YES button
function handleYes() {
    document.getElementById('final-screen').classList.add('hidden');
    document.getElementById('celebration-screen').classList.remove('hidden');
    
    // Create hearts animation
    const heartsContainer = document.getElementById('hearts-container');
    heartsContainer.innerHTML = '';
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'hearts-animation';
            heart.textContent = ['❤️', '💕', '💖', '💗', '💓'][Math.floor(Math.random() * 5)];
            heart.style.left = Math.random() * 100 + '%';
            heart.style.top = Math.random() * 50 + 50 + '%';
            heart.style.fontSize = (Math.random() * 2 + 2) + 'em';
            heart.style.animationDelay = Math.random() * 2 + 's';
            heartsContainer.appendChild(heart);
        }, i * 100);
    }

    // Play celebration
    createConfetti();
}

// Create confetti effect
function createConfetti() {
    const colors = ['#ff6b9d', '#f093fb', '#f5576c', '#ffd700', '#90ee90'];
    
    setInterval(() => {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.transition = 'top 3s ease-in, transform 3s linear';
        document.getElementById('celebration-screen').appendChild(confetti);
        
        setTimeout(() => {
            confetti.style.top = '100%';
            confetti.style.transform = `rotate(${Math.random() * 360 + 360}deg)`;
        }, 10);
    }, 100);
}

// Handle NO button (make it run away)
function handleNo() {
    const noBtn = document.getElementById('no-button');
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 50;
    
    noBtn.style.position = 'absolute';
    noBtn.style.left = Math.random() * maxX + 'px';
    noBtn.style.top = Math.random() * maxY + 'px';
}

// Main game loop
function gameLoop() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    if (gameState.currentScene === 'playing') {
        // Update
        gameState.player.update();
        checkInteractions();

        // Draw
        drawLevel(ctx);
        gameState.player.draw(ctx);
    }

    requestAnimationFrame(gameLoop);
}

// Initialize game
function initGame() {
    gameState.currentScene = 'playing';
    gameState.currentLevel = 0;
    gameState.memoriesCollected = 0;
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('memory-counter').classList.remove('hidden');
    
    initLevel(0);
    updateMemoryCounter();
    
    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === ' ' && gameState.isDialogueActive) {
        e.preventDefault();
        nextDialogue();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.getElementById('start-button').addEventListener('click', initGame);

document.getElementById('dialogue-continue').addEventListener('click', (e) => {
    e.stopPropagation();
    nextDialogue();
});

document.getElementById('yes-button').addEventListener('click', handleYes);

document.getElementById('no-button').addEventListener('click', (e) => {
    e.stopPropagation();
    handleNo();
});

document.getElementById('no-button').addEventListener('mouseenter', handleNo);

// Prevent default behavior for arrow keys
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

console.log("💕 Game loaded! Good luck! 💕");
