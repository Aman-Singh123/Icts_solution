"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface LoaderContextType {
    showLoader: () => void;
    hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function useLoader() {
    const context = useContext(LoaderContext);
    if (!context) throw new Error("useLoader must be used within LoaderProvider");
    return context;
}

export function LoaderProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(false);

    const showLoader = () => setLoading(true);
    const hideLoader = () => setLoading(false);

    return (
        <LoaderContext.Provider value={{ showLoader, hideLoader }}>
            {children}

            {loading && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                    <ClipLoader size={60} color="#2563EB" speedMultiplier={1} />
                </div>
            )}
        </LoaderContext.Provider>
    );
}
