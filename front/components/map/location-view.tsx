"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Map as MapIcon, Navigation, X } from "lucide-react";

import { addPin, createMap, type MapInstance } from "@/components/map/maplibre";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { mapsUrl, type GeoPoint } from "@/lib/meetups";
import { openExternal } from "@/lib/telegram";

/**
 * Кнопка «На карті» на сторінці події. Живої карти на сторінці немає (на телефоні вона
 * гальмує прокрутку) — повна карта відкривається поверх лише на тап.
 */
export function LocationButton({ point, label }: { point: GeoPoint; label: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useT();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="mt-2 flex h-9 w-fit items-center gap-1.5 rounded-full bg-secondary px-3.5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring">
        <MapIcon className="size-4" aria-hidden />
        {t.meetup.onMap}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <LocationMap point={point} label={label} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LocationMap({ point, label }: { point: GeoPoint; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useT();

  // Поки карта відкрита, свайп униз у Telegram не згортає застосунок.
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.disableVerticalSwipes?.();
    return () => webApp?.enableVerticalSwipes?.();
  }, []);

  useEffect(() => {
    let map: MapInstance | undefined;
    const controller = new AbortController();

    void createMap(containerRef.current!, { center: point, zoom: 15.5 }, controller.signal).then(
      (created) => {
        if (!created) return;
        map = created.map;
        addPin(created.maplibre, map, point);
      },
    );

    return () => {
      controller.abort();
      map?.remove();
    };
    // Карту створюємо один раз на відкриття.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="z-20 flex items-center gap-2 border-b border-border bg-background px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <Dialog.Close
          aria-label={t.common.close}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden />
        </Dialog.Close>
        <Dialog.Title className="min-w-0 flex-1 truncate text-base font-semibold">{label}</Dialog.Title>
      </div>

      <div className="relative flex-1">
        {/* Позиціонує обгортка: maplibre-gl.css ставить контейнеру карти position: relative
            поверх класів Tailwind — з absolute на ньому самому карта схлопується до висоти 0. */}
        <div className="absolute inset-0">
          <div ref={containerRef} className="map-surface size-full" />
        </div>
      </div>

      <div className="z-20 border-t border-border bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <Button
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          onClick={() => openExternal(mapsUrl(point))}
        >
          <Navigation aria-hidden />
          {t.meetup.route}
        </Button>
      </div>
    </>
  );
}
