import { gsap } from "gsap";

const CUSTOM_CURSOR_CLASS = "custom-cursor-active";
const CUSTOM_CURSOR_ID = "custom-cursor";
const CLICKABLE_SELECTOR =
  'a, button, [role="button"], [onclick], input:not([type="hidden"]), select, textarea, summary, label, [tabindex]:not([tabindex="-1"])';

let cursorCleanup: (() => void) | undefined;
let magneticCleanup: (() => void) | undefined;
let navSquiggleCleanup: (() => void) | undefined;
let navSquiggleInitialized = false;

function isClickableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(CLICKABLE_SELECTOR)) return true;
  return window.getComputedStyle(target).cursor === "pointer";
}

function setCursorFeature(): void {
  cursorCleanup?.();
  cursorCleanup = undefined;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canUseCustomCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
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

  const xTo = gsap.quickTo(cursor, "x", { duration: 0.6, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.6, ease: "power3" });
  let firstMove = true;

  const onPointerMove = (event: PointerEvent) => {
    state.x = event.clientX;
    state.y = event.clientY;

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

    gsap.to(cursor, {
      scaleX: finalScale + stretch,
      scaleY: finalScale - stretch * 0.5,
      rotate: speed > 0.5 ? Math.atan2(velocityY, velocityX) * (180 / Math.PI) : "+=0",
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });

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

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!canHover || prefersReducedMotion) return;

  const STRENGTH = 0.25;
  const cleanups: (() => void)[] = [];
  const elements = Array.from(document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR)).filter(
    el => !el.closest("pre, .astro-code")
  );

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
      gsap.to(el, { scale: 0.95, duration: 0.1, ease: "power2.in", overwrite: "auto" });
    };

    const onMouseUp = () => {
      gsap.to(el, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
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

  const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-tab="true"]'));
  if (!tabs.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paths = tabs
    .map(tab => tab.querySelector<SVGPathElement>(".nav-tab__squiggle-path"))
    .filter((p): p is SVGPathElement => Boolean(p));

  const setInactive = (path: SVGPathElement) => {
    gsap.killTweensOf(path);
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = `${pathLength}`;
    path.style.strokeDashoffset = `${pathLength}`;
    path.style.opacity = "0";
  };

  const playActive = (path: SVGPathElement, animate: boolean) => {
    gsap.killTweensOf(path);
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = `${pathLength}`;
    path.style.opacity = "1";
    if (!animate) {
      path.style.strokeDashoffset = "0";
      return;
    }
    gsap.fromTo(path, { strokeDashoffset: pathLength }, { strokeDashoffset: 0, duration: 0.55, ease: "power2.out" });
  };

  const isActiveTab = (tab: HTMLAnchorElement) =>
    tab.classList.contains("active-nav") || tab.getAttribute("aria-current") === "page";

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

  tabs.forEach(tab => tab.addEventListener("pointerdown", onPointerDown, { passive: true }));
  navSquiggleCleanup = () => tabs.forEach(tab => tab.removeEventListener("pointerdown", onPointerDown));
  navSquiggleInitialized = true;
}

function setGlobalFeatures(): void {
  setCursorFeature();
  setMagneticEffect();
  setNavSquiggleFeature();
}

setGlobalFeatures();
document.addEventListener("astro:after-swap", setGlobalFeatures);
