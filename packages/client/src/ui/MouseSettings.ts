/**
 * Mouse Settings UI: sensitivity slider.
 * Persists to localStorage under key 'browserstrike_sensitivity'.
 */

const LS_KEY = 'browserstrike_sensitivity';
const DEFAULT_SENSITIVITY = 1.0;
const MIN_SENSITIVITY = 0.1;
const MAX_SENSITIVITY = 5.0;
const STEP = 0.1;

export class MouseSettings {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private slider!: HTMLInputElement;
  private valueLabel!: HTMLElement;
  private onUpdate: ((sensitivity: number) => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'mouse-settings-overlay';
    this.overlay.style.display = 'none';

    this.panel = document.createElement('div');
    this.panel.className = 'mouse-settings-panel';
    this.overlay.appendChild(this.panel);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.build();
    document.body.appendChild(this.overlay);
  }

  setOnUpdate(fn: (sensitivity: number) => void): void {
    this.onUpdate = fn;
  }

  getSensitivity(): number {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return Math.max(MIN_SENSITIVITY, Math.min(MAX_SENSITIVITY, parseFloat(saved)));
    } catch { /* ignore */ }
    return DEFAULT_SENSITIVITY;
  }

  private build(): void {
    this.panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'ms-header';

    const title = document.createElement('h2');
    title.className = 'ms-title';
    title.textContent = 'Mouse Settings';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ms-close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // Sensitivity slider
    const row = document.createElement('div');
    row.className = 'ms-slider-row';

    const label = document.createElement('label');
    label.className = 'ms-label';
    label.textContent = 'Sensitivity';
    row.appendChild(label);

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'ms-slider-wrap';

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'ms-slider';
    this.slider.min = String(MIN_SENSITIVITY * 10);
    this.slider.max = String(MAX_SENSITIVITY * 10);
    this.slider.step = String(STEP * 10);
    const current = this.getSensitivity();
    this.slider.value = String(Math.round(current * 10));
    sliderWrap.appendChild(this.slider);

    this.valueLabel = document.createElement('span');
    this.valueLabel.className = 'ms-value';
    this.valueLabel.textContent = current.toFixed(1);
    sliderWrap.appendChild(this.valueLabel);

    row.appendChild(sliderWrap);
    this.panel.appendChild(row);

    // Info text
    const info = document.createElement('div');
    info.className = 'ms-info';
    info.textContent = 'Default: 1.0';
    this.panel.appendChild(info);

    this.slider.addEventListener('input', () => {
      const val = parseInt(this.slider.value, 10) / 10;
      this.valueLabel.textContent = val.toFixed(1);
      try { localStorage.setItem(LS_KEY, String(val)); } catch { /* ignore */ }
      if (this.onUpdate) this.onUpdate(val);
    });
  }

  show(): void {
    const current = this.getSensitivity();
    this.slider.value = String(Math.round(current * 10));
    this.valueLabel.textContent = current.toFixed(1);
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
