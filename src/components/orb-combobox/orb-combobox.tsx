import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  h,
} from "@stencil/core";
import { AsyncSubject } from "rxjs";

@Component({
  tag: "je-combobox",
  styleUrl: "je-combobox.css",
  shadow: {
    delegatesFocus: true,
  },
  formAssociated: true,
})
export class JeCombobox {
  private contentEl$ = new AsyncSubject<HTMLElement>();
  private listboxEl: HTMLElement;
  private containerEl: HTMLElement;
  private get popoverOpen() {
    return this.listboxEl.matches(":popover-open");
  }
  private cleanup?: () => void;

  @Element() hostEl!: HTMLElement;
  @AttachInternals() internals: ElementInternals;

  @Prop() value: any;
  @Prop() label?: string;
  @Prop() note?: string;
  @Prop() disabled = false;
  @Prop() placeholder?: string;
  @Prop() required = false;
  @Prop() multiple = false;
  @Prop() editable = false;
  @Prop() size: "sm" | "md" | "lg" = "md";
  @Prop() get searchTerm() {
    const el = this.contentEl$["_value"] as HTMLElement;
    return el?.innerText ?? "";
  }
  set searchTerm(val: string) {
    this.contentEl$.subscribe((el) => {
      el.innerText = val;
    });
  }

  @Event() valueChange: EventEmitter<any>;
  @Event() searchTermChange: EventEmitter;

  componentDidLoad() {
    this.contentEl$.complete();
  }

  @Listen("click")
  onClick(ev: Event) {
    const option = (ev.target as HTMLElement).closest("je-option");
    if (option) {
      this.value = option.value;
      this.valueChange.emit(this.value);
      this.searchTerm = option.textContent;
      if (!this.multiple) {
        this.toggle();
      }
    }
  }

  @Listen("click", { target: "window" })
  onWindowClick(ev: MouseEvent) {
    const path = ev.composedPath();
    if (this.popoverOpen && !path.includes(this.hostEl)) {
      this.toggle();
    }
  }

  private async toggle() {
    if (this.popoverOpen) {
      await this.listboxEl.animate(
        { opacity: [1, 0] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.listboxEl.hidePopover();
      this.cleanup?.();
    } else {
      await this.setPosition();
      this.cleanup = autoUpdate(
        this.containerEl,
        this.listboxEl,
        this.setPosition,
      );
      this.listboxEl.showPopover();
      await this.listboxEl.animate(
        { opacity: [0, 1] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
    }
  }

  private setPosition = async () => {
    const yOffset = 10;
    const { x, y } = await computePosition(this.containerEl, this.listboxEl, {
      placement: "bottom-start",
      strategy: "fixed",
      middleware: [
        offset({
          mainAxis: yOffset,
        }),
        shift(),
        flip(),
        size({
          apply: ({ availableHeight, availableWidth }) => {
            this.listboxEl.attributeStyleMap.set(
              "min-width",
              CSS.px(this.containerEl.clientWidth),
            );
            this.listboxEl.attributeStyleMap.set(
              "max-height",
              CSS.px(availableHeight - yOffset),
            );
            this.listboxEl.attributeStyleMap.set(
              "max-width",
              CSS.px(availableWidth),
            );
          },
        }),
      ],
    });
    this.listboxEl.style.left = `${x}px`;
    this.listboxEl.style.top = `${y}px`;
  };

  render() {
    return (
      <Host role="combobox">
        <div class="outer-container">
          <div
            ref={(el) => (this.containerEl = el)}
            class="inner-container"
            onClick={() => this.toggle()}
          >
            <slot name="label">
              {this.label && (
                <je-label required={this.required}>{this.label}</je-label>
              )}
            </slot>
            <span
              ref={(el) => this.contentEl$.next(el)}
              tabindex="0"
              part="content"
              onInput={(e) => {
                (e.target as HTMLElement)
                  .querySelectorAll("br")
                  .forEach((b) => b.remove());
                this.searchTermChange.emit(this.searchTerm);
              }}
              contenteditable={this.editable ? "plaintext-only" : "false"}
              data-placeholder={this.placeholder || null}
              onKeyDown={(e) => e.key == "Enter" && e.preventDefault()}
            />
            <je-icon>keyboard_arrow_down</je-icon>
          </div>
          <slot name="after" />
        </div>

        <slot name="note">{this.note && <je-note>{this.note}</je-note>}</slot>

        <div
          ref={(el) => (this.listboxEl = el)}
          role="listbox"
          popover="manual"
        >
          <slot />
        </div>
      </Host>
    );
  }
}
