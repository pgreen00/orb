/** A starting document, offered by the templates picker */
export interface TemplateInfo {
  id: string;
  label: string;
  description?: string;
  /** The template's HTML. Set this, or `load`. */
  html?: string;
  /** Loads the template's HTML when it's first used */
  load?: () => Promise<string>;
}
