import type { ContentPart, SuggestionModel, SuggestionsModel, VariantsModel } from "../model/types";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

export type ReasoningPart = Extract<ContentPart, { type: "reasoning" }>;
export type ToolCallPart = Extract<ContentPart, { type: "tool-call" }>;
export type CitationPart = Extract<ContentPart, { type: "citation" }>;

/** A model's reasoning, as a collapsible block above its answer */
export function ReasoningBlock(props: { part: ReasoningPart; open: boolean }) {
  const { part } = props;
  const label = part.label ?? (part.state === "done" ? "Reasoning" : "Thinking…");
  return (
    <orb-details iconSide="left" part="reasoning" class="reasoning" summary={part.duration ? `${label} (${part.duration})` : label} open={props.open}>
      <div part="reasoning-text" class="reasoning-text">
        {part.text}
      </div>
    </orb-details>
  );
}

const STATUS_LABELS: Record<string, string> = {
  running: "Running",
  done: "Done",
  error: "Failed",
  "awaiting-approval": "Waiting for approval",
  denied: "Denied",
};

/** A tool call, with its arguments and result, and approve and deny buttons while it waits for approval */
export function ToolCallBlock(props: { part: ToolCallPart; onDecide: (approved: boolean) => void }) {
  const { part } = props;
  const data = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));
  return (
    <div part="tool-call" class="tool" data-status={part.status}>
      <div class="tool-head">
        <code part="tool-name" class="tool-name">
          {part.name}
        </code>
        <span part="tool-status" class="tool-status">
          {STATUS_LABELS[part.status] ?? part.status}
        </span>
        {part.requiresApproval && (
          <span class="badge">Needs approval</span>
        )}
      </div>
      {part.args !== undefined && (
        <pre part="tool-args" class="tool-data">
          {data(part.args)}
        </pre>
      )}
      {part.result !== undefined && (
        <pre part="tool-result" class="tool-data">
          {data(part.result)}
        </pre>
      )}
      {part.status === "awaiting-approval" && (
        <div part="approval" class="tool-actions">
          <orb-button size="xs" onClick={() => props.onDecide(true)}>
            Approve
          </orb-button>
          <orb-button size="xs" fill="outline" onClick={() => props.onDecide(false)}>
            Deny
          </orb-button>
        </div>
      )}
    </div>
  );
}

/** A citation's number, in the text. Its popover is drawn by the channel, next to the list. */
export function CitationButton(props: { part: CitationPart }) {
  const { part } = props;
  return (
    <button
      part="citation"
      class="citation"
      id={part.anchor}
      type="button"
      aria-label={part.title ? `Source ${part.index}: ${part.title}` : `Source ${part.index}`}
    >
      {part.index}
    </button>
  );
}

/** The popover of a citation, which opens from its number and shows the link */
export function CitationPopover(props: { key?: string; part: CitationPart }) {
  const { part } = props;
  return (
    <orb-popover part="citation-popover" class="citation-popover" for={part.anchor}>
      <div class="citation-card">
        {part.title && <strong>{part.title}</strong>}
        <a href={part.href} target="_blank" rel="noopener noreferrer">
          {part.href}
        </a>
      </div>
    </orb-popover>
  );
}

/** The version switcher of a message, such as "‹ 2 / 3 ›" */
export function VariantSwitch(props: { variants: VariantsModel; onChange: (current: number) => void }) {
  const { current, count, busy } = props.variants;
  return (
    <div part="variants" class="variants" role="group" aria-label={`Version ${current} of ${count}`} aria-busy={busy ? "true" : undefined}>
      <orb-button
        part="variants-previous"
        fill="clear"
        size="xs"
        class="icon-only"
        aria-label="Previous version"
        disabled={busy || current <= 1}
        onClick={() => props.onChange(current - 1)}
      >
        <ChevronLeftIcon />
      </orb-button>
      <span part="variants-count" class="variants-count" aria-hidden="true">
        {current} / {count}
      </span>
      {busy && <orb-loading part="variants-loading" class="variants-loading" />}
      <orb-button
        part="variants-next"
        fill="clear"
        size="xs"
        class="icon-only"
        aria-label="Next version"
        disabled={busy || current >= count}
        onClick={() => props.onChange(current + 1)}
      >
        <ChevronRightIcon />
      </orb-button>
    </div>
  );
}

/** The suggestions the app offers above the message box. Clicking one fills the box, or sends it. */
export function SuggestionsView(props: { suggestions: SuggestionsModel; onPick: (item: SuggestionModel) => void }) {
  return (
    <div part="suggestions" class="suggestions" role="group" aria-label={props.suggestions.label}>
      {props.suggestions.items.map((item) => (
        <orb-button part="suggestion" fill="outline" size="sm" radius="pill" onClick={() => props.onPick(item)}>
          {item.icon && <span class="suggestion-icon" ref={(el) => el?.replaceChildren(item.icon!.cloneNode(true))} />}
          {item.text}
        </orb-button>
      ))}
    </div>
  );
}
