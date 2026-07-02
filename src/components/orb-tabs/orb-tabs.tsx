import { Component, Element, Event, EventEmitter, Host, Listen, Prop, Watch, forceUpdate, h } from '@stencil/core';

@Component({
  tag: 'je-tabs',
  styleUrl: 'je-tabs.css',
  shadow: true,
})
export class JeTabs {
  @Element() el: HTMLJeTabsElement;

  @Prop({ reflect: true }) mode: 'mobile' | 'pill' | 'segment' = 'segment';

  @Prop({ mutable: true }) value?: string;

  @Event() valueChange: EventEmitter<string | undefined>;

  componentWillRender() {
    const tabs = this.el.querySelectorAll('je-tab');
    for (let t of tabs) t.active = (t.value ?? t.textContent) === this.value
  }

  @Listen('click')
  onClick(ev: Event) {
    if (ev.target instanceof HTMLElement) {
      const tab = ev.target.closest('je-tab');
      if (tab) {
        this.value = tab.value ?? tab.textContent;
      }
    }
  }

  @Watch('value')
  handleValueChange() {
    this.valueChange.emit(this.value);
  }

  getBackgroundStyle() {
    const activeTab = Array.from(this.el.querySelectorAll('je-tab')).find(t => t.active);
    if (!activeTab) return {};
    const { width, left, height } = activeTab.getBoundingClientRect();
    const hostRect = this.el.getBoundingClientRect();
    const xOffset = left - hostRect.left;

    return {
      width: `${width}px`,
      transform: `translateX(${xOffset}px)`,
      height: `${this.mode == 'pill' ? height : '1'}px`
    };
  }

  render() {
    return (
      <Host>
        <div part='indicator' style={this.getBackgroundStyle()}></div>
        <slot onSlotchange={() => forceUpdate(this.el)}></slot>
      </Host>
    );
  }
}
