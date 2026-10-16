import { Component, Host } from "@stencil/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleChevronLeftIcon,
  DoubleChevronRightIcon,
} from "../../utils/icons";

@Component({
  tag: "orb-pagination",
  styleUrl: "pagination.css",
  shadow: true,
})
export class Pagination {
  render() {
    return (
      <Host>
        <orb-toolbar space="3xs">
          <span slot="end">1 to 10 of 83</span>
          <orb-button slot="end" fill="clear" class="icon-only">
            <DoubleChevronLeftIcon />
          </orb-button>
          <orb-button slot="end" fill="clear" class="icon-only">
            <ChevronLeftIcon />
          </orb-button>
          <span slot="end">Page 1 of 9</span>
          <orb-button slot="end" fill="clear" class="icon-only">
            <ChevronRightIcon />
          </orb-button>
          <orb-button slot="end" fill="clear" class="icon-only">
            <DoubleChevronRightIcon />
          </orb-button>
        </orb-toolbar>
      </Host>
    );
  }
}
