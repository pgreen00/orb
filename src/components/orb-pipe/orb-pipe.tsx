import { Component, Host, Prop, State, Watch } from "@stencil/core";
import { onPipesChanged, resolvePipe, type PipeValue } from "../../utils/pipes.js";
import { builtinPipes } from "./pipes.generated.js";
import { parseInput } from "./parse.js";

@Component({
  tag: "orb-pipe",
  styleUrl: "orb-pipe.css",
  shadow: true,
})
export class OrbPipe {
  /**
   * A unix-like pipe expression. The first segment is a literal seed value and
   * each subsequent segment is a pipe invocation with optional arguments.
   *
   * @example "handheldInterfaceDefinition | reverseCase | titlecase"
   */
  @Prop() input!: string;

  @State() output = "";
  @State() resolved = false;
  @State() errored = false;

  /** Guards against a slow pipe chain overwriting a newer one. */
  private runId = 0;
  /** Set when evaluation stopped because a pipe name wasn't registered yet. */
  private missingPipe = false;
  private unsubscribe?: () => void;
  /** Pipe names already reported, so a retry doesn't warn twice. */
  private warned = new Set<string>();

  componentWillLoad() {
    // Elements are usually upgraded before a deferred module registers its
    // pipes, so retry when the registry gains something this chain was missing.
    this.unsubscribe = onPipesChanged(() => {
      if (this.missingPipe) this.run();
    });
    return this.run();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  @Watch("input")
  inputChanged() {
    this.run();
  }

  /**
   * Warns about an unregistered pipe, but only after giving deferred modules a
   * chance to register it. Elements are typically upgraded before a consumer's
   * registration module runs, so warning immediately would report names that
   * are about to become valid. Each name is reported at most once.
   */
  private warnUnknownPipe(name: string, raw: string) {
    if (this.warned.has(name)) return;
    this.warned.add(name);

    // Inline module scripts are deferred until parsing finishes, so a consumer
    // registering pipes there always loses the race against element upgrade.
    // Wait for the document to finish loading before deciding a name is bogus.
    const check = async () => {
      if (await resolvePipe(name, builtinPipes)) return;
      console.warn(`<orb-pipe> unknown pipe "${name}" in input: ${raw}`);
    };

    // `interactive` still precedes deferred module scripts, so only `complete`
    // means registration can no longer happen during startup.
    if (document.readyState === "complete") {
      setTimeout(check);
    } else {
      window.addEventListener("load", () => setTimeout(check), { once: true });
    }
  }

  /**
   * Evaluates the chain, awaiting each pipe in turn. Failures never throw into
   * the host application: a warning is logged and the last successful value in
   * the chain is rendered.
   */
  private async run() {
    const id = ++this.runId;
    const raw = this.input ?? "";

    let value: PipeValue;
    let failed = false;
    let missing = false;

    try {
      const { seed, calls } = parseInput(raw);
      value = seed;

      for (const { name, args } of calls) {
        const pipe = await resolvePipe(name, builtinPipes);
        if (!pipe) {
          this.warnUnknownPipe(name, raw);
          failed = true;
          missing = true;
          break;
        }
        // Keep the last good value if an individual pipe throws.
        const next = await pipe(value, ...args);
        value = next;
      }
    } catch (error) {
      console.warn(`<orb-pipe> failed to evaluate input: ${raw}`, error);
      failed = true;
    }

    if (id !== this.runId) return;

    this.missingPipe = missing;
    this.output = value == null ? "" : String(value);
    this.errored = failed;
    this.resolved = true;
  }

  render() {
    return (
      <Host data-resolved={this.resolved ? "" : null} data-error={this.errored ? "" : null}>
        {this.output}
      </Host>
    );
  }
}
