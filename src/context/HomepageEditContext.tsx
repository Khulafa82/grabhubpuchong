import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface Ctx {
  editing: boolean;
  open: () => void;
  close: () => void;
}

const HomepageEditContext = createContext<Ctx | undefined>(undefined);

export const HomepageEditProvider = ({ children }: { children: ReactNode }) => {
  const [editing, setEditing] = useState(false);
  const open = useCallback(() => setEditing(true), []);
  const close = useCallback(() => setEditing(false), []);
  return (
    <HomepageEditContext.Provider value={{ editing, open, close }}>
      {children}
    </HomepageEditContext.Provider>
  );
};

export const useHomepageEdit = () => {
  const ctx = useContext(HomepageEditContext);
  if (!ctx) throw new Error("useHomepageEdit must be used within HomepageEditProvider");
  return ctx;
};