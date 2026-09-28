import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Toast = { id: number; text: string };
const Ctx = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="fixed z-[90] bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-40px)] max-w-sm"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="toast panel-glass flex items-center gap-3 px-4 py-3 text-[15px] shadow-2xl shadow-black/60">
            <Icon name="check" size={16} className="text-cobalt-hi" />
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
