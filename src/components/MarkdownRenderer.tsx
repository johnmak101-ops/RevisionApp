"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { full as emoji } from "markdown-it-emoji";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cjs(m: any) { return m?.default ?? m; }

/* eslint-disable @typescript-eslint/no-require-imports */
const taskLists   = cjs(require("markdown-it-task-lists"));
const anchor      = cjs(require("markdown-it-anchor"));
const footnote    = cjs(require("markdown-it-footnote"));
const container   = cjs(require("markdown-it-container"));
const sup         = cjs(require("markdown-it-sup"));
const sub         = cjs(require("markdown-it-sub"));
/* eslint-enable @typescript-eslint/no-require-imports */

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
    if (lang) {
      try {
        const result = hljs.highlight(str, { language: lang, ignoreIllegals: true });
        return `<pre class="hljs"><code>${result.value}</code></pre>`;
      } catch {
        // unknown language — fall through to auto-detect
      }
    }
    try {
      const result = hljs.highlightAuto(str);
      return `<pre class="hljs"><code>${result.value}</code></pre>`;
    } catch {
      // fallback to plain text
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
})
  .use(taskLists, { enabled: true, label: true })
  .use(anchor, { permalink: false })
  .use(emoji)
  .use(footnote)
  .use(container, "warning")
  .use(container, "info")
  .use(container, "tip")
  .use(sup)
  .use(sub);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultRender = md.renderer.rules.link_open ||
  function (tokens: any[], idx: number, options: any, _env: any, self: any) {
    return self.renderToken(tokens, idx, options);
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
md.renderer.rules.link_open = function (tokens: any[], idx: number, options: any, env: any, self: any) {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultRender(tokens, idx, options, env, self);
};

/**
 * Pre-process AI-generated markdown to fix common formatting issues:
 * 1. Missing space after # in headings:  ###Opening → ### Opening
 * 2. Closing code fence merged with code: `9\`\`\`` → code on one line, fence on next
 * 3. Opening code fence merged with code: \`\`\`javaint big = 200; → split to two lines
 */
function fixMarkdown(src: string): string {
  let result = src;

  // Fix 1: Missing space after # in headings
  result = result.replace(
    /^(#{1,6})([^\s#])/gm,
    (_m, hashes: string, ch: string) => `${hashes} ${ch}`
  );

  // Fix 2: Closing code fence on same line as code  e.g. "int x = 9;```"
  result = result.replace(
    /^(.+)(```)$/gm,
    (_m, code: string, fence: string) => {
      // Only split if the line has actual code before the fence (not just whitespace)
      if (code.trim() && !code.trim().startsWith('```')) {
        return `${code}\n${fence}`;
      }
      return _m;
    }
  );

  return result;
}

/** MarkdownRenderer 元件的 Props */
export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown 渲染器 — 用 markdown-it 解析、DOMPurify 消毒、highlight.js 語法高亮。
 * 包含 AI 生成 markdown 常見格式問題的自動修復。
 */
export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    // Auto-fix common AI markdown issues before rendering
    const fixed = fixMarkdown(content);
    const raw = md.render(fixed);
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["input"],
      ADD_ATTR: ["checked", "disabled", "type"],
    });
  }, [content]);

  return (
    <div
      className={`chat-markdown ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
