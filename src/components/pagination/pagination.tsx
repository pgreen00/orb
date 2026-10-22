import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleChevronLeftIcon,
  DoubleChevronRightIcon,
} from "../../utils/icons";

export interface PageChangeDetail {
  page: number;
  pageSize: number;
}

type PaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; direction: "previous" | "next"; page: number };

interface ControlOptions {
  part: string;
  label: string;
  content: any;
  current?: boolean;
  disabled?: boolean;
}

/**
 * Splits a long list into pages and lets the user move between them. Renders
 * native buttons by default, or links when `href-template` is set.
 */
@Component({
  tag: "orb-pagination",
  styleUrl: "pagination.css",
  shadow: true,
})
export class Pagination {
  private focusAfterRender?: string;

  @Element() el!: HTMLElement;
  @AttachInternals() internals: ElementInternals;
  @State() announcement = "";

  /**
   * The pagination's visual appearance
   */
  @Prop({ reflect: true }) appearance: "outlined" | "filled" | "plain" =
    "outlined";

  /**
   * The number of pages to always show at the start and end
   */
  @Prop() boundaryCount = 1;

  /**
   * Disables the pagination
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * `standard` shows the full page list. `compact` shows a "1 of 5" label
   * between the previous and next buttons.
   */
  @Prop() format: "standard" | "compact" = "standard";

  /**
   * Renders nothing when there's only one page
   */
  @Prop() hideSinglePage = false;

  /**
   * Renders page items as links instead of buttons. Use `{page}` as a
   * placeholder for the page number, or assign a function that returns the URL.
   */
  @Prop() hrefTemplate?: string | ((page: number) => string);

  /**
   * A label that describes the pagination to assistive devices
   */
  @Prop() label = "";

  /**
   * The current page, starting at 1
   */
  @Prop({ mutable: true }) page = 1;

  /**
   * The number of items shown per page
   */
  @Prop() pageSize = 10;

  /**
   * The number of pages to show on each side of the current page
   */
  @Prop() siblingCount = 2;

  /**
   * The total number of items to paginate
   */
  @Prop() total = 0;

  /**
   * The total number of pages, derived from `total` and `pageSize`
   */
  @Prop() get totalPages(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0;
  }

  /**
   * Shows buttons that jump to the first and last pages
   */
  @Prop() withEdges = false;

  /**
   * Hides the previous and next buttons
   */
  @Prop() withoutNav = false;

  /**
   * Shows a summary of the items on the current page
   */
  @Prop() withSummary = false;

  /**
   * Emitted when the page is about to change. Call `preventDefault()` to cancel.
   */
  @Event({ cancelable: true }) beforePageChange: EventEmitter<PageChangeDetail>;

  /**
   * Emitted after the page changes
   */
  @Event() pageChange: EventEmitter<PageChangeDetail>;

  componentWillLoad() {
    this.syncDisabledState();
  }

  componentDidRender() {
    const part = this.focusAfterRender;
    if (!part) return;
    this.focusAfterRender = undefined;
    const root = this.el.shadowRoot;
    const target =
      root?.querySelector<HTMLElement>('[aria-current="page"]') ??
      root?.querySelector<HTMLElement>(`[part~="${part}"]:not(:disabled)`) ??
      root?.querySelector<HTMLElement>("button:not(:disabled)");
    target?.focus();
  }

  @Watch("disabled")
  handleDisabledChange() {
    this.syncDisabledState();
  }

  @Watch("page")
  handlePageChange() {
    this.announcement = `Page ${this.page} of ${this.totalPages}`;
  }

  private syncDisabledState() {
    if (this.disabled) this.internals.states.add("disabled");
    else this.internals.states.delete("disabled");
  }

  private get linked() {
    return !!this.hrefTemplate;
  }

  private get summary() {
    if (this.total === 0) return "0 of 0";
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.total);
    return `${start}–${end} of ${this.total}`;
  }

  /**
   * Builds the visible page list: boundary pages at each end, siblings around
   * the current page, and ellipses where pages are collapsed.
   */
  private get items(): PaginationItem[] {
    const count = this.totalPages;
    if (count < 1) return [];

    const boundary = Math.max(0, this.boundaryCount);
    const sibling = Math.max(0, this.siblingCount);
    const jump = Math.max(1, sibling * 2 + 1);
    const range = (start: number, end: number) => {
      const pages: number[] = [];
      for (let page = start; page <= end; page++) pages.push(page);
      return pages;
    };

    const startPages = range(1, Math.min(boundary, count));
    const endPages = range(
      Math.max(count - boundary + 1, boundary + 1),
      count,
    );
    const siblingsStart = Math.max(
      Math.min(this.page - sibling, count - boundary - sibling * 2 - 1),
      boundary + 2,
    );
    const siblingsEnd = Math.min(
      Math.max(this.page + sibling, boundary + sibling * 2 + 2),
      endPages.length > 0 ? endPages[0] - 2 : count - 1,
    );

    const items: PaginationItem[] = startPages.map((page) => ({
      type: "page",
      page,
    }));

    if (siblingsStart > boundary + 2) {
      items.push({
        type: "ellipsis",
        direction: "previous",
        page: Math.max(1, this.page - jump),
      });
    } else if (boundary + 1 < count - boundary) {
      items.push({ type: "page", page: boundary + 1 });
    }

    range(siblingsStart, siblingsEnd).forEach((page) =>
      items.push({ type: "page", page }),
    );

    if (siblingsEnd < count - boundary - 1) {
      items.push({
        type: "ellipsis",
        direction: "next",
        page: Math.min(count, this.page + jump),
      });
    } else if (count - boundary > boundary) {
      items.push({ type: "page", page: count - boundary });
    }

    endPages.forEach((page) => items.push({ type: "page", page }));
    return items;
  }

  private hrefFor(page: number) {
    const template = this.hrefTemplate;
    if (typeof template === "function") return template(page);
    return (template ?? "").replace("{page}", String(page));
  }

  /** Returns `false` when a listener canceled the change. */
  private emitBeforePageChange(page: number) {
    return !this.beforePageChange.emit({ page, pageSize: this.pageSize })
      .defaultPrevented;
  }

  private requestPage(page: number, part: string) {
    if (
      this.disabled ||
      page === this.page ||
      page < 1 ||
      page > this.totalPages
    ) {
      return;
    }
    if (!this.emitBeforePageChange(page)) return;

    this.focusAfterRender = part;
    this.page = page;
    this.pageChange.emit({ page, pageSize: this.pageSize });
  }

  /** In link mode the browser navigates, so a canceled event stops the navigation. */
  private onLinkClick(e: MouseEvent, page: number) {
    if (!this.emitBeforePageChange(page)) e.preventDefault();
  }

  private renderControl(
    page: number,
    { part, label, content, current = false, disabled = false }: ControlOptions,
  ) {
    const isDisabled = this.disabled || disabled;
    const parts = ["button", part, current ? "page-current" : ""]
      .filter(Boolean)
      .join(" ");

    if (this.linked) {
      return (
        <a
          part={parts}
          href={isDisabled ? undefined : this.hrefFor(page)}
          aria-disabled={isDisabled ? "true" : undefined}
          aria-current={current ? "page" : undefined}
          aria-label={label}
          onClick={(e) => this.onLinkClick(e, page)}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        type="button"
        part={parts}
        disabled={isDisabled}
        aria-current={current ? "page" : undefined}
        aria-label={label}
        onClick={() => this.requestPage(page, part)}
      >
        {content}
      </button>
    );
  }

  private renderItem(item: PaginationItem) {
    if (item.type === "ellipsis") {
      const distance = Math.abs(item.page - this.page);
      const label =
        item.direction === "previous"
          ? `Jump back ${distance} pages`
          : `Jump forward ${distance} pages`;
      return (
        <li key={`ellipsis-${item.direction}`}>
          {this.renderControl(item.page, {
            part: "ellipsis",
            label,
            content: "…",
          })}
        </li>
      );
    }

    return (
      <li key={`page-${item.page}`}>
        {this.renderControl(item.page, {
          part: "page",
          label: `Page ${item.page}`,
          content: item.page,
          current: item.page === this.page,
        })}
      </li>
    );
  }

  render() {
    const hidden = this.hideSinglePage && this.totalPages <= 1;
    const atFirst = this.page <= 1;
    const atLast = this.page >= this.totalPages;

    return (
      <Host>
        {!hidden && (
          <nav part="pagination" aria-label={this.label || undefined}>
            {this.withSummary && <span part="summary">{this.summary}</span>}
            {this.withEdges &&
              this.renderControl(1, {
                part: "first-button",
                label: "First page",
                disabled: atFirst,
                content: (
                  <slot name="first-icon">
                    <DoubleChevronLeftIcon class="rtl-flip" />
                  </slot>
                ),
              })}
            {!this.withoutNav &&
              this.renderControl(this.page - 1, {
                part: "previous-button",
                label: "Previous page",
                disabled: atFirst,
                content: (
                  <slot name="previous-icon">
                    <ChevronLeftIcon class="rtl-flip" />
                  </slot>
                ),
              })}
            {this.format === "compact" ? (
              <span part="label">{`${this.page} of ${this.totalPages}`}</span>
            ) : (
              <ul part="pages">{this.items.map((item) => this.renderItem(item))}</ul>
            )}
            {!this.withoutNav &&
              this.renderControl(this.page + 1, {
                part: "next-button",
                label: "Next page",
                disabled: atLast,
                content: (
                  <slot name="next-icon">
                    <ChevronRightIcon class="rtl-flip" />
                  </slot>
                ),
              })}
            {this.withEdges &&
              this.renderControl(this.totalPages, {
                part: "last-button",
                label: "Last page",
                disabled: atLast,
                content: (
                  <slot name="last-icon">
                    <DoubleChevronRightIcon class="rtl-flip" />
                  </slot>
                ),
              })}
          </nav>
        )}
        <span class="visually-hidden" aria-live="polite">
          {this.announcement}
        </span>
      </Host>
    );
  }
}
