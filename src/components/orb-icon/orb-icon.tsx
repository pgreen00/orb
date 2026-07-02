import { Component, Host, h, Prop } from '@stencil/core';

const size = {
  xs: '1rem',
  sm: '1.25rem',
  md: '1.5rem',
  lg: '2.5rem',
  xl: '3rem'
}

const optical = {
  xs: '16',
  sm: '20',
  md: '24',
  lg: '40',
  xl: '48'
}

@Component({
  tag: 'je-icon',
  styleUrl: 'je-icon.scss',
  shadow: true
})
export class JeIcon {
  /** Size of the icon */
  @Prop() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /** Whether or not the icon should be filled */
  @Prop() fill = false;

  /** Icon grade */
  @Prop() grade?: 'high' | 'low';

  /** Icon weight */
  @Prop() weight = 400;

  render() {
    return (
      <Host>
        <style>{`
          :host {
            --grade: ${this.grade == 'low' ? -25 : this.grade == 'high' ? 200 : 0};
            --weight: ${this.weight};
            --fill: ${this.fill ? 1 : 0};
            font-size: ${size[this.size]};
            --optical: ${optical[this.size]};
          }
        `}</style>
        <slot />
      </Host>
    );
  }
}
