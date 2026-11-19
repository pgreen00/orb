import chatStyles from "../styles/chat-content.generated.css";

const sheet = new CSSStyleSheet();
sheet.replaceSync(chatStyles());

/**
 * Adopts the chat content styles into a component's shadow root. Call it after
 * the first render, since Stencil adds the component's own styles then. Later
 * sheets win ties, so the chat styles override document rules of the same
 * specificity.
 */
export function adoptChatStyles(root: ShadowRoot) {
  if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}
