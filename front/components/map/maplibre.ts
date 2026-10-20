import type * as MapLibre from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoPoint } from "@/lib/meetups";

export type MapInstance = MapLibre.Map;

/** Копія з node_modules — див. scripts/copy-maplibre.mjs. */
const MAPLIBRE_URL = "/vendor/maplibre/maplibre-gl.mjs";

let library: Promise<typeof MapLibre> | undefined;

/** Бібліотека (~1 МБ) вантажиться лише при відкритті карти, один раз. */
export function loadMapLibre(): Promise<typeof MapLibre> {
  library ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ MAPLIBRE_URL);
  return library;
}

/*
 * Векторна карта OpenFreeMap (без ключа й лімітів) у кольорах Google Maps. Беремо стиль liberty
 * (у ньому є іконки закладів і зупинок) і перефарбовуємо: світла земля, білі вулиці з сірою
 * обвідкою, жовті траси, зелені парки, блакитна вода.
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const MAP_BACKGROUND = "#f5f6f7";

const ROAD_CASING = "#dadce0";
const HIGHWAY = "#fdd96b";
const HIGHWAY_CASING = "#e6b54a";
const LABEL_HALO = { "text-halo-color": "#ffffff", "text-halo-width": 1.5, "text-halo-blur": 0 };

/** Перше правило, чий шаблон підходить до id шару, задає його кольори. */
const GOOGLE_PAINT: [RegExp, Record<string, unknown>][] = [
  [/^background$/, { "background-color": MAP_BACKGROUND }],
  [/^park$/, { "fill-color": "#c8ebc4", "fill-opacity": 1, "fill-outline-color": "#c8ebc4" }],
  [/^park_outline$/, { "line-opacity": 0 }],
  [/^landcover_(wood|grass)$/, { "fill-color": "#c8ebc4", "fill-opacity": 0.8 }],
  [/^landuse_residential$/, { "fill-color": "#eef0f2" }],
  [/^landuse_(pitch|track)$/, { "fill-color": "#cdeccb" }],
  [/^landuse_cemetery$/, { "fill-color": "#d5ecd2" }],
  [/^landuse_hospital$/, { "fill-color": "#fbe5e5" }],
  [/^landuse_school$/, { "fill-color": "#eceef6" }],
  [/^water$/, { "fill-color": "#aadaff" }],
  [/^waterway_/, { "line-color": "#aadaff" }],
  [/^building$/, { "fill-color": "#e8eaed", "fill-outline-color": "#dadce0" }],
  [/_motorway(_link)?_casing$/, { "line-color": HIGHWAY_CASING }],
  [/_motorway(_link)?$/, { "line-color": HIGHWAY }],
  [/_casing$/, { "line-color": ROAD_CASING }],
  [/_(trunk_primary|secondary_tertiary|link|minor|street|service_track)$/, { "line-color": "#ffffff" }],
  [/_(major|transit)_rail(_hatching)?$/, { "line-color": "#c4c7cc" }],
  [/^(waterway_line|water_name_(point|line))_label$/, { "text-color": "#3b7fbf", ...LABEL_HALO }],
  [/^highway-name-/, { "text-color": "#5f6368", ...LABEL_HALO }],
  [/^poi_transit$/, { "text-color": "#1a73e8", ...LABEL_HALO }],
  [/^poi_/, { "text-color": "#5f6368", ...LABEL_HALO }],
  [/^label_(other|state)$/, { "text-color": "#5f6368", ...LABEL_HALO }],
  [/^label_/, { "text-color": "#202124", ...LABEL_HALO }],
];

const PAINT_PREFIXES: Record<string, string[]> = {
  background: ["background-"],
  fill: ["fill-"],
  line: ["line-"],
  symbol: ["text-", "icon-"],
};

/** 3D-будинків у Google на звичайній мапі немає, а нахил у нас вимкнено. */
const DROP_LAYERS = new Set(["building-3d"]);

let style: Promise<StyleSpecification> | undefined;

export function loadStyle(): Promise<StyleSpecification> {
  style ??= fetch(STYLE_URL)
    .then((response) => response.json() as Promise<StyleSpecification>)
    .then((spec) => ({
      ...spec,
      layers: spec.layers
        .filter((layer) => !DROP_LAYERS.has(layer.id))
        .map((layer) => {
          const patch = GOOGLE_PAINT.find(([pattern]) => pattern.test(layer.id))?.[1];
          if (!patch) return layer;
          // Лише властивості свого типу шару: line-color на підписі валить увесь стиль.
          const prefixes = PAINT_PREFIXES[layer.type] ?? [];
          const paint = Object.fromEntries(
            Object.entries(patch).filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix))),
          );
          return { ...layer, paint: { ...layer.paint, ...paint } } as typeof layer;
        }),
    }))
    .catch((error: unknown) => {
      style = undefined;
      throw error;
    });
  return style;
}

/**
 * Карта без повороту й нахилу — як звичайна мапа в телефоні. null — ефект уже скасували:
 * карту не створюємо зовсім, інакше дві карти ділять контейнер, а видалення зайвої
 * забирає в нього клас maplibregl-map (і друга лишається порожньою).
 */
export async function createMap(
  container: HTMLElement,
  options: { center: GeoPoint; zoom: number; interactive?: boolean },
  signal: AbortSignal,
) {
  const [maplibre, spec] = await Promise.all([loadMapLibre(), loadStyle()]);
  if (signal.aborted) return null;
  const map = new maplibre.Map({
    container,
    style: spec,
    center: toLngLat(options.center),
    zoom: options.zoom,
    interactive: options.interactive ?? true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
    attributionControl: { compact: true },
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  // MapLibre стежить лише за вікном; контейнер у діалозі ще добудовується — підлаштовуємось.
  const resize = new ResizeObserver(() => map.resize());
  resize.observe(container);
  map.once("remove", () => resize.disconnect());
  // Підпис джерел на старті розгорнутий і закриває пів низу — згортаємо в кнопку «i».
  map.once("load", () => {
    const attribution = container.querySelector(".maplibregl-ctrl-attrib");
    attribution?.classList.remove("maplibregl-compact-show");
    attribution?.removeAttribute("open");
  });
  return { maplibre, map };
}

/** Червоний пін, як у Google Maps; вістря — точно в координаті (anchor: bottom). */
export const PIN_HTML = `
  <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true" style="display:block;filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))">
    <path d="M16 39c0 0 13-12.6 13-23A13 13 0 0 0 3 16c0 10.4 13 23 13 23z" fill="#ea4335" stroke="#b31412" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="5" fill="#a50e0e"/>
  </svg>`;

export function addPin(maplibre: typeof MapLibre, map: MapInstance, point: GeoPoint) {
  const element = document.createElement("div");
  element.innerHTML = PIN_HTML;
  return new maplibre.Marker({ element, anchor: "bottom" }).setLngLat(toLngLat(point)).addTo(map);
}

export const toLngLat = ({ lat, lng }: GeoPoint): [number, number] => [lng, lat];

/** Координати з 6 знаками (~10 см) — більше не треба. */
export function roundPoint({ lat, lng }: { lat: number; lng: number }): GeoPoint {
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}
