
## Какво ще направя

### 1) Режими за достъп до публичната страница
В админ → Настройки добавям избор на режим:
- **Свободен** (както сега, без PIN).
- **Общ PIN** — един 4-символен PIN за всички ученици/посетители.
- **Личен PIN** — всеки потребител си има свой 4-символен PIN, който вие управлявате.

Реализация:
- Нови полета в `app_settings`: `access_mode` ('free' | 'global_pin' | 'user_pin'), `global_pin` (4 символа).
- Нов компонент `PinGate` обвива публичните роути (`/`, `/class/...`, `/theme/...`, `/test/...`). Показва голяма цифрова клавиатура + поле; **в реално време** при попадение на правилен PIN влиза автоматично, без бутон.
- Успешният PIN се пази в `sessionStorage` (за сесията) → бърз достъп до ресурсите без повторно искане.
- Тестовете (`/test/:id`) запазват PIN-gate ПРЕДИ въпроса за име/номер.

### 2) Управление на потребители (разширено)
Страница `/admin/users` (вече съществува) се разширява:
- **Роли**: `admin`, `editor`, `user` (вече има — само добавям UX и обяснения; потребител = ученик/гост с достъп до ресурсите).
- **Пауза** — toggle "Достъп: активен / на пауза". Поставените на пауза не могат да влязат (нито в админ, нито с личния си PIN). Реализирано с ново поле `profiles.is_paused`.
- **Личен PIN на потребител** — поле `profiles.access_pin` (4 символа), редактируемо от админ; бутон "Генерирай" за случаен PIN; копиране в clipboard; печат на списък PIN-ове (за раздаване в клас).
- **Редактиране на име**, изтриване (чрез service_role server fn), смяна на роля.
- Списъкът показва: име, роля, статус (активен/пауза), PIN (скрит по подразбиране, "покажи"), последен вход.

### 3) Админи и редактори да ползват публичната част пълноценно
- Премахвам всякакво пренасочване "не сте админ" за публичните страници.
- В `AdminShell` добавям бутон "Към сайта" (вече има логика за връщане), а на публичните страници — бутон "Към администрация" само за admin/editor.
- PIN-gate за admin/editor се прескача автоматично (роля > PIN).

### 4) Сигурност
- PIN-овете се пазят в БД като отворен текст? → **НЕ.** Пазим `pin_hash` (SHA-256 + сол) в `profiles` и `app_settings`. Проверката става в server function (`verifyPin`), която връща токен (signed) за `sessionStorage`. Така PIN не пътува към клиента и не се вижда в network responses.
- За UI "покажи PIN" — пазим **също** plaintext в защитена колона достъпна само за admin (RLS). Това е компромис, за да можете да виждате/раздавате PIN-ове; полето е достъпно само за роля admin.
- RLS: `profiles.access_pin` — SELECT само за `has_role(auth.uid(),'admin')`.

### 5) Допълнителни идеи (предлагам, кажете кои да включа)
- **"Заключване на клас"** — режим, в който даден клас иска отделен PIN (полезно при контролно само за един клас).
- **Дневник на достъпа** — кой PIN кога е влязъл (timestamp + IP), за прозрачност.
- **Eднократни PIN-кодове** за гости/родители — валидни 24ч.
- **Магически линк** вместо PIN — линк с токен в QR кода (още по-лесно за малки ученици).

## Технически детайли

**Миграция (DB):**
- `ALTER TABLE app_settings ADD COLUMN access_mode text DEFAULT 'free', ADD COLUMN global_pin_hash text, ADD COLUMN global_pin_plain text;`
- `ALTER TABLE profiles ADD COLUMN is_paused boolean DEFAULT false, ADD COLUMN access_pin_hash text, ADD COLUMN access_pin_plain text, ADD COLUMN last_login_at timestamptz;`
- RLS: `access_pin_plain` и `global_pin_plain` четими само от admin.
- Server function `verify_access_pin(pin text)` (SECURITY DEFINER) — сравнява hash, връща `{ok, user_id?}`.

**Нови/променени файлове:**
- `supabase/migrations/<ts>_access_modes.sql`
- `src/lib/access.functions.ts` — `verifyPin`, `setUserPin`, `setGlobalPin`, `togglePause`.
- `src/components/PinGate.tsx` — клавиатура + auto-submit.
- `src/hooks/useAccessGate.ts` — чете режим, проверява sessionStorage/роля.
- `src/routes/__root.tsx` — обвива публичните routes с `PinGate`.
- `src/routes/_authenticated/admin.settings.tsx` — секция "Достъп".
- `src/routes/_authenticated/admin.users.tsx` — нови колони (PIN, пауза), действия.
- `src/components/layout/PublicShell.tsx` — бутон "Към администрация" при роля.

## Какво ще питам преди да започна
1. Кои от **допълнителните идеи** в т.5 искате да включа сега?
2. PIN-кодът да е само цифри (по-лесна клавиатура) или цифри+букви?
3. При "Личен PIN" — какво виждаме на gate екрана? Само поле за PIN (auto-detect кой потребител е) или първо избор от списък с имена, после PIN?
