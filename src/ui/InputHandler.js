import { DIRECTIONS, PLAYERS } from '../game/constants.js';

const KEY_MAP_PLAYER_A = {
  ArrowUp:    DIRECTIONS.UP,
  ArrowDown:  DIRECTIONS.DOWN,
  ArrowLeft:  DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  w: DIRECTIONS.UP,
  s: DIRECTIONS.DOWN,
  a: DIRECTIONS.LEFT,
  d: DIRECTIONS.RIGHT,
};

const KEY_MAP_PLAYER_B = {
  i: DIRECTIONS.UP,
  k: DIRECTIONS.DOWN,
  j: DIRECTIONS.LEFT,
  l: DIRECTIONS.RIGHT,
};

export class InputHandler {
  constructor() {
    this.onDirection = null;
    this.onReveal = null;
    this.onWait = null;
    this.onUndo = null;
    this._handler = this._handleKey.bind(this);
  }

  bind() {
    window.addEventListener('keydown', this._handler);
  }

  unbind() {
    window.removeEventListener('keydown', this._handler);
  }

  setCallbacks(callbacks) {
    this.onDirection = callbacks.onDirection;
    this.onReveal = callbacks.onReveal;
    this.onWait = callbacks.onWait;
    this.onUndo = callbacks.onUndo;
  }

  _handleKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (this.onUndo) this.onUndo();
      return;
    }

    if (e.key === 'q') {
      e.preventDefault();
      if (this.onReveal) this.onReveal(PLAYERS.A);
      return;
    }
    if (e.key === 'u') {
      e.preventDefault();
      if (this.onReveal) this.onReveal(PLAYERS.B);
      return;
    }

    if (e.key === 'e') {
      e.preventDefault();
      if (this.onWait) this.onWait(PLAYERS.A);
      return;
    }
    if (e.key === 'o') {
      e.preventDefault();
      if (this.onWait) this.onWait(PLAYERS.B);
      return;
    }

    const dirA = KEY_MAP_PLAYER_A[e.key];
    if (dirA !== undefined) {
      e.preventDefault();
      if (this.onDirection) this.onDirection(PLAYERS.A, dirA);
      return;
    }

    const dirB = KEY_MAP_PLAYER_B[e.key];
    if (dirB !== undefined) {
      e.preventDefault();
      if (this.onDirection) this.onDirection(PLAYERS.B, dirB);
      return;
    }
  }
}