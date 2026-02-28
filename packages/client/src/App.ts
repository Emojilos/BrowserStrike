import { SceneManager } from './engine/SceneManager';
import { buildWarehouseMap } from './engine/MapBuilder';
import { FPSController } from './engine/FPSController';
import { WeaponModel } from './engine/WeaponModel';
import { RemotePlayerManager } from './engine/RemotePlayerManager';
import { NetworkManager } from './network/NetworkManager';
import { MenuScreen } from './ui/MenuScreen';
import type { InputMessage } from '@browserstrike/shared';

export enum AppState {
  MENU = 'menu',
  LOBBY = 'lobby',
  PLAYING = 'playing',
  MATCH_END = 'match_end',
}

/** Screen div IDs matching AppState values */
const SCREEN_IDS: Record<AppState, string> = {
  [AppState.MENU]: 'menu-screen',
  [AppState.LOBBY]: 'lobby-screen',
  [AppState.PLAYING]: 'playing-screen',
  [AppState.MATCH_END]: 'match-end-screen',
};

export class App {
  private state: AppState = AppState.MENU;
  private animationFrameId = 0;
  private lastTime = 0;
  private inputSeq = 0;

  // Engine systems — lazily created when entering PLAYING
  private sceneManager: SceneManager | null = null;
  private fpsController: FPSController | null = null;
  private weaponModel: WeaponModel | null = null;
  private remotePlayers: RemotePlayerManager | null = null;

  // Network — always available
  readonly network: NetworkManager;

  // UI screens
  private menuScreen: MenuScreen | null = null;

  // DOM references
  private readonly canvas: HTMLCanvasElement;
  private readonly uiRoot: HTMLElement;
  private readonly screens: Map<AppState, HTMLElement> = new Map();

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.uiRoot = document.getElementById('ui-root') as HTMLElement;
    this.network = new NetworkManager();

    this.createScreens();
    this.showScreen(AppState.MENU);

    // Hide canvas until playing
    this.canvas.style.display = 'none';

    // Initialize menu screen UI
    this.initMenuScreen();

    console.log('BrowserStrike loaded — app in MENU state');
  }

  private createScreens(): void {
    for (const appState of Object.values(AppState)) {
      const id = SCREEN_IDS[appState];
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        this.uiRoot.appendChild(el);
      }
      el.style.display = 'none';
      this.screens.set(appState, el);
    }
  }

  private initMenuScreen(): void {
    const menuEl = this.screens.get(AppState.MENU);
    if (!menuEl) return;

    this.menuScreen = new MenuScreen(menuEl);
    this.menuScreen.setCallbacks({
      onCreateRoom: async (nickname: string) => {
        const code = await this.network.createRoom(nickname);
        console.log(`Room created with code: ${code}`);
        this.setState(AppState.LOBBY);
      },
      onJoinRoom: async (roomCode: string, nickname: string) => {
        await this.network.joinByCode(roomCode, nickname);
        console.log(`Joined room: ${roomCode}`);
        this.setState(AppState.LOBBY);
      },
    });
  }

  /** Transition to a new app state. */
  setState(newState: AppState | `${AppState}`): void {
    const target = newState as AppState;
    if (target === this.state) return;

    const prev = this.state;
    this.leaveState(prev);
    this.state = target;
    this.enterState(target);

    console.log(`App state: ${prev} → ${target}`);
  }

  getState(): AppState {
    return this.state;
  }

  private showScreen(state: AppState): void {
    for (const [s, el] of this.screens) {
      el.style.display = s === state ? '' : 'none';
    }
  }

  private leaveState(state: AppState): void {
    if (state === AppState.PLAYING) {
      this.stopGameLoop();
    }
  }

  private enterState(state: AppState): void {
    this.showScreen(state);

    if (state === AppState.PLAYING) {
      this.canvas.style.display = 'block';
      this.startGameLoop();
    } else {
      this.canvas.style.display = 'none';
    }

    if (state === AppState.MENU) {
      this.menuScreen?.reset();
    }
  }

  // ── Game loop ──────────────────────────────────────────

  private startGameLoop(): void {
    this.sceneManager = new SceneManager(this.canvas);
    const collisionWorld = buildWarehouseMap(this.sceneManager.scene);

    this.fpsController = new FPSController(this.sceneManager.camera, this.canvas);
    this.fpsController.setCollisionWorld(collisionWorld);

    this.weaponModel = new WeaponModel(window.innerWidth / window.innerHeight);

    // Remote players — spawn/despawn capsules from Colyseus state
    this.remotePlayers = new RemotePlayerManager(
      this.sceneManager.scene,
      this.network.sessionId,
    );
    this.setupNetworkListeners();

    this.inputSeq = 0;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private stopGameLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    if (this.remotePlayers) {
      this.remotePlayers.dispose();
      this.remotePlayers = null;
    }
    if (this.fpsController) {
      this.fpsController.dispose();
      this.fpsController = null;
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
    this.weaponModel = null;
  }

  /** Wire up Colyseus state listeners for remote player add/remove/update. */
  private setupNetworkListeners(): void {
    if (!this.network.connected) return;

    this.network.listen({
      onPlayerAdd: (sessionId, player) => {
        const p = player as { team?: string; x?: number; y?: number; z?: number; yaw?: number };
        this.remotePlayers?.addPlayer(sessionId, p.team ?? 'unassigned');
        // Set initial position
        if (p.x !== undefined) {
          this.remotePlayers?.updatePlayer(
            sessionId,
            p.x,
            p.y ?? 0,
            p.z ?? 0,
            p.yaw ?? 0,
            p.team ?? 'unassigned',
          );
        }
      },
      onPlayerRemove: (sessionId) => {
        this.remotePlayers?.removePlayer(sessionId);
      },
      onStateChange: () => {
        this.syncRemotePlayers();
      },
    });
  }

  /** Read all players from Colyseus state and update remote capsule transforms. */
  private syncRemotePlayers(): void {
    if (!this.remotePlayers || !this.network.connected) return;

    const room = this.network.currentRoom;
    if (!room) return;

    const state = room.state as { players?: Map<string, PlayerData> };
    if (!state.players) return;

    state.players.forEach((p: PlayerData, sessionId: string) => {
      // Ensure the remote player mesh exists
      if (sessionId !== this.network.sessionId) {
        this.remotePlayers!.addPlayer(sessionId, p.team ?? 'unassigned');
        this.remotePlayers!.updatePlayer(
          sessionId,
          p.x,
          p.y,
          p.z,
          p.yaw,
          p.team ?? 'unassigned',
        );
      }
    });
  }

  /** Send the current input state to the server. */
  private sendInput(dt: number): void {
    if (!this.network.connected) return;

    const fps = this.fpsController!;
    if (!fps.pointerLock.locked) return;

    this.inputSeq++;

    const msg: InputMessage = {
      seq: this.inputSeq,
      keys: { ...fps.input.keys },
      yaw: fps.yaw,
      pitch: fps.pitch,
      deltaTime: dt,
    };

    this.network.send('input', msg);
  }

  private animate = (now: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const fps = this.fpsController!;
    const weapon = this.weaponModel!;
    const scene = this.sceneManager!;

    if (fps.pointerLock.locked) {
      weapon.tryFire(fps.input.mouseDown, now);
    }

    fps.update(dt);
    weapon.update(dt);

    // Send input to server after local prediction
    this.sendInput(dt);

    scene.render();
    scene.renderOverlay(weapon.scene, weapon.camera);
  };
}

/** Minimal shape for PlayerSchema fields accessed on the client. */
interface PlayerData {
  x: number;
  y: number;
  z: number;
  yaw: number;
  team?: string;
}
