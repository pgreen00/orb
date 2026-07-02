import {
  Component,
  Element,
  Fragment,
  Host,
  Method,
  Prop,
  forceUpdate,
  h,
} from "@stencil/core";

function getDepth(child: HTMLElement, ancestor: HTMLElement) {
  if (child === ancestor) return 0;
  if (!child.parentElement) return -1; // ancestor not found

  const parentDepth = getDepth(child.parentElement, ancestor);

  return parentDepth === -1 ? -1 : parentDepth + 1;
}

@Component({
  tag: "je-branch",
  styleUrl: "je-branch.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class JeBranch {
  private hasChildren = false;
  private isChild = false;
  @Element() element: HTMLElement;
  @Prop() selection?: "single" | "multiple" | "leaf";
  @Prop() indentation = false;
  @Prop({ mutable: true }) open = false;
  @Prop() value?: string;
  @Prop() label?: string;
  @Prop() selected: boolean | null = false;
  @Prop() href?: string;

  componentWillRender() {
    this.hasChildren = this.element.querySelector("je-branch") !== null;
    this.isChild = this.element.parentElement.closest("je-branch") != null;
    const depth = getDepth(this.element, this.element.closest("je-tree"));
    this.element.style.setProperty("--depth", depth.toString());
  }

  @Method()
  async isLeaf() {
    return !this.hasChildren;
  }

  private handleIconClick = (ev: MouseEvent) => {
    if (this.selection != "leaf") {
      ev.stopPropagation();
      this.open = !this.open;
    }
  };

  private checkboxPath() {
    return <path d={this.selected ? "M20 6 9 17l-5-5" : "M5 12h14"} />;
  }

  render() {
    const innerButton = (
      <Fragment>
        {this.selection === "multiple" && (
          <div part="multi-icon" class={{ selected: this.selected !== false }}>
            {this.selected !== false && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                {this.checkboxPath()}
              </svg>
            )}
          </div>
        )}
        <slot name="label">{this.label && <span>{this.label}</span>}</slot>
      </Fragment>
    );
    return (
      <Host>
        <div
          part="content-container"
          class={{
            selected: this.selected,
            [this.selection]: true,
            child: this.isChild,
            parent: this.hasChildren,
          }}
        >
          {this.hasChildren && (
            <div
              part="chevron"
              class={{ open: this.open }}
              onClickCapture={this.handleIconClick}
            >
              {chevron}
            </div>
          )}
          {this.href ? (
            <a href={this.href}>{innerButton}</a>
          ) : (
            <button type="button">{innerButton}</button>
          )}
          <div class="end-container" onClick={(ev) => ev.stopPropagation()}>
            <slot name="end" />
          </div>
        </div>
        <div
          class={{ open: this.open, indentation: this.indentation }}
          part="branch-container"
        >
          <div part="inner-branch-container">
            <slot onSlotchange={() => forceUpdate(this.element)} />
          </div>
        </div>
      </Host>
    );
  }
}

const chevron = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
);
