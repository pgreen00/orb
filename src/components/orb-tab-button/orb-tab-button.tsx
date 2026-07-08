import {
  AttachInternals,
  Component,
  Element,
  Host,
  Method,
  Prop,
} from "@stencil/core";
import { CloseIcon } from "../../utils/icons";

@Component({
  tag: "orb-tab-button",
  styleUrl: "orb-tab-button.css",
  shadow: true,
  formAssociated: true,
})
export class OrbTabButton {
  @AttachInternals({
    states: {
      /**
       * The panel is currently being displayed
       */
      active: false,
    },
  })
  internals: ElementInternals;
  @Element() el: HTMLElement;
  @Prop() panel?: string;
  @Prop() closable = false;

  /**
   * @internal
   */
  @Method()
  async setActive(isActive: boolean) {
    const action = isActive ? "add" : "delete";
    this.internals.states[action]("active");
  }

  render() {
    return (
      <Host role="tab">
        <slot></slot>
        {this.closable && (
          <orb-button size="xs" class="icon-only">
            <CloseIcon />
          </orb-button>
        )}
      </Host>
    );
  }
}
