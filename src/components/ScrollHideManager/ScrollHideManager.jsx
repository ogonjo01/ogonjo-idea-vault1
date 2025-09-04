// src/components/ScrollHideManager/ScrollHideManager.jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollHideManager() {
  const { pathname } = useLocation();

  const lastPos = useRef(0);
  const lastToggleTime = useRef(0);
  const ticking = useRef(false);
  const hidden = useRef(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    // pick the scroll container: prefer .main-content (app scroller), otherwise window
    const container = document.querySelector('.main-content') || window;
    scrollerRef.current = container;

    // route: homepage => fixed header+category; other routes => page-static (in-flow)
    if (pathname === '/' || pathname === '') {
      document.body.classList.add('homepage-fixed');
      document.body.classList.remove('page-static');
      document.body.classList.remove('scroll-hide-global');
      // reset hidden state
      hidden.current = false;
      lastPos.current = container === window ? window.scrollY : (container.scrollTop || 0);
      return () => {
        document.body.classList.remove('homepage-fixed');
        document.body.classList.remove('scroll-hide-global');
      };
    }

    // Non-home pages: header/category should be in-flow (but sticky)
    document.body.classList.remove('homepage-fixed');
    document.body.classList.add('page-static');
    document.body.classList.remove('scroll-hide-global');

    const HIDE_THRESHOLD = 18;
    const SHOW_THRESHOLD = 10;
    const MIN_TOGGLE_INTERVAL = 160; // ms
    const ALWAYS_SHOW_TOP = 80;

    const getPos = () => (container === window ? window.scrollY || 0 : container.scrollTop || 0);

    const handler = () => {
      const current = getPos();
      const now = performance.now();

      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          const delta = current - lastPos.current;

          if (current <= ALWAYS_SHOW_TOP) {
            // near top -> ensure show
            if (hidden.current && now - lastToggleTime.current > MIN_TOGGLE_INTERVAL) {
              hidden.current = false;
              lastToggleTime.current = now;
              document.body.classList.remove('scroll-hide-global');
            }
          } else if (delta > HIDE_THRESHOLD) {
            // scrolling down
            if (!hidden.current && now - lastToggleTime.current > MIN_TOGGLE_INTERVAL) {
              hidden.current = true;
              lastToggleTime.current = now;
              document.body.classList.add('scroll-hide-global');
            }
          } else if (delta < -SHOW_THRESHOLD) {
            // scrolling up
            if (hidden.current && now - lastToggleTime.current > MIN_TOGGLE_INTERVAL) {
              hidden.current = false;
              lastToggleTime.current = now;
              document.body.classList.remove('scroll-hide-global');
            }
          }

          lastPos.current = current;
          ticking.current = false;
        });
      }
    };

    // initialize
    lastPos.current = getPos();
    // bind to the appropriate element(s)
    if (container === window) {
      window.addEventListener('scroll', handler, { passive: true });
      window.addEventListener('wheel', handler, { passive: true });
      window.addEventListener('touchmove', handler, { passive: true });
    } else {
      container.addEventListener('scroll', handler, { passive: true });
      // wheel/touch on the container are less critical, but safe to add:
      container.addEventListener('wheel', handler, { passive: true });
      container.addEventListener('touchmove', handler, { passive: true });
    }

    return () => {
      if (container === window) {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('wheel', handler);
        window.removeEventListener('touchmove', handler);
      } else {
        container.removeEventListener('scroll', handler);
        container.removeEventListener('wheel', handler);
        container.removeEventListener('touchmove', handler);
      }
      document.body.classList.remove('scroll-hide-global');
      document.body.classList.remove('page-static');
    };
  }, [pathname]);

  return null;
}
