import {
  Component,
  Element,
  Fragment,
  Host,
  Method,
  Prop,
  forceUpdate,
} from "@stencil/core";
import {
  ChevronDownIcon,
  SquareCheckIcon,
  SquareIcon,
  SquareMinusIcon,
} from "../../utils/icons";

function getDepth(child: HTMLElement, ancestor: HTMLElement) {
  if (child === ancestor) return 0;
  if (!child.parentElement) return -1; // ancestor not found

  const parentDepth = getDepth(child.parentElement, ancestor);

  return parentDepth === -1 ? -1 : parentDepth + 1;
}

@Component({
  tag: "orb-branch",
  styleUrl: "orb-branch.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class OrbBranch {
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
    this.hasChildren = this.element.querySelector("orb-branch") !== null;
    this.isChild = this.element.parentElement.closest("orb-branch") != null;
    const depth = getDepth(this.element, this.element.closest("orb-tree"));
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

  render() {
    const innerButton = (
      <Fragment>
        {this.selection === "multiple" &&
          (this.selected === true ? (
            <SquareCheckIcon class="multi-icon" />
          ) : this.selected === false ? (
            <SquareIcon class="multi-icon" />
          ) : (
            <SquareMinusIcon class="multi-icon" />
          ))}
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
              <ChevronDownIcon />
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
