export const PROMPT = "joojoo@portfolio:~$ ";
export const HUMAN_CHECK_WORD = "human";
export const BOOT_LINES = [
  "initializing resume-cli...",
  "loading profile context...",
  "loading project descriptors...",
  "ready.",
  "",
  "Type `help` to begin.",
  "",
];

export const COMMANDS = ["help", "about", "projects", "project", "contact", "contact-me", "clear"] as const;
export const COMMAND_ALIASES: Record<string, string> = {
  ls: "projects",
  whoami: "about",
};
export const AUTOCOMPLETE_OPTIONS = [...COMMANDS, ...Object.keys(COMMAND_ALIASES)];

export type CliLink = { label: string; url: string };
export type CliProject = {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  url: string;
  links: CliLink[];
};
export type CliProfile = {
  name: string;
  summary: string;
  about: string;
  profileUrl?: string;
  contacts: CliLink[];
};
export type ContactFormData = {
  name: string;
  email: string;
  message: string;
  trap: string;
  humanCheck: string;
};
export type AutocompleteState = { base: string; options: string[]; index: number };

export function getMailRecipient(profile: CliProfile) {
  const mailtoLink = profile.contacts.find((link: CliLink) =>
    link.url.trim().toLowerCase().startsWith("mailto:")
  );
  if (!mailtoLink) return null;

  const email = mailtoLink.url.trim().slice("mailto:".length).split("?")[0]?.trim();
  return email || null;
}

export function canComposeMail(form: ContactFormData) {
  const hasHumanProof = form.humanCheck.trim().toLowerCase() === HUMAN_CHECK_WORD;
  return hasHumanProof && !form.trap.trim();
}

export function buildMailtoHref(recipient: string, form: ContactFormData) {
  const safeName = form.name.trim() || "Portfolio visitor";
  const safeEmail = form.email.trim() || "Not provided";
  const safeMessage = form.message.trim() || "Hello from your portfolio terminal.";
  const subject = `Portfolio contact from ${safeName}`;
  const body = [`Name: ${safeName}`, `Email: ${safeEmail}`, "", safeMessage].join("\n");

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
