import { Color } from "./color";

export type CreateToastOptions = {
  color?: Color;
  duration?: number;
  closable?: boolean;
  position?:
    | "top"
    | "bottom"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";
  buttons?: {
    text?: string;
    fill?: "solid" | "outline" | "clear";
    color?: Color;
    size?: "sm" | "md" | "lg";
    handler?: (toast: HTMLOrbAlertElement) => void | Promise<void>;
  }[];
};

export const createToast = (options: CreateToastOptions) => {
  const toast = document.createElement("orb-alert");
  toast.color = options.color;
  toast.duration = options.duration;
  toast.closable = options.closable;
  if (options.buttons) {
    options.buttons.forEach((button) => {
      const btn = document.createElement("orb-button");
      btn.textContent = button.text;
      btn.fill = button.fill;
      btn.color = button.color;
      btn.size = button.size ?? "sm";
      btn.slot = "buttons";
      if (button.handler)
        btn.addEventListener("click", () => button.handler(toast));
      toast.append(btn);
    });
  }
  let container = document.querySelector<HTMLDivElement>(
    `div.orb-toast-container[data-position=${options.position}]`,
  );
  if (!container) {
    container = document.createElement("div");
    container.dataset.position = options.position;
    document.body.append(container);
    container.popover = "manual";
    //needs mutation observer
  }

  container.append(toast);
  toast.didDismiss().then(() => {
    toast.remove();
  });
  return toast;
};
