"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LocateFixed, MapPin, Search, X } from "lucide-react";

import { createMap, PIN_HTML, roundPoint, toLngLat, type MapInstance } from "@/components/map/maplibre";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_CENTER,
  findCity,
  isAborted,
  reverseGeocode,
  searchPlaces,
  type Place,
} from "@/lib/geocode";
import type { GeoPoint } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Та сама точка з точністю ~10 м (після flyTo центр карти трохи «пливе» в останніх знаках). */
const isSameSpot = (a: GeoPoint, b: GeoPoint) =>
  Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1.5e-4;

type PickerProps = {
  /** Уже позначена точка — з неї й починаємо. */
  initial: GeoPoint | null;
  /** Місто з форми: без точки карта відкривається на ньому. */
  city: string;
  /** Текст з поля «Де?» — одразу шукаємо його. */
  query: string;
  /** Точка під піном і адреса там (null — адресу не знайшли). */
  onPick: (point: GeoPoint, place: Place | null) => void;
};

/**
 * Повноекранний вибір точки: пін стоїть по центру, людина рухає карту під ним
 * (або шукає вулицю чи місце зверху, або тисне «де я»).
 */
export function LocationPicker({
  open,
  onOpenChange,
  ...props
}: PickerProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <PickerBody {...props} onClose={() => onOpenChange(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PickerBody({ initial, city, query: initialQuery, onPick, onClose }: PickerProps & { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [center, setCenter] = useState<GeoPoint>(initial ?? DEFAULT_CENTER);
  const [address, setAddress] = useState<Place | null>(null);
  const [resolving, setResolving] = useState(true);
  // Геокодер не відповів (тайм-аут чи збій) — точку все одно можна зберегти.
  const [addressFailed, setAddressFailed] = useState(false);
  // Обране з пошуку — показуємо його назву замість зворотного геокодування цієї точки.
  const chosenRef = useRef<Place | null>(null);
  // Запит адреси, що ще висить: вибір з пошуку його скасовує, щоб стара відповідь не затерла нову.
  const reverseRef = useRef<AbortController | null>(null);
  // Людина вже рухала карту чи вибрала місце — центр міста, що знайшовся запізно, не застосовуємо.
  const touchedRef = useRef(false);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [nothingFound, setNothingFound] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  // Поки карта відкрита, свайп униз у Telegram не згортає застосунок.
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.disableVerticalSwipes?.();
    return () => webApp?.enableVerticalSwipes?.();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void createMap(
      containerRef.current!,
      { center: initial ?? DEFAULT_CENTER, zoom: initial ? 16 : 12 },
      controller.signal,
    ).then((created) => {
      if (!created) return;
      const { map } = created;
      map.on("moveend", () => setCenter(roundPoint(map.getCenter())));
      map.on("dragstart", () => {
        touchedRef.current = true;
        chosenRef.current = null;
        setResults([]);
        (document.activeElement as HTMLElement | null)?.blur();
      });
      mapRef.current = map;

      if (!initial && city.trim()) {
        findCity(city.trim(), controller.signal)
          .then((place) => {
            if (place && !touchedRef.current) map.jumpTo({ center: toLngLat(place), zoom: 12 });
          })
          .catch(() => {});
      }
    });

    return () => {
      controller.abort();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Карту створюємо один раз на відкриття.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Адреса під піном — з паузою, щоб не смикати геокодер на кожен рух.
  useEffect(() => {
    const chosen = chosenRef.current;
    if (chosen && isSameSpot(chosen, center)) return;
    chosenRef.current = null;
    const controller = new AbortController();
    reverseRef.current = controller;
    const timer = setTimeout(() => {
      setResolving(true);
      setAddressFailed(false);
      reverseGeocode(center, controller.signal)
        .then((place) => {
          setAddress(place);
          setResolving(false);
        })
        .catch((error: unknown) => {
          if (isAborted(error)) return;
          setAddress(null);
          setAddressFailed(true);
          setResolving(false);
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [center]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchFailed(false);
      const near = mapRef.current ? roundPoint(mapRef.current.getCenter()) : DEFAULT_CENTER;
      searchPlaces(text, near, controller.signal)
        .then((places) => {
          setResults(places);
          setNothingFound(places.length === 0);
          setSearching(false);
        })
        .catch((error: unknown) => {
          if (isAborted(error)) return;
          setSearching(false);
          setSearchFailed(true);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(place: Place) {
    touchedRef.current = true;
    reverseRef.current?.abort();
    const point = roundPoint(place);
    chosenRef.current = { ...place, ...point };
    setAddress(place);
    setResolving(false);
    setAddressFailed(false);
    setResults([]);
    setNothingFound(false);
    (document.activeElement as HTMLElement | null)?.blur();
    mapRef.current?.flyTo({ center: toLngLat(point), zoom: 16, duration: 800 });
  }

  function locate() {
    touchedRef.current = true;
    setGeoError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16,
          duration: 800,
        });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <>
      <div className="relative z-20 flex items-center gap-2 border-b border-border bg-background px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <Dialog.Close
          aria-label="Закрити"
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden />
        </Dialog.Close>
        <Dialog.Title className="sr-only">Точка на карті</Dialog.Title>
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-secondary px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim().length < 3) {
                setResults([]);
                setSearching(false);
                setNothingFound(false);
                setSearchFailed(false);
              }
            }}
            placeholder="Вулиця, номер, місце"
            aria-label="Пошук адреси"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        {(results.length > 0 || searching || nothingFound || searchFailed) && (
          <div className="absolute inset-x-3 top-full mt-2 overflow-hidden rounded-2xl bg-popover shadow-xl ring-1 ring-white/10">
            {searching && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Шукаю…</p>
            )}
            {searchFailed && !searching && (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Пошук адрес зараз не відповідає. Пересунь карту до місця вручну — пін стоїть по центру.
              </p>
            )}
            {nothingFound && !searching && (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Нічого не знайшли. Спробуй польською (напр. «Święty Marcin 80») або пересунь карту до місця.
              </p>
            )}
            <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
              {results.map((place) => (
                <li key={`${place.lat},${place.lng},${place.title}`}>
                  <button
                    type="button"
                    onClick={() => choose(place)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none hover:bg-secondary focus-visible:bg-secondary"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">{place.title}</span>
                      {place.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">{place.subtitle}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative flex-1">
        {/* Позиціонує обгортка: maplibre-gl.css ставить контейнеру карти position: relative
            поверх класів Tailwind — з absolute на ньому самому карта схлопується до висоти 0. */}
        <div className="absolute inset-0">
          <div ref={containerRef} className="map-surface size-full" />
        </div>
        {/* Вістря піна — точно в центрі карти. */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full pb-px"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: PIN_HTML }}
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 size-1.5 -translate-1/2 rounded-full bg-black/60" aria-hidden />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="Де я зараз"
          className="absolute right-3 bottom-12 z-10 grid size-12 place-items-center rounded-full bg-popover text-foreground shadow-lg ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <LocateFixed className={cn("size-5", locating && "animate-pulse")} aria-hidden />
        </button>
      </div>

      <div className="z-20 flex flex-col gap-3 border-t border-border bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="flex min-h-11 items-start gap-3" aria-live="polite">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            {resolving ? (
              <p className="text-[15px] text-muted-foreground">Шукаю адресу…</p>
            ) : address ? (
              <>
                <p className="truncate text-[15px] font-medium">{address.title}</p>
                {address.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{address.subtitle}</p>
                )}
              </>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                {addressFailed
                  ? "Не вдалося визначити адресу — точку все одно збережемо"
                  : "Адреси тут немає — але точку збережемо"}
              </p>
            )}
            {geoError && (
              <p className="mt-1 text-xs text-destructive">Не вдалося визначити, де ти. Дозволь доступ до геолокації.</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Пересунь карту, щоб пін став точно на місце зустрічі.</p>
        <Button
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          onClick={() => {
            onPick(center, resolving ? null : address);
            onClose();
          }}
        >
          Готово
        </Button>
      </div>
    </>
  );
}
