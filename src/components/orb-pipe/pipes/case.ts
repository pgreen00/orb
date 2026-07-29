import type { Pipe } from "../../../utils/pipes.js";

const str = (input: unknown) => (input == null ? "" : String(input));

export const uppercase: Pipe = (input) => str(input).toUpperCase();

export const lowercase: Pipe = (input) => str(input).toLowerCase();

/** Uppercases the first letter of the string, leaving the rest untouched. */
export const capitalize: Pipe = (input) => {
  const value = str(input);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/** Uppercases the first letter of every whitespace-separated word. */
export const titlecase: Pipe = (input) =>
  str(input).replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));

/**
 * Splits a camel, pascal, snake, kebab or dot cased identifier into lowercase
 * space-separated words. An optional argument names the source casing but is
 * accepted only for readability -- detection is automatic.
 *
 * @example reverseCase("handheldInterfaceDefinition") // "handheld interface definition"
 */
export const reverseCase: Pipe = (input) =>
  str(input)
    // Split acronym runs from following words: "HTTPServer" -> "HTTP Server"
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // Split lower/digit to upper boundaries: "fooBar" -> "foo Bar"
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Converts arbitrary text into a url-friendly slug. */
export const slugify: Pipe = (input) =>
  str(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
