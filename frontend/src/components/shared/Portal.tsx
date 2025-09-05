/**
 * Portal组件
 * 将子组件渲染到document.body，确保最高层级显示
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface PortalProps {
  children: ReactNode;
  className?: string;
}

export default function Portal({ children, className }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const portalRoot = document.body;
  
  return createPortal(
    <div className={className}>
      {children}
    </div>,
    portalRoot
  );
}
