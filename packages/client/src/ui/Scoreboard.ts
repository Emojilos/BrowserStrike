/**
 * Scoreboard UI — shown while Tab is held.
 * Two team columns with player rows: nickname, kills, deaths.
 * Updates from Colyseus state in real-time.
 */

export interface ScoreboardPlayer {
  nickname: string;
  kills: number;
  deaths: number;
  isLocal: boolean;
  isAlive: boolean;
}

export interface ScoreboardState {
  teamA: ScoreboardPlayer[];
  teamB: ScoreboardPlayer[];
  scoreA: number;
  scoreB: number;
}

export class Scoreboard {
  private container: HTMLElement;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'scoreboard-overlay';
    this.container.style.display = 'none';
    parent.appendChild(this.container);
  }

  setVisible(show: boolean): void {
    if (show === this.visible) return;
    this.visible = show;
    this.container.style.display = show ? '' : 'none';
  }

  isShown(): boolean {
    return this.visible;
  }

  update(state: ScoreboardState): void {
    if (!this.visible) return;

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const renderRows = (players: ScoreboardPlayer[]) =>
      players.map(p => {
        const localClass = p.isLocal ? ' sb-local' : '';
        const deadClass = p.isAlive ? '' : ' sb-dead';
        return `<tr class="sb-row${localClass}${deadClass}">
          <td class="sb-name">${esc(p.nickname)}</td>
          <td class="sb-stat">${p.kills}</td>
          <td class="sb-stat">${p.deaths}</td>
        </tr>`;
      }).join('');

    this.container.innerHTML = `
      <div class="scoreboard-panel">
        <div class="sb-header">
          <span class="sb-score sb-score-a">${state.scoreA}</span>
          <span class="sb-title">SCOREBOARD</span>
          <span class="sb-score sb-score-b">${state.scoreB}</span>
        </div>
        <div class="sb-teams">
          <div class="sb-team sb-team-a">
            <div class="sb-team-header sb-team-header-a">TEAM A</div>
            <table class="sb-table">
              <thead><tr><th class="sb-th-name">Player</th><th class="sb-th-stat">K</th><th class="sb-th-stat">D</th></tr></thead>
              <tbody>${renderRows(state.teamA)}</tbody>
            </table>
          </div>
          <div class="sb-team sb-team-b">
            <div class="sb-team-header sb-team-header-b">TEAM B</div>
            <table class="sb-table">
              <thead><tr><th class="sb-th-name">Player</th><th class="sb-th-stat">K</th><th class="sb-th-stat">D</th></tr></thead>
              <tbody>${renderRows(state.teamB)}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  dispose(): void {
    this.container.remove();
  }
}
