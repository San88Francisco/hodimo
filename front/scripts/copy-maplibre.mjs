/*
 * MapLibre 6 шукає свій воркер поруч із власним файлом (import.meta.url), а після бандлінгу
 * Next цей шлях ламається. Тому віддаємо бібліотеку як статику з public/vendor/maplibre
 * і вантажимо її лише тоді, коли відкривають карту. Запускається перед dev і build.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const target = join(import.meta.dirname, "..", "public", "vendor", "maplibre");

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs"]) {
  copyFileSync(join(dist, file), join(target, file));
}
