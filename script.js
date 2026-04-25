const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const statusEl = document.getElementById("status");

const state = {
  running: false,
  playerScore: 0,
  aiScore: 0,
  winningScore: 5,
  keys: new Set(),
  flashTimer: 0,
};

const field = {
  width: canvas.width,
  height: canvas.height,
  inset: 28,
};

const player = {
  x: 58,
  y: field.height / 2 - 62,
  width: 18,
  height: 124,
  speed: 7.5,
};

const ai = {
  x: field.width - 76,
  y: field.height / 2 - 62,
  width: 18,
  height: 124,
  speed: 5.1,
};

const ball = {
  x: field.width / 2,
  y: field.height / 2,
  radius: 13,
  speed: 6.4,
  vx: 0,
  vy: 0,
  trail: [],
};

const pace = {
  startSpeed: 6.4,
  hitBoost: 1.15,
  maxSpeed: 22,
};

function startRound(direction = Math.random() > 0.5 ? 1 : -1) {
  ball.x = field.width / 2;
  ball.y = field.height / 2;
  ball.speed = pace.startSpeed;
  ball.vx = direction * ball.speed;
  ball.vy = (Math.random() * 2 - 1) * 3.6;
  ball.trail.length = 0;
  state.running = true;
  statusEl.textContent = "El duelo sigue";
}

function resetMatch(message) {
  state.running = false;
  state.playerScore = 0;
  state.aiScore = 0;
  updateScore();
  statusEl.textContent = message;
  ball.x = field.width / 2;
  ball.y = field.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.trail.length = 0;
}

function updateScore() {
  playerScoreEl.textContent = state.playerScore;
  aiScoreEl.textContent = state.aiScore;
}

function clampPaddles() {
  const top = field.inset + 10;
  const bottom = field.height - field.inset - 10;
  player.y = Math.max(top, Math.min(bottom - player.height, player.y));
  ai.y = Math.max(top, Math.min(bottom - ai.height, ai.y));
}

function updatePlayer() {
  if (state.keys.has("w") || state.keys.has("arrowup")) {
    player.y -= player.speed;
  }
  if (state.keys.has("s") || state.keys.has("arrowdown")) {
    player.y += player.speed;
  }
}

function updateAI() {
  const target = ball.y - ai.height / 2;
  const delta = target - ai.y;
  ai.y += Math.sign(delta) * Math.min(Math.abs(delta), ai.speed);
}

function reflectBall(paddle, isPlayer) {
  const relative = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const spin = relative * 6.2;
  ball.speed = Math.min(ball.speed + pace.hitBoost, pace.maxSpeed);
  ball.vx = (isPlayer ? 1 : -1) * ball.speed;
  ball.vy = spin;
  state.flashTimer = 6;
}

function updateBall() {
  ball.trail.unshift({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) {
    ball.trail.pop();
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  const ceiling = field.inset + 12 + ball.radius;
  const floor = field.height - field.inset - 12 - ball.radius;

  if (ball.y <= ceiling || ball.y >= floor) {
    ball.vy *= -1;
    ball.y = Math.max(ceiling, Math.min(floor, ball.y));
    state.flashTimer = 4;
  }

  if (
    ball.x - ball.radius <= player.x + player.width &&
    ball.y >= player.y &&
    ball.y <= player.y + player.height &&
    ball.x > player.x
  ) {
    ball.x = player.x + player.width + ball.radius;
    reflectBall(player, true);
  }

  if (
    ball.x + ball.radius >= ai.x &&
    ball.y >= ai.y &&
    ball.y <= ai.y + ai.height &&
    ball.x < ai.x + ai.width
  ) {
    ball.x = ai.x - ball.radius;
    reflectBall(ai, false);
  }

  const leftFailLine = field.inset + 6;
  const rightFailLine = field.width - field.inset - 6;

  if (ball.x - ball.radius <= leftFailLine) {
    state.aiScore += 1;
    updateScore();
    state.running = false;
    statusEl.textContent = "El borde izquierdo casi cae. Espacio para seguir";
    checkWinner(1);
  } else if (ball.x + ball.radius >= rightFailLine) {
    state.playerScore += 1;
    updateScore();
    state.running = false;
    statusEl.textContent = "Gran devolución. Espacio para el siguiente saque";
    checkWinner(-1);
  }
}

function checkWinner(nextDirection) {
  if (state.playerScore >= state.winningScore) {
    resetMatch("Ganaste el show. Espacio para reiniciar");
    return;
  }
  if (state.aiScore >= state.winningScore) {
    resetMatch("El rival ganó esta función. Espacio para revancha");
    return;
  }
  ball.vx = nextDirection * ball.speed;
  ball.vy = 0;
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, field.height);
  gradient.addColorStop(0, "#f3e2bb");
  gradient.addColorStop(1, "#d4b07b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, field.width, field.height);

  ctx.save();
  ctx.strokeStyle = "rgba(38, 21, 15, 0.95)";
  ctx.lineWidth = 6;
  roundRect(field.inset, field.inset, field.width - field.inset * 2, field.height - field.inset * 2, 24);
  ctx.stroke();

  ctx.strokeStyle = "rgba(38, 21, 15, 0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 16]);
  ctx.beginPath();
  ctx.moveTo(field.width / 2, field.inset + 12);
  ctx.lineTo(field.width / 2, field.height - field.inset - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.arc(
      (i * 67) % field.width,
      30 + ((i * 47) % field.height),
      1 + (i % 3),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#2d1a12";
    ctx.fill();
  }
  ctx.restore();
}

function drawPaddle(paddle, side) {
  ctx.save();
  const fill = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
  fill.addColorStop(0, "#2f1a13");
  fill.addColorStop(0.5, "#6d3d29");
  fill.addColorStop(1, "#1a0f0b");

  ctx.fillStyle = fill;
  ctx.strokeStyle = "#f6dfb1";
  ctx.lineWidth = 3;
  roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 240, 205, 0.35)";
  roundRect(paddle.x + 4, paddle.y + 8, 5, paddle.height - 16, 4);
  ctx.fill();

  ctx.fillStyle = "rgba(36, 21, 15, 0.78)";
  ctx.font = '700 18px "Cormorant SC", serif';
  ctx.textAlign = "center";
  ctx.fillText(side, paddle.x + paddle.width / 2, paddle.y - 12);
  ctx.restore();
}

function drawBall() {
  ctx.save();
  ball.trail.forEach((point, index) => {
    ctx.globalAlpha = 0.08 - index * 0.006;
    ctx.fillStyle = "#7d3d28";
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.radius - index * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const gradient = ctx.createRadialGradient(
    ball.x - 4,
    ball.y - 4,
    3,
    ball.x,
    ball.y,
    ball.radius
  );
  gradient.addColorStop(0, "#fff8e8");
  gradient.addColorStop(0.6, "#f1ddae");
  gradient.addColorStop(1, "#ae6947");

  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#2d1912";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFlash() {
  if (state.flashTimer <= 0) {
    return;
  }

  ctx.save();
  ctx.fillStyle = `rgba(255, 247, 225, ${state.flashTimer * 0.025})`;
  ctx.fillRect(0, 0, field.width, field.height);
  ctx.restore();
  state.flashTimer -= 1;
}

function drawCenterText() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(36, 21, 15, 0.82)";
  ctx.font = 'italic 32px "DM Serif Display", serif';
  ctx.fillText("No dejes que la pelota bese el borde", field.width / 2, 70);
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function update() {
  updatePlayer();
  updateAI();
  clampPaddles();

  if (state.running) {
    updateBall();
  }
}

function render() {
  ctx.clearRect(0, 0, field.width, field.height);
  drawBackdrop();
  drawCenterText();
  drawPaddle(player, "TÚ");
  drawPaddle(ai, "CPU");
  drawBall();
  drawFlash();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "s", "arrowup", "arrowdown", " "].includes(key)) {
    event.preventDefault();
  }
  state.keys.add(key);

  if (key === " " && !state.running) {
    startRound(ball.vx === 0 ? 1 : Math.sign(ball.vx));
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

updateScore();
render();
loop();
