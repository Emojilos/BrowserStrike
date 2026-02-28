import { WEAPONS, WEAPON_IDS, DEFAULT_WEAPON } from '@browserstrike/shared';
import type { WeaponId, WeaponConfig } from '@browserstrike/shared';

export interface WeaponSelectCallbacks {
  onSelect: (weapon: WeaponId) => void;
}

export class WeaponSelectScreen {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private timerEl: HTMLElement | null = null;
  private cards: Map<WeaponId, HTMLElement> = new Map();
  private selectedWeapon: WeaponId = DEFAULT_WEAPON;
  private callbacks: WeaponSelectCallbacks | null = null;
  private visible = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.overlay = document.createElement('div');
    this.overlay.className = 'weapon-select-overlay';
    this.overlay.style.display = 'none';
    this.build();
    this.container.appendChild(this.overlay);
  }

  setCallbacks(cb: WeaponSelectCallbacks): void {
    this.callbacks = cb;
  }

  private build(): void {
    const title = document.createElement('div');
    title.className = 'ws-title';
    title.textContent = 'CHOOSE YOUR WEAPON';
    this.overlay.appendChild(title);

    this.timerEl = document.createElement('div');
    this.timerEl.className = 'ws-timer';
    this.timerEl.textContent = '5';
    this.overlay.appendChild(this.timerEl);

    const cardsRow = document.createElement('div');
    cardsRow.className = 'ws-cards';
    this.overlay.appendChild(cardsRow);

    for (const weaponId of WEAPON_IDS) {
      const config = WEAPONS[weaponId];
      const card = this.buildCard(weaponId, config);
      cardsRow.appendChild(card);
      this.cards.set(weaponId, card);
    }

    this.highlightCard(this.selectedWeapon);
  }

  private buildCard(id: WeaponId, cfg: WeaponConfig): HTMLElement {
    const card = document.createElement('div');
    card.className = 'ws-card';
    card.dataset.weapon = id;

    const name = document.createElement('div');
    name.className = 'ws-card-name';
    name.textContent = cfg.name;

    const type = document.createElement('div');
    type.className = 'ws-card-type';
    type.textContent = cfg.type.toUpperCase();

    const stats = document.createElement('div');
    stats.className = 'ws-card-stats';

    const fireRateDisplay = cfg.automatic
      ? `${Math.round(1000 / cfg.fireRate)} rps`
      : `${(1000 / cfg.fireRate).toFixed(1)} rps`;

    stats.innerHTML = [
      this.statRow('DMG', `${cfg.damage.body} / ${cfg.damage.head}`),
      this.statRow('RATE', fireRateDisplay),
      this.statRow('MAG', `${cfg.magazine}`),
      this.statRow('RELOAD', `${(cfg.reloadTime / 1000).toFixed(1)}s`),
      this.statRow('RANGE', `${cfg.range}m`),
    ].join('');

    if (cfg.automatic) {
      const autoTag = document.createElement('div');
      autoTag.className = 'ws-card-auto';
      autoTag.textContent = 'AUTO';
      card.appendChild(autoTag);
    }

    card.appendChild(name);
    card.appendChild(type);
    card.appendChild(stats);

    card.addEventListener('click', () => {
      this.selectWeapon(id);
    });

    return card;
  }

  private statRow(label: string, value: string): string {
    return `<div class="ws-stat"><span class="ws-stat-label">${label}</span><span class="ws-stat-value">${value}</span></div>`;
  }

  private highlightCard(weaponId: WeaponId): void {
    this.cards.forEach((card, id) => {
      card.classList.toggle('ws-card-selected', id === weaponId);
    });
  }

  private selectWeapon(weaponId: WeaponId): void {
    this.selectedWeapon = weaponId;
    this.highlightCard(weaponId);
    this.callbacks?.onSelect(weaponId);
  }

  show(): void {
    this.visible = true;
    this.selectedWeapon = DEFAULT_WEAPON;
    this.highlightCard(DEFAULT_WEAPON);
    this.overlay.style.display = '';
  }

  hide(): void {
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  getSelectedWeapon(): WeaponId {
    return this.selectedWeapon;
  }

  updateTimer(seconds: number): void {
    if (this.timerEl) {
      this.timerEl.textContent = `${Math.ceil(seconds)}`;
    }
  }

  dispose(): void {
    this.overlay.remove();
    this.cards.clear();
    this.timerEl = null;
  }
}
