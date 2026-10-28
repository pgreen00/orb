import { AttachInternals, Component, Element, Host, Prop, Watch } from '@stencil/core';
import { CheckIcon } from '../../utils/icons';

@Component({
  tag: 'orb-wizard-item',
  styleUrl: 'wizard-item.css',
  shadow: true,
})
export class WizardItem {
  private index: number;
  @AttachInternals() internals: ElementInternals
  @Element() el: HTMLElement

  @Prop() active = false;
  @Prop() completed = false;
  @Prop() disabled = false;
  @Prop() error?: string;

  componentWillLoad() {
    this.internals.role = 'listitem'
  }

  connectedCallback() {
    this.index = Array.from(this.el.parentElement.children).indexOf(this.el)
  }

  @Watch('active', { immediate: true })
  activeChanged() {
    this.internals.ariaCurrent = this.active ? 'step' : null;
  }

  render() {
    return (
      <Host>
        <div class="indicators">
          <div part="icon-container">
            <slot name="icon">
              {this.completed ? <CheckIcon/> : this.index + 1}
            </slot>
          </div>
        </div>
        <div part="labels">
          <slot/>
          <slot name="note" />
        </div>
      </Host>
    );
  }
}
