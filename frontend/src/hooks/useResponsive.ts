import { useState, useEffect } from 'react';
import type { BreakpointType, ResponsiveConfig } from '../types';

/**
 * 响应式设计Hook
 * 提供当前屏幕断点信息和响应式状态
 */
export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      breakpoint: getBreakpoint(width),
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      screenWidth: width,
      screenHeight: height
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setConfig({
        breakpoint: getBreakpoint(width),
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return config;
}

/**
 * 根据屏幕宽度获取断点类型
 */
function getBreakpoint(width: number): BreakpointType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * 设备检测Hook
 * 检测设备类型和特性
 */
export function useDeviceDetection() {
  const [deviceInfo] = useState(() => {
    const userAgent = navigator.userAgent;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent),
      isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isTouchDevice,
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
      isChrome: /Chrome/.test(userAgent),
      isFirefox: /Firefox/.test(userAgent),
      supportsHover: !isTouchDevice,
      pixelRatio: window.devicePixelRatio || 1
    };
  });

  return deviceInfo;
}

/**
 * 媒体查询Hook
 * 监听特定的媒体查询变化
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/**
 * 屏幕方向Hook
 * 监听屏幕方向变化
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight,
        angle: (screen.orientation?.angle) || 0
      };
    }
    return { isPortrait: true, isLandscape: false, angle: 0 };
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation({
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight,
        angle: (screen.orientation?.angle) || 0
      });
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * 视口Hook
 * 提供视口相关信息
 */
export function useViewport() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollY: window.scrollY,
        scrollX: window.scrollX
      };
    }
    return { width: 0, height: 0, scrollY: 0, scrollX: 0 };
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport(prev => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight
      }));
    };

    const handleScroll = () => {
      setViewport(prev => ({
        ...prev,
        scrollY: window.scrollY,
        scrollX: window.scrollX
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return viewport;
}

/**
 * 预设的媒体查询
 */
export const mediaQueries = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)',
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
};

/**
 * 响应式值Hook
 * 根据断点返回不同的值
 */
export function useResponsiveValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}): T {
  const { breakpoint } = useResponsive();
  
  return values[breakpoint] ?? values.default;
}

/**
 * 断点匹配Hook
 * 检查当前是否匹配指定断点
 */
export function useBreakpoint(targetBreakpoint: BreakpointType): boolean {
  const { breakpoint } = useResponsive();
  return breakpoint === targetBreakpoint;
}

/**
 * 最小断点Hook
 * 检查当前是否大于等于指定断点
 */
export function useMinBreakpoint(minBreakpoint: BreakpointType): boolean {
  const { breakpoint } = useResponsive();
  
  const breakpointOrder: BreakpointType[] = ['mobile', 'tablet', 'desktop'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const minIndex = breakpointOrder.indexOf(minBreakpoint);
  
  return currentIndex >= minIndex;
}

/**
 * 最大断点Hook
 * 检查当前是否小于等于指定断点
 */
export function useMaxBreakpoint(maxBreakpoint: BreakpointType): boolean {
  const { breakpoint } = useResponsive();
  
  const breakpointOrder: BreakpointType[] = ['mobile', 'tablet', 'desktop'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const maxIndex = breakpointOrder.indexOf(maxBreakpoint);
  
  return currentIndex <= maxIndex;
}
