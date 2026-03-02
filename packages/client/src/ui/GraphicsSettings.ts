/**
 * Graphics Settings UI: quality level selector (Very Low / Low / Medium / High).
 * Can be opened from the main menu via a settings button.
 * Settings persist to localStorage via QualitySettings.
 */

import { QualitySettings, QualityLevel, QUALITY_LABELS, QUALITY_ORDER } from '../engine/QualitySettings';

export class GraphicsSettings {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private qualitySettings: QualitySettings;
  private buttons: Map<QualityLevel, HTMLButtonElement> = new Map();
  private onApply: (() => void) | null = null;

  constructor(qualitySettings: QualitySettings) {
    this.qualitySettings = qualitySettings;

    this.overlay = document.createElement('div');
    this.overlay.className = 'gfx-settings-overlay';
    this.overlay.style.display = 'none';

    this.panel = document.createElement('div');
    this.panel.className = 'gfx-settings-panel';
    this.overlay.appendChild(this.panel);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.build();
    document.body.appendChild(this.overlay);
  }

  /** Callback invoked when quality changes so the app can re-apply renderer settings. */
  setOnApply(fn: () => void): void {
    this.onApply = fn;
  }

  private build(): void {
    this.panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'gfx-header';

    const title = document.createElement('h2');
    title.className = 'gfx-title';
    title.textContent = 'Graphics Settings';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gfx-close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // Quality label
    const label = document.createElement('div');
    label.className = 'gfx-label';
    label.textContent = 'Quality';
    this.panel.appendChild(label);

    // Quality buttons row
    const row = document.createElement('div');
    row.className = 'gfx-quality-row';

    for (const level of QUALITY_ORDER) {
      const btn = document.createElement('button');
      btn.className = 'gfx-quality-btn';
      btn.textContent = QUALITY_LABELS[level];
      btn.dataset.level = level;
      btn.addEventListener('click', () => this.selectLevel(level));
      row.appendChild(btn);
      this.buttons.set(level, btn);
    }

    this.panel.appendChild(row);

    // Info text
    const info = document.createElement('div');
    info.className = 'gfx-info';
    info.textContent = 'Lower settings improve performance on weaker devices.';
    this.panel.appendChild(info);

    this.highlightCurrent();
  }

  private selectLevel(level: QualityLevel): void {
    this.qualitySettings.setLevel(level);
    this.highlightCurrent();
    if (this.onApply) this.onApply();
  }

  private highlightCurrent(): void {
    const current = this.qualitySettings.getLevel();
    for (const [level, btn] of this.buttons) {
      btn.classList.toggle('gfx-quality-active', level === current);
    }
  }

  show(): void {
    this.highlightCurrent();
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  isVisible(): boolean {
    return this.overlay.style.display !== 'none';
  }

  dispose(): void {
    this.overlay.remove();
  }
}
