import {
  AttachInternals,
  Component,
  Element,
  Host,
  Method,
  Prop,
} from "@stencil/core";

@Component({
  tag: "orb-tab-panel",
  styleUrl: "orb-tab-panel.css",
  shadow: true,
  formAssociated: true,
})
export class OrbTabPanel {
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
  @Prop() name?: string;

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
      <Host role="tabpanel">
        <slot></slot>
      </Host>
    );
  }
}
