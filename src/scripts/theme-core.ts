const THEME = "theme";
const LIGHT = "light";
const DARK = "dark";

const MOON_PATH =
  "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z";
const SUN_CIRCLE_PATH =
  "M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656z";

let themeValue = window.theme?.themeValue ?? getPreferredTheme();
let enhancementsLoaded = false;

function getPreferredTheme(): string {
  const currentTheme = localStorage.getItem(THEME);
  if (currentTheme) return currentTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT;
}

function setThemeIconInstant(theme: string): void {
  const main = document.querySelector<SVGPathElement>("#theme-icon-main");
  const rays = document.querySelectorAll<SVGPathElement>(".theme-icon-ray");
  if (!main) return;

  const isDark = theme === DARK;
  main.setAttribute("d", isDark ? MOON_PATH : SUN_CIRCLE_PATH);
  rays.forEach(ray => {
    ray.style.opacity = isDark ? "0" : "1";
  });
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);
  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  const body = document.body;
  if (body) {
    const bgColor = window.getComputedStyle(body).backgroundColor;
    document.querySelector("meta[name='theme-color']")?.setAttribute("content", bgColor);
  }

  setThemeIconInstant(themeValue);
}

function setPreference(): void {
  localStorage.setItem(THEME, themeValue);
  reflectPreference();
}

function applyTheme(nextTheme: string, persist = true): void {
  themeValue = nextTheme;
  window.theme?.setTheme(themeValue);
  if (persist) setPreference();
  else reflectPreference();
  document.dispatchEvent(new CustomEvent("theme:changed", { detail: { theme: themeValue } }));
}

function bindThemeButton(): void {
  const button = document.querySelector("#theme-btn");
  if (!button || button.getAttribute("data-theme-core-bound") === "true") return;
  button.setAttribute("data-theme-core-bound", "true");

  button.addEventListener("click", () => {
    const nextTheme = themeValue === LIGHT ? DARK : LIGHT;
    applyTheme(nextTheme, true);
  });
}

function setThemeApi(): void {
  window.theme = {
    themeValue,
    getTheme: () => themeValue,
    setTheme: val => {
      themeValue = val;
    },
    setPreference,
    reflectPreference,
  };
}

function setupThemeCore(): void {
  setThemeApi();
  reflectPreference();
  bindThemeButton();
}

function loadEnhancements(): void {
  if (enhancementsLoaded) return;
  enhancementsLoaded = true;

  const load = () => import("./theme-enhancements.ts");
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      void load();
    });
    return;
  }
  globalThis.setTimeout(() => {
    void load();
  }, 0);
}

setupThemeCore();
loadEnhancements();

document.addEventListener("astro:after-swap", () => {
  setupThemeCore();
  loadEnhancements();
});

document.addEventListener("astro:before-swap", event => {
  const astroEvent = event as Event & { newDocument: Document };
  const bgColor = document.querySelector("meta[name='theme-color']")?.getAttribute("content");
  if (bgColor) {
    astroEvent.newDocument.querySelector("meta[name='theme-color']")?.setAttribute("content", bgColor);
  }
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: isDark }) => {
  applyTheme(isDark ? DARK : LIGHT, true);
});
