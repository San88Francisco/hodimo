import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoPoint } from "@/lib/meetups";

export type LeafletLib = typeof Leaflet;
export type MapInstance = Leaflet.Map;

let library: Promise<LeafletLib> | undefined;

/** Leaflet звертається до window під час імпорту — тому вантажимо його лише при відкритті карти. */
export function loadLeaflet(): Promise<LeafletLib> {
  library ??= import("leaflet").then((module) => module.default ?? module);
  return library;
}

/*
 * Растрові тайли CARTO Voyager (дані OpenStreetMap) — світла карта, схожа на Google Maps.
 * Карта складається зі звичайних картинок, без WebGL: на телефоні у вебв'ю Telegram векторна
 * карта губила GPU-контекст після швидкого віддалення й наближення і лишалась порожньою.
 * {r} — тайли подвійної щільності на ретіна-екранах.
 */
const TILES_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Карта без кнопок зуму — як звичайна мапа в телефоні (щипок, подвійний тап, коліщатко).
 * null — ефект уже скасували: карту не створюємо зовсім, інакше дві карти ділять контейнер.
 */
export async function createMap(
  container: HTMLElement,
  options: { center: GeoPoint; zoom: number; interactive?: boolean; zoomAroundCenter?: boolean },
  signal: AbortSignal,
) {
  const leaflet = await loadLeaflet();
  if (signal.aborted) return null;
  const interactive = options.interactive ?? true;
  const around = options.zoomAroundCenter ? ("center" as const) : interactive;
  const map = leaflet.map(container, {
    center: toLatLng(options.center),
    zoom: options.zoom,
    zoomControl: false,
    attributionControl: true,
    dragging: interactive,
    touchZoom: around,
    scrollWheelZoom: around,
    doubleClickZoom: around,
    boxZoom: interactive,
    keyboard: interactive,
    maxZoom: 19,
    minZoom: 3,
  });
  map.attributionControl.setPrefix(false);
  leaflet
    .tileLayer(TILES_URL, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: ATTRIBUTION,
      // Тайли довкола екрана тримаємо довше: швидке віддалення не відкриває порожнє поле.
      keepBuffer: 4,
    })
    .addTo(map);

  // Leaflet сам стежить лише за розміром вікна. Висота контейнера міняється й без нього
  // (панель з адресою під картою) — тоді перераховуємо, зберігаючи центр під піном.
  const observer = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
  observer.observe(container);
  map.on("unload", () => observer.disconnect());

  return { leaflet, map };
}

/** Червоний пін, як у Google Maps; вістря — точно в координаті. */
export const PIN_HTML = `
  <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true" style="display:block;filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))">
    <path d="M16 39c0 0 13-12.6 13-23A13 13 0 0 0 3 16c0 10.4 13 23 13 23z" fill="#ea4335" stroke="#b31412" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="5" fill="#a50e0e"/>
  </svg>`;

export function addPin(leaflet: LeafletLib, map: MapInstance, point: GeoPoint) {
  const icon = leaflet.divIcon({ html: PIN_HTML, className: "", iconSize: [32, 40], iconAnchor: [16, 40] });
  return leaflet.marker(toLatLng(point), { icon, interactive: false, keyboard: false }).addTo(map);
}

export const toLatLng = ({ lat, lng }: GeoPoint): [number, number] => [lat, lng];

/** Координати з 6 знаками (~10 см) — більше не треба. */
export function roundPoint({ lat, lng }: { lat: number; lng: number }): GeoPoint {
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}
