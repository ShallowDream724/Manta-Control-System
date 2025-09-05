
import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import MobileLayout from './MobileLayout';
import TabletLayout from './TabletLayout';
import DesktopLayout from './DesktopLayout';
import LoadingScreen from './LoadingScreen';

interface AppLayoutProps {
  children: React.ReactNode;
  loading?: boolean;
}

/**
 * 主应用布局组件
 * 根据设备类型自动选择合适的布局
 */
export default function AppLayout({ children, loading = false }: AppLayoutProps) {
  const { breakpoint } = useResponsive();

  // 显示加载屏幕
  if (loading) {
    return <LoadingScreen />;
  }

  // 根据断点选择布局
  switch (breakpoint) {
    case 'mobile':
      return (
        <MobileLayout>
          {children}
        </MobileLayout>
      );

    case 'tablet':
      return (
        <TabletLayout>
          {children}
        </TabletLayout>
      );

    case 'desktop':
      return (
        <DesktopLayout>
          {children}
        </DesktopLayout>
      );

    default:
      return (
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      );
  }
}
