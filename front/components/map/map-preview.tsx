"use client";

import { useEffect, useRef } from "react";

import { addPin, createMap, type MapInstance } from "@/components/map/maplibre";
import type { GeoPoint } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/**
 * Карта з піном лише для перегляду: без перетягування й зуму, щоб на телефоні
 * не перехоплювати прокрутку сторінки.
 */
export function MapPreview({
  point,
  zoom = 15,
  className,
}: {
  point: GeoPoint;
  zoom?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { lat, lng } = point;

  useEffect(() => {
    let map: MapInstance | undefined;
    const controller = new AbortController();

    void createMap(
      containerRef.current!,
      { center: { lat, lng }, zoom, interactive: false },
      controller.signal,
    ).then((created) => {
      if (!created) return;
      map = created.map;
      addPin(created.maplibre, map, { lat, lng });
    });

    return () => {
      controller.abort();
      map?.remove();
    };
  }, [lat, lng, zoom]);

  // Розмір і форму задає обгортка: maplibre-gl.css перебиває класи Tailwind на самому контейнері.
  return (
    <div className={cn("overflow-hidden", className)}>
      <div ref={containerRef} className="map-surface size-full" />
    </div>
  );
}
