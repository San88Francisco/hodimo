"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ImageOff, MapPin, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { resolveImageUrl, saveMeetup } from "@/app/actions";
import { BottomBar } from "@/components/layout/bottom-bar";
import { LocationPicker } from "@/components/map/location-picker";
import { MapPreview } from "@/components/map/map-preview";
import { DatePickerChip } from "@/components/meetups/date-picker-chip";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isGoogleShareLink, normalizeImageUrl } from "@/lib/image-url";
import {
  formatDayKey,
  formatRelativeDay,
  formatWeekday,
  fromDateTimeInputs,
  isoWeekday,
  localDayKey,
  normalizeGroupUrl,
  toDateTimeInputs,
  type Category,
  type Meetup,
} from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Схема з повідомленнями мовою інтерфейсу. */
function makeSchema({ form: { errors: e } }: Dictionary) {
  return z
    .object({
      categoryId: z.string().min(1, e.category),
      title: z.string().trim().min(3, e.min(3)).max(80, e.max(80)),
      date: z.string().min(1, e.day),
      time: z.string().min(1, e.time),
      place: z.string().trim().min(2, e.place).max(120, e.max(120)),
      city: z.string().trim().min(2, e.city).max(80, e.max(80)),
      capacity: z
        .number({ error: e.number })
        .int(e.integer)
        .min(2, e.minPeople(2))
        .max(100, e.maxPeople(100))
        // null — без обмежень.
        .nullable(),
      description: z.string().trim().max(1000, e.max(1000)),
      location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
      imageUrl: z.union([
        z.literal(""),
        z
          .url({ protocol: /^https?$/, error: e.https })
          .refine((value) => !isGoogleShareLink(value), e.googleNoImage),
      ]),
      groupUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, error: e.https }).max(300, e.max(300))]),
    })
    .superRefine((value, ctx) => {
      if (value.date && value.time) {
        const startsAt = new Date(fromDateTimeInputs(value.date, value.time));
        if (startsAt.getTime() <= Date.now()) {
          ctx.addIssue({ code: "custom", path: ["time"], message: e.past });
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

/** Поля API → поля форми (startsAt розбитий на день і час). */
const API_FIELD: Record<string, keyof FormValues> = { startsAt: "time" };

function defaultsFor(meetup: Meetup | undefined, defaultCity: string): FormValues {
  if (!meetup) {
    return {
      categoryId: "",
      title: "",
      date: "",
      time: "19:00",
      place: "",
      city: defaultCity,
      capacity: 6,
      description: "",
      location: null,
      imageUrl: "",
      groupUrl: "",
    };
  }
  return {
    categoryId: meetup.category.id,
    title: meetup.title,
    ...toDateTimeInputs(meetup.startsAt),
    place: meetup.place,
    city: meetup.city,
    capacity: meetup.capacity,
    description: meetup.description,
    location: meetup.location,
    imageUrl: meetup.imageUrl ?? "",
    groupUrl: meetup.groupUrl ?? "",
  };
}

/** Швидкий вибір дня: сьогодні, завтра й найближчі вихідні. */
function useQuickDays(locale: Locale) {
  return useMemo(() => {
    const days = [
      { key: localDayKey(0), label: formatRelativeDay(0, locale) },
      { key: localDayKey(1), label: formatRelativeDay(1, locale) },
    ];
    for (let offset = 2; offset < 8; offset++) {
      const key = localDayKey(offset);
      const weekday = isoWeekday(key);
      if (weekday === 6 || weekday === 7) days.push({ key, label: formatWeekday(key, locale) });
    }
    return days;
  }, [locale]);
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary/60 text-muted-foreground ring-1 ring-white/8 hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Поле числа з кнопками −/+ — на телефоні зручніше, ніж набирати.
 * null — «без обмежень»: показуємо ∞, а будь-яка зміна повертає число.
 */
function NumberStepper({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  invalid,
}: {
  id: string;
  value: number | null;
  onChange: (value: number) => void;
  onBlur: () => void;
  min: number;
  max: number;
  invalid?: boolean;
}) {
  const { t } = useT();
  const unlimited = value === null;
  const current = value !== null && Number.isFinite(value) ? value : 6;
  const stepButton =
    "grid size-12 shrink-0 place-items-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-primary disabled:opacity-30";
  return (
    <div
      aria-invalid={invalid}
      className={cn(
        "flex h-12 w-44 items-center rounded-full border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30",
        unlimited && "border-dashed",
      )}
    >
      <button
        type="button"
        aria-label={t.form.less}
        className={stepButton}
        disabled={!unlimited && current <= min}
        onClick={() => onChange(unlimited ? current : Math.max(min, current - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-invalid={invalid}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none",
          unlimited && "text-2xl text-muted-foreground",
        )}
        value={unlimited ? "∞" : Number.isFinite(value) ? value : ""}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits === "" ? Number.NaN : Number(digits));
        }}
        onBlur={onBlur}
      />
      <button
        type="button"
        aria-label={t.form.more}
        className={stepButton}
        disabled={!unlimited && current >= max}
        onClick={() => onChange(unlimited ? current : Math.min(max, current + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

const INPUT = "h-12 rounded-xl px-3.5 text-base lg:h-11";

function isHttpUrl(value: string) {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Як картинка виглядатиме на картці; підказує, якщо сайт не віддає її. */
function ImagePreview({ src }: { src: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const { t } = useT();
  return (
    <div className="relative mt-1 aspect-video overflow-hidden rounded-xl bg-secondary ring-1 ring-white/5">
      {status !== "error" && (
        <Image
          src={src}
          alt={t.form.previewAlt}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(min-width: 640px) 40rem, 100vw"
          className={cn("object-cover transition-opacity", status === "ok" ? "opacity-100" : "opacity-0")}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          {t.form.loading}
        </span>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
          {t.form.previewError}
        </div>
      )}
    </div>
  );
}

export function MeetupForm({
  categories,
  meetup,
  submitLabel,
}: {
  categories: Category[];
  meetup?: Meetup;
  /** Напр. «Надіслати на розгляд» для користувача. */
  submitLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { locale, t } = useT();
  const quickDays = useQuickDays(locale);
  const defaults = defaultsFor(meetup, t.form.defaultCity);
  const schema = useMemo(() => makeSchema(t), [t]);
  const [customDate, setCustomDate] = useState(
    () => Boolean(defaults.date) && !quickDays.some((day) => day.key === defaults.date),
  );

  // Архівна категорія події, що редагується, лишається у виборі.
  const options =
    meetup && !categories.some((category) => category.id === meetup.category.id)
      ? [...categories, meetup.category]
      : categories;

  const [pickerOpen, setPickerOpen] = useState(false);
  const { register, control, handleSubmit, setError, setValue, getValues, formState } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: defaults,
      mode: "onTouched",
    });
  const { errors } = formState;
  const date = useWatch({ control, name: "date" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  // Посилання, які вже перевірили: true — це картинка, false — картинку не знайшли.
  const [checkedLinks, setCheckedLinks] = useState<Record<string, boolean>>(() =>
    defaults.imageUrl ? { [defaults.imageUrl]: true } : {},
  );
  // З якого сайту взяли картинку — підказка під полем.
  const [foundOn, setFoundOn] = useState<string | null>(null);
  const resolvingImage = isHttpUrl(imageUrl) && !(imageUrl in checkedLinks);

  // Будь-яке вставлене посилання → адреса самої картинки: текст навколо, google imgres,
  // share.google, пін у Pinterest, сторінка сайту, коротке посилання.
  useEffect(() => {
    const normalized = normalizeImageUrl(imageUrl);
    if (normalized !== imageUrl) {
      setValue("imageUrl", normalized, { shouldValidate: true });
      return;
    }
    if (!isHttpUrl(imageUrl) || imageUrl in checkedLinks) return;
    let cancelled = false;
    // Невелика пауза — щоб не смикати сервер на кожну літеру, якщо посилання набирають руками.
    const timer = setTimeout(() => {
      resolveImageUrl(imageUrl)
        .catch(() => null)
        .then((target) => {
          if (cancelled) return;
          if (target && target !== imageUrl) {
            setCheckedLinks((links) => ({ ...links, [imageUrl]: true, [target]: true }));
            setFoundOn(new URL(imageUrl).hostname.replace(/^www\./, ""));
            setValue("imageUrl", target, { shouldValidate: true });
          } else {
            setCheckedLinks((links) => ({ ...links, [imageUrl]: Boolean(target) }));
            setFoundOn(null);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [imageUrl, checkedLinks, setValue]);

  const onSubmit = handleSubmit((values) => {
    const { date, time, imageUrl, groupUrl, ...rest } = values;
    startTransition(async () => {
      const result = await saveMeetup(meetup?.id ?? null, {
        ...rest,
        startsAt: fromDateTimeInputs(date, time),
        imageUrl: imageUrl || null,
        groupUrl: groupUrl || null,
      });
      // При успіху action робить redirect, тож далі обробляємо лише помилку.
      if (!result) return;
      const fields = Object.entries(result.fieldErrors);
      for (const [path, message] of fields) {
        const field = API_FIELD[path] ?? (path as keyof FormValues);
        if (field in values) setError(field, { message });
      }
      if (fields.length === 0) setError("root", { message: result.message });
    });
  });

  const invalid = (name: keyof FormValues) => (errors[name] ? true : undefined);
  const pickDay = (key: string) => setValue("date", key, { shouldValidate: true, shouldTouch: true });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col pb-28 lg:pb-0">
      <FieldGroup className="gap-7">
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Field data-invalid={invalid("categoryId")}>
              <FieldLabel id="category-label" className="text-base">
                {t.form.what}
              </FieldLabel>
              <div role="radiogroup" aria-labelledby="category-label" className="flex flex-wrap gap-2">
                {options.map((category) => (
                  <Chip
                    key={category.id}
                    active={field.value === category.id}
                    onClick={() => field.onChange(category.id)}
                  >
                    <span aria-hidden>{category.emoji}</span>
                    {category.name}
                  </Chip>
                ))}
              </div>
              <FieldError errors={[errors.categoryId]} />
            </Field>
          )}
        />

        <Field data-invalid={invalid("title")}>
          <FieldLabel htmlFor="title" className="text-base">
            {t.form.title}
          </FieldLabel>
          <Input
            id="title"
            className={INPUT}
            placeholder={t.form.titlePlaceholder}
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={invalid("title")}
            {...register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={invalid("date") || invalid("time")}>
          <FieldLabel id="date-label" className="text-base">
            {t.form.when}
          </FieldLabel>
          <div role="radiogroup" aria-labelledby="date-label" className="flex flex-wrap gap-2">
            {quickDays.map((day) => (
              <Chip
                key={day.key}
                active={!customDate && date === day.key}
                onClick={() => {
                  setCustomDate(false);
                  pickDay(day.key);
                }}
              >
                {day.label}
              </Chip>
            ))}
            <DatePickerChip
              value={date}
              active={customDate}
              onChange={(key) => {
                setCustomDate(true);
                pickDay(key);
              }}
            />
          </div>

          <div className="mt-1 flex items-center gap-3">
            <Input
              id="time"
              type="time"
              aria-label={t.form.time}
              className={cn(INPUT, "w-36")}
              aria-invalid={invalid("time")}
              {...register("time")}
            />
            {date && <span className="text-sm text-muted-foreground">{formatDayKey(date, locale)}</span>}
          </div>
          <FieldError errors={[errors.date, errors.time]} />
        </Field>

        <Field data-invalid={invalid("place") || invalid("city")}>
          <FieldLabel htmlFor="place" className="text-base">
            {t.form.where}
          </FieldLabel>
          <div className="grid grid-cols-[1fr_8.5rem] gap-2">
            <Input
              id="place"
              className={INPUT}
              placeholder={t.form.placePlaceholder}
              enterKeyHint="next"
              aria-invalid={invalid("place")}
              {...register("place")}
            />
            <Input
              id="city"
              aria-label={t.form.city}
              className={INPUT}
              aria-invalid={invalid("city")}
              {...register("city")}
            />
          </div>
          <FieldError errors={[errors.place, errors.city]} />

          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <>
                {field.value ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <MapPreview
                      point={field.value}
                      className="aspect-video overflow-hidden rounded-xl ring-1 ring-white/5"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 flex-1 rounded-full"
                        onClick={() => setPickerOpen(true)}
                      >
                        <MapPin aria-hidden />
                        {t.form.changePoint}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 rounded-full px-4 text-muted-foreground"
                        onClick={() => field.onChange(null)}
                      >
                        {t.form.removePoint}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-input text-[15px] font-medium text-muted-foreground outline-none transition-colors hover:border-ring hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <MapPin className="size-4 text-primary" aria-hidden />
                    {t.form.markOnMap}
                    <span className="font-normal">{t.common.optional}</span>
                  </button>
                )}
                <LocationPicker
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  initial={field.value}
                  city={getValues("city")}
                  query={field.value ? "" : getValues("place")}
                  onPick={(point, place) => {
                    field.onChange(point);
                    if (place && !getValues("place").trim()) {
                      setValue("place", place.title.slice(0, 120), { shouldValidate: true });
                    }
                  }}
                />
              </>
            )}
          />
        </Field>

        <Controller
          control={control}
          name="capacity"
          render={({ field }) => (
            <Field data-invalid={invalid("capacity")}>
              <FieldLabel htmlFor="capacity" className="text-base">
                {t.form.capacity}
              </FieldLabel>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <NumberStepper
                  id="capacity"
                  min={2}
                  max={100}
                  value={field.value}
                  invalid={invalid("capacity")}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
                <label className="flex cursor-pointer items-center gap-2.5 text-[15px] select-none">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={field.value === null}
                    onChange={(event) => field.onChange(event.target.checked ? null : 6)}
                  />
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-md border transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                      field.value === null
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-input/30",
                    )}
                    aria-hidden
                  >
                    {field.value === null && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  {t.form.unlimited}
                </label>
              </div>
              <FieldError errors={[errors.capacity]} />
            </Field>
          )}
        />

        <Field data-invalid={invalid("description")}>
          <FieldLabel htmlFor="description" className="text-base">
            {t.form.details} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </FieldLabel>
          <Textarea
            id="description"
            rows={3}
            className="min-h-24 rounded-xl px-3.5 py-3 text-base"
            placeholder={t.form.detailsPlaceholder}
            aria-invalid={invalid("description")}
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={invalid("groupUrl")}>
          <FieldLabel htmlFor="groupUrl" className="text-base">
            {t.form.group} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </FieldLabel>
          <Input
            id="groupUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            className={INPUT}
            placeholder="https://t.me/…"
            aria-invalid={invalid("groupUrl")}
            {...register("groupUrl", { setValueAs: normalizeGroupUrl })}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">{t.form.groupHint}</p>
          <FieldError errors={[errors.groupUrl]} />
        </Field>

        <Field data-invalid={invalid("imageUrl")}>
          <FieldLabel htmlFor="imageUrl" className="text-base">
            {t.form.photo} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </FieldLabel>
          <Input
            id="imageUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            className={INPUT}
            placeholder="https://…"
            aria-invalid={invalid("imageUrl")}
            {...register("imageUrl", { setValueAs: (value: string) => value.trim() })}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">{t.form.photoHint}</p>
          {resolvingImage ? (
            <p className="text-sm text-muted-foreground">{t.form.resolvingImage}</p>
          ) : checkedLinks[imageUrl] === false ? (
            <p className="text-sm text-muted-foreground">{t.form.imageNotFound}</p>
          ) : (
            <FieldError errors={[errors.imageUrl]} />
          )}
          {foundOn && !resolvingImage && checkedLinks[imageUrl] && (
            <p className="text-xs text-primary">{t.form.foundOn(foundOn)}</p>
          )}
          {isHttpUrl(imageUrl) && !resolvingImage && checkedLinks[imageUrl] !== false && (
            <ImagePreview key={imageUrl} src={imageUrl} />
          )}
        </Field>
      </FieldGroup>

      {errors.root && (
        <p role="alert" className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <BottomBar className="lg:mt-8 lg:flex lg:justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending || resolvingImage}
          className="h-12 w-full rounded-full px-6 text-base font-semibold lg:h-11 lg:w-auto lg:text-sm"
        >
          {pending ? t.common.saving : submitLabel ?? (meetup ? t.form.saveChanges : t.common.createMeetup)}
        </Button>
      </BottomBar>
    </form>
  );
}
