import { Component, Host, h, Prop, Event, EventEmitter, State, Method, Element } from '@stencil/core';

export interface EditorCommand {
  command: string;
  value?: string;
  icon?: string;
  label: string;
  active?: boolean;
}

export interface EditorChangeEvent {
  html: string;
  text: string;
  isEmpty: boolean;
}

@Component({
  tag: 'je-rich-text',
  styleUrl: 'je-rich-text.css',
  shadow: {
    delegatesFocus: true
  },
})
export class JeRichText {
  @Element() el: HTMLElement;

  @Prop() placeholder: string = 'Start typing...';
  @Prop() value: string = '';
  @Prop() disabled: boolean = false;
  @Prop() readonly: boolean = false;
  @Prop() minHeight: string = '200px';
  @Prop() maxHeight: string = '500px';
  @Prop() showWordCount: boolean = true;

  @State() isFocused: boolean = false;
  @State() wordCount: number = 0;
  @State() characterCount: number = 0;
  @State() selectedLink: string = '';

  @Event() editorChange: EventEmitter<EditorChangeEvent>;
  @Event() editorFocus: EventEmitter<FocusEvent>;
  @Event() editorBlur: EventEmitter<FocusEvent>;

  private editorRef: HTMLDivElement;
  private fileInputRef: HTMLInputElement;

  private toolbarCommands: EditorCommand[] = [
    { command: 'undo', icon: '↶', label: 'Undo' },
    { command: 'redo', icon: '↷', label: 'Redo' },
    { command: 'divider', icon: '', label: '' },
    { command: 'bold', icon: 'B', label: 'Bold' },
    { command: 'italic', icon: 'I', label: 'Italic' },
    { command: 'underline', icon: 'U', label: 'Underline' },
    { command: 'strikeThrough', icon: 'S', label: 'Strikethrough' },
    { command: 'divider', icon: '', label: '' },
    { command: 'heading1', icon: 'H1', label: 'Heading 1' },
    { command: 'heading2', icon: 'H2', label: 'Heading 2' },
    { command: 'paragraph', icon: '¶', label: 'Paragraph' },
    { command: 'divider', icon: '', label: '' },
    { command: 'insertOrderedList', icon: '1.', label: 'Ordered List' },
    { command: 'insertUnorderedList', icon: '•', label: 'Unordered List' },
    { command: 'divider', icon: '', label: '' },
    { command: 'justifyLeft', icon: '⬅', label: 'Align Left' },
    { command: 'justifyCenter', icon: '↔', label: 'Align Center' },
    { command: 'justifyRight', icon: '➡', label: 'Align Right' },
    { command: 'justifyFull', icon: '☰', label: 'Justify' },
    { command: 'divider', icon: '', label: '' },
    { command: 'createLink', icon: '🔗', label: 'Insert Link' },
    { command: 'insertImage', icon: '🖼', label: 'Insert Image' },
    { command: 'divider', icon: '', label: '' },
    { command: 'removeFormat', icon: '✕', label: 'Clear Formatting' },
  ];

  componentDidLoad() {
    if (this.value) {
      this.editorRef.innerHTML = this.value;
      this.updateWordCount();
    }
  }

  @Method()
  async getContent(): Promise<string> {
    return this.editorRef.innerHTML;
  }

  @Method()
  async getText(): Promise<string> {
    return this.editorRef.innerText;
  }

  @Method()
  async setContent(html: string): Promise<void> {
    this.editorRef.innerHTML = html;
    this.updateWordCount();
    this.emitChange();
  }

  @Method()
  async clear(): Promise<void> {
    this.editorRef.innerHTML = '';
    this.updateWordCount();
    this.emitChange();
  }

  private executeCommand(command: string, value?: string) {
    if (this.disabled || this.readonly) return;

    switch (command) {
      case 'heading1':
        document.execCommand('formatBlock', false, 'h1');
        break;
      case 'heading2':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'paragraph':
        document.execCommand('formatBlock', false, 'p');
        break;
      case 'createLink':
        this.handleCreateLink();
        break;
      case 'insertImage':
        this.fileInputRef.click();
        break;
      case 'divider':
        // Do nothing for dividers
        break;
      default:
        document.execCommand(command, false, value);
    }

    this.editorRef.focus();
    this.emitChange();
  }

  private handleCreateLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (!selectedText) {
      alert('Please select text to create a link');
      return;
    }

    const url = prompt('Enter URL:', 'https://');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }

  private handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = `<img src="${e.target.result}" alt="${file.name}" style="max-width: 100%; height: auto;">`;
      document.execCommand('insertHTML', false, img);
      this.emitChange();
    };
    reader.readAsDataURL(file);
  }

  private handleInput = () => {
    this.updateWordCount();
    this.emitChange();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          this.executeCommand('bold');
          break;
        case 'i':
          event.preventDefault();
          this.executeCommand('italic');
          break;
        case 'u':
          event.preventDefault();
          this.executeCommand('underline');
          break;
        case 'z':
          event.preventDefault();
          this.executeCommand('undo');
          break;
        case 'y':
          event.preventDefault();
          this.executeCommand('redo');
          break;
      }
    }
  };

  private handlePaste = (event: ClipboardEvent) => {
    if (this.disabled || this.readonly) {
      event.preventDefault();
      return;
    }

    // Handle paste to clean HTML
    event.preventDefault();
    const text = event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain');

    if (text) {
      // Clean the HTML to prevent XSS and unwanted styles
      const cleanHtml = this.sanitizeHtml(text);
      document.execCommand('insertHTML', false, cleanHtml);
      this.emitChange();
    }
  };

  private sanitizeHtml(html: string): string {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script tags and dangerous attributes
    const scripts = temp.querySelectorAll('script, style, meta, link');
    scripts.forEach(el => el.remove());

    // Remove dangerous attributes
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove event handlers and dangerous attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'style') {
          el.removeAttribute(attr.name);
        }
      });
    });

    return temp.innerHTML;
  }

  private updateWordCount() {
    const text = this.editorRef.innerText || '';
    this.characterCount = text.length;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private emitChange() {
    const html = this.editorRef.innerHTML;
    const text = this.editorRef.innerText || '';
    const isEmpty = !text.trim();

    this.editorChange.emit({
      html,
      text,
      isEmpty,
    });
  }

  private handleFocus = (event: FocusEvent) => {
    this.isFocused = true;
    this.editorFocus.emit(event);
  };

  private handleBlur = (event: FocusEvent) => {
    this.isFocused = false;
    this.editorBlur.emit(event);
  };

  private isCommandActive(command: string): boolean {
    switch (command) {
      case 'heading1':
        return document.queryCommandValue('formatBlock') === 'h1';
      case 'heading2':
        return document.queryCommandValue('formatBlock') === 'h2';
      case 'paragraph':
        return document.queryCommandValue('formatBlock') === 'p';
      default:
        return document.queryCommandState(command);
    }
  }

  render() {
    return (
      <Host
        class={{
          'editor-container': true,
          'editor-focused': this.isFocused,
          'editor-disabled': this.disabled,
          'editor-readonly': this.readonly,
        }}
      >
        <div class="editor-toolbar" role="toolbar" aria-label="Formatting options">
          {this.toolbarCommands.map(cmd => {
            if (cmd.command === 'divider') {
              return <div class="toolbar-divider" aria-hidden="true"></div>;
            }

            return (
              <button
                type="button"
                class={{
                  'toolbar-btn': true,
                  'active': this.isCommandActive(cmd.command),
                }}
                onClick={() => this.executeCommand(cmd.command)}
                disabled={this.disabled || this.readonly}
                title={cmd.label}
                aria-label={cmd.label}
                aria-pressed={this.isCommandActive(cmd.command) ? 'true' : 'false'}
              >
                <span class="toolbar-icon">{cmd.icon}</span>
              </button>
            );
          })}
        </div>

        <div class="editor-content-wrapper">
          <div tabindex={0}
            ref={el => this.editorRef = el}
            class="editor-content"
            contenteditable={!this.disabled && !this.readonly}
            onInput={this.handleInput}
            onKeyDown={this.handleKeyDown}
            onPaste={this.handlePaste}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            role="textbox"
            aria-multiline="true"
            aria-label="Rich text editor"
            aria-placeholder={this.placeholder}
            data-placeholder={this.placeholder}
            style={{
              minHeight: this.minHeight,
              maxHeight: this.maxHeight,
            }}
          ></div>
        </div>

        {this.showWordCount && (
          <div class="editor-footer">
            <span class="word-count">
              Words: {this.wordCount} | Characters: {this.characterCount}
            </span>
          </div>
        )}

        <input
          ref={el => this.fileInputRef = el}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={this.handleImageUpload.bind(this)}
        />
      </Host>
    );
  }
}
