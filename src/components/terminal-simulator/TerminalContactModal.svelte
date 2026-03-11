<svelte:options runes={true} />

<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { ContactFormData } from "./terminalSimulator.shared";

  type Props = {
    canCompose: boolean;
    formData: ContactFormData;
    onClose: () => void;
    onSubmit: (form: ContactFormData) => void;
    onFormChange: (form: ContactFormData) => void;
  };

  let { canCompose, formData, onClose, onSubmit, onFormChange }: Props = $props();

  const FORM_FIELD_CLASS =
    "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none ring-0 focus:border-accent";
  const TEXTAREA_FIELD_CLASS = `w-full resize-y ${FORM_FIELD_CLASS}`;

  let nameInput = $state<HTMLInputElement | undefined>(undefined);

  onMount(() => {
    void tick().then(() => nameInput?.focus());
  });

  function updateField<K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) {
    onFormChange({ ...formData, [key]: value });
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onSubmit(formData);
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-labelledby="contact-modal-title"
  onclick={(event) => {
    if (event.currentTarget === event.target) onClose();
  }}
  onkeydown={(event) => {
    if (event.key === "Escape") onClose();
  }}
>
  <div
    class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-6"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 id="contact-modal-title" class="text-lg font-semibold text-foreground sm:text-xl">Contact Me</h3>
        <p class="mt-1 text-sm text-foreground/75">
          This stays static: it opens your mail app using a mailto link.
        </p>
      </div>
      <button
        type="button"
        class="rounded-md border border-border px-2 py-1 text-sm text-foreground/80 hover:bg-muted"
        onclick={onClose}
      >
        Close
      </button>
    </div>

    <form class="space-y-3" onsubmit={handleSubmit}>
      <div>
        <label for="contact-name" class="mb-1 block text-sm text-foreground/85">Name</label>
        <input
          id="contact-name"
          type="text"
          class={FORM_FIELD_CLASS}
          bind:this={nameInput}
          value={formData.name}
          oninput={(event) => updateField("name", (event.currentTarget as HTMLInputElement).value)}
          autocomplete="name"
          placeholder="Your name"
        />
      </div>

      <div>
        <label for="contact-email" class="mb-1 block text-sm text-foreground/85">Email</label>
        <input
          id="contact-email"
          type="email"
          class={FORM_FIELD_CLASS}
          value={formData.email}
          oninput={(event) => updateField("email", (event.currentTarget as HTMLInputElement).value)}
          autocomplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="contact-message" class="mb-1 block text-sm text-foreground/85">Message</label>
        <textarea
          id="contact-message"
          rows="5"
          class={TEXTAREA_FIELD_CLASS}
          value={formData.message}
          oninput={(event) => updateField("message", (event.currentTarget as HTMLTextAreaElement).value)}
          placeholder="Hi, I saw your portfolio..."
        ></textarea>
      </div>

      <div class="sr-only" aria-hidden="true">
        <label for="contact-company">Company</label>
        <input
          id="contact-company"
          type="text"
          tabindex="-1"
          autocomplete="off"
          value={formData.trap}
          oninput={(event) => updateField("trap", (event.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div>
        <label for="human-check" class="mb-1 block text-sm text-foreground/85">
          Anti-bot check: type <span class="font-semibold">human</span>
        </label>
        <input
          id="human-check"
          type="text"
          class={FORM_FIELD_CLASS}
          value={formData.humanCheck}
          oninput={(event) => updateField("humanCheck", (event.currentTarget as HTMLInputElement).value)}
          autocomplete="off"
          placeholder="human"
        />
      </div>

      <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-muted sm:order-1"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canCompose}
        >
          Open mail app
        </button>
      </div>
    </form>
  </div>
</div>
