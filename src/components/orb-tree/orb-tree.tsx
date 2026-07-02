import { Component, Element, Event, EventEmitter, Host, Listen, Prop, Watch, h } from '@stencil/core';

@Component({
  tag: 'je-tree',
  styleUrl: 'je-tree.css',
  shadow: true,
})
export class JeTree {
  @Element() element: HTMLJeTreeElement;
  @Prop({ mutable: true }) value?: string | string[];
  @Prop() selection: 'single' | 'multiple' | 'leaf' = 'leaf';
  @Prop() indentation = false;
  @Event() valueChange: EventEmitter<string | string[]>;

  private get branches() {
    return Array.from(this.element.querySelectorAll('je-branch'))
  }

  componentWillLoad() {
    if (this.selection == 'multiple' && !Array.isArray(this.value)) this.value = [];
  }

  componentWillRender() {
    const { branches, selection, indentation, value } = this;
    branches.forEach(branch => {
      branch.selection = selection;
      branch.indentation = indentation;
    })
    const selectedBranch = branches.find(b => value == (b.value ?? b.label))
    if (selectedBranch && !selectedBranch.selected) {
      this.onClick({target: selectedBranch} as any)
    }
  }

  @Watch('value')
  valueChanged() {
    this.valueChange.emit(this.value);
  }

  @Listen('click')
  async onClick(event: MouseEvent) {
    const { target } = event;
    if (this.isBranch(target)) {
      const { branches, selection } = this;
      const isLeaf = await target.isLeaf();
      if ((selection == 'leaf' && isLeaf) || selection == 'single') {
        this.value = target.value || target.label;
        branches.forEach(branch => branch.selected = this.value === (branch.value || branch.label));
      } else if (this.selection == 'leaf') {
        target.open = !target.open;
      } else if (this.selection == 'multiple') {
        target.selected = !target.selected;
        if (isLeaf && target.selected) {
          this.value = [...this.value, (target.value || target.label)]
        } else if (isLeaf) {
          this.value = (this.value as Array<string>).filter(v => v != (target.value || target.label))
        } else {
          target.querySelectorAll('je-branch').forEach(branch => branch.selected = target.selected);
        }
        this.setParents(target);
      }
    }
  }

  @Listen('keyup')
  async onKeyup(event: KeyboardEvent) {
    const { target, key } = event;
    if (this.isBranch(target)) {
      const hasChildren = !(await target.isLeaf());
      const { branches } = this;
      if (key == 'ArrowRight' && hasChildren && !target.open) {
        target.open = true;
      } else if (key == 'ArrowLeft' && hasChildren && target.open) {
        target.open = false;
      } else if (key == 'ArrowUp') {
        const index = branches.indexOf(target);
        if (index > 0) {
          branches[index - 1].focus();
        }
      } else if (key == 'ArrowDown') {
        const index = branches.indexOf(target);
        if (index < branches.length - 1) {
          branches[index + 1].focus();
        }
      }
    }
  }

  private isBranch = (target: any): target is HTMLJeBranchElement => target instanceof HTMLElement && target.tagName == 'JE-BRANCH';

  private async setParents(branch: HTMLJeBranchElement) {
    const parentBranch = branch.parentElement
    if (this.isBranch(parentBranch)) {
      const children = Array.from(parentBranch.querySelectorAll('je-branch'));
      parentBranch.selected = children.every(child => child.selected) ? true : children.some(child => child.selected) ? null : false;
      this.setParents(parentBranch);
    }
  }

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
