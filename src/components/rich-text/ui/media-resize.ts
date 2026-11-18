import interact from "interactjs";

/** The narrowest an image can be dragged, in pixels */
const MIN_WIDTH = 40;

/**
 * Adds a resize handle at the bottom-right corner of a figure's image. Dragging it
 * sets the image's width, and the height follows, so the aspect ratio holds.
 * `onEnd` gets the final width once the drag ends. Returns a function that removes
 * the handle.
 */
export function attachResize(figure: HTMLElement, options: { onEnd(width: number): void }): () => void {
  const img = figure.querySelector("img");
  if (!img) return () => {};
  const handle = figure.ownerDocument.createElement("div");
  handle.className = "media-handle";
  figure.append(handle);

  const place = () => {
    handle.style.left = `${img.offsetLeft + img.offsetWidth}px`;
    handle.style.top = `${img.offsetTop + img.offsetHeight}px`;
  };
  place();
  // A press on the handle must not move the selection. That would deselect the figure, and remove this handle, mid-drag.
  handle.addEventListener("mousedown", (event) => event.preventDefault());

  let width = 0;
  let ratio = 1;
  let moved = false;
  let startWidth: string | null = null;
  // The handle keeps its CSS cursor rather than interact's move cursor
  interact(handle).styleCursor(false).draggable({
    listeners: {
      start() {
        const rect = img.getBoundingClientRect();
        width = rect.width;
        ratio = rect.height ? rect.width / rect.height : 1;
        moved = false;
        startWidth = img.getAttribute("width");
      },
      move(event) {
        // Along whichever axis the pointer moved further, so a drag from the corner works either way
        const grow = Math.abs(event.dx) >= Math.abs(event.dy * ratio) ? event.dx : event.dy * ratio;
        width = Math.min(figure.clientWidth, Math.max(MIN_WIDTH, width + grow));
        img.setAttribute("width", String(Math.round(width)));
        place();
        moved = true;
      },
      end() {
        if (!moved) return;
        // The drag already showed the new width, so the old one is put back for the edit, which then records the change
        if (startWidth === null) img.removeAttribute("width");
        else img.setAttribute("width", startWidth);
        options.onEnd(Math.round(width));
      },
    },
  });

  return () => {
    interact(handle).unset();
    handle.remove();
  };
}
