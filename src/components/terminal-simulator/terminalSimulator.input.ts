import type { AutocompleteState } from "./terminalSimulator.shared";

export function nextAutocomplete(
  inputBuffer: string,
  autocomplete: AutocompleteState | null,
  options: string[]
) {
  const [typedCommand = ""] = inputBuffer.trimStart().split(/\s+/);
  const isAtFirstWord = !inputBuffer.trimStart().includes(" ");
  if (!isAtFirstWord) return null;

  const matches = options.filter((command: string) => command.startsWith(typedCommand));
  if (!matches.length) return null;

  const hasSameSet =
    autocomplete && autocomplete.base === typedCommand
      ? autocomplete.options.join(",") === matches.join(",")
      : false;

  if (!hasSameSet) {
    return {
      autocomplete: { base: typedCommand, options: matches, index: 0 },
      replacement: matches[0],
    };
  }

  if (!autocomplete) return null;
  const index = (autocomplete.index + 1) % autocomplete.options.length;
  return {
    autocomplete: { ...autocomplete, index },
    replacement: autocomplete.options[index],
  };
}

export function nextHistoryEntry(history: string[], historyIndex: number, direction: "up" | "down") {
  if (!history.length) return null;

  const nextIndex =
    direction === "up"
      ? historyIndex < history.length - 1
        ? historyIndex + 1
        : historyIndex
      : historyIndex > -1
        ? historyIndex - 1
        : historyIndex;

  if (nextIndex === -1) {
    return { historyIndex: nextIndex, value: "" };
  }

  return {
    historyIndex: nextIndex,
    value: history[history.length - 1 - nextIndex] || "",
  };
}
