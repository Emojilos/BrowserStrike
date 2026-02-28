# PRD: BrowserStrike — Браузерный FPS-шутер в стиле CS2

**Версия:** 1.2
**Дата:** 28 февраля 2026
**Автор:** PRD Creation Assistant
**Статус:** В разработке

---

## 1. Обзор продукта

### 1.1 Описание
BrowserStrike — браузерный мультиплеерный FPS-шутер в стиле Counter-Strike 2, ориентированный на быстрые дуэли 1v1 и 2v2. Игра использует упрощённую low-poly 3D-графику с реалистичной цветовой палитрой, оптимизированную для слабых ПК. Подключение к матчам происходит по коду комнаты, без регистрации — только никнейм.

### 1.2 Проблема
Существующие браузерные шутеры (Krunker.io, Shell Shockers) ориентированы на казуальный геймплей и большие лобби. Нет качественного браузерного аналога для тактических дуэлей в стиле CS2 с раундовой системой и выбором оружия.

### 1.3 Цели продукта
- Доступный через браузер тактический шутер без установки
- Минимальный порог входа: никнейм → код комнаты → играй
- Стабильный сетевой FPS на слабых ПК (целевой минимум: 30 FPS на интегрированной графике)
- Тактический геймплей с раундовой системой и выбором оружия

### 1.4 Целевая аудитория
- Казуальные геймеры, которые хотят быстро поиграть с друзьями без установки
- Фанаты CS2, которые хотят поиграть на рабочем/слабом ПК
- Игроки, предпочитающие короткие сессии (дуэли 1v1, 2v2)

---

## 2. Основные функции и функциональность

### 2.1 Система лобби и комнат

**Описание:** Игрок может создать или присоединиться к комнате по коду.

**Пользовательский флоу:**
1. Игрок заходит на сайт → вводит никнейм
2. Выбирает "Создать комнату" или "Присоединиться"
3. **Создатель (админ)** настраивает:
   - Режим: 1v1 или 2v2
   - Карту (одна из 3–4 доступных)
   - Количество раундов до победы (например: 5, 7, 10, 13)
4. Система генерирует уникальный код комнаты (6 символов)
5. Админ делится кодом с друзьями
6. Присоединившиеся игроки попадают в лобби комнаты
7. Игроки выбирают команду (Team A / Team B)
8. Админ нажимает "Начать игру", когда команды укомплектованы (1v1: по 1 игроку; 2v2: по 2)

**Acceptance Criteria:**
- Код комнаты: 6 символов, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (без 0/O/1/I для избежания путаницы)
- Код exposed как metadata через `setMetadata()` для client discovery через `getAvailableRooms()`
- Никнейм: 3–16 символов, regex `/^[A-Za-z0-9_]+$/`, валидация на сервере через `ServerError(400)`
- Первый подключившийся — админ (`adminId = sessionId`)
- При подключении: `PlayerSchema` с `team='unassigned'`, переключение через `joinTeam` message
- Админ не может начать игру, пока команды не укомплектованы
- Если игрок отключается в лобби, его слот освобождается
- Максимум 4 игрока в комнате

### 2.2 Движение и управление

**Описание:** Классическое FPS-управление от первого лица.

**Управление:**
| Действие | Клавиша |
|---|---|
| Движение вперёд/назад/влево/вправо | W / S / A / D |
| Прыжок | Space |
| Прицеливание | Мышь (Pointer Lock API) |
| Стрельба | ЛКМ (левая кнопка мыши) |
| Перезарядка | R |
| Выбор оружия | 1 / 2 / 3 или колёсико мыши |
| Scoreboard | Tab (зажать) |

**Физика движения (реализованные параметры):**
- `PLAYER_SPEED = 250` units/sec
- `GRAVITY = -20`
- `JUMP_VELOCITY = 8` (фиксированная высота, без bunny-hop)
- `PLAYER_RADIUS = 0.3`, `PLAYER_HEIGHT = 1.8` (collision capsule approximated as AABB)
- `EYE_HEIGHT = 1.65m` (позиция камеры)
- Mouse sensitivity: `0.002`, Euler order `YXZ`
- Pitch ограничен: -89° до +89°
- `applyMovement()` — чистая функция в `packages/shared/src/physics/movement.ts`. Возвращает новое состояние, не мутирует вход. Используется и клиентом, и сервером
- `CollisionWorld.resolve()` — до 4 итераций для обработки corner sliding
- Диагональное движение нормализовано (W+A не быстрее W)

**Acceptance Criteria:**
- Pointer Lock активируется по клику на canvas, Esc — выход
- Движение плавное на 60 FPS
- Игрок не проходит сквозь стены и объекты

### 2.3 Система оружия

**Описание:** 3 вида оружия с уникальными характеристиками. Выбор оружия происходит перед каждым раундом.

**Арсенал (значения из `shared/constants/weapons.ts`):**

| Оружие | Тип | Урон (тело) | Урон (голова) | Скорострельность | Магазин | Перезарядка | Дальность |
|---|---|---|---|---|---|---|---|
| Desert Eagle | Пистолет | 35 | 70 | Полуавтомат (~2 выстр/сек, 500ms) | 7 | 2 сек | Средняя |
| SSG-08 | Снайперская | 75 | 150 (мгновенное убийство) | Bolt-action (~1 выстр/1.5 сек) | 10 | 2.5 сек | Дальняя |
| MP9 | Пистолет-пулемёт | 20 | 40 | Автомат (~10 выстр/сек, 100ms) | 30 | 2.5 сек | Ближняя-средняя |

**Механики:**
- Разброс (spread): увеличивается при стрельбе очередями (MP9) и при движении, уменьшается при стоянии
- Отдача (recoil): визуальная отдача модели оружия
  - Deagle реализация: 120ms duration, sin-based kick curve, up=0.04 / back=0.06 / rotation=0.15 rad
- Перезарядка: автоматическая при пустом магазине, ручная по R
- Перезарядка прерывается при смене оружия
- Хэдшоты: множитель x2 к базовому урону
- Режим стрельбы: Deagle и SSG-08 — полуавтомат (один клик = один выстрел); MP9 — автомат (зажатие ЛКМ = непрерывная стрельба)

**Выбор оружия перед раундом:**
- 5-секундное окно выбора
- Интерфейс: 3 карточки с характеристиками
- По умолчанию выбран Desert Eagle
- Если время вышло — применяется текущий выбор

**Acceptance Criteria:**
- Каждое оружие имеет уникальную модель, звук и анимацию
- Урон рассчитывается на сервере (авторитарная модель)
- Хэдшот регистрируется при попадании в хитбокс головы (отдельный от тела)

### 2.4 Система раундов

**Описание:** Матч состоит из серии раундов.

**Правила:**
- **1v1:** Раунд заканчивается при смерти одного из игроков
- **2v2:** Раунд заканчивается при смерти **обоих** игроков одной команды (один мёртвый — раунд продолжается)
- Победа в матче: команда первой набирает N раундов (настраивается админом: 5, 7, 10, 13)
- Таймаут раунда: 120 сек по умолчанию. Если время вышло — ничья (никто не получает очко)

**Флоу раунда (state machine):**
1. `round_end` → Пауза 3 сек (отображение результатов)
2. `weapon_select` → Выбор оружия 5 сек
3. Спавн игроков на фиксированных spawn points с HP=100
4. `countdown` → Обратный отсчёт 3–2–1
5. `playing` → Раунд начинается
6. Смерть всех игроков одной команды → переход к шагу 1
7. При достижении `roundsToWin` → `match_end`

**Acceptance Criteria:**
- Мёртвый игрок в 2v2 наблюдает за живым тиммейтом (spectator camera)
- Все игроки респавнятся с HP=100 между раундами
- При достижении победного счёта — экран результатов матча

### 2.5 Карты

**Описание:** 3–4 асимметричные карты в стиле локаций CS2, среднего размера с коридорами и позициями.

**Концепция карт:**

| Карта | Стилистика | Описание |
|---|---|---|
| Warehouse | Склад / промзона | Тёмный склад с ящиками, вилочными погрузчиками, узкие проходы между стеллажами |
| Dust Alley | Пустынный городок | Песочные стены, арки, узкие переулки и одна открытая площадь |
| Office | Офисное здание | Коридоры, комнаты, лестницы между этажами (2 этажа) |
| Trainyard | Ж/д станция (опциональная) | Вагоны, платформы, открытые и закрытые зоны |

**Структура карт:**
- Размер: ~40x40 метров
- Асимметричные: у каждой стороны своя уникальная зона спавна
- 2–3 ключевых маршрута между зонами спавна
- Укрытия, углы, позиции для тактической игры
- Разная высота (ящики, лестницы, балконы)
- Spawn points без прямой видимости друг на друга

**Технические требования:**
- Low-poly геометрия (< 10,000 полигонов на карту)
- Текстуры: маленькие (256x256 – 512x512), тайловые
- Формат: GLTF/GLB
- Коллизии: упрощённая AABB геометрия
- Загрузка < 5 секунд на среднем соединении
- FPS >= 30 на интегрированной графике

**Текущая прототип-карта (Warehouse):**
- Построена из примитивов Three.js (BoxGeometry, PlaneGeometry)
- Пол, 4 стены, 5-8 ящиков разного размера
- Реалистичная палитра: серый бетон, коричневое дерево
- Сцена: PCFSoftShadowMap, fog (30-60 range), directional light shadow camera covers 25 units

### 2.6 HUD (интерфейс в игре)

**Элементы:**
- **Прицел (crosshair):** настраиваемый крестик (цвет, размер, толщина, gap, точка, контур). Дефолт: зелёный
- **HP:** полоска или число (100/100) — внизу по центру
- **Оружие:** название + патроны (текущие / магазин) — внизу справа
- **Счёт раундов:** Team A : Team B — сверху по центру
- **Таймер раунда:** обратный отсчёт — сверху по центру
- **Countdown:** 3-2-1 крупно по центру экрана перед раундом
- **Килфид (kill feed):** лента убийств — справа сверху, последние 5 событий, fade-out через 5 сек
- **Scoreboard (Tab):** таблица с никнеймами, K/D, пингом — по центру при зажатом Tab
- **Индикатор урона:** красная виньетка с направлением, интенсивность зависит от урона
- **Hitmarker:** крестик по центру при попадании (белый — тело, красный — хэдшот)
- **Spectator label:** "Наблюдение: [nickname]" при режиме спектатора

**Техническая реализация:**
- HTML/CSS overlay поверх canvas (`<div id='ui-root'>`)
- `pointer-events: none` на элементах HUD
- Настройки прицела сохраняются в localStorage
- Все данные берутся из Colyseus state sync

### 2.7 Звуковая система

**Звуки:**
- Выстрелы: уникальный звук для каждого оружия (Deagle, SSG-08, MP9)
- Шаги: звук при ходьбе (чередование 2-3 вариантов), тишина при стоянии
- Попадание (hit), хэдшот (dink), смерть
- Перезарядка: уникальный звук для каждого оружия
- UI: клик по кнопкам, начало/конец раунда
- Шаги и выстрелы противников: пространственные (3D audio)

**Технические требования:**
- Web Audio API + PannerNode для пространственного звука
- AudioListener привязан к позиции/ротации камеры
- Свои звуки: 2D (без пространственности)
- Звуки противников: 3D с rolloff по расстоянию
- Форматы: OGG/MP3
- Настройки: Master volume + Effects + Footsteps, mute toggle
- Задержка воспроизведения < 50ms
- Сохранение настроек в localStorage

---

## 3. Технический стек и архитектура

### 3.1 Архитектура проекта

```
browserstrike/                    # Корень монорепо
├── package.json                  # npm workspaces: ['packages/*']
├── tsconfig.base.json            # strict, ES2020, moduleResolution: bundler
├── .gitignore                    # node_modules, dist, .env
│
├── packages/shared/              # @browserstrike/shared
│   ├── package.json
│   ├── tsconfig.json             # extends ../../tsconfig.base.json
│   └── src/
│       ├── index.ts              # barrel export
│       ├── constants/
│       │   ├── game.ts           # TICK_RATE, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY, EYE_HEIGHT, PLAYER_RADIUS, PLAYER_HEIGHT
│       │   └── weapons.ts        # WEAPONS config: damage, fireRate, magazine, reloadTime для deagle/ssg08/mp9
│       ├── types/                # GameStatus, Team, WeaponId, PlayerState, InputMessage, ShootMessage, etc.
│       └── physics/
│           └── movement.ts       # applyMovement() — чистая функция, используется клиентом и сервером
│
├── packages/client/              # @browserstrike/client
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env                      # VITE_SERVER_URL=http://localhost:2567 (dev) / wss://xxx.onrender.com (prod)
│   ├── index.html                # <canvas id="game"> + <div id="ui-root">
│   └── src/
│       ├── main.ts               # Entry point
│       ├── vite-env.d.ts         # Vite type support
│       ├── core/                 # SceneManager, GameLoop
│       ├── input/                # InputManager, PointerLock
│       ├── player/               # FPSController, CollisionWorld
│       ├── weapons/              # WeaponManager, models, animations, Raycaster
│       ├── network/              # NetworkManager (Colyseus SDK)
│       ├── ui/                   # HUD, MainMenu, Lobby, WeaponSelect, MatchEnd, Scoreboard, KillFeed
│       ├── audio/                # AudioManager, SoundBank, SpatialAudio
│       └── world/                # MapRenderer, player models
│
├── packages/server/              # @browserstrike/server
│   ├── package.json
│   ├── tsconfig.json             # experimentalDecorators: true (для @colyseus/schema)
│   ├── Dockerfile                # Multi-stage build для Render
│   └── src/
│       ├── index.ts              # Colyseus server startup
│       ├── rooms/
│       │   └── GameRoom.ts       # onCreate, onJoin, onLeave, message handlers
│       ├── schemas/              # GameState, PlayerSchema, SettingsSchema, KillEventSchema
│       ├── systems/              # MovementSystem, CombatSystem, RoundSystem
│       ├── physics/              # HitDetection (server-side raycast), LagCompensation, SnapshotBuffer
│       └── utils/                # rate-limiter, validation
```

### 3.2 Клиентская часть (Frontend)

| Компонент | Технология | Версия / Примечание |
|---|---|---|
| 3D-движок | **Three.js** | Отдельная сцена + камера для оружия overlay (autoClear=false, clearDepth) |
| Сборщик | **Vite** | С .env поддержкой для VITE_SERVER_URL |
| Язык | **TypeScript** | Strict mode |
| Сетевой клиент | **colyseus.js** | ^0.15.0 |
| Хостинг | **Netlify** | Статика. Бесплатный план: 100 GB bandwidth/мес |

### 3.3 Серверная часть (Backend)

| Компонент | Технология | Версия / Примечание |
|---|---|---|
| Игровой сервер | **Colyseus** | 0.15.57. `tsx` с `--tsconfig` для legacy decorators |
| Schema | **@colyseus/schema** | 2.0.37. Требует `experimentalDecorators: true` |
| Хостинг | **Render** | Persistent WebSocket, Dockerfile деплой |

**Важно:** `@colyseus/schema v2.0.37` использует legacy decorators → `experimentalDecorators: true` в tsconfig. `tsx` требует флаг `--tsconfig` чтобы это подхватить.

### 3.4 Архитектура деплоя

```
┌─────────────────────────────────────────────────────────────────────┐
│                        АРХИТЕКТУРА ДЕПЛОЯ                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────┐        WSS (WebSocket)   ┌────────────────┐│
│  │   Client (Netlify) │ ◄──────────────────────► │  Game Server   ││
│  │                    │                           │  (Render)      ││
│  │  - Three.js        │   Inputs (keys, mouse,    │                ││
│  │  - Input capture   │   shoot, selectWeapon)    │  - Colyseus    ││
│  │  - Rendering       │   ──────────────────►     │  - Game state  ││
│  │  - Sound           │                           │  - Physics     ││
│  │  - Prediction      │   State sync + events     │  - Hit detect  ││
│  │  - HUD             │   (positions, HP, kills)  │  - Rounds      ││
│  │                    │   ◄──────────────────     │  - Rooms       ││
│  └────────────────────┘                           └────────────────┘│
│        Netlify                                        Render        │
│   (статика, бесплатно)                        (Node.js, $0-7/мес)  │
│                                                                     │
│  VITE_SERVER_URL → wss://browserstrike-server.onrender.com          │
│  CORS настроен для Netlify домена и localhost:5173 (dev)            │
└─────────────────────────────────────────────────────────────────────┘
```

**Сетевая модель:**
- **Authoritative Server:** Сервер — единственный источник правды. Все расчёты урона, хитдетекции и физики — на сервере
- **Client-side Prediction:** Клиент применяет `applyMovement()` мгновенно, буфер pending inputs с sequence numbers
- **Server Reconciliation:** При получении серверного состояния — snap + replay unacked inputs. `lastProcessedSeq` от сервера
- **Entity Interpolation:** Буфер 2-3 серверных снапшотов, интерполяция позиции и ротации (lerp/slerp). Задержка: ~2 × (1000/TICK_RATE) ms
- **Tick Rate:** 20–30 тиков/сек
- **Lag Compensation:** Кольцевой буфер снапшотов, rewind к тику по timestamp + RTT, raycast по rewound позициям

### 3.5 Оценка затрат

| Ресурс | Стоимость | Примечание |
|---|---|---|
| Netlify (клиент) | **Бесплатно** | Free tier: 100 GB bandwidth/мес |
| Render (сервер) | **Бесплатно** или ~$7/мес | Free tier: сервер засыпает через 15 мин неактивности (~30 сек wake-up). Платный — постоянно |
| Звуковые ассеты | **Бесплатно** | freesound.org, OpenGameArt (CC0) |
| 3D-модели | **Бесплатно** | Kenney Assets, Sketchfab (CC), OpenGameArt, или Blender |
| Домен (опционально) | ~$10–15/год | Вместо *.netlify.app |

**Итого MVP:** $0–7/мес. БД не нужна.

---

## 4. Модель данных

### 4.1 Серверное состояние (Colyseus State Schema)

**Реализованные схемы:**
- `GameState` — `MapSchema<PlayerSchema>` keyed by sessionId, `ArraySchema<KillEventSchema>`
- `PlayerSchema` — flat `float32` для position/rotation (не nested Schema, для bandwidth efficiency)
- `SettingsSchema`, `KillEventSchema`

```
GameState
├── roomCode: string              // "A3F8K2" (charset без 0/O/1/I)
├── status: string                // "lobby" | "weapon_select" | "playing" | "round_end" | "match_end"
├── settings: SettingsSchema
│   ├── mode: string              // "1v1" | "2v2"
│   ├── mapId: string             // "warehouse" | "dust_alley" | "office" | "trainyard"
│   ├── roundsToWin: number       // 5, 7, 10, 13
│   └── roundTimeLimit: number    // секунды (default: 120)
├── adminId: string               // session ID создателя комнаты
├── scoreTeamA: number
├── scoreTeamB: number
├── currentRound: number
├── roundTimer: number
├── players: MapSchema<PlayerSchema>  // keyed by sessionId
│   └── PlayerSchema
│       ├── sessionId: string
│       ├── nickname: string
│       ├── team: string          // "A" | "B" | "unassigned"
│       ├── isAlive: boolean
│       ├── hp: number            // 0–100
│       ├── posX, posY, posZ: float32     // flat, не nested
│       ├── rotYaw, rotPitch: float32     // flat, не nested
│       ├── currentWeapon: string // "deagle" | "ssg08" | "mp9"
│       ├── ammo: number
│       ├── isReloading: boolean
│       ├── kills: number
│       └── deaths: number
└── killFeed: ArraySchema<KillEventSchema>
    └── KillEventSchema
        ├── killerNickname: string
        ├── victimNickname: string
        ├── weapon: string
        ├── isHeadshot: boolean
        └── timestamp: number
```

### 4.2 Клиент → Сервер (Messages)

| Сообщение | Поля | Описание |
|---|---|---|
| `move` | `{ keys: { w, a, s, d, space }, deltaTime, seq }` | Input с sequence number |
| `look` | `{ yaw, pitch }` | Поворот камеры |
| `shoot` | `{ timestamp, origin: {x,y,z}, direction: {x,y,z} }` | Выстрел с данными для server raycast |
| `reload` | `{}` | Перезарядка |
| `selectWeapon` | `{ weapon: "deagle" \| "ssg08" \| "mp9" }` | Выбор оружия (фаза weapon_select) |
| `joinTeam` | `{ team: "A" \| "B" }` | Выбор команды в лобби |
| `startGame` | `{}` | Админ начинает игру |
| `updateSettings` | `{ mode?, mapId?, roundsToWin? }` | Админ меняет настройки |

### 4.3 Сервер → Клиент (Events)

State sync через Colyseus автоматически. Дополнительные события:

| Событие | Данные | Описание |
|---|---|---|
| `hit` | `{ damage, isHeadshot, direction: {x,z} }` | Игрок получил урон (для damage indicator) |
| `kill` | `{ killer, victim, weapon, isHeadshot }` | Убийство |
| `roundEnd` | `{ winnerTeam, scoreA, scoreB }` | Раунд завершён |
| `matchEnd` | `{ winnerTeam, finalScoreA, finalScoreB }` | Матч завершён |
| `playerDied` | `{ sessionId }` | Для spectator mode |
| `sound` | `{ type, position: {x,y,z}, sourceId }` | Пространственное звуковое событие |

---

## 5. Принципы UI-дизайна

### 5.1 Общий стиль
- **Палитра:** Тёмно-серый/чёрный фон (#1a1a2e), оранжевые акценты (#ff6b00)
- **Шрифты:** Rajdhani или Barlow Condensed (Google Fonts)
- **Минимализм:** Минимум UI-элементов во время игры
- **Таргет:** Десктопный браузер (не мобильные)

### 5.2 Экраны

1. **Главный экран (Main Menu):**
   - Поле ввода никнейма (валидация: 3-16 символов)
   - Две кнопки: "Создать комнату" / "Присоединиться"
   - Поле ввода кода (6 символов, автокапитализация)
   - Отображение ошибок (неверный код, комната полна)

2. **Лобби комнаты:**
   - Код комнаты крупно + "Копировать" (navigator.clipboard)
   - Настройки (админ): режим (1v1/2v2), карта, раунды
   - Настройки (не-админ): read-only
   - Два столбца: Team A / Team B с кнопками
   - "Начать игру" (только админ, только при полных командах)

3. **Экран выбора оружия:**
   - 3 карточки с характеристиками из shared/weapons.ts
   - Таймер 5 сек, оранжевая подсветка выбранного
   - Дефолт: Deagle

4. **Игровой HUD** (описан в 2.6)

5. **Экран конца матча:**
   - Команда-победитель, финальный счёт
   - Таблица K/D всех игроков
   - "Реванш" / "В лобби"

### 5.3 Настройки прицела
- Цвет: предустановки (зелёный, красный, белый, жёлтый) + HEX
- Размер, толщина линий, gap — слайдеры
- Точка в центре: toggle
- Контур (outline): toggle
- Preview при настройке
- localStorage persistence

---

## 6. Безопасность

### 6.1 Античит (авторитарный сервер)
- Все расчёты урона и хитдетекции — на сервере
- Валидация скорости: `PLAYER_SPEED` из shared constants
- Rate limiting выстрелов: по `fireRate` оружия
- Валидация инпутов: reject NaN, Infinity, отрицательный deltaTime, неизвестные ключи
- Throttling: макс ~60 msg/sec per player
- Логирование подозрительной активности

### 6.2 Сетевая безопасность
- WSS (WebSocket Secure) в production
- CORS: разрешены только Netlify домен + localhost:5173
- Таймаут неактивных соединений (5 минут)

### 6.3 Защита от абьюза
- Базовый фильтр никнеймов (запрещённые слова)
- Комната авто-уничтожается если все покинули
- Таймаут комнаты: 10 минут без активности

---

## 7. Обработка дисконнектов

- **В лобби:** слот освобождается мгновенно
- **Во время матча:** игрок считается мёртвым (`isAlive = false`)
- **2v2:** если оба из одной команды отключились — раунд за противников
- Уведомление: "[Nickname] отключился"

---

## 8. Текущий рендеринг (реализованные решения)

Данные решения уже реализованы и должны быть сохранены в дальнейшей разработке:

**Сцена:**
- `PCFSoftShadowMap` для мягких теней
- Fog: near=30, far=60 (для performance и атмосферы)
- DirectionalLight: shadow camera covers 25 units
- AmbientLight + DirectionalLight

**Оружие overlay:**
- Отдельная Three.js сцена + камера для модели оружия от первого лица
- `renderer.autoClear = false`, `renderer.clearDepth()` перед рендером overlay
- Оружие всегда отрисовывается поверх мира (не перекрывается стенами)

**Deagle recoil animation:**
- 120ms duration
- Sin-based kick curve
- up=0.04, back=0.06, rotation=0.15 rad

**NetworkManager (клиент):**
- `createRoom(nickname)` → создаёт комнату, возвращает room code
- `joinByCode(roomCode, nickname)` → `getAvailableRooms()` по metadata, join matching
- `listen(callbacks)` → state change, player add/remove, error, leave
- `send(type, data)` / `onMessage(type, callback)`
- `leave()`, `sessionId`, `connected`, `currentRoom` getters
- `VITE_SERVER_URL` env var (default: `ws://localhost:2567`)

---

## 9. Этапы разработки

### Этап 1: Прототип ✅ ЗАВЕРШЁН
**Цель:** Один игрок двигается по карте и стреляет.
- [x] Монорепо: npm workspaces, tsconfig, shared package
- [x] Клиент: Vite + TypeScript + Three.js
- [x] Сервер: Colyseus с GameRoom
- [x] Shared: константы, типы, конфиг оружия, applyMovement()
- [x] 3D сцена: прототип Warehouse из примитивов
- [x] FPS-контроллер: WASD + мышь + Pointer Lock
- [x] Физика: гравитация, прыжок, коллизии AABB
- [x] Модель Deagle с анимацией отдачи
- [x] State Schema: GameState, PlayerSchema, SettingsSchema, KillEventSchema
- [x] Система комнат: создание/подключение по коду, никнеймы, команды

### Этап 2: Мультиплеер (текущий)
**Цель:** Два игрока могут зайти в одну комнату, стрелять друг в друга.
- [ ] Система стрельбы: raycasting, визуальные эффекты (muzzle flash, tracers, decals)
- [ ] Патроны и перезарядка: счётчик, авто/ручная, анимация
- [ ] Базовый HUD: прицел, HP, патроны
- [ ] Main Menu UI: никнейм, создать/присоединиться
- [ ] Лобби UI: код, команды, настройки, старт
- [ ] Синхронизация позиций: клиент → сервер → другие клиенты
- [ ] Client-side prediction + server reconciliation
- [ ] Entity interpolation
- [ ] Серверная хитдетекция: raycast по хитбоксам, расчёт урона
- [ ] Lag compensation: snapshot buffer, rewind

### Этап 3: Геймплейный цикл
**Цель:** Полноценная раундовая система.
- [ ] RoundSystem: state machine (weapon_select → countdown → playing → round_end → match_end)
- [ ] Экран выбора оружия
- [ ] Все 3 оружия: SSG-08 и MP9 на клиенте
- [ ] Серверная валидация и античит
- [ ] Kill feed, scoreboard, счёт раундов, countdown
- [ ] Индикатор урона, hitmarker
- [ ] Spectator mode (2v2)
- [ ] Экран конца матча

### Этап 4: Карты и контент
**Цель:** 3–4 играбельные карты.
- [ ] Warehouse: полноценная GLTF карта (замена примитивов)
- [ ] Dust Alley
- [ ] Office (2 этажа)
- [ ] Trainyard (опционально)
- [ ] MapLoader (сервер) + MapRenderer (клиент) по mapId
- [ ] Модели игроков: low-poly humanoid с цветом команды, анимация ходьбы

### Этап 5: Полировка
**Цель:** Звук, оптимизация, деплой.
- [ ] AudioManager, SoundBank: звуки выстрелов, шагов, хитов, UI
- [ ] SpatialAudio: 3D звук для противников (PannerNode)
- [ ] Настройки прицела
- [ ] Настройки звука (volume sliders)
- [ ] Object pooling, quality settings
- [ ] Debug overlay (FPS, ping, position)
- [ ] Обработка дисконнектов: авто-уничтожение комнат
- [ ] Деплой: Dockerfile для Render, netlify.toml для Netlify
- [ ] End-to-end тест: полный матч от меню до конца

**Общая оценка:** 12–17 недель (3–4 месяца)

---

## 10. Потенциальные проблемы и решения

### 10.1 Сетевая задержка (Latency)
**Проблема:** Высокий пинг делает игру неиграбельной.
**Решение:** Client-side prediction (shared `applyMovement()`), lag compensation (snapshot rewind), entity interpolation (буфер 2-3 снапшотов).

### 10.2 Производительность на слабых ПК
**Проблема:** WebGL на интегрированной графике.
**Решение:** Low-poly (< 500 poly/объект), baked lightmaps, fog (уже: 30-60), object pooling, quality settings (разрешение, дальность).

### 10.3 Хитдетекция в сетевой игре
**Проблема:** Авторитарный сервер + отзывчивость стрельбы.
**Решение:** Клиент отправляет `{ timestamp, origin, direction }`, сервер rewind + raycast по хитбоксам, hitmarker приходит с сервера.

### 10.4 Создание 3D-контента
**Проблема:** Нет опыта в моделировании.
**Решение:** Начать с примитивов (уже сделано для Warehouse). Далее: Kenney Assets (kenney.nl), Blender + YouTube-туториалы, GLTF формат.

### 10.5 Масштабирование
**Проблема:** Один Node.js сервер ограничен.
**Решение:** Для MVP один Render инстанс достаточно (десятки комнат по 2-4 игрока). Colyseus поддерживает горизонтальное масштабирование.

### 10.6 Render Free Tier cold start
**Проблема:** Сервер засыпает после 15 мин неактивности, ~30 сек wake-up.
**Решение:** Для MVP приемлемо. Для production: $7/мес за always-on. Опционально: cron ping каждые 14 минут.

---

## 11. Возможности будущего расширения (v2.0)

- Больше оружия (AK-47, M4A4, AWP, гранаты)
- Экономическая система (покупка оружия за деньги раундов)
- Режим Bomb Defusal
- Система аккаунтов и ELO рейтинг (потребуется БД)
- Кастомизация скинов
- Голосовой чат (WebRTC)
- Мобильная адаптация
- Режим Deathmatch
- Реплей-система
- Текстовый чат

---

## 12. Технические ссылки

| Ресурс | Ссылка |
|---|---|
| Three.js docs | https://threejs.org/docs/ |
| Colyseus docs | https://docs.colyseus.io/ |
| Colyseus GitHub | https://github.com/colyseus/colyseus |
| Vite | https://vitejs.dev/ |
| Pointer Lock API | https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API |
| Web Audio API | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API |
| Kenney Assets | https://kenney.nl/assets |
| Freesound | https://freesound.org/ |
| Blender | https://www.blender.org/ |
| Gabriel Gambetta — сетевой код | https://www.gabrielgambetta.com/client-server-game-architecture.html |
| Render docs | https://docs.render.com/ |
| Netlify docs | https://docs.netlify.com/ |

---

*PRD v1.2 — обновлён с учётом всех реализованных технических решений и текущего прогресса.*