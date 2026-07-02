import { autoUpdate, ComputePositionReturn, computePosition, offset, autoPlacement, size } from '@floating-ui/dom';
import { Component, Host, Prop, State, Watch, h, Element } from '@stencil/core';
import { AsyncSubject, Subscription, fromEvent, debounceTime, map, switchMap, merge, debounce, tap } from 'rxjs';
import { getDOMRect } from '../../utils/get-dom-rect';

@Component({
  tag: 'je-tooltip',
  styleUrl: 'je-tooltip.css',
  shadow: true,
})
export class JeTooltip {
  @Element() el!: HTMLElement;
  @State() open = false;
  private ready = new AsyncSubject<void>();
  private sub?: Subscription;
  private get containerEl() {
    return this.el.shadowRoot.querySelector<HTMLSlotElement>('slot[name=content]');
  }
  private get referenceEl() {
    return { getBoundingClientRect: () => getDOMRect(this.el.querySelector(':scope > :not([slot])')) }
  }
  private cleanup?: () => void;

  /** The content of the tooltip */
  @Prop() content?: string;

  /** Horizontal offset used when auto positioning the popover content */
  @Prop() offsetX = 0;

  /** Vertical offset used when auto positioning the popover content */
  @Prop() offsetY = 10;

  componentDidLoad() {
    this.ready.next();
    this.ready.complete();
  }

  connectedCallback() {
    const mouseMoveDebounce = fromEvent(window, 'mousemove').pipe(debounceTime(50));

    this.sub = this.ready.pipe(
      map(() => this.el.querySelector<HTMLElement>(':not([slot])')),
      switchMap(triggerEl => merge(
        fromEvent(triggerEl, 'mouseenter').pipe(map(() => 'enter' as const)),
        fromEvent(triggerEl, 'mouseleave').pipe(map(() => 'leave' as const))
      )),
      debounce(() => mouseMoveDebounce)
    ).subscribe(res => this.open = res == 'enter');

    this.sub.add(this.ready.pipe(
      tap(() => this.containerEl.popover = 'manual')
    ).subscribe());
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
  }

  @Watch('open')
  async onOpenChange(open: boolean) {
    if (open) {
      this.setPosition(await this.computePosition());
      this.cleanup = autoUpdate(this.referenceEl, this.containerEl, () => this.computePosition().then(this.setPosition));
      this.containerEl.showPopover()
    } else {
      this.cleanup();
      this.containerEl.hidePopover()
    }
  }

  private setPosition = ({ x, y }: ComputePositionReturn) => {
    this.containerEl.style.left = `${x}px`;
    this.containerEl.style.top = `${y}px`;
  }

  private computePosition() {
    return computePosition(this.referenceEl, this.containerEl, {
      strategy: 'fixed',
      middleware: [
        offset({
          mainAxis: this.offsetY,
          crossAxis: this.offsetX,
        }),
        autoPlacement(),
        size({
          apply: ({ availableHeight, availableWidth }) => {
            this.containerEl.style.setProperty('--available-height', `${availableHeight - this.offsetY}px`);
            this.containerEl.style.setProperty('--available-width', `${availableWidth - this.offsetX}px`);
          },
        })
      ]
    })
  }

  render() {
    return (
      <Host role="tooltip">
        <slot />
        <slot name='content'>
          {this.content && <span>{this.content}</span>}
        </slot>
      </Host>
    );
  }
}
