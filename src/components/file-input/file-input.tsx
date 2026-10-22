import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { CloseIcon, FileIcon, UploadIcon } from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";
import bytes from "../pipe/pipes/bytes";

const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

function isAccepted(file: File, accept: string) {
  const types = accept
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
  if (!types.length) return true;

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return types.some((type) => {
    if (type.startsWith(".")) return name.endsWith(type);
    if (type.endsWith("/*")) return mime.startsWith(type.slice(0, -1));
    return mime === type;
  });
}

async function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    entries.push(...batch);
  } while (batch.length);
  return entries;
}

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return [file];
  }
  const children = await readAllEntries(
    (entry as FileSystemDirectoryEntry).createReader(),
  );
  return (await Promise.all(children.map(readEntry))).flat();
}

/**
 * Collects the files from a drop, including everything inside dropped folders.
 * Entries are captured synchronously because the DataTransfer is only valid
 * during the drop event.
 */
async function collectDroppedFiles(data: DataTransfer): Promise<File[]> {
  const entries = Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);
  if (!entries.length) return Array.from(data.files);
  return (await Promise.all(entries.map(readEntry))).flat();
}

@Component({
  tag: "orb-file-input",
  styleUrl: "file-input.css",
  shadow: {
    delegatesFocus: true,
  },
  formAssociated: true,
})
export class FileInput extends ReadyController {
  private inputEl!: HTMLInputElement;
  private dropzoneEl!: HTMLElement;
  private previews = new Map<File, string>();
  private customMessage = "";
  private interacted = false;

  @Element() el!: HTMLElement;
  @AttachInternals() internals: ElementInternals;
  @State() dragging = false;

  /**
   * Label that shows above the control
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the control
   */
  @Prop() note?: string;

  /**
   * Requires at least one file before the form can be submitted
   */
  @Prop() required = false;

  /**
   * Disables the control
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Allows more than one file to be selected
   */
  @Prop() multiple = false;

  /**
   * Comma-separated list of acceptable file types, such as `image/*` or `.pdf`
   */
  @Prop() accept?: string;

  /**
   * On mobile devices, which camera to capture from. Only used when `accept`
   * includes an image, video, or audio type.
   */
  @Prop() capture?: "user" | "environment";

  /**
   * Name the files are submitted under with form data
   */
  @Prop() name?: string;

  /**
   * Size of the control
   */
  @Prop({ reflect: true }) size: "xs" | "sm" | "md" | "lg" = "md";

  /**
   * The selected files
   */
  @Prop({ mutable: true }) files: File[] = [];

  /**
   * Emitted when files are added or removed
   */
  @Event() input: EventEmitter<void>;

  /**
   * Emitted when files are added or removed
   */
  @Event() change: EventEmitter<void>;

  componentWillLoad() {
    this.sync();
  }

  @Watch("files")
  @Watch("required")
  @Watch("name")
  @Watch("dragging")
  handleStateChange() {
    this.sync();
  }

  @Listen("invalid")
  onInvalid() {
    this.interacted = true;
    this.sync();
  }

  formResetCallback() {
    this.interacted = false;
    this.files = [];
    this.sync();
  }

  formStateRestoreCallback(state: File | string | FormData | null) {
    if (state instanceof FormData) {
      this.files = state
        .getAll("files")
        .filter((file): file is File => file instanceof File);
    }
  }

  /**
   * Sets a custom validation error. Pass an empty string to clear it.
   */
  @Method()
  async setCustomValidity(message: string) {
    this.customMessage = message;
    this.sync();
  }

  /**
   * Clears custom errors and the user interaction state, so validation styling
   * is hidden until the user interacts with the control again.
   */
  @Method()
  async resetValidity() {
    this.customMessage = "";
    this.interacted = false;
    this.sync();
  }

  private sync() {
    this.syncPreviews();
    this.syncFormValue();
    this.syncValidity();
    this.syncStates();
  }

  private syncPreviews() {
    for (const [file, url] of this.previews) {
      if (!this.files.includes(file)) {
        URL.revokeObjectURL(url);
        this.previews.delete(file);
      }
    }
    for (const file of this.files) {
      if (file.type.startsWith("image/") && !this.previews.has(file)) {
        this.previews.set(file, URL.createObjectURL(file));
      }
    }
  }

  private syncFormValue() {
    const value = new FormData();
    const state = new FormData();
    for (const file of this.files) {
      if (this.name) value.append(this.name, file);
      state.append("files", file);
    }
    this.internals.setFormValue(this.name ? value : null, state);
  }

  private syncValidity() {
    const valueMissing = this.required && this.files.length === 0;
    const customError = this.customMessage !== "";
    if (valueMissing || customError) {
      const message = customError ? this.customMessage : "Please select a file.";
      this.internals.setValidity(
        { valueMissing, customError },
        message,
        this.dropzoneEl,
      );
    } else {
      this.internals.setValidity({});
    }
    this.internals.ariaInvalid = this.internals.validity.valid ? "false" : "true";
  }

  private syncStates() {
    const { states, validity } = this.internals;
    const setState = (state: string, on: boolean) => {
      if (on) states.add(state);
      else states.delete(state);
    };
    setState("blank", this.files.length === 0);
    setState("dragging", this.dragging);
    setState("user-valid", this.interacted && validity.valid);
    setState("user-invalid", this.interacted && !validity.valid);
  }

  private emitChange() {
    this.input.emit();
    this.change.emit();
  }

  private addFiles(incoming: File[]) {
    const accepted = incoming.filter((file) =>
      isAccepted(file, this.accept ?? ""),
    );
    const next = this.multiple
      ? [
          ...this.files,
          ...accepted.filter(
            (file) => !this.files.some((existing) => fileKey(existing) === fileKey(file)),
          ),
        ]
      : accepted.slice(0, 1);
    const changed =
      next.length !== this.files.length ||
      next.some((file, index) => file !== this.files[index]);

    this.interacted = true;
    this.files = next;
    if (changed) this.emitChange();
  }

  private removeFile(file: File) {
    if (this.disabled) return;
    this.interacted = true;
    this.files = this.files.filter((existing) => existing !== file);
    this.emitChange();
  }

  private onInputChange = () => {
    this.addFiles(Array.from(this.inputEl.files ?? []));
    this.inputEl.value = "";
  };

  private onDragOver = (e: DragEvent) => {
    if (this.disabled) return;
    e.preventDefault();
    this.dragging = true;
  };

  private onDragLeave = (e: DragEvent) => {
    if (this.dropzoneEl.contains(e.relatedTarget as Node | null)) return;
    this.dragging = false;
  };

  private onDrop = async (e: DragEvent) => {
    e.preventDefault();
    this.dragging = false;
    if (this.disabled || !e.dataTransfer) return;
    this.addFiles(await collectDroppedFiles(e.dataTransfer));
  };

  private onDropzoneClick = (e: MouseEvent) => {
    if (this.disabled || e.target === this.inputEl) return;
    this.inputEl.click();
  };

  private onDropzoneKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.inputEl.click();
    }
  };

  render() {
    return (
      <Host>
        <slot
          name="label"
          ref={async (el) => {
            await this.ready;
            this.inputEl.ariaLabelledByElements = [el];
          }}
        >
          {this.label && (
            <orb-label required={this.required}>{this.label}</orb-label>
          )}
        </slot>
        <div
          part="dropzone"
          class="dropzone"
          ref={(el) => (this.dropzoneEl = el)}
          onDragOver={this.onDragOver}
          onDragLeave={this.onDragLeave}
          onDrop={this.onDrop}
          onClick={this.onDropzoneClick}
          onKeyDown={this.onDropzoneKeyDown}
        >
          <input
            type="file"
            ref={(el) => (this.inputEl = el)}
            accept={this.accept}
            capture={this.capture}
            multiple={this.multiple}
            disabled={this.disabled}
            onChange={this.onInputChange}
            onInput={(e) => e.stopPropagation()}
          />
          <slot name="dropzone">
            <UploadIcon part="dropzone-icon" />
            <span part="dropzone-text">Drop files here or click to upload</span>
          </slot>
        </div>
        <slot
          name="note"
          ref={async (el) => {
            await this.ready;
            this.inputEl.ariaDescribedByElements = [el];
          }}
        >
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>
        {this.files.length > 0 && (
          <div part="file-list" class="file-list">
            {this.files.map((file) => (
              <orb-card part="file" key={fileKey(file)}>
                <orb-toolbar flank space="sm">
                  <div part="file-thumbnail" class="thumbnail">
                    {this.previews.has(file) ? (
                      <img
                        part="file-image"
                        src={this.previews.get(file)}
                        alt=""
                      />
                    ) : (
                      <FileIcon part="file-icon" />
                    )}
                  </div>
                  <div part="file-details" class="details">
                    <span part="file-name" class="name">
                      {file.name}
                    </span>
                    <span part="file-size" class="size">
                      {String(bytes(file.size))}
                    </span>
                  </div>
                  <orb-button
                    slot="end"
                    part="remove-button"
                    fill="clear"
                    size="sm"
                    class="icon-only"
                    aria-label={`Remove ${file.name}`}
                    disabled={this.disabled}
                    onClick={() => this.removeFile(file)}
                  >
                    <CloseIcon />
                  </orb-button>
                </orb-toolbar>
              </orb-card>
            ))}
          </div>
        )}
      </Host>
    );
  }
}
