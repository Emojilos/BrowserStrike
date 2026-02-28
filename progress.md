# BrowserStrike — Progress Log

## Формат записи
```
### [ДАТА] — TASK-XXX: [Описание]
**Статус:** done / in-progress / blocked
**Автор:** [agent/human]
**Изменения:**
- что было сделано
**Заметки:**
- важные решения, проблемы
```

---

## Лог

### 2026-02-27 — TASK-001: Инициализация монорепо
**Статус:** done
**Автор:** agent
**Изменения:**
- Корневой package.json с npm workspaces (shared, server, client)
- tsconfig.base.json (strict, ES2020, bundler moduleResolution)
- .gitignore (node_modules, dist, .env)
- packages/shared: package.json, tsconfig.json (composite: true), src/index.ts
- packages/client: package.json (three.js, vite), tsconfig.json, vite.config.ts, index.html, src/main.ts
- packages/server: package.json (colyseus, tsx), tsconfig.json, src/index.ts
**Заметки:**
- Пришлось добавить composite: true в shared/tsconfig.json для project references
- Vite alias для @browserstrike/shared → ../shared/src (чтобы HMR работал с source, а не dist)

### 2026-02-27 — TASK-002: Shared константы и типы
**Статус:** done
**Автор:** agent
**Изменения:**
- constants/game.ts: TICK_RATE, PLAYER_SPEED, GRAVITY, HP, таймеры, размеры хитбоксов
- constants/weapons.ts: полный конфиг 3 оружий (deagle, ssg08, mp9) — значения из PRD
- constants/maps.ts: конфиг 4 карт с spawn points
- types/game.ts: GameStatus, Team, GameMode, Vec3, Rotation, MapConfig, RoomSettings
- types/weapons.ts: WeaponId, WeaponConfig
- types/player.ts: PlayerState, KeyState
- types/network.ts: все message types (client→server, server→client)
- types/room.ts: RoomState
- index.ts: barrel export всех констант и типов
**Заметки:**
- Убрали rootDir из client/server tsconfig чтобы paths + include ../shared/src работали без конфликтов
- Проверено: значения оружия точно соответствуют PRD (Deagle 35/70/7, SSG 75/150/10, MP9 20/40/30)

### 2026-02-28 — TASK-003: Настройка клиента (Vite + Three.js)
**Статус:** done
**Автор:** agent
**Изменения:**
- Уже был реализован в рамках TASK-001, просто верифицирован и отмечен done
- vite.config.ts, index.html (canvas#game + div#ui-root), main.ts с Three.js сценой
- tsc --noEmit и vite build проходят без ошибок
**Заметки:**
- Был реализован как часть TASK-001, отдельная работа не потребовалась

### 2026-02-28 — TASK-004: Настройка сервера (Colyseus)
**Статус:** done
**Автор:** agent
**Изменения:**
- Улучшен packages/server/src/index.ts: добавлен http.createServer с JSON health endpoint
- HTTP endpoint возвращает { status: "ok", name: "BrowserStrike", port: 2567 }
- CORS заголовок для кросс-доменных запросов с клиентского dev-сервера
- Добавлен colyseus.js ^0.15.0 в dependencies клиента для будущего сетевого взаимодействия
**Заметки:**
- WebSocketTransport принимает http.Server через опцию `server` — transport.listen() вызывает httpServer.listen()
- Colyseus 0.15.57 установлен, GameRoom зарегистрирован и работает
- Все 4 test step пройдены: сервер стартует, HTTP отвечает, логи корректны

### 2026-02-28 — TASK-005 → TASK-013: Завершение Этапа 1
**Статус:** done
**Автор:** agent
**Изменения:**
- TASK-005: 3D сцена, Warehouse из примитивов (b0c2c06)
- TASK-006: FPS-контроллер WASD + мышь + Pointer Lock (b8faab3)
- TASK-007: Физика — гравитация, прыжок, AABB коллизии (0c840ec)
- TASK-008: Модель Deagle с анимацией отдачи (4ede179)
- TASK-009: CJS-совместимость shared для сервера (18ee8d9)
- TASK-010: applyMovement() чистая функция (18ee8d9)
- TASK-011: Shared типы сообщений (8428b38)
- TASK-012: State Schema — GameState, PlayerSchema и др. (8428b38)
- TASK-013: Система комнат — код, никнеймы, команды (f670c16)

---

## Этап 2: Мультиплеер — В РАБОТЕ

_Записи добавляются агентами по мере выполнения задач._
