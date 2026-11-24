import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket;
function getSocket() {
  if (!socket) socket = io({ autoConnect: true });
  return socket;
}

/**
 * Subscribe to live events for a room. `onEvent(type, payload)` receives:
 *  'counts' | 'status' | 'team' | 'reconnect' | 'visible'
 */
export function useRoomEvents(code, onEvent) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!code) return undefined;
    const s = getSocket();
    let first = true;
    const onConnect = () => {
      s.emit('room:watch', code);
      if (!first) handler.current('reconnect');
      first = false;
    };
    if (s.connected) onConnect();
    const listeners = {
      connect: onConnect,
      'room:counts': (p) => handler.current('counts', p),
      'room:status': (p) => handler.current('status', p),
      'team:update': (p) => handler.current('team', p),
    };
    Object.entries(listeners).forEach(([e, fn]) => s.on(e, fn));

    // Phones lock and sleep — refresh state when the page becomes visible again.
    const onVisible = () => { if (document.visibilityState === 'visible') handler.current('visible'); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      Object.entries(listeners).forEach(([e, fn]) => s.off(e, fn));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code]);
}
