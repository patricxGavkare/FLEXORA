// =============================================================================
// MathView.jsx - KaTeX Mathematical Notation Renderer
//
// WHAT THIS COMPONENT DOES (in simple English):
// Renders LaTeX mathematical equations into crisp, publication-grade typography
// directly in the browser using KaTeX.
//
// Handles both display equations (centered equations) and inline expressions
// (like variables and formulas inside bullet points).
// =============================================================================

import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function MathView({ math, block = false, inline = false }) {
  const renderedHtml = useMemo(() => {
    if (!math) return "";
    try {
      return katex.renderToString(math, {
        displayMode: block && !inline,
        throwOnError: false,
      });
    } catch (err) {
      console.warn("KaTeX render fallback:", err);
      return `<code class="math-fallback">${math}</code>`;
    }
  }, [math, block, inline]);

  if (block && !inline) {
    return (
      <div
        className="katex-display-block"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
        style={{
          overflowX: "auto",
          padding: "6px 0",
          color: "var(--accent)",
        }}
      />
    );
  }

  return (
    <span
      className="katex-inline"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      style={{
        display: "inline-block",
        verticalAlign: "baseline",
      }}
    />
  );
}

// Helper to parse strings containing inline LaTeX expressions like \(...\) or $...$
export function renderWithMath(text) {
  if (typeof text !== "string") return text;

  // Match \( ... \) or $ ... $
  const regex = /(\\\([^\)]+\\\)|\$[^\$]+\$)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      const expr = part.slice(2, -2).trim();
      return <MathView key={index} math={expr} inline />;
    }
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const expr = part.slice(1, -1).trim();
      return <MathView key={index} math={expr} inline />;
    }
    return part;
  });
}
