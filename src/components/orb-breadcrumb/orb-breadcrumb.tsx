import { Component, h } from '@stencil/core';

@Component({
  tag: 'je-breadcrumb',
  styleUrl: 'je-breadcrumb.css',
  shadow: true,
})
export class JeBreadcrumb {
  render() {
    return (
      <a>
        <slot/>
      </a>
    );
  }
}
