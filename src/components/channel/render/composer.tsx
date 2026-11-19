import type { ActionModel, ComposerModel, ParticipantModel } from "../model/types";
import { PaperclipIcon, PlusIcon, SendIcon } from "../icons";

export interface ComposerHandlers {
  input: (text: string) => void;
  keyDown: (event: KeyboardEvent) => void;
  paste: (event: ClipboardEvent) => void;
  send: () => void;
  richSubmit: (event: CustomEvent<{ html: string; text: string }>) => void;
  attach: () => void;
  removeFile: (index: number) => void;
  toggleToolbar: () => void;
  action: (name: string, composer: HTMLElement) => void;
  drop: (event: DragEvent) => void;
  dragOver: (event: DragEvent) => void;
  textarea: (el: HTMLTextAreaElement | null) => void;
  rich: (el: HTMLElement | null) => void;
  richCommands: (query: string) => { id: string; label: string; details?: string }[];
  richMentions: (query: string) => { id: string; label: string }[];
}

export interface ComposerProps {
  model: ComposerModel;
  draft: string;
  files: File[];
  /** Disables the field and the send button, such as while muted or in slow mode */
  disabled: boolean;
  readonly: boolean;
  /** Why the composer is off, shown under it */
  note?: string;
  /** Text for screen readers, such as when slow mode starts or ends */
  announcement?: string;
  /** The countdown shown while slow mode is on */
  countdown?: string;
  toolbarShown: boolean;
  handlers: ComposerHandlers;
  /** The action buttons, from the composer's children */
  actions: ActionModel[];
  fileUrls: Map<File, string>;
}

/** The message box. The plain editor is a textarea, and the rich one is `orb-rich-text`. Both use the same slots. */
export function ComposerView(props: ComposerProps) {
  const { model, handlers, draft, files, disabled, readonly } = props;
  const sendDisabled = disabled || readonly || (!draft.trim() && files.length === 0);
  const placement = model.toolbar === "always" || (model.toolbar === "toggle" && props.toolbarShown) ? "bottom" : "none";

  const top = files.length > 0 && (
    <div slot="top-start" part="files" class="files">
      {files.map((file, index) => (
        <span class="file" key={`${file.name}-${index}`}>
          {props.fileUrls.get(file) && file.type.startsWith("image/") && <img src={props.fileUrls.get(file)} alt="" />}
          <span class="file-name">{file.name}</span>
          <orb-button
            fill="clear"
            size="xs"
            class="icon-only"
            aria-label={`Remove ${file.name}`}
            disabled={disabled}
            onClick={() => handlers.removeFile(index)}
          >
            <PlusIcon style={{ transform: "rotate(45deg)" }} />
          </orb-button>
        </span>
      ))}
    </div>
  );

  const bottomStart = (
    <>
      {model.attachments !== undefined && (
        <orb-button
          slot="bottom-start"
          part="attach"
          fill="clear"
          size="sm"
          class="icon-only"
          aria-label="Attach file"
          disabled={disabled || readonly}
          onClick={() => handlers.attach()}
        >
          <PaperclipIcon />
        </orb-button>
      )}
      {model.editor === "rich" && model.toolbar === "toggle" && (
        <orb-button
          slot="bottom-start"
          part="toolbar-toggle"
          fill="clear"
          size="sm"
          aria-label="Formatting"
          aria-pressed={props.toolbarShown ? "true" : "false"}
          disabled={disabled || readonly}
          onClick={() => handlers.toggleToolbar()}
        >
          Aa
        </orb-button>
      )}
      {props.actions.map((action) => (
        <orb-button
          key={action.name}
          slot="bottom-start"
          part="action"
          fill="clear"
          size="sm"
          class="icon-only"
          aria-label={action.label}
          disabled={disabled || readonly}
          onClick={() => handlers.action(action.name, model.el)}
        >
          {action.icon ? (
            <span class="action-icon" ref={(el) => el?.replaceChildren(action.icon!.cloneNode(true))} />
          ) : (
            <PlusIcon />
          )}
        </orb-button>
      ))}
    </>
  );

  const send = (
    <orb-button
      slot="bottom-end"
      part="send"
      fill="solid"
      size="sm"
      class="icon-only"
      aria-label="Send"
      disabled={sendDisabled}
      onClick={() => handlers.send()}
    >
      <SendIcon />
    </orb-button>
  );

  return (
    <div part="composer" class="composer" onDragOver={handlers.dragOver} onDrop={handlers.drop}>
      {model.editor === "rich" ? (
        <orb-rich-text
          ref={(el) => handlers.rich(el ?? null)}
          variant="compact"
          enter-action="submit"
          toolbar-placement={placement}
          placeholder={model.placeholder}
          label={model.label}
          disabled={disabled}
          readonly={readonly}
          commands={handlers.richCommands}
          mentions={handlers.richMentions}
          onOrbSubmit={handlers.richSubmit}
        >
          {top}
          {bottomStart}
          {send}
        </orb-rich-text>
      ) : (
        <orb-textbox>
          <textarea
            rows={1}
            value={draft}
            placeholder={model.placeholder}
            aria-label={model.label || model.placeholder}
            maxLength={model.maxLength}
            disabled={disabled}
            readOnly={readonly}
            onInput={(event) => handlers.input((event.target as HTMLTextAreaElement).value)}
            onKeyDown={handlers.keyDown}
            onPaste={handlers.paste}
            ref={(el) => handlers.textarea(el ?? null)}
          />
          {top}
          {bottomStart}
          {send}
        </orb-textbox>
      )}
      {props.countdown && (
        <span part="countdown" class="note" aria-hidden="true">
          {props.countdown}
        </span>
      )}
      {props.note && (
        <p part="note" class="note">
          {props.note}
        </p>
      )}
      <p part="announcement" class="sr-only" role="status">
        {props.announcement}
      </p>
    </div>
  );
}

/** The participants to offer for a mention, from the query */
export function mentionItems(participants: ParticipantModel[], query: string) {
  const wanted = query.toLowerCase();
  return participants.filter((p) => p.name.toLowerCase().includes(wanted)).map((p) => ({ id: p.id, label: p.name }));
}
