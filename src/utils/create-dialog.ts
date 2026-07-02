import { Color } from "./color";

export type DialogControl = {
  label?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  originalValue?: string;
  value?: string;
  name?: string;
  debounce?: number;
  valueChangeHandler?: (input: any) => void | Promise<void>;
};

export type DialogButton = {
  text?: string;
  fill?: "solid" | "outline" | "clear";
  color?: Color;
  type?: "submit" | "reset";
  size?: "sm" | "md" | "lg";
  handler?: (dialog: HTMLOrbOverlayElement) => void | Promise<void>;
};

export type CreateDialogOptions = {
  header?: string;
  message?: string;
  icon?: string;
  buttons?: DialogButton[];
  controls?: DialogControl[];
  backdropDismiss?: boolean;
};

export const createDialog = (options: CreateDialogOptions) => {
  const dialog = document.createElement("orb-overlay");
  dialog.size = "sm";
  dialog.setHTMLUnsafe(`
    <orb-form>
      <div class="orb-dialog-container">
        <template shadowrootmode="open">
          <style>
            :host {
              display: flex;
              flex-direction: column;
              gap: 1rem;
              padding: 1rem;
              box-sizing: border-box;
            }
          </style>
          <orb-toolbar>
            <slot name="icon"></slot>
            <slot name="header"></slot>
            <orb-button slot="end">
              <orb-icon>close</orb-icon
            </orb-button>
          </orb-toolbar>
          <slot name="message"></slot>
          <slot name="controls"></slot>
          <slot name="buttons"></slot>
        </template>
      </div>
    </orb-form>
  `);
  dialog.backdropDismiss = options.backdropDismiss;
  document.body.append(dialog);
  const container = dialog.querySelector(".orb-dialog-container");
  if (options.header) {
    container.insertAdjacentHTML(
      "afterbegin",
      `
      <h3 slot="header">${options.header}</h3>
    `,
    );
  }
  if (options.message) {
    container.insertAdjacentHTML(
      "beforeend",
      `
      <orb-label slot="message">${options.message}</orb-label>
    `,
    );
  }
  if (options.icon) {
    container.insertAdjacentHTML(
      "afterbegin",
      `
      <orb-icon fill slot="icon">${options.icon}</orb-icon>
    `,
    );
  }
  if (options.controls) {
    container.insertAdjacentHTML(
      "beforeend",
      `
      <div slot="controls" class="orb-dialog-controls"></div>
    `,
    );
    const controls = container.querySelector(".orb-dialog-controls");
    options.controls.forEach((control) => {
      const input = document.createElement("orb-textbox");
      input.label = control.label;
      input.placeholder = control.placeholder;
      //input.validators = control.validators;
      input.required = control.required;
      //input.type = control.type;
      input.setAttribute("name", control.name);
      input.value = control.value;
      input.debounce = control.debounce;
      input.addEventListener("valueChange", control.valueChangeHandler);
      controls.append(input);
    });
  }
  if (options.buttons) {
    container.insertAdjacentHTML(
      "beforeend",
      `
      <orb-toolbar slot="buttons" class="orb-dialog-buttons"></orb-toolbar>
    `,
    );
    const buttons = container.querySelector(".orb-dialog-buttons");
    options.buttons.forEach((button) => {
      const btn = document.createElement("orb-button");
      btn.textContent = button.text;
      btn.fill = button.fill;
      btn.color = button.color;
      btn.type = button.type;
      btn.size = button.size;
      btn.slot = "end";
      if (button.handler)
        btn.addEventListener("click", () => button.handler(dialog));
      buttons.append(btn);
    });
  }
  const closeButton = container.shadowRoot.querySelector("orb-button");
  closeButton.addEventListener("click", () => dialog.hide(), { once: true });
  const form = dialog.querySelector("orb-form");
  form.addEventListener("submit", () => dialog.hide(), { once: true });
  dialog.addEventListener("dismiss", () => dialog.remove(), { once: true });
  return [dialog, form] as const;
};
