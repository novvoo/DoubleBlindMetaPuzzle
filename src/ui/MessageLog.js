/**
 * MessageLog manages the shared message log in the UI.
 */
export class MessageLog {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.maxEntries = 50;
  }

  add(message, type = 'system') {
    if (!this.container) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    entry.textContent = `[${time}] ${message}`;
    this.container.prepend(entry);

    // Trim old entries
    while (this.container.children.length > this.maxEntries) {
      this.container.lastChild.remove();
    }
  }

  addMove(playerName, directionName) {
    this.add(`${playerName} 向 ${directionName} 移动`, 'system');
  }

  addReveal(playerName, what) {
    this.add(`${playerName} 揭示了：${what}`, 'reveal');
  }

  addWait(playerName) {
    this.add(`${playerName} 等待`, 'system');
  }

  addWin(message) {
    this.add(`🏆 ${message}`, 'win');
  }

  clear() {
    if (this.container) this.container.innerHTML = '';
  }
}