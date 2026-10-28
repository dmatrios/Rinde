"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastViewport } from "@/components/ui/toast";

const ModalPortalContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useModalPortal() {
  return useContext(ModalPortalContext);
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const portalHostRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-[1.5rem] border border-border/80 bg-card p-0 text-foreground shadow-[0_24px_70px_-26px_rgb(32_42_58_/_0.55)] animate-in fade-in zoom-in-95 duration-200 backdrop:bg-panel/45 backdrop:backdrop-blur-[2px]",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
    >
      <ModalPortalContext.Provider value={portalHostRef}>
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/70 bg-linear-to-b from-card to-background/55 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 id={titleId} className="text-lg font-bold tracking-tight">
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1.5 text-sm leading-6 text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="modal-scroll min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
        <div ref={portalHostRef} />
        <ToastViewport />
      </ModalPortalContext.Provider>
    </dialog>
  );
}
