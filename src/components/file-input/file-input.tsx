import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  State,
  Prop
} from "@stencil/core";
import { UploadIcon } from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";

@Component({
  tag: "orb-file-input",
  styleUrl: "file-input.css",
  shadow: {
    delegatesFocus: true
  },
  formAssociated: true
})
export class FileInput extends ReadyController {
  private inputEl: HTMLInputElement
  @Element() el!: HTMLElement;
  @AttachInternals() internals: ElementInternals;
  @State() hover = false;

  /**
   * Label that shows above the control
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the control
   */
  @Prop() note?: string;

  /**
   * Requires a value before the form can be submitted
   */
  @Prop() required?: boolean;

  @Event() dataDrop: EventEmitter<DataTransfer | FileList>;

  @Listen("change")
  onChange(e: Event) {
    e.preventDefault();
    this.dataDrop.emit(this.inputEl.files);
  }

  private onDrop = (e: DragEvent) => {
    e.preventDefault();
    this.hover = false
    this.dataDrop.emit(e.dataTransfer);
  }

  private onDragOver = (e: DragEvent) => {
    e.preventDefault();
    this.hover = true
  }

  private onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    this.hover = false
  }

  private onClick = (_e: MouseEvent) => {
    this.inputEl.click();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      this.inputEl.click();
    }
  }

  render() {
    return (
      <Host>
        <slot
          name="label"
          ref={async el => {
            await this.ready
            this.inputEl.ariaLabelledByElements = [el]
          }}
        >
          {this.label && (
            <orb-label required={this.required}>
              {this.label}
            </orb-label>
          )}
        </slot>
        <div
          onDragOver={this.onDragOver}
          onDragLeave={this.onDragLeave}
          onDrop={this.onDrop}
          onClick={this.onClick}
          onKeyDown={this.onKeyDown}
          part="dropzone"
          class={{ hover: this.hover }}
        >
          <input type="file" ref={el => this.inputEl = el}/>
          <slot>
            <UploadIcon/>
            <span>Drop files here or click to upload</span>
          </slot>
        </div>
        <slot
          name="note"
          ref={async el => {
            await this.ready
            this.inputEl.ariaDescribedByElements = [el]
          }}
        >
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>
      </Host>
    );
  }
}
