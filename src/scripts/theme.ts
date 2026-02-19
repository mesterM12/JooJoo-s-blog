import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin);

// Constants
const THEME = "theme";
const LIGHT = "light";
const DARK = "dark";
const CUSTOM_CURSOR_CLASS = "custom-cursor-active";
const CUSTOM_CURSOR_ID = "custom-cursor";
const CLICKABLE_SELECTOR =
  'a, button, [role="button"], [onclick], input:not([type="hidden"]), select, textarea, summary, label, [tabindex]:not([tabindex="-1"])';

// Theme icon morph path data — exact `d` values from the Tabler icon SVGs
const MOON_PATH =
  "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z";
const SUN_CIRCLE_PATH =
  "M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656z";

let cursorCleanup: (() => void) | undefined;
let magneticCleanup: (() => void) | undefined;
let navSquiggleCleanup: (() => void) | undefined;
let navSquiggleInitialized = false;

// Initial color scheme
// Can be "light", "dark", or empty string for system's prefers-color-scheme
const initialColorScheme = "";

function getPreferTheme(): string {
  // get theme data from local storage (user's explicit choice)
  const currentTheme = localStorage.getItem(THEME);
  if (currentTheme) return currentTheme;

  // return initial color scheme if it is set (site default)
  if (initialColorScheme) return initialColorScheme;

  // return user device's prefer color scheme (system fallback)
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Use existing theme value from inline script if available, otherwise detect
let themeValue = window.theme?.themeValue ?? getPreferTheme();

function setPreference(): void {
  localStorage.setItem(THEME, themeValue);
  reflectPreference();
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);

  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  // Get a reference to the body element
  const body = document.body;

  // Check if the body element exists before using getComputedStyle
  if (body) {
    // Get the computed styles for the body element
    const computedStyles = window.getComputedStyle(body);

    // Get the background color property
    const bgColor = computedStyles.backgroundColor;

    // Set the background color in <meta theme-color ... />
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
}

// Update the global theme API
if (window.theme) {
  window.theme.setPreference = setPreference;
  window.theme.reflectPreference = reflectPreference;
} else {
  window.theme = {
    themeValue,
    setPreference,
    reflectPreference,
    getTheme: () => themeValue,
    setTheme: (val: string) => {
      themeValue = val;
    },
  };
}

// Ensure theme is reflected (in case body wasn't ready when inline script ran)
reflectPreference();

function getThemeIconEls() {
  return {
    main: document.querySelector<SVGPathElement>("#theme-icon-main"),
    rays: document.querySelectorAll<SVGPathElement>(".theme-icon-ray"),
  };
}

/** Snap the icon to the correct state with no animation (called on init / page swap). */
function setThemeIconInstant(theme: string): void {
  const { main, rays } = getThemeIconEls();
  if (!main) return;

  const isDark = theme === DARK;
  main.setAttribute("d", isDark ? MOON_PATH : SUN_CIRCLE_PATH);
  gsap.set(rays, { drawSVG: isDark ? "0%" : "100%", opacity: isDark ? 0 : 1 });
}

/** Animate the icon morph when the user explicitly toggles the theme. */
function morphThemeIcon(theme: string): void {
  const { main, rays } = getThemeIconEls();
  if (!main) return;

  const toDark = theme === DARK;
  const tl = gsap.timeline();

  if (toDark) {
    // Sun → Moon: retract rays, then morph circle back to crescent
    tl.to(rays, {
      drawSVG: "0%",
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      stagger: { each: 0.02, from: "random" },
    }).to(
      main,
      { morphSVG: MOON_PATH, duration: 0.45, ease: "power2.inOut" },
      "-=0.05"
    );
  } else {
    // Moon → Sun: morph crescent to circle, then draw rays out
    tl.to(main, {
      morphSVG: SUN_CIRCLE_PATH,
      duration: 0.45,
      ease: "power2.inOut",
    })
      .set(rays, { opacity: 1 })
      .fromTo(
        rays,
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          duration: 0.3,
          ease: "power2.out",
          stagger: { each: 0.025, from: "random" },
        },
        "-=0.15"
      );
  }
}

function setThemeFeature(): void {
  // set on load so screen readers can get the latest value on the button
  reflectPreference();
  setThemeIconInstant(themeValue);

  // now this script can find and listen for clicks on the control
  document.querySelector("#theme-btn")?.addEventListener("click", () => {
    themeValue = themeValue === LIGHT ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
    morphThemeIcon(themeValue);
  });
}

function isClickableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(CLICKABLE_SELECTOR)) return true;

  // Catch custom widgets that only advertise pointer via CSS.
  return window.getComputedStyle(target).cursor === "pointer";
}

function setCursorFeature(): void {
  cursorCleanup?.();
  cursorCleanup = undefined;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const canUseCustomCursor = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  if (!canUseCustomCursor || prefersReducedMotion) {
    document.body.classList.remove(CUSTOM_CURSOR_CLASS);
    return;
  }

  const existingCursor = document.getElementById(CUSTOM_CURSOR_ID);
  existingCursor?.remove();

  const cursor = document.createElement("div");
  cursor.id = CUSTOM_CURSOR_ID;
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);
  document.body.classList.add(CUSTOM_CURSOR_CLASS);

  // Let GSAP own the centering so it doesn't conflict with x/y animation
  gsap.set(cursor, { xPercent: -50, yPercent: -50 });

  const state = {
    x: -100,
    y: -100,
    previousX: -100,
    previousY: -100,
    targetScale: 1,
    pressMultiplier: 1,
    visible: false,
  };

  // Longer duration = more laggy/draggy feel
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.6, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.6, ease: "power3" });

  let firstMove = true;

  const onPointerMove = (event: PointerEvent) => {
    state.x = event.clientX;
    state.y = event.clientY;

    // Snap to position on first move so the cursor doesn't fly in from (0,0)
    if (firstMove) {
      firstMove = false;
      gsap.set(cursor, { x: state.x, y: state.y });
      state.previousX = state.x;
      state.previousY = state.y;
    }

    xTo(state.x);
    yTo(state.y);

    if (!state.visible) {
      state.visible = true;
      gsap.to(cursor, { autoAlpha: 1, duration: 0.2, ease: "power1.out" });
    }

    const hovering = isClickableTarget(event.target);
    state.targetScale = hovering ? 1.4 : 1;
    cursor.classList.toggle("is-hovering", hovering);
  };

  const onPointerDown = () => {
    state.pressMultiplier = 0.75;
  };

  const onPointerUp = () => {
    state.pressMultiplier = 1;
  };

  const onPointerLeave = () => {
    gsap.to(cursor, { autoAlpha: 0, duration: 0.2, ease: "power1.out" });
    state.visible = false;
  };

  const onPointerEnter = () => {
    gsap.to(cursor, { autoAlpha: 1, duration: 0.2, ease: "power1.out" });
  };

  const onTick = () => {
    const velocityX = state.x - state.previousX;
    const velocityY = state.y - state.previousY;
    const speed = Math.hypot(velocityX, velocityY);
    const stretch = gsap.utils.clamp(0, 0.4, speed / 50);
    const finalScale = state.targetScale * state.pressMultiplier;

    // All scale logic lives here — no quickTo(scale) to conflict with
    gsap.to(cursor, {
      scaleX: finalScale + stretch,
      scaleY: finalScale - stretch * 0.5,
      rotate: speed > 0.5 ? Math.atan2(velocityY, velocityX) * (180 / Math.PI) : "+=0",
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });

    // Smoothed velocity tracking (lags slightly behind for the draggy feel)
    state.previousX += (state.x - state.previousX) * 0.2;
    state.previousY += (state.y - state.previousY) * 0.2;
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("pointerenter", onPointerEnter, { passive: true });
  gsap.ticker.add(onTick);

  cursorCleanup = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("pointerenter", onPointerEnter);
    gsap.ticker.remove(onTick);
    cursor.remove();
    document.body.classList.remove(CUSTOM_CURSOR_CLASS);
  };
}

function setMagneticEffect(): void {
  magneticCleanup?.();
  magneticCleanup = undefined;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  if (!canHover || prefersReducedMotion) return;

  // How far (fraction of offset from center) the element follows the cursor
  const STRENGTH = 0.25;
  const cleanups: (() => void)[] = [];
  // Exclude elements inside code blocks — pre[tabindex] matches CLICKABLE_SELECTOR
  // via the [tabindex] rule but should never get the magnetic effect
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR)
  ).filter(el => !el.closest("pre, .astro-code"));

  elements.forEach(el => {
    const onMouseMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * STRENGTH,
        y: (e.clientY - (r.top + r.height / 2)) * STRENGTH,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    const onMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.65,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
    };

    const onMouseDown = () => {
      gsap.to(el, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        overwrite: "auto",
      });
    };

    const onMouseUp = () => {
      gsap.to(el, {
        scale: 1,
        duration: 0.45,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);

    cleanups.push(() => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "x,y,scale" });
    });
  });

  magneticCleanup = () => cleanups.forEach(fn => fn());
}

function setNavSquiggleFeature(): void {
  navSquiggleCleanup?.();
  navSquiggleCleanup = undefined;

  const tabs = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('[data-nav-tab="true"]')
  );
  if (!tabs.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const paths = tabs
    .map(tab => tab.querySelector<SVGPathElement>(".nav-tab__squiggle-path"))
    .filter((p): p is SVGPathElement => Boolean(p));

  const setInactive = (path: SVGPathElement) => {
    gsap.killTweensOf(path);
    gsap.set(path, { drawSVG: "0%", opacity: 0 });
  };

  const playActive = (path: SVGPathElement, animate: boolean) => {
    gsap.killTweensOf(path);
    gsap.set(path, { opacity: 1 });

    if (!animate) {
      gsap.set(path, { drawSVG: "100%" });
      return;
    }

    gsap.set(path, { drawSVG: "0%" });
    gsap.to(path, {
      drawSVG: "100%",
      duration: 0.55,
      ease: "power2.out",
      overwrite: true,
    });
  };

  const isActiveTab = (tab: HTMLAnchorElement) =>
    tab.classList.contains("active-nav") ||
    tab.getAttribute("aria-current") === "page";

  // Don’t animate on first load; do animate on subsequent swaps/clicks.
  const animateOnInit = navSquiggleInitialized && !prefersReducedMotion;

  tabs.forEach(tab => {
    const path = tab.querySelector<SVGPathElement>(".nav-tab__squiggle-path");
    if (!path) return;
    if (isActiveTab(tab)) playActive(path, animateOnInit);
    else setInactive(path);
  });

  const onPointerDown = (event: PointerEvent) => {
    const tab = event.currentTarget as HTMLAnchorElement | null;
    if (!tab) return;
    const activePath = tab.querySelector<SVGPathElement>(".nav-tab__squiggle-path");
    if (!activePath) return;

    paths.forEach(p => setInactive(p));
    playActive(activePath, !prefersReducedMotion);
  };

  tabs.forEach(tab =>
    tab.addEventListener("pointerdown", onPointerDown, { passive: true })
  );

  navSquiggleCleanup = () => {
    tabs.forEach(tab => tab.removeEventListener("pointerdown", onPointerDown));
  };

  navSquiggleInitialized = true;
}

function setGlobalFeatures(): void {
  setThemeFeature();
  setCursorFeature();
  setMagneticEffect();
  setNavSquiggleFeature();
}

// Set up global features after page load
setGlobalFeatures();

// Runs on view transitions navigation
document.addEventListener("astro:after-swap", setGlobalFeatures);

// Set theme-color value before page transition
// to avoid navigation bar color flickering in Android dark mode
document.addEventListener("astro:before-swap", event => {
  const astroEvent = event;
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (bgColor) {
    astroEvent.newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
});

// sync with system changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    themeValue = isDark ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
    morphThemeIcon(themeValue);
  });
