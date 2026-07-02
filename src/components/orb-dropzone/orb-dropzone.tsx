import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  h,
} from "@stencil/core";

@Component({
  tag: "orb-dropzone",
  styleUrl: "orb-dropzone.css",
  shadow: true,
})
export class OrbDropzone {
  @Element() el!: HTMLOrbDropzoneElement;
  @Event() dataDrop: EventEmitter<DataTransfer>;

  @Listen("drop", { passive: false })
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.el.classList.remove("hover");
    this.dataDrop.emit(e.dataTransfer);
  }

  @Listen("dragover", { passive: false })
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.el.classList.add("hover");
  }

  @Listen("dragleave", { passive: false })
  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.el.classList.remove("hover");
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
