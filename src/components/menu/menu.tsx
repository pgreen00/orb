import {
  Component,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
} from "@stencil/core";

@Component({
  tag: "orb-menu",
  styleUrl: "menu.css",
  shadow: true,
})
export class Menu {
  @Prop() bar = false;
  @Event() action: EventEmitter<{ checked: boolean; value?: string }>;

  @Listen("click")
  onClick(ev: Event) {
    const menuItem =
      ev.target instanceof HTMLElement && ev.target.closest("orb-mi");
    if (menuItem) {
      ev.stopPropagation();
      this.action.emit({
        checked: menuItem.checked,
        value: menuItem.value,
      });
    }
  }

  render() {
    return (
      <Host role={this.bar ? "menubar" : "menu"}>
        <slot></slot>
      </Host>
    );
  }
}
