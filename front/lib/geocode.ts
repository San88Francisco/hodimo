import type { GeoPoint } from "@/lib/meetups";

/*
 * Пошук адрес — Photon (photon.komoot.io): безкоштовний геокодер на даних OpenStreetMap,
 * дозволяє пошук «під час набору». Просять не зловживати, тож запити з паузою й з AbortSignal.
 */
const PHOTON = "https://photon.komoot.io";

export type Place = GeoPoint & {
  /** Що показати першим рядком: назва місця або вулиця з номером. */
  title: string;
  /** Уточнення: вулиця, район, місто. */
  subtitle: string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    country?: string;
  };
};

function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const title = p.name || street || p.city || "Точка на карті";
  const subtitle = [p.name && street, p.district, p.city]
    .filter((part): part is string => Boolean(part) && part !== title)
    .join(", ");
  const [lng, lat] = geometry.coordinates;
  return { lat, lng, title, subtitle };
}

/** Публічний Photon часом відповідає по 10–20 с — довше не чекаємо. */
const TIMEOUT_MS = 10_000;

/** Скасовано нами (новий запит замість старого), а не збій чи тайм-аут. */
export const isAborted = (error: unknown) => (error as Error)?.name === "AbortError";

async function photon(path: string, params: Record<string, string | number>, signal?: AbortSignal) {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(`${PHOTON}${path}?${query}`, {
    signal: signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : (signal ?? timeout),
  });
  if (!response.ok) throw new Error(`Photon ${response.status}`);
  const data = (await response.json()) as { features: PhotonFeature[] };
  return data.features.map(toPlace);
}

// ---------- Кирилиця → латиниця ----------
// Photon знає назви лише латиницею: «Познань» не знайде, «Poznań» — так.

/** Міста Польщі українською → їхні польські назви. */
const POLISH_CITIES: Record<string, string> = {
  познань: "Poznań",
  варшава: "Warszawa",
  краків: "Kraków",
  вроцлав: "Wrocław",
  гданськ: "Gdańsk",
  гдиня: "Gdynia",
  сопот: "Sopot",
  лодзь: "Łódź",
  щецин: "Szczecin",
  люблін: "Lublin",
  катовіце: "Katowice",
  бидгощ: "Bydgoszcz",
  торунь: "Toruń",
  жешув: "Rzeszów",
  ряшів: "Rzeszów",
  білосток: "Białystok",
  ольштин: "Olsztyn",
  ченстохова: "Częstochowa",
  кельце: "Kielce",
  ополе: "Opole",
  "зелена гура": "Zielona Góra",
  гнезно: "Gniezno",
  перемишль: "Przemyśl",
  хелм: "Chełm",
  холм: "Chełm",
  замость: "Zamość",
  гливиці: "Gliwice",
  сосновець: "Sosnowiec",
  радом: "Radom",
  плоцьк: "Płock",
  ельблонг: "Elbląg",
  легниця: "Legnica",
  калиш: "Kalisz",
  лешно: "Leszno",
};

/** Транслітерація за польськими правилами (ш → sz, ч → cz, в → w): так Photon частіше вгадує. */
const LETTERS: Record<string, string> = {
  а: "a", б: "b", в: "w", г: "h", ґ: "g", д: "d", е: "e", є: "je", ж: "ż", з: "z", и: "y",
  і: "i", ї: "ji", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "ch", ц: "c", ч: "cz", ш: "sz", щ: "szcz", ь: "", ю: "ju",
  я: "ja", "'": "", "ʼ": "", "’": "",
};

const CYRILLIC = /[а-яґєії]/i;

const transliterate = (word: string) =>
  word
    .toLowerCase()
    .split("")
    .map((char) => LETTERS[char] ?? char)
    .join("");

/**
 * «вул. Свєнти Марцін, Познань» → «swjenty marcin, Poznań»;
 * «кав'ярня Weranda, Познань» → «Weranda, Poznań» (є латинська назва — українські слова зайві).
 */
export function toLatinQuery(text: string) {
  if (!CYRILLIC.test(text)) return text;
  const hasLatinWords = text.split(/[\s,]+/).some((word) => /[a-z]/i.test(word) && !CYRILLIC.test(word));
  let query = text.replace(/(^|[\s,])(вул\.?|вулиця|пл\.?|площа|просп\.?|проспект)(?=\s)/gi, "$1");
  for (const [name, polish] of Object.entries(POLISH_CITIES)) {
    query = query.replace(new RegExp(`(^|[\\s,])${name}(?=$|[\\s,])`, "gi"), `$1${polish}`);
  }
  return query
    .split(/(\s+|,)/)
    .map((word) => (CYRILLIC.test(word) ? (hasLatinWords ? "" : transliterate(word)) : word))
    .join("")
    .replace(/\s*,[\s,]*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "");
}

/** Відстань у км (рівнокутна апроксимація — для порівняння в межах країни досить). */
function distanceKm(a: GeoPoint, b: GeoPoint) {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot(x, b.lat - a.lat) * 111.32;
}

const NEARBY_KM = 40;

/**
 * Адреси й місця за текстом. Photon лише трохи підтягує ближчі вгору, тож «Czechosłowacka 2»
 * у Познані сусідить із Лешном і Лодзю — якщо поруч щось знайшлось, далекі відкидаємо.
 */
export async function searchPlaces(text: string, near: GeoPoint, signal?: AbortSignal) {
  const places = await photon("/api/", { q: toLatinQuery(text), lat: near.lat, lon: near.lng, limit: 10 }, signal);
  const nearby = places.filter((place) => distanceKm(near, place) <= NEARBY_KM);
  return (nearby.length > 0 ? nearby : places).slice(0, 6);
}

/** Що за адреса в цій точці (null — нічого поруч). */
export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal) {
  const [place] = await photon("/reverse", { lat: point.lat, lon: point.lng, limit: 1 }, signal);
  return place ?? null;
}

/** Центр міста — щоб карта відкривалась там, де подія. */
export async function findCity(city: string, signal?: AbortSignal) {
  const [place] = await photon("/api/", { q: toLatinQuery(city), osm_tag: "place", limit: 1 }, signal);
  return place ?? null;
}

/** Познань — коли міста не знайшли. */
export const DEFAULT_CENTER: GeoPoint = { lat: 52.4064, lng: 16.9252 };
