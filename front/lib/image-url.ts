/**
 * Посилання на картинку, які люди реально вставляють з телефона:
 * «Поділитися» в Google Картинках дає share.google/…, що веде на google.com/imgres?imgurl=<картинка>.
 */

function parse(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isGoogleHost(hostname: string) {
  return hostname === "share.google" || /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(hostname);
}

/** Коротке посилання «Поділитися» з Google — картинку з нього дістає лише сервер. */
export function isGoogleShareLink(value: string) {
  return parse(value)?.hostname === "share.google";
}

/** Адреса картинки з google.com/imgres?imgurl=…, інакше null. */
export function googleImageTarget(value: string) {
  const url = parse(value);
  if (!url || !isGoogleHost(url.hostname) || url.pathname !== "/imgres") return null;
  const target = parse(url.searchParams.get("imgurl") ?? "");
  return target && /^https?:$/.test(target.protocol) ? target.href : null;
}

/** Чи можна йти за редиректом share.google — лише в межах Google. */
export function isGoogleUrl(value: string) {
  const url = parse(value);
  return Boolean(url && url.protocol === "https:" && isGoogleHost(url.hostname));
}

/**
 * Те, що вставили, → адреса картинки: дістає посилання з тексту («Дивись: https://…»)
 * і розгортає google.com/imgres. share.google лишає як є — його розкручує сервер.
 */
export function normalizeImageUrl(raw: string) {
  const value = raw.trim();
  const found = value.match(/https?:\/\/\S+/)?.[0] ?? value;
  return googleImageTarget(found) ?? found;
}
