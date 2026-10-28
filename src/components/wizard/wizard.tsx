import {
  AttachInternals,
  Component,
  Event,
  EventEmitter,
  Host
} from "@stencil/core";

@Component({
  tag: "orb-wizard",
  styleUrl: "wizard.css",
  shadow: true,
})
export class Wizard {
  @AttachInternals() internals: ElementInternals
  @Event() stepChange: EventEmitter<number>;
  @Event() finish: EventEmitter<void>;

  componentWillLoad() {
    this.internals.role = 'list'
  }

  render() {
    return (
      <Host>
        <slot/>
      </Host>
    );
  }
}
