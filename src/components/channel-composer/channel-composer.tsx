import {
  AttachInternals,
  Component,
  Event,
  EventEmitter,
  Host,
  Prop,
  Watch,
} from "@stencil/core";

/**
 * The message box of an `orb-channel`. It's form-associated: the draft is
 * submitted under `name`, and a form reset clears it. The channel draws the
 * field and the buttons. This element renders nothing itself.
 */
@Component({
  tag: "orb-channel-composer",
  shadow: true,
  formAssociated: true,
})
export class ChannelComposer {
  @AttachInternals() internals: ElementInternals;

  /** The text shown while the draft is empty */
  @Prop() placeholder?: string;

  /** The accessible name of the field. Defaults to `placeholder`. */
  @Prop() label?: string;

  /** The longest draft the field allows */
  @Prop() maxLength?: number;

  /**
   * What sends the message. `enter` sends on Enter, and Shift+Enter adds a
   * line. `mod-enter` sends on Ctrl or ⌘+Enter, and Enter adds a line.
   */
  @Prop() sendOn: "enter" | "mod-enter" = "enter";

  /**
   * `plain` is a textarea. `rich` is a rich text editor, with formatting,
   * mentions and commands.
   */
  @Prop() editor: "plain" | "rich" = "plain";

  /**
   * The formatting toolbar of the rich editor. `toggle` shows a button that
   * shows and hides it. Ignored by the plain editor.
   */
  @Prop() toolbar: "always" | "toggle" | "none" = "toggle";

  /**
   * Adds an attach button, and accepts files dropped or pasted on the box.
   * Its value is the `accept` list, such as `image/*, .pdf`. An empty value
   * accepts any file.
   */
  @Prop() attachments?: string;

  /** The name the draft is submitted under with the form */
  @Prop() name?: string;

  /** The draft. The channel changes it as the user types, and sending clears it. */
  @Prop({ mutable: true }) value = "";

  /** Emitted when the composer's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.internals.setFormValue(this.value);
    this.orbChannelDataChange.emit();
  }

  @Watch("value")
  valueChanged() {
    this.internals.setFormValue(this.value);
    this.orbChannelDataChange.emit();
  }

  @Watch("placeholder")
  @Watch("label")
  @Watch("maxLength")
  @Watch("sendOn")
  @Watch("editor")
  @Watch("toolbar")
  @Watch("attachments")
  changed() {
    this.orbChannelDataChange.emit();
  }

  formResetCallback() {
    this.value = "";
  }

  render() {
    return <Host />;
  }
}
