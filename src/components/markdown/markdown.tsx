import { Component, Element, Prop, Watch } from "@stencil/core";
import type MarkdownIt from "markdown-it";

let markdownIt: Promise<typeof MarkdownIt> | undefined;

/** Loads markdown-it on first use so pages without markdown don't pay for it. */
const loadMarkdownIt = () =>
  (markdownIt ??= import("markdown-it").then((mod) => mod.default));

const SOURCE_SELECTOR = 'script[type="text/markdown"]';

/**
 * Removes the indentation shared by every line, so markdown can be indented to
 * match the surrounding HTML without turning into code blocks.
 */
function dedent(text: string) {
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.length - line.trimStart().length),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
}

const isSource = (node: Node) =>
  node instanceof HTMLScriptElement && node.matches(SOURCE_SELECTOR);

/**
 * Renders markdown from a child `<script type="text/markdown">` into the light
 * DOM, so the output picks up the page's native element styles.
 */
@Component({
  tag: "orb-markdown",
  styleUrl: "markdown.css",
  shadow: false,
})
export class Markdown {
  private rendered: ChildNode[] = [];
  private renderer?: { key: string; md: MarkdownIt };
  private renderId = 0;
  private observer = new MutationObserver((records) => {
    if (records.some((record) => this.isSourceChange(record))) this.update();
  });

  @Element() el!: HTMLElement;

  /**
   * Allows raw HTML in the markdown. HTML is escaped by default. Only enable
   * this for trusted content.
   */
  @Prop() html = false;

  /**
   * Converts single line breaks into `<br>` elements
   */
  @Prop() breaks = false;

  /**
   * Turns URL-like text into links
   */
  @Prop() linkify = true;

  /**
   * Replaces quotes, dashes, and similar with typographic equivalents
   */
  @Prop() typographer = true;

  connectedCallback() {
    this.observer.observe(this.el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.update();
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  @Watch("html")
  @Watch("breaks")
  @Watch("linkify")
  @Watch("typographer")
  handleOptionChange() {
    this.update();
  }

  private get source() {
    return this.el.querySelector<HTMLScriptElement>(`:scope > ${SOURCE_SELECTOR}`);
  }

  /** Ignores changes to the rendered output, so only edits to the source re-render. */
  private isSourceChange(record: MutationRecord) {
    if (record.target === this.el) {
      return [...record.addedNodes, ...record.removedNodes].some(isSource);
    }
    return isSource(record.target) || isSource(record.target.parentNode);
  }

  private async getRenderer() {
    const options = {
      html: this.html,
      breaks: this.breaks,
      linkify: this.linkify,
      typographer: this.typographer,
    };
    const key = JSON.stringify(options);
    if (this.renderer?.key !== key) {
      const MarkdownIt = await loadMarkdownIt();
      this.renderer = { key, md: new MarkdownIt(options) };
    }
    return this.renderer.md;
  }

  private async update() {
    const id = ++this.renderId;
    const source = this.source;
    let html = "";

    if (source) {
      const md = await this.getRenderer();
      // A newer update started while markdown-it was loading.
      if (id !== this.renderId) return;
      html = md.render(dedent(source.textContent ?? ""));
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    const nodes = [...template.content.childNodes];

    this.rendered.forEach((node) => node.remove());
    this.rendered = nodes;
    if (source) source.after(...nodes);
  }
}
