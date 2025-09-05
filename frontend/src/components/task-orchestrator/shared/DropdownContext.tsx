/**
 * 下拉菜单全局状态管理
 * 确保同时只有一个下拉菜单打开
 */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DropdownContextType {
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  isDropdownActive: (id: string) => boolean;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const isDropdownActive = (id: string) => activeDropdown === id;

  return (
    <DropdownContext.Provider value={{
      activeDropdown,
      setActiveDropdown,
      isDropdownActive
    }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdown() {
  const context = useContext(DropdownContext);
  if (context === undefined) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
}
