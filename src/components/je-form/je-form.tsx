import { Component, Event, EventEmitter, Listen, h } from "@stencil/core";

@Component({
  tag: "je-form",
  styleUrl: "je-form.css",
  scoped: true,
})
export class JeForm {
  private el: HTMLFormElement;

  @Event() dataSubmit: EventEmitter<Record<string, any>>;

  @Listen("submit")
  onSubmit(event: SubmitEvent) {
    event.preventDefault();
  }

  @Listen("keydown")
  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.el.requestSubmit();
    }
  }

  render() {
    return (
      <form ref={(el) => (this.el = el)}>
        <slot />
      </form>
    );
  }
}
