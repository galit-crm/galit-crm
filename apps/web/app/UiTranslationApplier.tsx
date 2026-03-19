'use client';

import { translateUiString } from '@/src/lib/he-labels';
import { useEffect, useMemo, useRef } from 'react';

function translateElementText(el: Element) {
  // Replace placeholder attributes
  const placeholder = (el as any).getAttribute?.('placeholder');
  if (typeof placeholder === 'string' && placeholder) {
    const next = translateUiString(placeholder);
    if (next !== placeholder) (el as any).setAttribute('placeholder', next);
  }

  // Translate visible text only for leaf elements to avoid destroying icons inside buttons.
  const text = el.textContent;
  if (!text) return;
  if ((el as any).childElementCount > 0) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  const translated = translateUiString(trimmed);
  if (translated !== trimmed) {
    // Keep surrounding whitespace minimal; UI strings are generally standalone.
    el.textContent = translated;
  }
}

function translateSubtree(root: Node) {
  if (!(root instanceof Element)) return;
  const all = root.querySelectorAll('*');
  for (const el of all) translateElementText(el);
  translateElementText(root);
}

export default function UiTranslationApplier() {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  const observerConfig = useMemo(
    () => ({
      childList: true,
      subtree: true,
      characterData: true,
    }),
    [],
  );

  useEffect(() => {
    const root = document.body;
    if (!root) return;

    // Initial pass
    translateSubtree(root);

    const obs = new MutationObserver((mutations) => {
      if (pendingRef.current) return;
      pendingRef.current = true;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        pendingRef.current = false;
        for (const m of mutations) {
          const target = m.target;
          if (target) translateSubtree(target);
          for (const node of Array.from((m.addedNodes || []) as any)) {
            translateSubtree(node as any);
          }
        }
      });
    });

    obs.observe(root, observerConfig as any);
    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [observerConfig]);

  return null;
}

