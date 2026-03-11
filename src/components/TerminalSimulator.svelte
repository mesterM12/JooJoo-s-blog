<svelte:options runes={true} />

<script lang="ts">
  import { onMount, tick } from "svelte";
  import TerminalContactModal from "./terminal-simulator/TerminalContactModal.svelte";
  import { runCliCommand } from "./terminal-simulator/terminalSimulator.commands";
  import { nextAutocomplete, nextHistoryEntry } from "./terminal-simulator/terminalSimulator.input";
  import {
    AUTOCOMPLETE_OPTIONS,
    BOOT_LINES,
    PROMPT,
    buildMailtoHref,
    canComposeMail,
    getMailRecipient,
    type AutocompleteState,
    type CliProfile,
    type CliProject,
    type ContactFormData,
  } from "./terminal-simulator/terminalSimulator.shared";

  type XtermTerminal = import("@xterm/xterm").Terminal;
  type FitAddonInstance = import("@xterm/addon-fit").FitAddon;

  type Props = { profile: CliProfile; projects?: CliProject[] };
  let { profile, projects = [] }: Props = $props();

  let shellEl = $state<HTMLDivElement | undefined>(undefined);
  let terminalEl = $state<HTMLDivElement | undefined>(undefined);
  let pulseEl = $state<HTMLSpanElement | undefined>(undefined);

  let term: XtermTerminal | null = null;
  let fitAddon: FitAddonInstance | null = null;
  let gsapLib: (typeof import("gsap"))["gsap"] | null = null;
  let reduceMotion = false;

  let inputBuffer = $state("");
  let history = $state<string[]>([]);
  let historyIndex = $state(-1);
  let autocomplete = $state<AutocompleteState | null>(null);
  let booting = $state(true);
  let contactModalOpen = $state(false);
  let contactForm = $state<ContactFormData>({
    name: "",
    email: "",
    message: "",
    trap: "",
    humanCheck: "",
  });

  const canComposeContactMail = $derived(canComposeMail(contactForm));

  function printLines(lines: string[]) {
    lines.forEach(line => term?.writeln(line));
  }

  function printLine(line: string) {
    term?.writeln(line);
  }

  function prompt() {
    term?.write(PROMPT);
  }

  function focusTerminal() {
    term?.focus();
  }

  function resetAutocomplete() {
    autocomplete = null;
  }

  function resetInteractiveState() {
    historyIndex = -1;
    resetAutocomplete();
  }

  function resetContactChecks() {
    contactForm.trap = "";
    contactForm.humanCheck = "";
  }

  function rewriteInput(value: string) {
    inputBuffer = value;
    term?.write(`\r\x1b[2K${PROMPT}${inputBuffer}`);
  }

  function openContactModal() {
    if (!getMailRecipient(profile)) {
      term?.writeln("No email address is configured in profile.contacts (mailto:).");
      return;
    }
    contactModalOpen = true;
  }

  function closeContactModal() {
    contactModalOpen = false;
    resetContactChecks();
    void tick().then(focusTerminal);
  }

  function setContactForm(nextForm: ContactFormData) {
    contactForm = nextForm;
  }

  function submitContactForm(form: ContactFormData) {
    if (!canComposeMail(form)) return;

    const recipient = getMailRecipient(profile);
    if (!recipient) return;

    window.location.href = buildMailtoHref(recipient, form);
    closeContactModal();
  }

  async function ensureGsap() {
    if (gsapLib) return gsapLib;
    const { gsap } = await import("gsap");
    gsapLib = gsap;
    return gsap;
  }

  function animateCommandPulse() {
    if (!pulseEl || reduceMotion) return;

    void ensureGsap().then(gsap => {
      if (!pulseEl) return;
      gsap.killTweensOf(pulseEl);
      gsap.fromTo(
        pulseEl,
        { scale: 1, opacity: 0.75 },
        { scale: 1.55, opacity: 0.2, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" }
      );
    });
  }

  function executeCommand(rawCommand: string) {
    animateCommandPulse();
    runCliCommand(rawCommand, {
      profile,
      projects,
      openContactModal,
      clearTerminal: () => term?.clear(),
      writeLine: printLine,
      writeLines: printLines,
    });
  }

  function handleAutocomplete() {
    const result = nextAutocomplete(inputBuffer, autocomplete, AUTOCOMPLETE_OPTIONS);
    if (!result) return;

    autocomplete = result.autocomplete;
    rewriteInput(result.replacement);
  }

  function handleHistory(direction: "up" | "down") {
    const result = nextHistoryEntry(history, historyIndex, direction);
    if (!result) return;

    historyIndex = result.historyIndex;
    rewriteInput(result.value);
  }

  function syncScrollableElementToViewport() {
    if (!terminalEl) return;

    const viewport = terminalEl.querySelector(".xterm-viewport") as HTMLElement | null;
    const scrollable = terminalEl.querySelector(".xterm-scrollable-element") as HTMLElement | null;
    if (!viewport || !scrollable) return;

    scrollable.style.left = "0px";
    scrollable.style.width = `${viewport.clientWidth}px`;
  }

  function updateViewportSizing() {
    if (!term || !fitAddon) return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    term.options.fontSize = isMobile ? 12 : 14;
    term.options.lineHeight = isMobile ? 1.4 : 1.7;
    fitAddon.fit();
    requestAnimationFrame(syncScrollableElementToViewport);
  }

  function themeColors() {
    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.dataset.theme !== "light";
    return {
      screenBg: isDark ? "#05080d" : "#f5f7fb",
      screenFg: isDark ? "#dbe6ff" : "#182238",
      accent: styles.getPropertyValue("--color-accent").trim() || "#39ff6b",
      border: styles.getPropertyValue("--color-border").trim() || "#2a3f72",
      scrollbarThumb: isDark ? "rgba(120, 139, 176, 0.55)" : "rgba(77, 97, 137, 0.5)",
      scrollbarTrack: isDark ? "rgba(18, 23, 34, 0.6)" : "rgba(196, 208, 227, 0.45)",
    };
  }

  function applyTerminalTheme() {
    if (!term) return;

    const colors = themeColors();
    shellEl?.style.setProperty("--terminal-screen-bg", colors.screenBg);
    shellEl?.style.setProperty("--terminal-scrollbar-thumb", colors.scrollbarThumb);
    shellEl?.style.setProperty("--terminal-scrollbar-track", colors.scrollbarTrack);
    term.options.theme = {
      background: colors.screenBg,
      foreground: colors.screenFg,
      cursor: colors.accent,
      selectionBackground: colors.border,
      brightGreen: colors.accent,
      green: colors.accent,
    };
  }

  function submitTerminalInput() {
    const command = inputBuffer.trim();
    term?.write("\r\n");
    if (command) history.push(command);
    resetInteractiveState();
    executeCommand(command);
    inputBuffer = "";
    prompt();
  }

  function eraseLastCharacter() {
    if (!inputBuffer.length) {
      resetAutocomplete();
      return;
    }

    inputBuffer = inputBuffer.slice(0, -1);
    term?.write("\b \b");
    resetAutocomplete();
  }

  function clearTerminalAndPrompt() {
    term?.clear();
    prompt();
    rewriteInput("");
  }

  function isPrintableKey(event: KeyboardEvent) {
    return !event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1;
  }

  function handleTerminalKeyPress(key: string, domEvent: KeyboardEvent) {
    if (contactModalOpen) return;

    if (domEvent.ctrlKey && domEvent.key.toLowerCase() === "l") {
      domEvent.preventDefault();
      clearTerminalAndPrompt();
      return;
    }

    switch (domEvent.key) {
      case "Enter":
        submitTerminalInput();
        return;
      case "Backspace":
        eraseLastCharacter();
        return;
      case "ArrowUp":
        domEvent.preventDefault();
        handleHistory("up");
        resetAutocomplete();
        return;
      case "ArrowDown":
        domEvent.preventDefault();
        handleHistory("down");
        resetAutocomplete();
        return;
      case "Tab":
        domEvent.preventDefault();
        handleAutocomplete();
        return;
      default:
        if (!isPrintableKey(domEvent)) return;
        inputBuffer += key;
        term?.write(key);
        resetAutocomplete();
    }
  }

  async function bootSequence() {
    if (reduceMotion) {
      BOOT_LINES.forEach(line => term?.writeln(line));
      booting = false;
      return;
    }

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    for (const line of BOOT_LINES) {
      term?.writeln(line);
      await wait(85);
    }
    booting = false;
  }

  onMount(() => {
    if (!terminalEl) {
      throw new Error("Terminal container is unavailable.");
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];
    const addCleanup = (cleanup: (() => void) | null | undefined) => {
      if (cleanup) cleanups.push(cleanup);
    };

    const initializeTerminal = async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/xterm/css/xterm.css"),
      ]);
      if (disposed || !terminalEl) return;

      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      term = new Terminal({
        convertEol: true,
        cursorBlink: true,
        scrollback: 1200,
        fontFamily: "var(--font-google-sans-code), monospace",
        fontSize: 14,
        lineHeight: 1.5,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalEl);
      applyTerminalTheme();
      updateViewportSizing();

      const resizeObserver = new ResizeObserver(updateViewportSizing);
      resizeObserver.observe(terminalEl);
      addCleanup(() => resizeObserver.disconnect());

      const handlePointerDown = () => focusTerminal();
      terminalEl.addEventListener("pointerdown", handlePointerDown);
      addCleanup(() => terminalEl?.removeEventListener("pointerdown", handlePointerDown));

      const themeObserver = new MutationObserver(applyTerminalTheme);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      addCleanup(() => themeObserver.disconnect());

      const syncAfterFontLoad = () => {
        updateViewportSizing();
        term?.refresh(0, term.rows - 1);
      };
      const fontSet = document.fonts;
      void fontSet.ready.then(syncAfterFontLoad);
      fontSet.addEventListener("loadingdone", syncAfterFontLoad);
      addCleanup(() => fontSet.removeEventListener("loadingdone", syncAfterFontLoad));

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || !contactModalOpen) return;
        event.preventDefault();
        closeContactModal();
      };
      window.addEventListener("keydown", handleEscape);
      addCleanup(() => window.removeEventListener("keydown", handleEscape));

      addCleanup(
        term.onKey(({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) =>
          handleTerminalKeyPress(key, domEvent)
        ).dispose
      );

      if (!reduceMotion && shellEl) {
        const gsap = await ensureGsap();
        if (disposed || !shellEl) return;
        const shellNode = shellEl;
        gsap.set(shellNode, { autoAlpha: 0, y: 24, filter: "blur(8px)" });
        let didAnimate = false;
        const observer = new IntersectionObserver(
          entries => {
            const isVisible = entries.some((entry: IntersectionObserverEntry) => entry.isIntersecting);
            if (!isVisible || didAnimate) return;

            didAnimate = true;
            gsap.to(shellNode, {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.65,
              ease: "power3.out",
              onComplete: () => {
                gsap.set(shellNode, { clearProps: "filter" });
              },
            });
            observer.disconnect();
          },
          { threshold: 0.25 }
        );
        observer.observe(shellNode);
        addCleanup(() => observer.disconnect());
      } else if (shellEl) {
        shellEl.style.opacity = "1";
        shellEl.style.transform = "none";
        shellEl.style.filter = "none";
      }

      term.writeln("resume-cli v1.0.0");
      void bootSequence().then(() => {
        prompt();
        focusTerminal();
      });
    };

    void initializeTerminal();

    return () => {
      disposed = true;
      for (const cleanup of cleanups.reverse()) cleanup();
      fitAddon?.dispose();
      term?.dispose();
    };
  });
</script>

<section class="relative my-14">
  <div
    class="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-accent/10 blur-3xl"
    aria-hidden="true"
  ></div>

  <div
    bind:this={shellEl}
    class="terminal-shell mx-auto min-w-0 max-w-5xl overflow-hidden rounded-2xl border border-border bg-muted/50 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_30px_80px_-40px_rgba(0,0,0,0.65)] backdrop-blur supports-backdrop-filter:bg-muted/40"
  >
    <div class="flex min-w-0 items-center justify-between gap-3 border-b border-border/80 px-3 py-2 sm:px-4">
      <div class="flex items-center gap-2">
        <span class="size-2.5 rounded-full bg-red-400/90"></span>
        <span class="size-2.5 rounded-full bg-yellow-300/90"></span>
        <span class="size-2.5 rounded-full bg-emerald-400/90"></span>
      </div>
      <div class="truncate text-[0.65rem] tracking-[0.16em] text-foreground/70 uppercase sm:text-[0.7rem]">
        resume-cli
      </div>
      <div class="shrink-0 flex items-center gap-2 text-xs text-foreground/70">
        <span class="hidden sm:inline">{booting ? "booting" : "ready"}</span>
        <span bind:this={pulseEl} class="size-2 rounded-full bg-accent"></span>
      </div>
    </div>

    <div class="h-80 w-full px-2 py-2 sm:h-104 sm:px-4 sm:py-4">
      <div bind:this={terminalEl} class="h-full w-full overflow-hidden"></div>
    </div>
  </div>
</section>

{#if contactModalOpen}
  <TerminalContactModal
    canCompose={canComposeContactMail}
    formData={contactForm}
    onClose={closeContactModal}
    onSubmit={submitContactForm}
    onFormChange={setContactForm}
  />
{/if}

<style>
  :global(.terminal-shell .xterm) {
    block-size: 100%;
    inline-size: 100%;
  }

  :global(.terminal-shell .xterm-viewport) {
    background: var(--terminal-screen-bg);
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-color: var(--terminal-scrollbar-thumb) var(--terminal-scrollbar-track);
  }
  :global(.xterm .xterm-viewport){
    background: var(--terminal-screen-bg);
  }

  :global(.terminal-shell .xterm-rows) {
    letter-spacing: 0 !important;
    font-feature-settings: "kern" 0;
    font-kerning: none;
    font-variant-ligatures: none;
  }

  :global(.terminal-shell .xterm-scrollable-element) {
    left: 0 !important;
    max-width: 100% !important;
  }

  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar) {
    width: 10px;
  }

  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-track) {
    background: var(--terminal-scrollbar-track);
  }

  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-thumb) {
    border: 2px solid transparent;
    border-radius: 999px;
    background: var(--terminal-scrollbar-thumb);
    background-clip: content-box;
  }
</style>
