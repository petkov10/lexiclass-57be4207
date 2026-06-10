## Какво ще направя

### 1. 👥 Потребители и роля `editor`
- Нова стойност `editor` в enum `app_role`
- Нова страница `/admin/users` (само за admin) — списък потребители, смяна на роля, деактивация
- **Покани** — admin въвежда email, системата създава "pending invite" запис; потребителят се регистрира със същия email и автоматично получава ролята
- Updated RLS: `editor` може да управлява classes/subjects/themes/resources, НЕ вижда settings/backup/users/AI настройки
- Sidebar в админа крие линкове според ролята

### 2. ⚡ Bulk admin операции
- **Multi-file drag&drop upload** в админ резурси: пускаш 10 файла наведнъж, всеки получава тип авто-разпознат (pdf/pptx/docx/image/code), batch upload progress
- **Дублиране на тема** между класове/предмети — модал "Копирай в..." с избор на target class+subject, копира всички ресурси и метаданни
- **Drag&drop подреждане** на теми и ресурси (`@dnd-kit/core` + `@dnd-kit/sortable`), записва нов `order_index`
- **Inline edit** на име на тема/ресурс — клик → input → Enter/Esc

### 3. 🎯 Бърз вход в час
- Начален екран `/` — **големи бутони с класове** (grid), 1 клик до класа
- **"Продължи последния урок"** карта най-отгоре (последно отворена тема от current user, в `localStorage`)
- **Fullscreen presentation mode** — бутон в theme view, скрива header/sidebar, F11-стил пълноекранно, ESC за изход
- Клавишни shortcut: `F` за fullscreen, `←/→` за навигация между ресурси

### 4. 🧠 AI разширения
- **AI Тестове** — нов tab в `/admin/ai`: задаваш тема + брой въпроси + тип (multiple choice / отворени / смесени), AI връща структуриран JSON тест с верни отговори, запазва се като ресурс тип `test`
- **AI План за урок** — задаваш тема + продължителност (40/45/90 мин) + клас, AI генерира timeline (въведение → теория → упражнение → обобщение → ДЗ), markdown, запазва се като ресурс
- **AI Код упражнения** — език (C#/SQL/HTML) + ниво + тема → starter code + решение + тестови случаи, запазва се като ресурс тип `code`

### 5. 📅 Календар, домашни, бележки
- **Schedule таблица** (`schedules`) — ден от седмицата + час + class + subject + theme (по избор). Нова страница `/admin/schedule` за управление. На начален екран **"Днес в час"** widget с дневното разписание + директни линкове.
- **Homework таблица** (`homework`) — текст, deadline, прикачени файлове, към тема. Нов tab в admin themes за добавяне; публично се показва в theme view.
- **Teacher notes** — `private_notes` text колона на `themes`, видима само в admin, не се показва публично

## Технически детайли

**Нови таблици:**
- `pending_invites` (email, role, invited_by, created_at)
- `schedules` (id, day_of_week, start_time, end_time, class_id, subject_id, theme_id?, owner_id)
- `homework` (id, theme_id, title, description, deadline, attachments jsonb)

**Промени на съществуващи:**
- `themes`: добавя `private_notes text`
- `app_role` enum: добавя `editor`
- Resource type enum: добавя `test`, `lesson_plan`, `code_exercise`
- RLS политики обновени: `has_role(uid, 'admin') OR has_role(uid, 'editor')` за content tables; само admin за settings/users/backup

**Auto-assign role при регистрация:** обновявам `handle_new_user()` да чете `pending_invites` по email и да задава ролята оттам.

**Нови dependencies:**
- `@dnd-kit/core` + `@dnd-kit/sortable` за drag&drop
- (всичко останало вече е инсталирано)

**Нови route файлове:**
- `src/routes/_authenticated/admin.users.tsx`
- `src/routes/_authenticated/admin.schedule.tsx`
- `src/routes/api/ai-test.ts`
- `src/routes/api/ai-lesson-plan.ts`
- `src/routes/api/ai-code-exercise.ts`

**Обхват:** Това е голям sprint (≈15-20 файла). Ако някоя част предпочиташ да отложиш — кажи и ще я махна.

Потвърди и стартирам с миграцията.