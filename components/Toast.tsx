"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "loading";

interface ToastProps {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used inside ToastProvider");
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const showToast = (message: string, type: ToastType = "success") => {
        const id = Date.now(); // unique id
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast UI */}
            <div className="fixed top-4 right-4 z-[9999] space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-md shadow-md text-white animate-fade-in-down
            ${toast.type === "success" && "bg-green-600"}
            ${toast.type === "error" && "bg-red-600"}
            ${toast.type === "loading" && "bg-gray-700"}
          `}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
