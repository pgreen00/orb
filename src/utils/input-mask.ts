import { BehaviorSubject } from "rxjs";

export interface InputMaskOptions {
  inputElement: HTMLInputElement | HTMLElement;
  formatter: (str: string) => string;
  extractor?: (str: string) => string;
  masker?: (rawValue: string, formattedValue: string) => string;
}

export class InputMask {
  private element: HTMLInputElement | HTMLElement;
  private isContentEditable: boolean;
  private formatter: (str: string) => string;
  private extractor: (str: string) => string;
  private masker?: (rawValue: string, formattedValue: string) => string;
  private rawValue: BehaviorSubject<string>;
  private formattedValue: BehaviorSubject<string>;
  private pendingCursor: { cancelled: boolean } | null = null;

  constructor({
    inputElement,
    formatter,
    extractor = (val) => val,
    masker,
  }: InputMaskOptions) {
    this.element = inputElement;
    this.isContentEditable =
      inputElement instanceof HTMLElement && inputElement.isContentEditable;
    this.formatter = formatter;
    this.extractor = extractor;
    this.masker = masker;

    this.rawValue = new BehaviorSubject(this.extractor(this.getValue()));
    this.formattedValue = new BehaviorSubject(
      this.formatter(this.rawValue.value),
    );
    this.setValue(this.getDisplayValue());

    this.element.addEventListener("keydown", this.handleKeyDown);
    this.element.addEventListener("input", this.handleInput);
  }

  public forceUpdate(newValue?: string) {
    if (newValue !== undefined) {
      this.setValue(newValue);
    }
    this.element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private getValue(): string {
    if (this.isContentEditable) {
      return (this.element as HTMLElement).textContent || "";
    }
    return (this.element as HTMLInputElement).value;
  }

  private setValue(value: string) {
    if (this.isContentEditable) {
      (this.element as HTMLElement).textContent = value;
    } else {
      (this.element as HTMLInputElement).value = value;
    }
  }

  private getSelectionRange(): { start: number; end: number } | null {
    if (this.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const root = this.element.getRootNode();
      const ranges = (selection as any).getComposedRanges({
        shadowRoots: root instanceof ShadowRoot ? [root] : [],
      });
      if (ranges.length === 0) return null;

      const range = ranges[0];
      const base = document.createRange();
      base.selectNodeContents(this.element);

      base.setEnd(range.startContainer, range.startOffset);
      const start = base.toString().length;

      base.setEnd(range.endContainer, range.endOffset);
      const end = base.toString().length;

      return { start, end };
    }

    const el = this.element as HTMLInputElement;
    if (el.selectionStart === null || el.selectionEnd === null) return null;
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  private getDisplayValue(): string {
    if (this.masker) {
      return this.masker(this.rawValue.value, this.formattedValue.value);
    }
    return this.formattedValue.value;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      const sel = this.getSelectionRange();
      if (!sel) return;
      const { start: cursorPos, end: selectionEnd } = sel;

      if (cursorPos === null || selectionEnd === null) return;

      // If there's a selection, let it handle normally
      if (cursorPos !== selectionEnd) {
        return;
      }

      // Use formattedValue (not the masked display) for logic
      const valueToCheck = this.formattedValue.value;

      // Check if we're about to delete a formatting character
      if (e.key === "Backspace" && cursorPos > 0) {
        const beforeSubstring = valueToCheck.substring(0, cursorPos - 1);
        const atSubstring = valueToCheck.substring(0, cursorPos);

        const beforeRaw = this.extractor(beforeSubstring);
        const atRaw = this.extractor(atSubstring);

        // If the character before cursor is a formatting character
        if (beforeRaw.length === atRaw.length) {
          e.preventDefault();
          this.deleteRawCharacter("backspace", cursorPos);
        }
      } else if (e.key === "Delete" && cursorPos < valueToCheck.length) {
        const atSubstring = valueToCheck.substring(0, cursorPos);
        const afterSubstring = valueToCheck.substring(0, cursorPos + 1);

        const atRaw = this.extractor(atSubstring);
        const afterRaw = this.extractor(afterSubstring);

        // If the character after cursor is a formatting character
        if (atRaw.length === afterRaw.length) {
          e.preventDefault();
          this.deleteRawCharacter("delete", cursorPos);
        }
      }
    }
  };

  private deleteRawCharacter(direction: string, cursorPos: number) {
    const rawPos = this.getRawCursorPosition(
      this.formattedValue.value,
      cursorPos,
    );

    // Delete from raw value
    if (direction === "backspace" && rawPos > 0) {
      this.rawValue.next(
        this.rawValue.value.slice(0, rawPos - 1) +
          this.rawValue.value.slice(rawPos),
      );
      this.updateAndPosition(rawPos - 1);
    } else if (direction === "delete" && rawPos < this.rawValue.value.length) {
      this.rawValue.next(
        this.rawValue.value.slice(0, rawPos) +
          this.rawValue.value.slice(rawPos + 1),
      );
      this.updateAndPosition(rawPos);
    }
  }

  private updateAndPosition(targetRawPos: number) {
    this.formattedValue.next(this.formatter(this.rawValue.value));
    this.setValue(this.getDisplayValue());

    const newCursorPos = this.getFormattedCursorPosition(targetRawPos);
    this.setCursor(newCursorPos);
  }

  private handleInput = () => {
    const sel = this.getSelectionRange();
    if (!sel) return;
    const cursorPos = sel.start;
    if (cursorPos === null) return;

    const inputValue = this.getValue();
    const prevDisplayValue = this.getDisplayValue();

    // When masking is enabled, we need to extract from the actual characters typed
    // not the masked display. We'll track what actually changed.
    let newRawValue: string;

    if (this.masker) {
      // Calculate where the cursor was BEFORE the input
      let prevCursorPos: number;

      if (inputValue.length > prevDisplayValue.length) {
        // User added characters - cursor was before the added characters
        const diff = inputValue.length - prevDisplayValue.length;
        prevCursorPos = cursorPos - diff;

        // Get raw cursor position before the change using the OLD cursor position
        const prevRawCursorPos = this.getRawCursorPosition(
          this.formattedValue.value,
          prevCursorPos,
        );

        const typedChars = inputValue.substring(prevCursorPos, cursorPos);
        const extractedTyped = this.extractor(typedChars);

        // Insert into raw value at cursor position
        const candidateRawValue =
          this.rawValue.value.slice(0, prevRawCursorPos) +
          extractedTyped +
          this.rawValue.value.slice(prevRawCursorPos);

        // Format to see what actually gets accepted
        const formattedCandidate = this.formatter(candidateRawValue);
        // Extract back to get the actual raw value that will be used
        newRawValue = this.extractor(formattedCandidate);

        // Calculate how much was actually added to the raw value
        const actualRawDiff = newRawValue.length - this.rawValue.value.length;
        // Update stored raw value
        this.rawValue.next(newRawValue);
        this.formattedValue.next(this.formatter(this.rawValue.value));
        this.setValue(this.getDisplayValue());

        // Position cursor after the characters that were actually added
        let newCursorPos = this.getFormattedCursorPosition(
          prevRawCursorPos + actualRawDiff,
        );
        if (actualRawDiff > 0) {
          newCursorPos = this.findNextRawCharPosition(newCursorPos);
        }

        this.setCursor(newCursorPos);
      } else if (inputValue.length < prevDisplayValue.length) {
        // User deleted characters
        const diff = prevDisplayValue.length - inputValue.length;
        prevCursorPos = cursorPos;

        const rawStart = this.getRawCursorPosition(
          this.formattedValue.value,
          prevCursorPos,
        );
        const rawEnd = this.getRawCursorPosition(
          this.formattedValue.value,
          prevCursorPos + diff,
        );

        newRawValue =
          this.rawValue.value.slice(0, rawStart) +
          this.rawValue.value.slice(rawEnd);

        this.rawValue.next(newRawValue);
        this.formattedValue.next(this.formatter(this.rawValue.value));
        this.setValue(this.getDisplayValue());

        const newCursorPos = this.getFormattedCursorPosition(rawStart);
        this.setCursor(newCursorPos);
      } else {
        // No length change
        newRawValue = this.rawValue.value;
      }
    } else {
      // Original behavior for non-masked inputs
      newRawValue = this.extractor(inputValue);

      // Calculate cursor position in terms of raw characters
      const rawCursorPos = this.getRawCursorPosition(inputValue, cursorPos);
      // Determine what changed in the raw value
      const rawDiff = newRawValue.length - this.rawValue.value.length;

      // Update stored raw value
      this.rawValue.next(newRawValue);

      // Apply formatting
      this.formattedValue.next(this.formatter(this.rawValue.value));
      this.setValue(this.getDisplayValue());

      // Calculate new cursor position
      let newCursorPos = this.getFormattedCursorPosition(
        rawCursorPos + (rawDiff > 0 ? rawDiff : 0),
      );
      // If we're adding characters, move cursor forward past any formatting
      if (rawDiff > 0) {
        // Make sure cursor is after the newly typed character(s)
        newCursorPos = this.findNextRawCharPosition(newCursorPos);
      }

      // Set cursor position
      this.setCursor(newCursorPos);
    }
  };

  private getRawCursorPosition(formattedValue: string, cursorPos: number) {
    // Count how many "raw" characters are before the cursor
    const extracted = this.extractor(formattedValue.substring(0, cursorPos));
    return extracted.length;
  }

  private getFormattedCursorPosition(rawPos: number) {
    // Find the formatted position that corresponds to the raw position
    if (rawPos === 0) return 0;
    if (rawPos >= this.rawValue.value.length)
      return this.formattedValue.value.length;
    for (let i = 0; i < this.formattedValue.value.length; i++) {
      const charUpToHere = this.extractor(
        this.formattedValue.value.substring(0, i + 1),
      );
      if (charUpToHere.length >= rawPos) {
        return i + 1;
      }
    }

    return this.formattedValue.value.length;
  }

  private findNextRawCharPosition(startPos: number) {
    // Move cursor forward until we're right after a raw character
    // This handles cases where formatting characters are inserted
    for (let i = startPos; i <= this.formattedValue.value.length; i++) {
      const beforeExtracted = this.extractor(
        this.formattedValue.value.substring(0, i - 1),
      );
      const atExtracted = this.extractor(
        this.formattedValue.value.substring(0, i),
      );

      if (atExtracted.length > beforeExtracted.length) {
        return i;
      }
    }
    return startPos;
  }

  private setCursor(position: number) {
    if (this.pendingCursor) {
      this.pendingCursor.cancelled = true;
    }

    const handle = { cancelled: false };
    this.pendingCursor = handle;

    queueMicrotask(() => {
      if (handle.cancelled) return;
      this.pendingCursor = null;

      if (this.isContentEditable) {
        const selection = window.getSelection();
        if (!selection) return;
        const textNode = Array.from(this.element.childNodes).find(
          (t) => t.nodeType === Node.TEXT_NODE,
        );
        if (textNode) {
          selection.setPosition(textNode, position);
        }
      } else {
        (this.element as HTMLInputElement).setSelectionRange(
          position,
          position,
        );
      }
    });
  }

  [Symbol.dispose]() {
    this.element.removeEventListener("keydown", this.handleKeyDown);
    this.element.removeEventListener("input", this.handleInput);
  }
}
