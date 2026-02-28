import { Team, SCORE_LIMIT_DEFAULT } from '@teeny-tanks/shared';

const KILL_FEED_MAX = 5;
const KILL_FEED_DURATION = 4000;
const ANNOUNCEMENT_DURATION = 2500;

/**
 * Manages the DOM-based HUD overlay for crisp, styled text rendering.
 * All HUD elements live in the #game-hud div defined in index.html.
 */
export class HudManager {
  private hudEl: HTMLElement;
  private scoreRedEl: HTMLElement;
  private scoreBlueEl: HTMLElement;
  private killFeedEl: HTMLElement;
  private respawnEl: HTMLElement;
  private gameOverEl: HTMLElement;
  private lastScores = { red: 0, blue: 0 };
  private scoreLimit: number = SCORE_LIMIT_DEFAULT;

  constructor() {
    this.hudEl = document.getElementById('game-hud')!;
    this.scoreRedEl = document.getElementById('hud-score-red')!;
    this.scoreBlueEl = document.getElementById('hud-score-blue')!;
    this.killFeedEl = document.getElementById('hud-kill-feed')!;
    this.respawnEl = document.getElementById('hud-respawn')!;
    this.gameOverEl = document.getElementById('game-over-overlay')!;

    // "Return to Lobby" reloads the page — simplest way to reset all state
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  show(): void {
    this.hudEl.classList.add('active');
  }

  hide(): void {
    this.hudEl.classList.remove('active');
  }

  /**
   * Set the score limit for display in the HUD. Called once when transitioning
   * from lobby to game, using the value the host configured.
   */
  setScoreLimit(limit: number): void {
    this.scoreLimit = limit;
  }

  updateScores(scores: Record<Team, number>): void {
    this.scoreRedEl.textContent = `${scores.red} / ${this.scoreLimit}`;
    this.scoreBlueEl.textContent = `${scores.blue} / ${this.scoreLimit}`;
    this.lastScores = { ...scores };
  }

  /**
   * Show a kill in the kill feed. Slides in from the right, fades out after a delay.
   */
  addKillEntry(killerTeam: Team, victimTeam: Team, killerName: string, victimName: string): void {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `<span class="killer ${killerTeam}">${killerName}</span> eliminated <span class="victim ${victimTeam}">${victimName}</span>`;

    this.killFeedEl.prepend(entry);

    // Limit the feed length
    while (this.killFeedEl.children.length > KILL_FEED_MAX) {
      this.killFeedEl.lastElementChild?.remove();
    }

    // Auto-remove after duration
    setTimeout(() => {
      entry.classList.add('fading');
      setTimeout(() => entry.remove(), 400);
    }, KILL_FEED_DURATION);
  }

  /**
   * Show a centered announcement (e.g., flag captured).
   */
  showAnnouncement(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'hud-announcement';
    el.textContent = text;
    el.style.color = color;
    // Flat paper-cutout drop shadow only — no glow
    el.style.textShadow = '1px 1px 0 rgba(0,0,0,0.15)';
    this.hudEl.appendChild(el);

    setTimeout(() => {
      el.classList.add('fading');
      setTimeout(() => el.remove(), 400);
    }, ANNOUNCEMENT_DURATION);
  }

  /**
   * Show/hide the respawn overlay when the local player is dead.
   */
  setRespawnVisible(visible: boolean): void {
    if (visible) {
      this.respawnEl.classList.add('visible');
    } else {
      this.respawnEl.classList.remove('visible');
    }
  }

  /**
   * Show the game-over victory overlay when a team reaches the score limit.
   */
  showGameOver(winner: Team, scores: { red: number; blue: number }): void {
    const titleEl = document.getElementById('game-over-title')!;
    const scoreEl = document.getElementById('game-over-score')!;

    titleEl.textContent = winner === 'red' ? 'Red Team Wins!' : 'Blue Team Wins!';
    titleEl.className = `game-over-title ${winner}`;
    scoreEl.textContent = `${scores.red} — ${scores.blue}`;

    this.gameOverEl.classList.remove('hidden');
  }
}
