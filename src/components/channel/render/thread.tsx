import { SendIcon } from "../icons";
import type { ComposerModel, ThreadModel } from "../model/types";

export interface ThreadSummaryProps {
  thread: ThreadModel;
  /** The threads' state, from the message they start from */
  state?: "collapsed" | "resolved";
  /** `inline` shows the replies under the message, and `panel` opens them beside the list */
  mode: "inline" | "panel";
  /** Whether the inline replies are shown */
  open: boolean;
  onToggle: () => void;
  onLoadMore: () => void;
}

/** The line under a message with replies: how many there are, when the last one came, and the button that shows them */
export function ThreadSummary(props: ThreadSummaryProps) {
  const { thread } = props;
  const count = `${thread.count} ${thread.count === 1 ? "reply" : "replies"}`;
  const label =
    props.mode === "inline"
      ? `${props.open ? "Hide" : "Show"} ${count}`
      : `Open thread · ${count}`;
  return (
    <div part="thread-summary" class="thread-summary">
      <button
        part="thread-toggle"
        class="thread-toggle"
        type="button"
        aria-expanded={props.mode === "inline" ? (props.open ? "true" : "false") : undefined}
        onClick={() => props.onToggle()}
      >
        {props.state === "resolved" && <span class="resolved">Resolved · </span>}
        {label}
      </button>
      {thread.last !== undefined && (
        <orb-relative-time class="thread-last" date={new Date(thread.last).toISOString()} />
      )}
      {thread.missing > 0 && (
        <button part="thread-load" class="thread-toggle" type="button" onClick={() => props.onLoadMore()}>
          View {thread.missing} more {thread.missing === 1 ? "reply" : "replies"}
        </button>
      )}
    </div>
  );
}

export interface ReplyBoxProps {
  /** The id of the message the reply goes to. It names the box, so focus can go to it. */
  parent: string;
  composer: ComposerModel;
  draft: string;
  disabled: boolean;
  onInput: (text: string) => void;
  onSend: () => void;
}

/** A box for a reply in a thread. Its settings come from the replies composer, or the main one. */
export function ReplyBox(props: ReplyBoxProps) {
  const { composer, draft } = props;
  return (
    <div part="reply-composer" class="reply">
      <orb-textbox>
        <textarea
          rows={1}
          value={draft}
          placeholder={composer.placeholder ?? "Reply"}
          aria-label={composer.label || composer.placeholder || "Reply"}
          data-reply-for={props.parent}
          maxLength={composer.maxLength}
          disabled={props.disabled}
          onInput={(event) => props.onInput((event.target as HTMLTextAreaElement).value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.isComposing) return;
            const mod = event.ctrlKey || event.metaKey;
            const sends = composer.sendOn === "mod-enter" ? mod : !event.shiftKey && !mod;
            if (!sends) return;
            event.preventDefault();
            props.onSend();
          }}
        />
        <orb-button
          slot="bottom-end"
          part="reply-send"
          fill="solid"
          size="sm"
          class="icon-only"
          aria-label="Send reply"
          disabled={props.disabled || !draft.trim()}
          onClick={() => props.onSend()}
        >
          <SendIcon />
        </orb-button>
      </orb-textbox>
    </div>
  );
}
