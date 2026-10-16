import { Component, Element, Host, Prop, State, Watch } from "@stencil/core";
import {
  isFragment,
  onPipesChanged,
  resolvePipe,
  type PipeValue,
} from "../../utils/pipes.js";
import { builtinPipes } from "./pipes.generated.js";
import { parseInput } from "./parse.js";
import { ReadyController } from "../../utils/ready-controller.js";

/**
 * Pipes take a unix-like expression, run it through a chain of transforms, and renders the result as text.
 */
@Component({
  tag: "orb-pipe",
  styleUrl: "pipe.css",
  shadow: true,
})
export class Pipe extends ReadyController {
  @Element() el: HTMLElement;
  @State() output: string | DocumentFragment = "";
  @State() resolved = false;
  @State() errored = false;
  private runId = 0;
  private missingPipe = false;
  private unsubscribe?: () => void;
  private warned = new Set<string>();

  /**
   * A unix-like pipe expression. The first segment is a literal seed value and
   * each subsequent segment is a pipe invocation with optional arguments.
   *
   * @example "handheldInterfaceDefinition | reverseCase | titlecase"
   */
  @Prop() input!: string;

  connectedCallback() {
    this.unsubscribe = onPipesChanged(() => {
      if (this.missingPipe) this.run();
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  @Watch("input", { immediate: true })
  async onInputChange() {
    await this.ready;
    this.run();
  }

  @Watch("output", { immediate: true })
  async onOutputChange() {
    await this.ready;
    this.el.replaceChildren(this.output);
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
        const next = await pipe(value, ...args);
        value = next;
      }
    } catch (error) {
      console.warn(`<orb-pipe> failed to evaluate input: ${raw}`, error);
      failed = true;
    }

    if (id !== this.runId) return;

    this.missingPipe = missing;
    this.output = isFragment(value)
      ? (value.cloneNode(true) as DocumentFragment)
      : value == null
        ? ""
        : String(value);
    this.errored = failed;
    this.resolved = true;
  }

  render() {
    return (
      <Host
        data-resolved={this.resolved ? "" : null}
        data-error={this.errored ? "" : null}
      >
        <slot />
      </Host>
    );
  }
}
