import { Component, Prop, Element, Host, AttachInternals, State, Watch } from "@stencil/core";
import { RadioEmpty, RadioFill } from "../../utils/icons";

@Component({
  tag: "orb-radio",
  styleUrl: "radio.css",
  shadow: true,
})
export class Radio {
  @AttachInternals() internals: ElementInternals
  @Element() el!: HTMLElement;
  @State() selected = false;

  /**
   * The value of this option and the radio group will compare against
   */
  @Prop() value: any;

  componentWillLoad() {
    this.internals.role = 'radio'
    this.onSelectedChange(this.el.dataset.selected)
  }

  @Watch('data-selected')
  onSelectedChange(selected?: string) {
    this.selected = selected === '';
    this.el.tabIndex = this.selected ? 0 : -1
    this.internals.ariaChecked = this.selected ? "true" : "false"
    this.internals.states[this.selected ? 'add' : 'delete']('selected')
  }

  render() {
    return (
      <Host>
        {this.selected ? <RadioFill /> : <RadioEmpty />}
        <slot />
      </Host>
    );
  }
}
