import {
  AttachInternals,
  Component,
  Element,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { CheckIcon, CloseIcon } from "../../utils/icons";

/**
 * One step in an `<orb-wizard>`. Set `active` on the current step and
 * `completed` on finished ones.
 *
 * @slot - The step's label
 * @slot icon - Replaces the number, checkmark, or spinner in the marker
 * @slot note - Supporting text under the label
 *
 * @part button - The button wrapping the step when the wizard is `clickable`
 * @part marker - The circle with the number, checkmark, or icon
 * @part connector - The line between markers
 * @part labels - The wrapper around the label, note, and error
 * @part label - The label
 * @part note - The note
 * @part error - The error message
 */
@Component({
  tag: "orb-wizard-item",
  styleUrl: "wizard-item.css",
  shadow: true,
})
export class WizardItem {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;

  /** Position in the wizard, from `data-index` set by `orb-wizard`. */
  @State() index = 0;
  /** Set by `orb-wizard` in `linear` mode for steps that can't be reached yet. */
  @State() locked = false;
  /** Set by `orb-wizard` when it's `clickable`. */
  @State() clickable = false;

  /**
   * The current step. Setting it on one step makes the others inactive.
   */
  @Prop({ mutable: true, reflect: true }) active = false;

  /**
   * Marks the step as finished. The wizard never sets this itself.
   */
  @Prop({ reflect: true }) completed = false;

  /**
   * Keeps the step visible but unreachable
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Shows a spinner in the marker and sets `aria-busy`
   */
  @Prop({ reflect: true }) loading = false;

  /**
   * Marks the step as failed and shows this message under the label
   */
  @Prop({ reflect: true }) error?: string;

  /**
   * Colors the marker. Color alone doesn't carry meaning, so explain the
   * reason in the label, note, or `error`.
   */
  @Prop({ reflect: true }) variant: "primary" | "success" | "warning" | "danger" =
    "primary";

  /**
   * Animates the marker to draw attention to the step. Disabled when the user
   * prefers reduced motion.
   */
  @Prop({ reflect: true }) attention?: "pulse" | "bounce";

  componentWillLoad() {
    this.internals.role = "listitem";
    this.readWizardState();
  }

  @Watch("data-index")
  @Watch("data-locked")
  @Watch("data-clickable")
  readWizardState() {
    this.index = Number(this.el.dataset.index ?? 0);
    this.locked = this.el.hasAttribute("data-locked");
    this.clickable = this.el.hasAttribute("data-clickable");
  }

  componentWillRender() {
    // aria-current goes on whichever element is focusable.
    this.internals.ariaCurrent = this.active && !this.clickable ? "step" : null;
    this.internals.ariaBusy = this.loading ? "true" : null;
    const { states } = this.internals;
    const setState = (name: string, on: boolean) =>
      on ? states.add(name) : states.delete(name);
    setState("active", this.active);
    setState("completed", this.completed);
    setState("locked", this.locked);
    setState("error", !!this.error);
  }

  private get status() {
    if (this.error) return "Error";
    if (this.disabled) return "Disabled";
    if (this.locked) return "Locked";
    return this.completed ? "Completed" : "Not completed";
  }

  private renderMarkerContent() {
    if (this.loading) return <orb-loading />;
    if (this.error) return <CloseIcon />;
    if (this.completed) return <CheckIcon />;
    return this.index + 1;
  }

  render() {
    const content = [
      <span class="indicators" aria-hidden="true">
        <span class="connector before" part="connector" />
        <span class="marker" part="marker">
          <slot name="icon">{this.renderMarkerContent()}</slot>
        </span>
        <span class="connector after" part="connector" />
      </span>,
      <span class="labels" part="labels">
        <span class="label" part="label">
          <slot />
        </span>
        <span class="note" part="note">
          <slot name="note" />
        </span>
        {this.error && (
          <span class="error" part="error">
            {this.error}
          </span>
        )}
        <span class="visually-hidden">{this.status}</span>
      </span>,
    ];

    return (
      <Host>
        {this.clickable ? (
          <button
            type="button"
            class="step"
            part="button"
            disabled={this.disabled || this.locked}
            aria-current={this.active ? "step" : undefined}
          >
            {content}
          </button>
        ) : (
          <div class="step">{content}</div>
        )}
      </Host>
    );
  }
}
