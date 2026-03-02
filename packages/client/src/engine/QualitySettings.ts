import * as THREE from 'three';

export type QualityLevel = 'very_low' | 'low' | 'medium' | 'high';

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const QUALITY_ORDER: QualityLevel[] = ['very_low', 'low', 'medium', 'high'];

interface QualityConfig {
  pixelRatio: number;
  fogNear: number;
  fogFar: number;
  maxDecals: number;
  maxTracers: number;
  antialias: boolean;
}

const QUALITY_CONFIGS: Record<QualityLevel, QualityConfig> = {
  very_low: {
    pixelRatio: 0.5,
    fogNear: 15,
    fogFar: 30,
    maxDecals: 8,
    maxTracers: 4,
    antialias: false,
  },
  low: {
    pixelRatio: 1,
    fogNear: 20,
    fogFar: 40,
    maxDecals: 16,
    maxTracers: 8,
    antialias: false,
  },
  medium: {
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    fogNear: 30,
    fogFar: 60,
    maxDecals: 32,
    maxTracers: 16,
    antialias: true,
  },
  high: {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    fogNear: 30,
    fogFar: 60,
    maxDecals: 64,
    maxTracers: 32,
    antialias: true,
  },
};

const STORAGE_KEY = 'browserstrike_quality';

export class QualitySettings {
  private level: QualityLevel;

  constructor() {
    this.level = (localStorage.getItem(STORAGE_KEY) as QualityLevel) || 'high';
    if (!QUALITY_CONFIGS[this.level]) this.level = 'high';
  }

  getLevel(): QualityLevel {
    return this.level;
  }

  getConfig(): QualityConfig {
    return QUALITY_CONFIGS[this.level];
  }

  setLevel(level: QualityLevel): void {
    this.level = level;
    localStorage.setItem(STORAGE_KEY, level);
  }

  applyToRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const config = this.getConfig();
    renderer.setPixelRatio(config.pixelRatio);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = config.fogNear;
      scene.fog.far = config.fogFar;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getMaxDecals(): number {
    return this.getConfig().maxDecals;
  }

  getMaxTracers(): number {
    return this.getConfig().maxTracers;
  }
}
