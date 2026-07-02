import { Component, Host, Prop, h } from '@stencil/core';
import { shade, Color } from '../../utils/color';

@Component({
  tag: 'je-color',
  shadow: true,
})
export class JeColor {
  /** Fixed color */
  @Prop({ reflect: true }) color?: Color;

  /** Color in light mode */
  @Prop() light?: Color;

  /** Color in dark mode */
  @Prop() dark?: Color;

  private get cssValue() {
    if (this.color) {
      return shade(this.color, 500)
    } else {
      return `light-dark(${this.light ? shade(this.light, 500) : shade('neutral', 900)}, ${this.dark ? shade(this.dark, 500) : shade('neutral', 50)})`
    }
  }

  render() {
    return (
      <Host>
        <style>{`:host{display:contents;color:${this.cssValue};}`}</style>
        <slot/>
      </Host>
    );
  }
}
