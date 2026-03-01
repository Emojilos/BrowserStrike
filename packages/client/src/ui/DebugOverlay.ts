export interface DebugState {
  fps: number;
  ping: number;
  posX: number;
  posY: number;
  posZ: number;
  playerCount: number;
  serverTick: number;
}

/**
 * Debug overlay toggled by backtick (`).
 * Semi-transparent panel in top-left corner showing FPS, ping, position, etc.
 */
export class DebugOverlay {
  private container: HTMLElement;
  private visible = false;

  private fpsEl!: HTMLElement;
  private pingEl!: HTMLElement;
  private posEl!: HTMLElement;
  private playersEl!: HTMLElement;
  private tickEl!: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'debug-overlay';
    this.container.style.display = 'none';
    this.build();
    parent.appendChild(this.container);
  }

  private build(): void {
    this.container.innerHTML = `
      <div class="debug-row"><span class="debug-label">FPS</span><span class="debug-value debug-fps">0</span></div>
      <div class="debug-row"><span class="debug-label">PING</span><span class="debug-value debug-ping">0 ms</span></div>
      <div class="debug-row"><span class="debug-label">POS</span><span class="debug-value debug-pos">0, 0, 0</span></div>
      <div class="debug-row"><span class="debug-label">PLAYERS</span><span class="debug-value debug-players">0</span></div>
      <div class="debug-row"><span class="debug-label">TICK</span><span class="debug-value debug-tick">0</span></div>
    `;

    this.fpsEl = this.container.querySelector('.debug-fps')!;
    this.pingEl = this.container.querySelector('.debug-ping')!;
    this.posEl = this.container.querySelector('.debug-pos')!;
    this.playersEl = this.container.querySelector('.debug-players')!;
    this.tickEl = this.container.querySelector('.debug-tick')!;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? '' : 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(state: DebugState): void {
    if (!this.visible) return;

    this.fpsEl.textContent = String(state.fps);
    // Color FPS: green >=50, orange 30-49, red <30
    if (state.fps >= 50) {
      this.fpsEl.style.color = '#4cff4c';
    } else if (state.fps >= 30) {
      this.fpsEl.style.color = '#ffaa00';
    } else {
      this.fpsEl.style.color = '#ff3c3c';
    }

    this.pingEl.textContent = `${state.ping} ms`;
    this.posEl.textContent = `${state.posX.toFixed(1)}, ${state.posY.toFixed(1)}, ${state.posZ.toFixed(1)}`;
    this.playersEl.textContent = String(state.playerCount);
    this.tickEl.textContent = String(state.serverTick);
  }

  dispose(): void {
    this.container.remove();
  }
}
