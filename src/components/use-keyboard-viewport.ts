'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/** iOS pans its visual viewport as well as resizing it. Height alone therefore
 * anchors a composer above/below the keyboard after Safari scrolls to an input.
 * WKWebView may resize innerHeight too: retain the unfocused baseline instead
 * of comparing two values that have both already shrunk. */
export function useKeyboardViewport(active: boolean) {
  const [viewport, setViewport] = useState({ height: 0, top: 0, keyboardOpen: false });
  useEffect(() => {
    const visual = window.visualViewport;
    let baseline = Math.max(window.innerHeight, visual?.height ?? 0);
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = document.activeElement;
        const editing = element instanceof HTMLElement && (element.matches('input:not([type=checkbox]):not([type=range]),textarea') || element.isContentEditable);
        const height = visual?.height ?? window.innerHeight;
        const top = Math.max(0, visual?.offsetTop ?? 0);
        // Pinch zoom also shrinks visualViewport; it is not a software keyboard.
        const zoomed = Math.abs((visual?.scale ?? 1) - 1) > 0.05;
        if (!editing && baseline - height < 150) baseline = Math.max(window.innerHeight, height);
        const keyboardOpen = active && editing && !zoomed && Math.max(window.innerHeight - height, baseline - height) > 150;
        setViewport(previous => previous.height === height && previous.top === top && previous.keyboardOpen === keyboardOpen ? previous : { height, top, keyboardOpen });
      });
    };
    measure();
    visual?.addEventListener('resize', measure);
    visual?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    document.addEventListener('focusin', measure);
    document.addEventListener('focusout', measure);
    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener('resize', measure);
      visual?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', measure);
      document.removeEventListener('focusout', measure);
    };
  }, [active]);
  const style: CSSProperties | undefined = viewport.height ? {
    height: viewport.height,
    ...(viewport.keyboardOpen ? { position: 'fixed', top: viewport.top, left: '50%', transform: 'translateX(-50%)', width: '100%' } : {}),
  } : undefined;
  return { keyboardOpen: viewport.keyboardOpen, viewportStyle: style };
}
