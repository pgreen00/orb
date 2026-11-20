/** What a message writer starts its message with */
export interface MessageWriterOptions {
  /** The participant who writes the message, by id */
  from: string;
  /** The message's id, so the app can find it later */
  id?: string;
  /** The version switcher, when the message is one of several versions */
  variants?: { current: number; count: number };
}

export interface ToolCallInit {
  callId: string;
  name: string;
  /** The arguments the tool was called with. Stored as JSON. */
  args?: unknown;
  /** Defaults to `running` */
  status?: string;
  requiresApproval?: boolean;
}

export interface MessageWriter {
  /** The message element, for anything the writer doesn't cover */
  readonly message: HTMLElement;
  /** Starts or continues the reasoning block */
  reasoning(text: string): void;
  /** Adds a tool call. Its result comes later, with `toolResult`. */
  toolCall(call: ToolCallInit): void;
  /** Stores a tool call's result, and marks the call `done` */
  toolResult(callId: string, result: unknown): void;
  /** Appends to the answer's text */
  text(text: string): void;
  /** Ends the message: it stops streaming, and its reasoning is done */
  finish(): void;
  /** Ends the message as failed, with the reason shown in place of "Not sent" */
  fail(reason: string): void;
}

function jsonScript(part: "args" | "result", value: unknown): HTMLScriptElement {
  const script = document.createElement("script");
  script.type = "application/json";
  script.setAttribute("data-part", part);
  script.textContent = JSON.stringify(value) ?? "null";
  return script;
}

/**
 * Writes a streaming message into an `orb-channel`, by adding and changing its
 * elements. It doesn't depend on any model SDK, and everything it does could be
 * written by hand. The channel batches the changes like any other.
 *
 * @example
 * const writer = createMessageWriter(channel, { from: "claude" });
 * writer.reasoning("The user wants…");
 * writer.text("Here's what changed");
 * writer.finish();
 */
export function createMessageWriter(channel: HTMLElement, options: MessageWriterOptions): MessageWriter {
  const message = document.createElement("orb-channel-message");
  message.setAttribute("from", options.from);
  if (options.id) message.id = options.id;
  message.setAttribute("ts", new Date().toISOString());
  message.setAttribute("streaming", "");
  if (options.variants) {
    const switcher = document.createElement("orb-channel-variants");
    switcher.setAttribute("current", String(options.variants.current));
    switcher.setAttribute("count", String(options.variants.count));
    message.append(switcher);
  }
  channel.append(message);

  // The markdown script that new text goes into. Anything else in between starts a new one, so the order holds.
  let script: HTMLScriptElement | undefined;
  let thinking: { el: HTMLElement; started: number } | undefined;

  const endThinking = () => {
    if (!thinking) return;
    thinking.el.setAttribute("state", "done");
    thinking.el.setAttribute("duration", `${((Date.now() - thinking.started) / 1000).toFixed(1)}s`);
    thinking = undefined;
  };

  return {
    message,
    reasoning(text) {
      script = undefined;
      if (!thinking) {
        const el = document.createElement("orb-channel-reasoning");
        el.setAttribute("state", "thinking");
        message.append(el);
        thinking = { el, started: Date.now() };
      }
      if (text) thinking.el.append(document.createTextNode(text));
    },
    toolCall({ callId, name, args, status = "running", requiresApproval }) {
      endThinking();
      script = undefined;
      const el = document.createElement("orb-channel-tool-call");
      el.setAttribute("name", name);
      el.setAttribute("call-id", callId);
      el.setAttribute("status", status);
      if (requiresApproval) el.setAttribute("requires-approval", "");
      if (args !== undefined) el.append(jsonScript("args", args));
      message.append(el);
    },
    toolResult(callId, result) {
      const el = message.querySelector(`orb-channel-tool-call[call-id="${CSS.escape(callId)}"]`);
      if (!el) {
        console.warn(`orb-channel: no tool call with the call-id "${callId}" in this message.`);
        return;
      }
      el.querySelector(':scope > script[data-part="result"]')?.remove();
      el.append(jsonScript("result", result));
      el.setAttribute("status", "done");
    },
    text(text) {
      endThinking();
      if (!text) return;
      if (!script) {
        script = document.createElement("script");
        script.type = "text/markdown";
        message.append(script);
      }
      script.append(document.createTextNode(text));
    },
    finish() {
      endThinking();
      script = undefined;
      message.removeAttribute("streaming");
    },
    fail(reason) {
      endThinking();
      script = undefined;
      message.removeAttribute("streaming");
      message.setAttribute("status", "failed");
      message.setAttribute("error", reason);
    },
  };
}
