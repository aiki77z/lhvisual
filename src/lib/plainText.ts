function cleanMarkdownLine(line: string) {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s{0,3}>\s?/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function toPlainDisplayText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(cleanMarkdownLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
