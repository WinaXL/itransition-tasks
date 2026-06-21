# Itransition Frontend Internship — Industrial Training Tasks

Репозиторий с решениями практических заданий в рамках **промышленной практики (industrial training)** программы **Itransition Frontend Internship**.

---

## Обзор

| # | Задание | Папка | Технологии |
|---|---------|-------|------------|
| 1 | Longest Common Substring (Code Golf) | [`task1-lcs/`](task1-lcs/) | Чистый Node.js |
| 2 | Пакетное SHA3-256 хеширование | [`task2-hashing/`](task2-hashing/) | `crypto`, `BigInt` |
| 3 | LCM Web Server | [`task3/`](task3/) | Express, HTTP API |
| 4 | User Management Admin Panel | [`task4/`](task4/) | React, Express, PostgreSQL, JWT |
| 5 | Soundforge — Procedural Music Store | [`task5/`](task5/) | React + TS, Express + TS, Web Audio |
| 6 | Naval Strike — Multiplayer Battleship | [`task6/`](task6/) | React + TS, Express + Socket.io, Tailwind v4 |

### Дополнительные задания (optional)

| # | Задание | Папка | Технологии |
|---|---------|-------|------------|
| 1 | Quine Relay (5 языков) | [`optional1/`](optional1/) | JS → Python → TS → Java → C# |
| 2 | Max-Min Levenshtein Outlier | [`optional2/`](optional2/) | Node.js, `worker_threads` |
| 3 | Hex Divisibility Puzzle | [`optional3/`](optional3/) | Node.js, `BigInt` backtracking |
| 4 | Digit Image Classification | [`optional4/`](optional4/) | Python, PyTorch, MNIST CNN |

---

## Структура проекта

```
itransition-tasks/
├── README.md
├── .gitignore
├── task1-lcs/
│   └── lcs.js
├── task2-hashing/
│   └── task2.js              # *.data — локально, не в Git
├── task3/
│   ├── server.js
│   ├── package.json
│   └── README.md
├── task4/
│   ├── backend/                # Express + PostgreSQL + JWT
│   └── frontend/               # React + Vite + Tailwind
├── task5/
│   ├── backend/                # Express API, seeded generation
│   └── frontend/               # React SPA (table + gallery)
├── task6/
│   ├── server/                 # Express + Socket.io game server
│   └── client/                 # React SPA (Vite + Tailwind v4)
├── optional1/
│   ├── build_quine.js          # генератор quine-relay
│   ├── quine.js                # самовоспроизводящаяся цепочка
│   └── verify.js               # end-to-end верификатор
├── optional2/
│   └── surname_problem.js      # in.txt — локально, не в Git
├── optional3/
│   ├── solve-puzzle.js
│   └── README.md
└── optional4/
    ├── solve-digits.py
    ├── requirements.txt
    └── README.md               # mnist_data/, weights — локально
```

> **Примечание:** бинарные входные данные (`*.data`, `in.txt`, MNIST-кэш, веса модели) **не коммитятся** — см. [`.gitignore`](.gitignore).

---

## Задание 1 — Longest Common Substring (Code Golf)

**Папка:** [`task1-lcs/`](task1-lcs/)

Найти **наибольшую общую подстроку** среди строк, переданных через аргументы командной строки. Решение сжато до ~141 байт (code golf).

```bash
node task1-lcs/lcs.js "abcdef" "zbcdxy" "abcef"
# bcd
```

---

## Задание 2 — Пакетная обработка бинарных файлов (SHA3-256 + BigInt)

**Папка:** [`task2-hashing/`](task2-hashing/)

Обработать **256 бинарных файлов** `file_XX.data`, вычислить SHA3-256, отсортировать по специальному `BigInt`-ключу и получить итоговый хеш.

```bash
node task2-hashing/task2.js
```

---

## Задание 3 — LCM Web Server (Express)

**Папка:** [`task3/`](task3/) · Подробнее: [`task3/README.md`](task3/README.md)

HTTP-сервер с эндпоинтом `GET /:emailSlug?x=<n>&y=<n>`, возвращающим LCM двух натуральных чисел (plain text).

```bash
cd task3 && npm install && npm start
curl "http://localhost:3000/user?x=15&y=20"   # 60
```

---

## Задание 4 — User Management Admin Panel

**Папка:** [`task4/`](task4/) · Подробнее: [`task4/README.md`](task4/README.md)

Full-stack приложение: регистрация/логин, JWT-аутентификация, CRUD пользователей, блокировка, верификация email.

| Слой | Стек |
|------|------|
| Frontend | React 18, Vite, Tailwind, React Router |
| Backend | Node.js, Express, JWT, bcryptjs |
| Database | PostgreSQL |

```bash
# backend (порт 5000)
cd task4/backend && npm install && npm start

# frontend (порт 5173)
cd task4/frontend && npm install && npm run dev
```

---

## Задание 5 — Soundforge (Procedural Music Store)

**Папка:** [`task5/`](task5/) · Подробнее: [`task5/README.md`](task5/README.md)

SPA-витрина музыкального магазина с **детерминированной** генерацией песен на сервере: обложки (SVG), аудио (Web Audio API), тексты, отзывы. Независимые параметры seed / locale / likes через вложенные RNG.

```bash
cd task5/backend && npm install && npm run dev    # :4000
cd task5/frontend && npm install && npm run dev   # :5173
```

Деплой: backend → Render (`render.yaml`), frontend → Vercel (`vercel.json`).

---

## Задание 6 — Naval Strike (Multiplayer Battleship)

**Папка:** [`task6/`](task6/) · Подробнее: [`task6/README.md`](task6/README.md)

Real-time multiplayer «Морской бой» для двух удалённых соперников: комнаты, настройка сетки и флота, WebSocket без перезагрузки страницы. Имена без регистрации с суффиксами (`John`, `John 2`, …).

```bash
cd task6 && npm run install:all && npm run dev    # client :5173, server :3001
```

Деплой: backend → Render (`task6/render.yaml`), frontend → Vercel (`task6/client/vercel.json`).

---

## Optional 1 — Quine Relay (5 языков)

**Папка:** [`optional1/`](optional1/)

Самовоспроизводящаяся цепочка: **JS → Python → TypeScript → Java → C# → JS**. Каждый этап выводит исходный код следующего.

```bash
node optional1/quine.js          # запуск relay
node optional1/verify.js         # полная верификация цепочки
node optional1/build_quine.js    # пересборка quine.js
```

---

## Optional 2 — Max-Min Levenshtein Outlier

**Папка:** [`optional2/`](optional2/)

Найти фамилию, **максимально отличающуюся от каждой другой** (maximize minimum Levenshtein distance). Параллельная обработка через `worker_threads`.

```bash
node optional2/surname_problem.js path/to/in.txt
```

---

## Optional 3 — Hex Divisibility Puzzle

**Папка:** [`optional3/`](optional3/) · Подробнее: [`optional3/README.md`](optional3/README.md)

Найти самое длинное hex-число, где каждый префикс длины `k` удовлетворяет `value % k === k − 1`. Средняя цифра ответа — `3`.

```bash
node optional3/solve-puzzle.js
```

---

## Optional 4 — Digit Image Classification

**Папка:** [`optional4/`](optional4/) · Подробнее: [`optional4/README.md`](optional4/README.md)

CNN на PyTorch: обучение на MNIST, классификация изображений из `digits.zip`, вывод массива счётчиков цифр 0–9.

```bash
cd optional4
pip install -r requirements.txt
python solve-digits.py
```

---

## Требования

| | Задания 1–2, optional 1–3 | Задание 3 | Задания 4–6 | Optional 4 |
|---|---------------------------|-----------|-------------|------------|
| **Runtime** | Node.js 18+ | Node.js 18+ | Node.js 18+ | Python 3.10+ |
| **Зависимости** | встроенные модули | `npm install` | `npm install` | `pip install -r requirements.txt` |
| **БД** | — | — | PostgreSQL (task 4) | — |

---

## Автор

**Maxat Kaliyev** — Itransition Frontend Internship, industrial training tasks.
