import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }
        try {
            if (typeof window !== "undefined" && (window as any).vscode && (window as any).__vscState) {
                // If injected by vscode wrapper logic before Mount
                const item = (window as any).__vscState[key];
                return item !== undefined ? item : initialValue;
            }
            if (typeof window !== "undefined" && !(window as any).vscode) {
                const item = window.localStorage.getItem(key);
                return item ? JSON.parse(item) : initialValue;
            }
            return initialValue;
        } catch (error) {
            console.warn(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            setStoredValue(prevStore => {
                const valueToStore = value instanceof Function ? value(prevStore) : value;
                if (typeof window !== "undefined") {
                    if ((window as any).vscode) {
                        (window as any).vscode.postMessage({
                            command: 'saveState',
                            key: key,
                            value: valueToStore
                        });
                    } else {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    }
                }
                return valueToStore;
            });
        } catch (error) {
            console.warn(error);
        }
    };

    return [storedValue, setValue] as const;
}
