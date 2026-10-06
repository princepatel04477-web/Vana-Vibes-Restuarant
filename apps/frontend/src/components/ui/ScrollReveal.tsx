'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
  delay?: number;
  staggerIndex?: number;
  staggerBaseDelay?: number;
  threshold?: number;
  once?: boolean;
  as?: React.ElementType;
}

export function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  distance = 24,
  duration = 450,
  delay = 0,
  staggerIndex = 0,
  staggerBaseDelay = 70,
  threshold = 0.05,
  once = true,
  as: Component = 'div',
  style,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Use IntersectionObserver with comfortable margin so reveal happens before full edge
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '100px 0px 100px 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once, prefersReducedMotion]);

  // Compute transform based on direction
  const getInitialTransform = () => {
    if (prefersReducedMotion) return 'none';
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      case 'none':
      default:
        return 'none';
    }
  };

  const totalDelay = Math.min(delay + staggerIndex * staggerBaseDelay, 400);
  const activeVisible = prefersReducedMotion || isVisible;

  const transitionStyle: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        opacity: activeVisible ? 1 : 0,
        transform: activeVisible ? 'translate3d(0, 0, 0)' : getInitialTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${totalDelay}ms`,
        willChange: activeVisible ? 'auto' : 'opacity, transform',
        ...style,
      };

  return (
    <Component
      ref={ref}
      className={`scroll-reveal-container ${className}`}
      style={transitionStyle}
      {...props}
    >
      {children}
    </Component>
  );
}
