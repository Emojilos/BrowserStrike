import { PLAYER_SPEED } from '@browserstrike/shared';
import { SceneManager } from './engine/SceneManager';
import { buildWarehouseMap } from './engine/MapBuilder';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const sceneManager = new SceneManager(canvas);
buildWarehouseMap(sceneManager.scene);

function animate() {
  requestAnimationFrame(animate);
  sceneManager.render();
}

animate();

console.log('BrowserStrike client loaded | Player speed:', PLAYER_SPEED);
