import { useState, useCallback, useRef } from 'react';

// FIX: module-level singleton replaced with a ref-based approach
// so it works safely with React strict mode and concurrent rendering.
let _showFn = null;

export function setToastFn(fn) {
  _showFn = fn;
}

// Call this anywhere — inside or outside React tree
export function toast(msg) {
  _showFn?.(msg);
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const show = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    timers.current[id] = setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
      delete timers.current[id];
    }, 2800);
  }, []);

  return { toasts, show };
}
