/**
 * Convert markdown-formatted text to plain text for WeChat delivery.
 * WeChat does not render markdown, so this is needed for any AI reply.
 */
export function markdownToPlainText(text: string): string {
  let result = text;

  // Code blocks: strip fences, keep code content
  result = result.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_, code: string) => code.trim());

  // Images: remove entirely
  result = result.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Links: keep display text only
  result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Tables: remove separator rows, then strip pipes
  result = result.replace(/^\|[\s:|-]+\|$/gm, "");
  result = result.replace(/^\|(.+)\|$/gm, (_, inner: string) =>
    inner.split("|").map((cell) => cell.trim()).join("  "),
  );

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/__(.+?)__/g, "$1");

  // Italic: *text* or _text_
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1");
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "$1");

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, "$1");

  // Headers: # Title
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "$1");

  // Blockquotes: > text
  result = result.replace(/^>\s?(.*)$/gm, "$1");

  // Horizontal rules: ---, ***, ___
  result = result.replace(/^[-*_]{3,}$/gm, "");

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, "$1");

  // Clean up extra blank lines
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  return result;
}
