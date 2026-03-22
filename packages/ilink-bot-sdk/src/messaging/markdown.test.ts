import { describe, it, expect } from "vitest";
import { markdownToPlainText } from "./markdown.js";

describe("markdownToPlainText", () => {
  it("strips bold", () => {
    expect(markdownToPlainText("**bold**")).toBe("bold");
    expect(markdownToPlainText("__bold__")).toBe("bold");
  });

  it("strips italic", () => {
    expect(markdownToPlainText("*italic*")).toBe("italic");
  });

  it("strips strikethrough", () => {
    expect(markdownToPlainText("~~deleted~~")).toBe("deleted");
  });

  it("strips headers", () => {
    expect(markdownToPlainText("## Title")).toBe("Title");
  });

  it("strips code blocks, keeps content", () => {
    expect(markdownToPlainText("```js\nconsole.log(1)\n```")).toBe("console.log(1)");
  });

  it("strips inline code", () => {
    expect(markdownToPlainText("use `foo()` here")).toBe("use foo() here");
  });

  it("removes images entirely", () => {
    expect(markdownToPlainText("![alt](url)")).toBe("");
  });

  it("keeps link display text", () => {
    expect(markdownToPlainText("[click here](https://example.com)")).toBe("click here");
  });

  it("strips blockquotes", () => {
    expect(markdownToPlainText("> quoted")).toBe("quoted");
  });

  it("strips horizontal rules", () => {
    expect(markdownToPlainText("---")).toBe("");
  });

  it("handles table rows", () => {
    const table = "| A | B |\n|---|---|\n| 1 | 2 |";
    const result = markdownToPlainText(table);
    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result).not.toContain("|");
  });

  it("collapses excessive blank lines", () => {
    expect(markdownToPlainText("a\n\n\n\nb")).toBe("a\n\nb");
  });
});
