// Type declarations for markdown-it plugins without bundled types

declare module "markdown-it-emoji" {
  import type MarkdownIt from "markdown-it";
  const bare: MarkdownIt.PluginSimple;
  const full: MarkdownIt.PluginSimple;
  const light: MarkdownIt.PluginSimple;
  export { bare, full, light };
}
