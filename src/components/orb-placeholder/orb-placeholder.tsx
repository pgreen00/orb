import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-placeholder',
  styleUrl: 'je-placeholder.css',
  shadow: true,
})
export class JePlaceholder {
  /**
   * Whether or not the component should have the animated "shimmer" effect
   */
  @Prop({ reflect: true }) animated = true;

  render() {
    return <slot/>
  }
}
