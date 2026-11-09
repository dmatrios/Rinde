"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronsRight } from "lucide-react";

const HANDLE_SIZE = 48;
const TRACK_INSET = 4;
const COMPLETE_AT = 0.78;

export function SlideToStart({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    max: number;
    value: number;
  } | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [complete, setComplete] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const reset = () => {
    dragRef.current = null;
    setDragging(false);
    setOffset(0);
    setReady(false);
  };

  const finish = () => {
    setDragging(false);
    setComplete(true);
    timeoutRef.current = window.setTimeout(() => {
      setOffset(0);
      setComplete(false);
      timeoutRef.current = null;
      onComplete();
    }, 220);
  };

  return (
    <div
      ref={trackRef}
      className={`relative mt-5 h-14 w-full touch-none select-none overflow-hidden rounded-full bg-primary shadow-sm ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={(event) => {
        if (complete || (event.pointerType === "mouse" && event.button !== 0))
          return;
        const max = Math.max(
          0,
          event.currentTarget.getBoundingClientRect().width -
            HANDLE_SIZE -
            TRACK_INSET * 2,
        );
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX - offset,
          max,
          value: offset,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag.value = Math.min(
          drag.max,
          Math.max(0, event.clientX - drag.startX),
        );
        setOffset(drag.value);
        setReady(drag.max > 0 && drag.value >= drag.max * COMPLETE_AT);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (drag.max > 0 && drag.value >= drag.max * COMPLETE_AT) {
          setOffset(drag.max);
          finish();
        } else {
          reset();
        }
      }}
      onPointerCancel={reset}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 bg-primary-foreground/15 ${dragging ? "" : "transition-[width] duration-300 ease-out motion-reduce:transition-none"}`}
        style={{ width: offset + HANDLE_SIZE + TRACK_INSET * 2 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-14 right-3 flex items-center justify-center gap-1 text-center text-sm font-semibold text-primary-foreground"
      >
        {complete
          ? "Listo"
          : ready
            ? "Suelta para continuar"
            : "Desliza para iniciar"}
        {!complete && !ready && (
          <ChevronsRight size={16} className="opacity-70" />
        )}
      </span>
      <button
        type="button"
        aria-label="Iniciar jornada"
        aria-describedby="slide-start-help"
        className={`absolute left-1 top-1 flex size-12 touch-none items-center justify-center rounded-full bg-primary-foreground text-primary shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/60 ${dragging ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"}`}
        style={{ transform: `translateX(${offset}px)` }}
        onClick={(event) => {
          if (event.detail === 0 && !complete) onComplete();
        }}
      >
        {complete ? <Check size={20} /> : <ArrowRight size={20} />}
      </button>
      <span id="slide-start-help" className="sr-only">
        Desliza hacia la derecha. Con teclado, presiona Enter o Espacio.
      </span>
    </div>
  );
}
