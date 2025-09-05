/**
 * 元素位置跟踪Hook
 * 动态计算元素的屏幕坐标，用于弹窗定位
 */

import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface UseElementPositionOptions {
  enabled?: boolean;
  offset?: {
    x?: number;
    y?: number;
  };
}

export function useElementPosition(
  elementRef: RefObject<HTMLElement | null>,
  options: UseElementPositionOptions = {}
) {
  const { enabled = true, offset = {} } = options;
  const [position, setPosition] = useState<ElementPosition | null>(null);

  const updatePosition = useCallback(() => {
    if (!enabled || !elementRef.current) {
      setPosition(null);
      return;
    }

    const rect = elementRef.current.getBoundingClientRect();

    // 使用视口坐标，不加滚动偏移
    // 这样弹窗会相对于视口定位，跟随按钮移动
    setPosition({
      x: rect.left + (offset.x || 0),
      y: rect.top + (offset.y || 0),
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    });
  }, [enabled, elementRef, offset.x, offset.y]);

  useEffect(() => {
    if (!enabled) return;

    // 初始计算
    updatePosition();

    // 监听各种可能改变位置的事件
    const events = ['scroll', 'resize', 'orientationchange'];
    
    events.forEach(event => {
      window.addEventListener(event, updatePosition, { passive: true });
    });

    // 监听DOM变化（如果元素位置因为其他元素变化而改变）
    const observer = new MutationObserver(updatePosition);
    if (elementRef.current) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updatePosition);
      });
      observer.disconnect();
    };
  }, [enabled, updatePosition]);

  return {
    position,
    updatePosition
  };
}

/**
 * 计算弹窗最佳显示位置
 * 确保弹窗不会超出视口边界
 */
export function calculatePopoverPosition(
  triggerPosition: ElementPosition,
  popoverSize: { width: number; height: number },
  preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  offset: number = 8
): { x: number; y: number; placement: string } {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const positions = {
    bottom: {
      x: triggerPosition.left + triggerPosition.width / 2 - popoverSize.width / 2,
      y: triggerPosition.bottom + offset,
      placement: 'bottom'
    },
    top: {
      x: triggerPosition.left + triggerPosition.width / 2 - popoverSize.width / 2,
      y: triggerPosition.top - popoverSize.height - offset,
      placement: 'top'
    },
    right: {
      x: triggerPosition.right + offset,
      y: triggerPosition.top + triggerPosition.height / 2 - popoverSize.height / 2,
      placement: 'right'
    },
    left: {
      x: triggerPosition.left - popoverSize.width - offset,
      y: triggerPosition.top + triggerPosition.height / 2 - popoverSize.height / 2,
      placement: 'left'
    }
  };

  // 检查首选位置是否适合（使用视口坐标）
  const preferred = positions[preferredPlacement];
  if (
    preferred.x >= 0 &&
    preferred.x + popoverSize.width <= viewport.width &&
    preferred.y >= 0 &&
    preferred.y + popoverSize.height <= viewport.height
  ) {
    return preferred;
  }

  // 尝试其他位置
  const placements: Array<keyof typeof positions> = ['bottom', 'top', 'right', 'left'];
  for (const placement of placements) {
    const pos = positions[placement];
    if (
      pos.x >= 0 &&
      pos.x + popoverSize.width <= viewport.width &&
      pos.y >= 0 &&
      pos.y + popoverSize.height <= viewport.height
    ) {
      return pos;
    }
  }

  // 如果都不适合，使用首选位置并调整到视口内
  const fallback = { ...preferred };

  // 水平调整
  if (fallback.x < 0) {
    fallback.x = 8;
  } else if (fallback.x + popoverSize.width > viewport.width) {
    fallback.x = viewport.width - popoverSize.width - 8;
  }

  // 垂直调整
  if (fallback.y < 0) {
    fallback.y = 8;
  } else if (fallback.y + popoverSize.height > viewport.height) {
    fallback.y = viewport.height - popoverSize.height - 8;
  }

  return fallback;
}
