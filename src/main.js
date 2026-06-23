import { Game } from './ui/Game.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game;

  const startSection = document.getElementById('start-section');
  const gameLayout = document.getElementById('game-layout');
  const btnStart = document.getElementById('btn-start');
  const btnNewGame = document.getElementById('btn-new-game');

  function startGame() {
    startSection.classList.add('hidden');
    gameLayout.classList.add('visible');
    game.start();
    // 自动启动 AI 对战
    game.startAutoPlay(1200);
    updateAIToggleButton();
  }

  btnStart.addEventListener('click', startGame);

  // 新游戏按钮：返回开始界面
  btnNewGame.addEventListener('click', () => {
    game.stopAutoPlay();
    gameLayout.classList.remove('visible');
    startSection.classList.remove('hidden');
  });

  // AI开始按钮
  const btnAIStart = document.getElementById('btn-ai-start-btn');
  btnAIStart.addEventListener('click', () => {
    if (game.started && !game.winner && !game.autoPlay) {
      game.startAutoPlay(game.autoPlaySpeed || 1200);
      updateAIToggleButton();
    }
  });

  // AI 暂停/继续按钮
  const btnToggleAI = document.getElementById('btn-toggle-ai');
  btnToggleAI.addEventListener('click', () => {
    game.toggleAutoPlay();
    updateAIToggleButton();
  });

  function updateAIToggleButton() {
    if (game.autoPlay) {
      btnToggleAI.textContent = '⏯ AI 暂停';
      btnToggleAI.classList.remove('paused');
    } else {
      btnToggleAI.textContent = '▶ AI 继续';
      btnToggleAI.classList.add('paused');
    }
  }

  // 速度控制按钮
  const speedBtns = document.querySelectorAll('.speed-btn');
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const speed = parseInt(btn.dataset.speed);
      game.setSpeed(speed);
    });
  });

  // 初始化速度按钮状态：中速默认激活
  const defaultSpeed = document.querySelector('.speed-btn[data-speed="1200"]');
  if (defaultSpeed) {
    speedBtns.forEach(b => b.classList.remove('active'));
    defaultSpeed.classList.add('active');
  }
});