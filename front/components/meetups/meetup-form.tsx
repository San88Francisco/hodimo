"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ImageOff, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { resolveImageUrl, saveMeetup } from "@/app/actions";
import { BottomBar } from "@/components/layout/bottom-bar";
import { DatePickerChip } from "@/components/meetups/date-picker-chip";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isGoogleShareLink, normalizeImageUrl } from "@/lib/image-url";
import {
  formatDayKey,
  fromDateTimeInputs,
  isoWeekday,
  localDayKey,
  toDateTimeInputs,
  type Category,
  type Meetup,
} from "@/lib/meetups";
import { cn } from "@/lib/utils";

const FormSchema = z
  .object({
    categoryId: z.string().min(1, "Обери, що плануєш"),
    title: z.string().trim().min(3, "Мінімум 3 символи").max(80, "Максимум 80 символів"),
    date: z.string().min(1, "Обери день"),
    time: z.string().min(1, "Вкажи час"),
    place: z.string().trim().min(2, "Де зустрічаємось?").max(120, "Максимум 120 символів"),
    city: z.string().trim().min(2, "Вкажи місто").max(80, "Максимум 80 символів"),
    capacity: z
      .number({ error: "Вкажи число" })
      .int("Ціле число")
      .min(2, "Мінімум 2")
      .max(100, "Максимум 100")
      // null — без обмежень.
      .nullable(),
    description: z.string().trim().max(1000, "Максимум 1000 символів"),
    imageUrl: z.union([
      z.literal(""),
      z
        .url({ protocol: /^https?$/, error: "Встав посилання, що починається з https://" })
        .refine((value) => !isGoogleShareLink(value), "За цим посиланням Google не знайшлося картинки"),
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.date && value.time) {
      const startsAt = new Date(fromDateTimeInputs(value.date, value.time));
      if (startsAt.getTime() <= Date.now()) {
        ctx.addIssue({ code: "custom", path: ["time"], message: "Цей час уже минув" });
      }
    }
  });

type FormValues = z.infer<typeof FormSchema>;

/** Поля API → поля форми (startsAt розбитий на день і час). */
const API_FIELD: Record<string, keyof FormValues> = { startsAt: "time" };

function defaultsFor(meetup?: Meetup): FormValues {
  if (!meetup) {
    return {
      categoryId: "",
      title: "",
      date: "",
      time: "19:00",
      place: "",
      city: "Познань",
      capacity: 6,
      description: "",
      imageUrl: "",
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
    imageUrl: meetup.imageUrl ?? "",
  };
}

/** Швидкий вибір дня: сьогодні, завтра й найближчі вихідні. */
function useQuickDays() {
  return useMemo(() => {
    const days = [
      { key: localDayKey(0), label: "Сьогодні" },
      { key: localDayKey(1), label: "Завтра" },
    ];
    for (let offset = 2; offset < 8; offset++) {
      const key = localDayKey(offset);
      const weekday = isoWeekday(key);
      if (weekday === 6) days.push({ key, label: "Субота" });
      if (weekday === 7) days.push({ key, label: "Неділя" });
    }
    return days;
  }, []);
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
        aria-label="Менше"
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
        aria-label="Більше"
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
  return (
    <div className="relative mt-1 aspect-video overflow-hidden rounded-xl bg-secondary ring-1 ring-white/5">
      {status !== "error" && (
        <Image
          src={src}
          alt="Превʼю фото"
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
          Завантажую…
        </span>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
          Не вдалося завантажити. Спробуй інше посилання — саме на картинку, а не на сторінку.
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
  const quickDays = useQuickDays();
  const defaults = defaultsFor(meetup);
  const [customDate, setCustomDate] = useState(
    () => Boolean(defaults.date) && !quickDays.some((day) => day.key === defaults.date),
  );

  // Архівна категорія події, що редагується, лишається у виборі.
  const options =
    meetup && !categories.some((category) => category.id === meetup.category.id)
      ? [...categories, meetup.category]
      : categories;

  const { register, control, handleSubmit, setError, setValue, formState } =
    useForm<FormValues>({
      resolver: zodResolver(FormSchema),
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
    const { date, time, imageUrl, ...rest } = values;
    startTransition(async () => {
      const result = await saveMeetup(meetup?.id ?? null, {
        ...rest,
        startsAt: fromDateTimeInputs(date, time),
        imageUrl: imageUrl || null,
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
                Що плануєш?
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
            Назва
          </FieldLabel>
          <Input
            id="title"
            className={INPUT}
            placeholder="Наприклад: кава в центрі"
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={invalid("title")}
            {...register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={invalid("date") || invalid("time")}>
          <FieldLabel id="date-label" className="text-base">
            Коли?
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
              aria-label="Час"
              className={cn(INPUT, "w-36")}
              aria-invalid={invalid("time")}
              {...register("time")}
            />
            {date && <span className="text-sm text-muted-foreground">{formatDayKey(date)}</span>}
          </div>
          <FieldError errors={[errors.date, errors.time]} />
        </Field>

        <Field data-invalid={invalid("place") || invalid("city")}>
          <FieldLabel htmlFor="place" className="text-base">
            Де?
          </FieldLabel>
          <div className="grid grid-cols-[1fr_8.5rem] gap-2">
            <Input
              id="place"
              className={INPUT}
              placeholder="Кав'ярня, парк, адреса"
              enterKeyHint="next"
              aria-invalid={invalid("place")}
              {...register("place")}
            />
            <Input
              id="city"
              aria-label="Місто"
              className={INPUT}
              aria-invalid={invalid("city")}
              {...register("city")}
            />
          </div>
          <FieldError errors={[errors.place, errors.city]} />
        </Field>

        <Controller
          control={control}
          name="capacity"
          render={({ field }) => (
            <Field data-invalid={invalid("capacity")}>
              <FieldLabel htmlFor="capacity" className="text-base">
                Скільки людей?
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
                  Без обмежень
                </label>
              </div>
              <FieldError errors={[errors.capacity]} />
            </Field>
          )}
        />

        <Field data-invalid={invalid("description")}>
          <FieldLabel htmlFor="description" className="text-base">
            Деталі <span className="font-normal text-muted-foreground">— необов&apos;язково</span>
          </FieldLabel>
          <Textarea
            id="description"
            rows={3}
            className="min-h-24 rounded-xl px-3.5 py-3 text-base"
            placeholder="Що робимо, що взяти з собою"
            aria-invalid={invalid("description")}
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={invalid("imageUrl")}>
          <FieldLabel htmlFor="imageUrl" className="text-base">
            Фото <span className="font-normal text-muted-foreground">— необов&apos;язково</span>
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            Встав будь-яке посилання: пін з Pinterest, «Поділитися» з Google Картинок, сторінку сайту
            чи адресу самого зображення — картинку знайдемо самі.
          </p>
          {resolvingImage ? (
            <p className="text-sm text-muted-foreground">Шукаю картинку за посиланням…</p>
          ) : checkedLinks[imageUrl] === false ? (
            <p className="text-sm text-muted-foreground">
              На цій сторінці картинку не знайшли — спробуй інше посилання або адресу самого зображення.
            </p>
          ) : (
            <FieldError errors={[errors.imageUrl]} />
          )}
          {foundOn && !resolvingImage && checkedLinks[imageUrl] && (
            <p className="text-xs text-primary">Взяли картинку зі сторінки {foundOn}</p>
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
          {pending ? "Зберігаю…" : submitLabel ?? (meetup ? "Зберегти зміни" : "Створити подію")}
        </Button>
      </BottomBar>
    </form>
  );
}
