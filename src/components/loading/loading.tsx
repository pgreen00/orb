import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-loading",
  styleUrl: "loading.css",
  shadow: true,
})
export class Loading {
  render() {
    return (
      <Host role="status" aria-label="Loading">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="track" cx="12" cy="12" r="9" />
          <circle class="indicator" cx="12" cy="12" r="9" />
        </svg>
      </Host>
    );
  }
}
