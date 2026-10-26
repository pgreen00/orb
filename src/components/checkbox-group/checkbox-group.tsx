import { AttachInternals, Component, Host, Prop } from "@stencil/core";

/**
 * Groups related checkboxes or toggles under a shared label. The host has the
 * `group` role and takes its accessible name from the label and its
 * description from the note.
 *
 * @slot - The checkboxes or toggles in the group
 * @slot label - Label content, used instead of the `label` attribute
 * @slot note - Note content, used instead of the `note` attribute
 *
 * @part content - The wrapper around the default slot
 */
@Component({
  tag: "orb-checkbox-group",
  styleUrl: "checkbox-group.css",
  shadow: true,
})
export class CheckboxGroup {
  @AttachInternals() internals!: ElementInternals;

  /**
   * Label that shows above the controls
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the controls
   */
  @Prop() note?: string;

  /**
   * Lays the controls out in a column or a wrapping row
   */
  @Prop({ reflect: true }) mode: "row" | "column" = "column";

  componentWillLoad() {
    this.internals.role = "group";
  }

  render() {
    return (
      <Host>
        <slot
          name="label"
          ref={(el) => (this.internals.ariaLabelledByElements = [el])}
        >
          {this.label && <orb-label>{this.label}</orb-label>}
        </slot>
        <div part="content">
          <slot />
        </div>
        <slot
          name="note"
          ref={(el) => (this.internals.ariaDescribedByElements = [el])}
        >
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>
      </Host>
    );
  }
}
