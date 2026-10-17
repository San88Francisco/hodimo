"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { uk } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localDayKey } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** `YYYY-MM-DD` ↔ локальна Date опівдні (щоб перехід на літній час не зсунув день). */
const keyToDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
};
const dateToKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const shortDate = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" });

/**
 * Чіп «Інший день», що відкриває календар. Коли день обрано тут,
 * на чіпі показується дата, а сам чіп підсвічується як активний.
 */
export function DatePickerChip({
  value,
  active,
  onChange,
}: {
  value: string;
  active: boolean;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = active && value ? keyToDate(value) : undefined;
  const today = keyToDate(localDayKey(0));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary/60 text-muted-foreground ring-1 ring-white/8 hover:bg-secondary hover:text-foreground",
        )}
      >
        <CalendarDays className="size-4" aria-hidden />
        {selected ? shortDate.format(selected) : "Інший день"}
        <ChevronDown
          className={cn("size-3.5 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-auto rounded-2xl bg-card p-3 ring-white/10 shadow-xl shadow-black/40"
      >
        <Calendar
          mode="single"
          locale={uk}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? today}
          startMonth={today}
          disabled={{ before: today }}
          showOutsideDays={false}
          onSelect={(date) => {
            if (!date) return;
            onChange(dateToKey(date));
            setOpen(false);
          }}
          className={cn(
            "bg-transparent p-0 [--cell-radius:9999px] [--cell-size:--spacing(10)]",
            "[&_[data-slot=calendar]]:w-full",
          )}
          classNames={{
            caption_label: "text-[15px] font-semibold capitalize",
            weekday: "flex-1 text-xs font-medium text-muted-foreground capitalize select-none",
            today: "rounded-full text-primary [&_button]:font-semibold",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
