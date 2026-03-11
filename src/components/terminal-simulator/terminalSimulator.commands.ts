import {
  COMMAND_ALIASES,
  type CliLink,
  type CliProfile,
  type CliProject,
} from "./terminalSimulator.shared";

type CommandWriter = {
  writeLine: (line: string) => void;
  writeLines: (lines: string[]) => void;
};

type CommandContext = CommandWriter & {
  profile: CliProfile;
  projects: CliProject[];
  openContactModal: () => void;
  clearTerminal: () => void;
};

const HELP_LINES = [
  "Available commands:",
  "  help                Show command list",
  "  about               Show resume summary",
  "  projects            List available projects",
  "  project <slug|id>   Show one project detail",
  "  contact             Show profile/contact links",
  "  contact-me          Open contact modal (mailto)",
  "  clear               Clear terminal output",
  "  ls                  Alias of projects",
  "  whoami              Alias of about",
];

function showAbout(ctx: CommandContext) {
  const lines = [ctx.profile.name, "", ctx.profile.summary, "", "About:", ctx.profile.about];
  if (ctx.profile.profileUrl) lines.push("", `Profile: ${ctx.profile.profileUrl}`);
  ctx.writeLines(lines);
}

function showProjects(ctx: CommandContext) {
  if (!ctx.projects.length) {
    ctx.writeLine("No project entries found.");
    return;
  }

  ctx.writeLine("Projects:");
  ctx.projects.forEach((project: CliProject, idx: number) => {
    ctx.writeLine(`  [${idx + 1}] ${project.title} (${project.slug})`);
  });
  ctx.writeLine("");
  ctx.writeLine("Tip: run `project <slug|id>` to view details.");
}

function showProject(rawArg: string, ctx: CommandContext) {
  if (!rawArg) {
    ctx.writeLine("Usage: project <slug|id>");
    return;
  }

  const arg = rawArg.trim();
  const byIndex = Number.parseInt(arg, 10);
  const selected =
    Number.isNaN(byIndex) === false
      ? ctx.projects[byIndex - 1]
      : ctx.projects.find((project: CliProject) => project.slug === arg);

  if (!selected) {
    ctx.writeLine(`Project not found: ${arg}`);
    return;
  }

  ctx.writeLines([
    selected.title,
    "-".repeat(Math.max(6, selected.title.length)),
    selected.description,
    `Tags: ${selected.tags.join(", ") || "n/a"}`,
    `Post: ${selected.url}`,
    ...selected.links.map((link: CliLink) => `${link.label}: ${link.url}`),
  ]);
}

function showContact(ctx: CommandContext) {
  if (!ctx.profile.contacts.length && !ctx.profile.profileUrl) {
    ctx.writeLine("No contact links configured.");
    return;
  }

  ctx.writeLine("Contact:");
  if (ctx.profile.profileUrl) ctx.writeLine(`  profile  -> ${ctx.profile.profileUrl}`);
  ctx.profile.contacts.forEach((link: CliLink) =>
    ctx.writeLine(`  ${link.label.toLowerCase()}  -> ${link.url}`)
  );
  ctx.writeLine("");
  ctx.writeLine("Tip: run `contact-me` to open a quick contact form.");
}

export function runCliCommand(rawCommand: string, ctx: CommandContext) {
  if (!rawCommand) return;

  const [rawCommandName, ...rest] = rawCommand.split(/\s+/);
  const command = COMMAND_ALIASES[rawCommandName] ?? rawCommandName;
  const arg = rest.join(" ");

  switch (command) {
    case "help":
      ctx.writeLines(HELP_LINES);
      return;
    case "about":
      showAbout(ctx);
      return;
    case "projects":
      showProjects(ctx);
      return;
    case "project":
      showProject(arg, ctx);
      return;
    case "contact":
      showContact(ctx);
      return;
    case "contact-me":
      ctx.openContactModal();
      return;
    case "clear":
      ctx.clearTerminal();
      return;
    default:
      ctx.writeLine(`Unknown command: ${rawCommandName}`);
      ctx.writeLine("Run `help` to see available commands.");
  }
}
