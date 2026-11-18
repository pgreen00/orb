const ALIGN_LABELS = { left: "Left", center: "Center", right: "Right" } as const;

function button(text: string, onClick: () => void, label?: string): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = text;
  if (label) el.setAttribute("aria-label", label);
  el.addEventListener("click", onClick);
  return el;
}

/** The options for a selected figure: alt text, caption, alignment, and replace or remove */
export function createMediaPopover(options: {
  alt: string;
  caption: boolean;
  align: "left" | "center" | "right";
  onAlt(alt: string): void;
  onCaption(on: boolean): void;
  onAlign(align: "left" | "center" | "right"): void;
  onReplace(): void;
  onRemove(): void;
}): HTMLElement {
  const root = document.createElement("div");
  root.className = "picker media-popover";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Media options");

  // Changes are read on `change`, so alt text is recorded once it's finished, not per key.
  const alt = document.createElement("input");
  alt.type = "text";
  alt.value = options.alt;
  alt.addEventListener("change", () => options.onAlt(alt.value));
  const altField = document.createElement("label");
  altField.className = "media-field";
  altField.append("Alt text", alt);

  const caption = document.createElement("input");
  caption.type = "checkbox";
  caption.checked = options.caption;
  caption.addEventListener("change", () => options.onCaption(caption.checked));
  const captionField = document.createElement("label");
  captionField.className = "media-toggle";
  captionField.append(caption, "Caption");

  const alignButtons = (Object.keys(ALIGN_LABELS) as (keyof typeof ALIGN_LABELS)[]).map((align) => {
    const el = button(ALIGN_LABELS[align], () => {
      options.onAlign(align);
      alignButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === el)));
    }, `Align ${align}`);
    el.setAttribute("aria-pressed", String(align === options.align));
    return el;
  });
  const alignGroup = document.createElement("div");
  alignGroup.className = "media-align";
  alignGroup.setAttribute("role", "group");
  alignGroup.setAttribute("aria-label", "Alignment");
  alignGroup.append(...alignButtons);

  const actions = document.createElement("div");
  actions.className = "media-actions";
  actions.append(
    button("Replace", () => options.onReplace()),
    button("Remove", () => options.onRemove()),
  );

  root.append(altField, captionField, alignGroup, actions);
  return root;
}
