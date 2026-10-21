/**
 * Повідомлення помилок API іншими мовами. Ключ — український текст, як він написаний у коді:
 * так валідація й перевірки лишаються читабельними, а переклад потрібен лише на виході (handler).
 * Немає перекладу — віддаємо українською.
 */
export type Locale = "uk" | "ru" | "pl" | "en";

type Translations = Record<string, { ru: string; pl: string; en: string }>;

const MESSAGES: Translations = {
  "Відкрий застосунок у Telegram, щоб продовжити": {
    ru: "Открой приложение в Telegram, чтобы продолжить",
    pl: "Otwórz aplikację w Telegramie, żeby kontynuować",
    en: "Open the app in Telegram to continue",
  },
  "Недостатньо прав": { ru: "Недостаточно прав", pl: "Brak uprawnień", en: "Not enough permissions" },
  "Не знайдено": { ru: "Не найдено", pl: "Nie znaleziono", en: "Not found" },
  "Некоректні дані": { ru: "Некорректные данные", pl: "Nieprawidłowe dane", en: "Invalid data" },
  "Щось пішло не так": { ru: "Что-то пошло не так", pl: "Coś poszło nie tak", en: "Something went wrong" },
  "Тіло запиту має бути коректним JSON": {
    ru: "Тело запроса должно быть корректным JSON",
    pl: "Treść żądania musi być poprawnym JSON",
    en: "The request body must be valid JSON",
  },
  "Некоректний id": { ru: "Некорректный id", pl: "Nieprawidłowe id", en: "Invalid id" },
  "Твій акаунт заблоковано": {
    ru: "Твой аккаунт заблокирован",
    pl: "Twoje konto jest zablokowane",
    en: "Your account is blocked",
  },
  "Лише для адміністраторів": { ru: "Только для администраторов", pl: "Tylko dla administratorów", en: "Admins only" },
  "Очікується заголовок Authorization: tma <initData>": {
    ru: "Ожидается заголовок Authorization: tma <initData>",
    pl: "Oczekiwany nagłówek Authorization: tma <initData>",
    en: "Expected the Authorization: tma <initData> header",
  },
  "initData прострочені": { ru: "initData просрочены", pl: "initData wygasły", en: "initData has expired" },
  "Невірний підпис initData": {
    ru: "Неверная подпись initData",
    pl: "Nieprawidłowy podpis initData",
    en: "Invalid initData signature",
  },

  // ---------- Події ----------
  "Подію не знайдено": { ru: "Событие не найдено", pl: "Nie znaleziono wydarzenia", en: "Event not found" },
  "Подія вже відбулася": {
    ru: "Событие уже прошло",
    pl: "Wydarzenie już się odbyło",
    en: "This event has already taken place",
  },
  "Подія вже відбулася — її не можна змінити": {
    ru: "Событие уже прошло — его нельзя изменить",
    pl: "Wydarzenie już się odbyło — nie można go zmienić",
    en: "This event has already taken place — it can't be changed",
  },
  "Подія вже почалася": { ru: "Событие уже началось", pl: "Wydarzenie już się zaczęło", en: "This event has already started" },
  "Подія ще на розгляді": {
    ru: "Событие ещё на рассмотрении",
    pl: "Wydarzenie jest jeszcze w moderacji",
    en: "This event is still in review",
  },
  "Вільних місць немає": { ru: "Свободных мест нет", pl: "Brak wolnych miejsc", en: "No spots left" },
  "Автор не може вийти — видали подію натомість": {
    ru: "Автор не может выйти — удали событие вместо этого",
    pl: "Autor nie może zrezygnować — zamiast tego usuń wydarzenie",
    en: "The author can't leave — delete the event instead",
  },
  "Редагувати може лише автор події": {
    ru: "Редактировать может только автор события",
    pl: "Edytować może tylko autor wydarzenia",
    en: "Only the event's author can edit it",
  },
  "Видалити може лише автор події": {
    ru: "Удалить может только автор события",
    pl: "Usunąć może tylko autor wydarzenia",
    en: "Only the event's author can delete it",
  },
  "Немає полів для оновлення": { ru: "Нет полей для обновления", pl: "Brak pól do aktualizacji", en: "Nothing to update" },
  "Фільтр за статусом — лише для адмінів": {
    ru: "Фильтр по статусу — только для админов",
    pl: "Filtr według statusu — tylko dla adminów",
    en: "Filtering by status is for admins only",
  },
  "Такої категорії немає — обери іншу": {
    ru: "Такой категории нет — выбери другую",
    pl: "Nie ma takiej kategorii — wybierz inną",
    en: "There's no such category — choose another one",
  },
  "Обери категорію": { ru: "Выбери категорию", pl: "Wybierz kategorię", en: "Choose a category" },
  "Цей час уже минув": { ru: "Это время уже прошло", pl: "Ta godzina już minęła", en: "This time has already passed" },
  "Дата у форматі ISO 8601": { ru: "Дата в формате ISO 8601", pl: "Data w formacie ISO 8601", en: "Date in ISO 8601 format" },
  "Мінімум 2": { ru: "Минимум 2", pl: "Minimum 2", en: "At least 2" },
  "Максимум 100": { ru: "Максимум 100", pl: "Maksimum 100", en: "At most 100" },
  "Мінімум 2 символи": { ru: "Минимум 2 символа", pl: "Minimum 2 znaki", en: "At least 2 characters" },
  "Мінімум 3 символи": { ru: "Минимум 3 символа", pl: "Minimum 3 znaki", en: "At least 3 characters" },
  "Максимум 40 символів": { ru: "Максимум 40 символов", pl: "Maksimum 40 znaków", en: "At most 40 characters" },
  "Максимум 80 символів": { ru: "Максимум 80 символов", pl: "Maksimum 80 znaków", en: "At most 80 characters" },
  "Максимум 300 символів": { ru: "Максимум 300 символов", pl: "Maksimum 300 znaków", en: "At most 300 characters" },
  "Максимум 1000 символів": { ru: "Максимум 1000 символов", pl: "Maksimum 1000 znaków", en: "At most 1000 characters" },
  "Посилання має починатися з https://": {
    ru: "Ссылка должна начинаться с https://",
    pl: "Link musi zaczynać się od https://",
    en: "The link must start with https://",
  },

  // ---------- Картинки за посиланням ----------
  "Це не схоже на посилання": { ru: "Это не похоже на ссылку", pl: "To nie wygląda na link", en: "This doesn't look like a link" },
  "Потрібне посилання http(s)": { ru: "Нужна ссылка http(s)", pl: "Potrzebny link http(s)", en: "An http(s) link is required" },
  "Посилання з логіном не підтримуються": {
    ru: "Ссылки с логином не поддерживаются",
    pl: "Linki z loginem nie są obsługiwane",
    en: "Links with a login aren't supported",
  },
  "Це посилання недоступне": { ru: "Эта ссылка недоступна", pl: "Ten link jest niedostępny", en: "This link isn't available" },
  "Не вдалося знайти цей сайт": {
    ru: "Не удалось найти этот сайт",
    pl: "Nie udało się znaleźć tej strony",
    en: "Couldn't find this website",
  },
  "Сайт не відповідає — спробуй інше посилання": {
    ru: "Сайт не отвечает — попробуй другую ссылку",
    pl: "Strona nie odpowiada — spróbuj innego linku",
    en: "The website isn't responding — try another link",
  },
  "Забагато переадресацій": { ru: "Слишком много переадресаций", pl: "Zbyt wiele przekierowań", en: "Too many redirects" },
  "Не знайшли картинку за цим посиланням — спробуй скопіювати адресу самого зображення": {
    ru: "Не нашли картинку по этой ссылке — попробуй скопировать адрес самого изображения",
    pl: "Nie znaleźliśmy zdjęcia pod tym linkiem — spróbuj skopiować adres samego obrazka",
    en: "Couldn't find an image at this link — try copying the image address itself",
  },

  // ---------- Категорії ----------
  "Категорію не знайдено": { ru: "Категория не найдена", pl: "Nie znaleziono kategorii", en: "Category not found" },
  "Категорія з такою назвою вже є": {
    ru: "Категория с таким названием уже есть",
    pl: "Kategoria o tej nazwie już istnieje",
    en: "A category with this name already exists",
  },
  "Додай емодзі": { ru: "Добавь эмодзи", pl: "Dodaj emoji", en: "Add an emoji" },

  // ---------- Користувачі ----------
  "Користувача не знайдено": { ru: "Пользователь не найден", pl: "Nie znaleziono użytkownika", en: "User not found" },
  "Свою роль і статус змінювати не можна": {
    ru: "Свою роль и статус менять нельзя",
    pl: "Nie można zmieniać własnej roli ani statusu",
    en: "You can't change your own role or status",
  },
  "Спершу розблокуй користувача": {
    ru: "Сначала разблокируй пользователя",
    pl: "Najpierw odblokuj użytkownika",
    en: "Unblock the user first",
  },
  "Адміна не можна заблокувати — спершу зніми роль": {
    ru: "Админа нельзя заблокировать — сначала сними роль",
    pl: "Admina nie można zablokować — najpierw odbierz mu rolę",
    en: "An admin can't be blocked — remove the role first",
  },
  "Це головний адмін (ADMIN_TELEGRAM_IDS) — його змінюють лише в налаштуваннях сервера": {
    ru: "Это главный админ (ADMIN_TELEGRAM_IDS) — его меняют только в настройках сервера",
    pl: "To główny admin (ADMIN_TELEGRAM_IDS) — zmienia się go tylko w ustawieniach serwera",
    en: "This is the root admin (ADMIN_TELEGRAM_IDS) — it can only be changed in the server settings",
  },
};

/** Перша наша мова з Accept-Language; інакше українська. */
export function requestLocale(request: unknown): Locale {
  const header = request instanceof Request ? request.headers.get("accept-language") : null;
  for (const part of header?.split(",") ?? []) {
    const tag = part.split(";")[0]!.trim().toLowerCase().split("-")[0];
    if (tag === "uk" || tag === "ru" || tag === "pl" || tag === "en") return tag;
  }
  return "uk";
}

export function translate(message: string, locale: Locale) {
  return locale === "uk" ? message : (MESSAGES[message]?.[locale] ?? message);
}
