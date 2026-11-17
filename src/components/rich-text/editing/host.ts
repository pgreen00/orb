import type { PendingFormats } from "./inline";
import type { FontOption } from "../ui/defaults";

export interface ApplyOptions {
  /** The `inputType` of the `input` event. Defaults to insertReplacementText. */
  inputType?: string;
  /** Edits this range instead of the selection, such as one saved before a dialog took focus */
  range?: Range;
}

/**
 * What commands and their helpers use to change the editor. `orb-rich-text`
 * implements it, so the editing modules don't depend on the component.
 */
export interface EditorHost {
  /** The contenteditable */
  readonly root: HTMLElement;
  /** `<orb-rich-text>` */
  readonly el: HTMLElement;
  /** False while disabled or readonly */
  readonly editable: boolean;
  /** Formats for the next text typed at a collapsed caret */
  readonly pending: PendingFormats;
  /** The languages offered for code blocks */
  readonly codeLanguages: string[];
  /** The fonts the font picker offers */
  readonly fonts: FontOption[];
  /** The font sizes in points the size picker offers */
  readonly fontSizeList: string[];
  /** The swatches in the color pickers */
  readonly colors: string[];
  /** The selection to edit: the live one, the last one, or the end */
  takeRange(): Range;
  /** Focuses the editor and selects `range`, unless the editor already has focus */
  focusAt(range: Range): void;
  /** Runs an edit as one undo step and selects its result. Returns false if nothing changed. */
  apply(edit: (range: Range) => Range | null | undefined, options?: ApplyOptions): boolean;
  undo(): boolean;
  redo(): boolean;
  /** Opens the image picker. The picked image goes at `range`. */
  pickImage(range: Range): void;
  /** Opens the link popover for `range` */
  openLink(range: Range): void;
  /** Opens the list of keyboard shortcuts */
  showHelp(): void;
  /** Opens the picker for a command, such as a color or a special character. The choice runs the command again with its value. */
  openPicker(id: string, range: Range): void;
  /** Recomputes the toolbar states, such as after a pending format changes */
  update(): void;
}
