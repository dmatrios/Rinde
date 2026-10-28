"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ModalPopover } from "@/components/ui/modal-popover";

const weekdayLabels = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
const monthFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function DatePicker({
  disabled = false,
  id,
  name,
  onChange,
  value,
}: {
  disabled?: boolean;
  id: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedDate = dateFromValue(value);
  const [month, setMonth] = useState(() => startOfMonth(selectedDate ?? todayInLima()));
  const today = todayInLima();
  const days = calendarDays(month);

  return (
    <div>
      <input name={name} type="hidden" value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{formatSelectedDate(selectedDate)}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays size={17} />
          <ChevronDown className={open ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"} size={16} />
        </span>
      </button>
      {open && (
        <ModalPopover
          anchorRef={triggerRef}
          open={open}
          onOpenChange={setOpen}
          contentWidth={292}
          maxHeight={356}
          className="p-3"
        >
          <div role="dialog" aria-label="Elegir fecha">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonth((current) => moveMonth(current, -1))}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-semibold capitalize">{monthFormatter.format(month)}</p>
              <button
                type="button"
                onClick={() => setMonth((current) => moveMonth(current, 1))}
                disabled={sameMonth(month, today)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center" role="grid">
              {weekdayLabels.map((day) => (
                <span key={day} className="pb-1 text-[10px] font-semibold text-muted-foreground">
                  {day}
                </span>
              ))}
              {days.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} />;
                const isSelected = sameDay(day, selectedDate);
                const isToday = sameDay(day, today);
                const unavailable = day > today;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={unavailable}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onChange(valueFromDate(day));
                      setOpen(false);
                    }}
                    className={`mx-auto flex size-8 items-center justify-center rounded-lg text-xs transition-colors ${
                      isSelected
                        ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                        : isToday
                          ? "bg-secondary font-semibold text-secondary-foreground"
                          : "hover:bg-muted"
                    } disabled:pointer-events-none disabled:opacity-30`}
                  >
                    {day.getUTCDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange(valueFromDate(today));
                  setMonth(startOfMonth(today));
                  setOpen(false);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Listo
              </button>
            </div>
          </div>
        </ModalPopover>
      )}
    </div>
  );
}

function dateFromValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function todayInLima() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function moveMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function calendarDays(month: Date) {
  const firstWeekday = month.getUTCDay();
  const totalDays = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return Array.from({ length: firstWeekday + totalDays }, (_, index) =>
    index < firstWeekday
      ? null
      : new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index - firstWeekday + 1)),
  );
}

function sameDay(first: Date | null, second: Date | null) {
  return !!first && !!second && first.getTime() === second.getTime();
}

function sameMonth(first: Date, second: Date) {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth()
  );
}

function valueFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatSelectedDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Elige una fecha";
}
