/*
  Shrinking Circle Challenge - Complete Game Logic Rewrite
  - Clean, modular implementation with clear game flow
  - Embedded pop sound for offline play
  - Proper difficulty modes and scoring
  - Smooth animations and transitions
*/

// ========== GAME STATE ==========
let gameState = {
  isRunning: false,
  score: 0,
  clicks: 0,
  misses: 0,
  difficulty: 'easy',
  duration: 40,
  startTime: 0,
  remainingTime: 0,
  currentCircle: null,
  timerId: null,
  highScore: Number(localStorage.getItem("rc_high_score") || 0)
};

// ========== EMBEDDED POP SOUND ==========
// Base64 encoded short pop sound for offline play
const popAudio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT");

/**
 * Plays pop sound on successful circle click
 * Uses cloneNode to allow multiple simultaneous plays
 */
function playPop() {
  try {
    const s = popAudio.cloneNode(true);
    s.volume = 0.7;
    s.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors (autoplay restrictions, etc.)
  }
}

// ========== DOM ELEMENTS ==========
const elements = {
  gameArea: document.getElementById("gameArea"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  backToMenuBtn: document.getElementById("backToMenuBtn"),
  durationSelect: document.getElementById("durationSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  timer: document.getElementById("timer"),
  score: document.getElementById("score"),
  highScore: document.getElementById("highScore"),
  resultsOverlay: document.getElementById("resultsOverlay"),
  resultsTitle: document.querySelector(".results-title"),
  finalScore: document.getElementById("finalScore"),
  clicksCount: document.getElementById("clicksCount"),
  missesCount: document.getElementById("missesCount"),
  avgReaction: document.getElementById("avgReaction"),
  quote: document.getElementById("quote")
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Formats milliseconds as "XXX ms" string
 */
function formatMs(ms) {
  return `${Math.round(ms)} ms`;
}

/**
 * Clamps value between min and max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates random number between min and max
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Updates timer display in HUD
 */
function updateTimerDisplay() {
  elements.timer.textContent = (gameState.remainingTime / 1000).toFixed(1);
}

/**
 * Updates score display in HUD
 */
function updateScoreDisplay() {
  elements.score.textContent = gameState.score;
  elements.highScore.textContent = gameState.highScore;
}

/**
 * Updates high score if current score is higher
 */
function updateHighScore() {
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("rc_high_score", String(gameState.highScore));
    updateScoreDisplay();
  }
}

// ========== CIRCLE MANAGEMENT ==========

/**
 * Generates random position for circle within game area
 */
function getRandomPosition(radius) {
  const rect = elements.gameArea.getBoundingClientRect();
  const x = randomBetween(rect.left + radius, rect.right - radius);
  const y = randomBetween(rect.top + radius, rect.bottom - radius);
  return { x, y };
}

/**
 * Creates and spawns a new circle at random position
 */
function spawnCircle() {
  if (!gameState.isRunning) return;

  const radius = 80; // Starting radius
  const { x, y } = getRandomPosition(radius);

  // Create circle element
  const circle = document.createElement("div");
  circle.className = "circle";
  circle.style.width = `${radius * 2}px`;
  circle.style.height = `${radius * 2}px`;

  // Position circle (centered at x, y)
  const areaRect = elements.gameArea.getBoundingClientRect();
  circle.style.left = `${x - areaRect.left - radius}px`;
  circle.style.top = `${y - areaRect.top - radius}px`;

  // Add click handler
  circle.addEventListener("pointerdown", handleCircleClick, { passive: true });
  circle.addEventListener("touchstart", handleCircleClick, { passive: true });

  // Remove any existing circle
  removeCurrentCircle();

  // Add to game area
  elements.gameArea.appendChild(circle);
  gameState.currentCircle = circle;

  // Start shrinking animation
  animateCircleShrink(circle, radius, 12, 1000, () => {
    // Circle vanished without being clicked
    if (circle.isConnected) {
      handleCircleMiss();
    }
  });
}

/**
 * Handles successful circle click
 */
function handleCircleClick(event) {
  if (!gameState.isRunning || !gameState.currentCircle) return;

  const circle = gameState.currentCircle;
  const rect = circle.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Get click position
  const clickX = event.clientX ?? (event.touches && event.touches[0].clientX);
  const clickY = event.clientY ?? (event.touches && event.touches[0].clientY);
  
  // Check if click is inside circle
  const distance = Math.sqrt(
    Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
  );
  const currentRadius = rect.width / 2;

  if (distance <= currentRadius + 0.5) {
    // Successful hit
    gameState.clicks++;
    gameState.score++;
    updateScoreDisplay();
    playPop();
    showPlusOnePopup(clickX, clickY);
    popCircle(circle);
  }
}

/**
 * Handles circle miss (vanished without click)
 */
function handleCircleMiss() {
  gameState.misses++;
  
  // Apply difficulty penalty
  if (gameState.difficulty === 'hard') {
    gameState.score = Math.max(0, gameState.score - 1);
    updateScoreDisplay();
    
    // Check for game over
    if (gameState.score <= 0) {
      endGame("lose");
      return;
    }
  }
  
  // Spawn next circle
  setTimeout(() => {
    if (gameState.isRunning) {
      spawnCircle();
    }
  }, 200);
}

/**
 * Removes current circle from game area
 */
function removeCurrentCircle() {
  if (gameState.currentCircle && gameState.currentCircle.parentNode) {
    gameState.currentCircle.remove();
  }
  gameState.currentCircle = null;
}

/**
 * Animates circle shrinking from startRadius to endRadius over duration
 */
function animateCircleShrink(circle, startRadius, endRadius, duration, onComplete) {
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = clamp(elapsed / duration, 0, 1);
    
    const currentRadius = startRadius + (endRadius - startRadius) * progress;
    circle.style.width = `${currentRadius * 2}px`;
    circle.style.height = `${currentRadius * 2}px`;
    
    if (progress < 1 && circle.isConnected) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }
  
  requestAnimationFrame(animate);
}

/**
 * Shows pop animation when circle is successfully clicked
 */
function popCircle(circle) {
  circle.classList.add("pop");
  setTimeout(() => {
    circle.remove();
    gameState.currentCircle = null;
    
    // Spawn next circle
    setTimeout(() => {
      if (gameState.isRunning) {
        spawnCircle();
      }
    }, 200);
  }, 200);
}

/**
 * Shows +1 popup animation at click position
 */
function showPlusOnePopup(x, y) {
  const popup = document.createElement("div");
  popup.className = "plus-one";
  popup.textContent = "+1";
  
  const rect = elements.gameArea.getBoundingClientRect();
  popup.style.left = `${x - rect.left}px`;
  popup.style.top = `${y - rect.top}px`;
  
  elements.gameArea.appendChild(popup);
  setTimeout(() => popup.remove(), 600);
}

// ========== GAME FLOW ==========

/**
 * Starts the game with selected settings
 */
function startGame() {
  if (gameState.isRunning) return;
  
  // Get selected settings
  gameState.duration = parseInt(elements.durationSelect.value);
  gameState.difficulty = elements.difficultySelect.value;
  
  // Reset game state
  gameState.isRunning = true;
  gameState.score = gameState.difficulty === 'hard' ? 3 : 0;
  gameState.clicks = 0;
  gameState.misses = 0;
  gameState.remainingTime = gameState.duration * 1000;
  gameState.startTime = performance.now();
  
  // Update displays
  updateScoreDisplay();
  updateTimerDisplay();
  
  // Hide start menu and results
  const landing = elements.gameArea.querySelector(".landing");
  if (landing) landing.classList.add("hidden");
  hideResults();
  
  // Start timer
  startTimer();
  
  // Spawn first circle
  spawnCircle();
}

/**
 * Starts the countdown timer
 */
function startTimer() {
  function tick() {
    if (!gameState.isRunning) return;
    
    const elapsed = performance.now() - gameState.startTime;
    gameState.remainingTime = Math.max(0, (gameState.duration * 1000) - elapsed);
    updateTimerDisplay();
    
    if (gameState.remainingTime <= 0) {
      endGame("timeup");
    } else {
      gameState.timerId = setTimeout(tick, 50);
    }
  }
  
  tick();
}

/**
 * Ends the game with specified reason
 */
function endGame(reason) {
  gameState.isRunning = false;
  clearTimeout(gameState.timerId);
  removeCurrentCircle();
  
  // Update high score if not a loss
  if (reason !== "lose") {
    updateHighScore();
  }
  
  // Show results
  showResults(reason);
}

/**
 * Shows the results overlay with game statistics
 */
function showResults(reason) {
  // Update result message
  if (reason === "lose") {
    elements.resultsTitle.textContent = "💥 You Lose!";
  } else {
    elements.resultsTitle.textContent = "⏳ Time's Up!";
  }
  
  // Update statistics
  elements.finalScore.textContent = gameState.score;
  elements.clicksCount.textContent = gameState.clicks;
  elements.missesCount.textContent = gameState.misses;
  
  // Calculate average reaction time (placeholder for now)
  elements.avgReaction.textContent = "0 ms";
  
  // Fetch motivational quote
  fetchQuote();
  
  // Show overlay
  elements.resultsOverlay.classList.remove("hidden");
}

/**
 * Hides the results overlay
 */
function hideResults() {
  elements.resultsOverlay.classList.add("hidden");
}

/**
 * Restarts the game with same settings
 */
function restartGame() {
  hideResults();
  startGame();
}

/**
 * Returns to start menu
 */
function backToMenu() {
  hideResults();
  const landing = elements.gameArea.querySelector(".landing");
  if (landing) landing.classList.remove("hidden");
}

// ========== QUOTE API ==========

/**
 * Fetches motivational quote from API
 */
async function fetchQuote() {
  try {
    elements.quote.textContent = "Fetching a motivational boost…";
    const response = await fetch("https://zenquotes.io/api/random");
    if (!response.ok) throw new Error("Quote fetch failed");
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const quote = data[0];
      const text = quote.q || "";
      const author = quote.a || "Unknown";
      elements.quote.innerHTML = `"${escapeHtml(text)}" — ${escapeHtml(author)}`;
    } else {
      elements.quote.textContent = "Stay focused and keep tapping!";
    }
  } catch (e) {
    elements.quote.textContent = "Stay focused and keep tapping!";
  }
}

/**
 * Escapes HTML characters in text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========== EVENT LISTENERS ==========

// Start game button
elements.startBtn.addEventListener("click", startGame);

// Restart button
elements.restartBtn.addEventListener("click", restartGame);

// Back to menu button
elements.backToMenuBtn.addEventListener("click", backToMenu);

// ========== INITIALIZATION ==========

// Initialize displays
updateScoreDisplay();
updateTimerDisplay();