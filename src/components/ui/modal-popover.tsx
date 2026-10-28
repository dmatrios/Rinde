"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useModalPortal } from "@/components/ui/modal";

type Placement = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

const VIEWPORT_MARGIN = 12;
const MENU_OFFSET = 8;
const MENU_MAX_HEIGHT = 280;

export function ModalPopover({
  anchorRef,
  children,
  className,
  contentWidth,
  maxHeight = MENU_MAX_HEIGHT,
  open,
  onOpenChange,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  contentWidth?: number;
  maxHeight?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const portalHostRef = useModalPortal();
  const contentRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const updatePlacement = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const boundedMaxHeight = Math.max(84, Math.min(maxHeight, availableBelow));
    const width = Math.min(
      Math.max(rect.width, contentWidth ?? rect.width),
      window.innerWidth - VIEWPORT_MARGIN * 2,
    );
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    const top = rect.bottom + MENU_OFFSET;

    setPlacement({ left, maxHeight: boundedMaxHeight, top, width });
  }, [anchorRef, contentWidth, maxHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    setPortalTarget(portalHostRef?.current ?? document.body);
    updatePlacement();
  }, [open, portalHostRef, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const dismissOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !anchorRef.current?.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        onOpenChange(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const refreshPlacement = () => updatePlacement();

    document.addEventListener("pointerdown", dismissOnOutsidePress);
    document.addEventListener("keydown", dismissOnEscape);
    window.addEventListener("resize", refreshPlacement);
    window.addEventListener("scroll", refreshPlacement, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePress);
      document.removeEventListener("keydown", dismissOnEscape);
      window.removeEventListener("resize", refreshPlacement);
      window.removeEventListener("scroll", refreshPlacement, true);
    };
  }, [anchorRef, onOpenChange, open, updatePlacement]);

  if (!open || !placement || !portalTarget) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        left: placement.left,
        maxHeight: placement.maxHeight,
        top: placement.top,
        width: placement.width,
      }}
      className={cn(
        "modal-popover fixed z-[60] overflow-y-auto rounded-xl border border-border/80 bg-card p-1.5 shadow-[0_18px_40px_-20px_rgb(32_42_58_/_0.55)] animate-in fade-in zoom-in-95 duration-150",
        className,
      )}
    >
      {children}
    </div>,
    portalTarget,
  );
}
