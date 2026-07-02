import { Component, Element, Event, EventEmitter, Host, Listen, h } from '@stencil/core';

@Component({
  tag: 'je-dropzone',
  styleUrl: 'je-dropzone.css',
  shadow: true,
})
export class JeDropzone {
  @Element() el!: HTMLJeDropzoneElement;
  @Event() dataDrop: EventEmitter<DataTransfer>;

  @Listen('drop', { passive: false })
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.el.classList.remove('hover')
    this.dataDrop.emit(e.dataTransfer);
  }

  @Listen('dragover', { passive: false })
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.el.classList.add('hover')
  }

  @Listen('dragleave', { passive: false })
  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.el.classList.remove('hover')
  }

  render() {
    return (
      <Host>
        <slot/>
      </Host>
    );
  }
}
