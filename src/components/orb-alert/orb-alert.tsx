import { Component, Listen, Prop, h, Element, Host, State, Event, EventEmitter, Method, Watch } from '@stencil/core';
import { Color } from '../../utils/color';
import { OverlayData } from '../je-overlay/je-overlay';

@Component({
  tag: 'je-alert',
  styleUrl: 'je-alert.css',
  shadow: true,
})
export class JeAlert {
  private role?: string;
  private data?: any;
  @State() paused = true;
  @Element() el!: HTMLJeAlertElement;
  @Prop() closable = false;
  @Prop({ reflect: true }) color?: Color;
  @Prop() duration = 0;
  @Prop({ mutable: true, reflect: true }) open = false;
  @Event() present: EventEmitter;
  @Event() dismiss: EventEmitter<OverlayData>;

  @Watch('open')
  onOpenChange(open: boolean) {
    if (open) {
      const animation = this.el.animate({
        opacity: [0, 1],
        transform: ['scale(0%)', 'scale(100%)'],
        display: ['none', 'block']
      }, 600)
      animation.onfinish = () => {
        this.paused = false;
        this.present.emit();
      }
    } else {
      const animation = this.el.animate({
        opacity: [1, 0],
        transform: ['scale(100%)', 'scale(0%)'],
        display: ['block', 'none']
      }, 600)
      animation.onfinish = () => {
        this.paused = true;
        this.dismiss.emit({
          role: this.role ?? 'manualDismiss',
          data: this.data
        });
        this.role = undefined;
        this.data = undefined;
      }
    }
  }

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide(role?: string, data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  @Method()
  didDismiss() {
    return new Promise(resolve => {
      this.el.addEventListener('dismiss', e => resolve(e.detail), { once: true });
    });
  }

  @Listen('mouseenter')
  onMouseEnter() {
    if (this.open) this.paused = true;
  }

  @Listen('mouseleave')
  onMouseLeave() {
    if (this.open) this.paused = false;
  }

  render() {
    return (
      <Host>
        {this.duration > 0 && (
          <div
            onAnimationEnd={() => this.hide('autoDismiss')}
            class={{ progress: true, running: this.open && !this.paused }}
            style={{ animationDuration: `${this.duration}ms` }}
          ></div>
        )}
        <je-toolbar>
          <slot name='start' />
          <div>
            <slot />
          </div>
          <slot slot='end' name='end' />
          {this.closable && <je-button fill='clear' class='icon-only' slot='end' onClick={() => this.hide('userDismiss')}><je-icon>close</je-icon></je-button>}
        </je-toolbar>
      </Host>
    )
  }
}
