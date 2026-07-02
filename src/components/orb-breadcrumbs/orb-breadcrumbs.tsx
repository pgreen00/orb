import { Component, Element, Event, EventEmitter, h, Prop } from '@stencil/core';

@Component({
  tag: 'je-breadcrumbs',
  styleUrl: 'je-breadcrumbs.css',
  shadow: true,
})
export class JeBreadcrumbs {
  @Element() host: HTMLElement;
  @Prop() itemsBeforeCollapse = 1;
  @Prop() itemsAfterCollapse = 1;
  @Prop() maxItems?: number;
  @Event() expandClick: EventEmitter;

  componentWillRender() {
    const crumbs = Array.from(this.host.querySelectorAll('je-breadcrumb'));
    this.host.querySelector('.collapse')?.remove();

    if (this.maxItems && crumbs.length > this.maxItems) {
      crumbs.forEach((crumb, index) => {
        const shouldShow = index < this.itemsBeforeCollapse || index >= crumbs.length - this.itemsAfterCollapse;
        crumb.classList.toggle('visible', shouldShow);
      });

      if (crumbs.length > this.itemsBeforeCollapse) {
        const insertionIndex = Math.min(this.itemsBeforeCollapse - 1, crumbs.length - 1);
        const referenceCrumb = crumbs[insertionIndex];
        referenceCrumb.insertAdjacentHTML('afterend', '<button class="collapse">more_horiz</button>');
        const collapseButton = this.host.querySelector<HTMLButtonElement>('.collapse');
        collapseButton.onclick = () => this.expandClick.emit();
      }
    } else {
      crumbs.forEach((crumb) => crumb.classList.add('visible'));
    }
  }

  componentDidRender() {
    const crumbs = Array.from(this.host.querySelectorAll('je-breadcrumb'));
    crumbs.forEach((crumb, _i) => {
      const anchor = crumb.shadowRoot.querySelector('a')
      if (anchor) {
        if (crumb.matches(':last-of-type')) {
          anchor.setAttribute('aria-current', 'page');
        } else {
          anchor.removeAttribute('aria-current');
        }
      }
    });
  }

  render() {
    return (
      <nav>
        <slot />
      </nav>
    );
  }
}
