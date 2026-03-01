/**
 * Sound Settings UI: volume sliders (master, effects, footsteps) + mute toggle.
 * Can be opened from the main menu via a settings button.
 * Settings persist to localStorage via AudioManager.
 */

import type { AudioManager, VolumeSettings } from '../engine/AudioManager';

export class SoundSettings {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private muteBtn!: HTMLButtonElement;
  private sliders: Record<keyof VolumeSettings, HTMLInputElement> = {} as Record<keyof VolumeSettings, HTMLInputElement>;
  private valueLabels: Record<keyof VolumeSettings, HTMLElement> = {} as Record<keyof VolumeSettings, HTMLElement>;
  private audioManager: AudioManager;
  private mutedVolumes: VolumeSettings | null = null;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;

    // Full-screen overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'sound-settings-overlay';
    this.overlay.style.display = 'none';

    this.panel = document.createElement('div');
    this.panel.className = 'sound-settings-panel';
    this.overlay.appendChild(this.panel);

    // Click outside panel to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.build();
    document.body.appendChild(this.overlay);
  }

  private build(): void {
    this.panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'ss-header';

    const title = document.createElement('h2');
    title.className = 'ss-title';
    title.textContent = 'Sound Settings';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ss-close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // Sliders
    const volumes = this.audioManager.getVolumes();
    this.addSlider('master', 'Master Volume', volumes.master);
    this.addSlider('effects', 'Effects', volumes.effects);
    this.addSlider('footsteps', 'Footsteps', volumes.footsteps);

    // Mute toggle
    const muteRow = document.createElement('div');
    muteRow.className = 'ss-mute-row';

    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'ss-mute-btn';
    this.updateMuteButton();
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    muteRow.appendChild(this.muteBtn);

    this.panel.appendChild(muteRow);
  }

  private addSlider(category: keyof VolumeSettings, label: string, value: number): void {
    const row = document.createElement('div');
    row.className = 'ss-slider-row';

    const lbl = document.createElement('label');
    lbl.className = 'ss-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'ss-slider-wrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'ss-slider';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(value * 100));
    sliderWrap.appendChild(slider);

    const valLabel = document.createElement('span');
    valLabel.className = 'ss-value';
    valLabel.textContent = String(Math.round(value * 100));
    sliderWrap.appendChild(valLabel);

    row.appendChild(sliderWrap);
    this.panel.appendChild(row);

    this.sliders[category] = slider;
    this.valueLabels[category] = valLabel;

    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10) / 100;
      this.audioManager.setVolume(category, v);
      valLabel.textContent = slider.value;
      // If user adjusts a slider while muted, unmute
      if (this.mutedVolumes) {
        this.mutedVolumes = null;
        this.updateMuteButton();
      }
    });
  }

  private toggleMute(): void {
    if (this.mutedVolumes) {
      // Unmute: restore previous volumes
      const prev = this.mutedVolumes;
      this.mutedVolumes = null;
      for (const cat of ['master', 'effects', 'footsteps'] as (keyof VolumeSettings)[]) {
        this.audioManager.setVolume(cat, prev[cat]);
        this.sliders[cat].value = String(Math.round(prev[cat] * 100));
        this.valueLabels[cat].textContent = String(Math.round(prev[cat] * 100));
      }
    } else {
      // Mute: save current volumes, set all to 0
      this.mutedVolumes = this.audioManager.getVolumes();
      for (const cat of ['master', 'effects', 'footsteps'] as (keyof VolumeSettings)[]) {
        this.audioManager.setVolume(cat, 0);
        this.sliders[cat].value = '0';
        this.valueLabels[cat].textContent = '0';
      }
    }
    this.updateMuteButton();
    this.saveMuteState();
  }

  private updateMuteButton(): void {
    if (this.mutedVolumes) {
      this.muteBtn.textContent = 'Unmute All';
      this.muteBtn.classList.add('ss-muted');
    } else {
      this.muteBtn.textContent = 'Mute All';
      this.muteBtn.classList.remove('ss-muted');
    }
  }

  private saveMuteState(): void {
    try {
      if (this.mutedVolumes) {
        localStorage.setItem('browserstrike_muted', JSON.stringify(this.mutedVolumes));
      } else {
        localStorage.removeItem('browserstrike_muted');
      }
    } catch { /* ignore */ }
  }

  private loadMuteState(): void {
    try {
      const saved = localStorage.getItem('browserstrike_muted');
      if (saved) {
        this.mutedVolumes = JSON.parse(saved);
        this.updateMuteButton();
      }
    } catch { /* ignore */ }
  }

  show(): void {
    // Refresh slider values from current AudioManager state
    const volumes = this.audioManager.getVolumes();
    this.loadMuteState();
    if (!this.mutedVolumes) {
      for (const cat of ['master', 'effects', 'footsteps'] as (keyof VolumeSettings)[]) {
        this.sliders[cat].value = String(Math.round(volumes[cat] * 100));
        this.valueLabels[cat].textContent = String(Math.round(volumes[cat] * 100));
      }
    }
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
