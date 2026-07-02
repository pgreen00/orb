import {
  Component,
  Host,
  h,
  Prop,
  State,
  Event,
  EventEmitter,
  Method,
  Element,
  Watch,
} from "@stencil/core";

export interface ShaderErrorDetail {
  message: string;
  /** Line number in the user-authored shader (1-based), when known. */
  line?: number;
  /** true when WebGPU itself is unavailable, false for compile/validation errors. */
  unsupported: boolean;
}

/**
 * `<orb-shader-canvas>` renders a WGSL fragment shader with WebGPU, ShaderToy-style.
 *
 * Provide the fragment shader inside a `<script type="wgsl">` child. Using a script
 * block (rather than raw text) means the HTML parser treats the WGSL as opaque text,
 * so `<`, `>`, and generics like `mat2x2<f32>` need no escaping. A `uniforms` binding
 * and a full-screen vertex stage are injected for you — you only write the fragment.
 */
@Component({
  tag: "orb-shader-canvas",
  styleUrl: "orb-shader-canvas.css",
  shadow: true,
})
export class OrbShaderCanvas {
  @Element() el: HTMLElement;

  /** Backing-store width in pixels. When unset, the canvas fills its container. */
  @Prop() width?: number;
  /** Backing-store height in pixels. When unset, the canvas fills its container. */
  @Prop() height?: number;
  /** Name of the fragment entry point in the supplied shader. */
  @Prop() fragmentEntry: string = "main";
  /** Pixel density multiplier applied to the backing store. Increase for sharper output. */
  @Prop() dpr: number = 1;
  /** Freezes time and stops the render loop while keeping the last frame on screen. */
  @Prop() paused: boolean = false;

  @State() error: string = "";
  @State() unsupported: boolean = false;

  /** Fires once the GPU device is ready and the first frame has rendered. */
  @Event() ready: EventEmitter<void>;
  /** Fires when the shader fails to compile/validate or WebGPU is unavailable. */
  @Event() shaderError: EventEmitter<ShaderErrorDetail>;

  private canvas!: HTMLCanvasElement;
  // WebGPU handles are untyped here (project has no @webgpu/types); treat them as opaque.
  private device: any;
  private context: any;
  private format: any;
  private pipeline: any;
  private uniformBuffer: any;
  private bindGroup: any;

  private readonly uniformData = new Float32Array(12);
  private shaderSource = "";
  private preludeLineCount = 0;
  private disposed = false;

  private rafId: number | null = null;
  private lastFrameTime = 0;
  private elapsed = 0;
  private frameCount = 0;

  private readonly mouse = { x: 0, y: 0, pressX: 0, pressY: 0, down: false };
  private resizeObserver?: ResizeObserver;

  async componentDidLoad() {
    this.disposed = false;
    await this.initGpu();
  }

  connectedCallback() {
    // Re-observe / resume when moved back into the DOM after a disconnect.
    this.disposed = false;
    if (this.device) {
      this.resizeObserver?.observe(this.el);
      if (!this.paused) this.start();
    }
  }

  disconnectedCallback() {
    this.disposed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.teardownPointerEvents();
  }

  @Watch("paused")
  pausedChanged(paused: boolean) {
    if (!this.device) return;
    if (paused) this.stop();
    else this.start();
  }

  @Watch("fragmentEntry")
  async fragmentEntryChanged() {
    await this.buildPipeline();
  }

  @Watch("width")
  @Watch("height")
  @Watch("dpr")
  dimensionsChanged() {
    if (this.device) this.resize();
  }

  /** Replace the shader source at runtime, recompiling the pipeline. */
  @Method()
  async setShader(source: string) {
    this.shaderSource = source ?? "";
    await this.buildPipeline();
  }

  /** Read the shader source currently in use. */
  @Method()
  async getShader(): Promise<string> {
    return this.shaderSource;
  }

  /** Reset elapsed time and the frame counter to zero. */
  @Method()
  async reset() {
    this.elapsed = 0;
    this.frameCount = 0;
  }

  /** Resume the render loop (equivalent to `paused = false`). */
  @Method()
  async play() {
    this.paused = false;
  }

  /** Pause the render loop, keeping the last frame on screen. */
  @Method()
  async pause() {
    this.paused = true;
  }

  private async initGpu() {
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      this.fail("WebGPU is not supported in this browser.", {
        unsupported: true,
      });
      return;
    }

    try {
      const adapter = await gpu.requestAdapter();
      if (!adapter) throw new Error("No suitable GPU adapter found.");
      this.device = await adapter.requestDevice();
      if (this.disposed) return;

      this.device.lost?.then((info: any) => {
        // "destroyed" is the reason reported after an intentional device.destroy().
        if (this.disposed || info?.reason === "destroyed") return;
        this.fail(`GPU device lost: ${info?.message || "unknown reason"}`);
      });

      this.context = this.canvas.getContext("webgpu");
      this.format = gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "premultiplied",
      });

      this.uniformBuffer = this.device.createBuffer({
        size: this.uniformData.byteLength,
        usage: this.bufferUsage("UNIFORM", "COPY_DST"),
      });

      this.shaderSource = this.readShaderSource();
      this.resize();
      this.setupPointerEvents();
      this.observeResize();

      await this.buildPipeline();
    } catch (err: any) {
      this.fail(err?.message || String(err));
    }
  }

  private buildPrelude(): string {
    return `struct Uniforms {
  resolution: vec2f,
  time: f32,
  timeDelta: f32,
  mouse: vec4f,
  frame: f32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn je_vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}

`;
  }

  private async buildPipeline() {
    if (!this.device) return;

    if (!this.shaderSource.trim()) {
      this.pipeline = null;
      this.fail("No shader source provided.");
      return;
    }

    const prelude = this.buildPrelude();
    this.preludeLineCount = prelude.split("\n").length - 1;
    const code = prelude + this.shaderSource;

    this.device.pushErrorScope("validation");

    const module = this.device.createShaderModule({ code });

    // Surface compile errors with line numbers mapped back to the user's source.
    if (typeof module.getCompilationInfo === "function") {
      const info = await module.getCompilationInfo();
      const firstError = info.messages.find((m: any) => m.type === "error");
      if (firstError) {
        await this.device.popErrorScope();
        const line = Math.max(
          1,
          (firstError.lineNum || 0) - this.preludeLineCount,
        );
        this.fail(firstError.message, { line });
        return;
      }
    }

    let pipeline: any;
    try {
      pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "je_vs_main" },
        fragment: {
          module,
          entryPoint: this.fragmentEntry,
          targets: [{ format: this.format }],
        },
        primitive: { topology: "triangle-list" },
      });
    } catch (err: any) {
      await this.device.popErrorScope();
      this.fail(err?.message || String(err));
      return;
    }

    const validationError = await this.device.popErrorScope();
    if (validationError) {
      this.fail(validationError.message);
      return;
    }

    this.pipeline = pipeline;
    this.bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.error = "";
    this.unsupported = false;

    this.renderFrame();
    if (!this.paused) this.start();

    this.ready.emit();
  }

  private renderFrame() {
    if (!this.pipeline || !this.device) return;

    const d = this.uniformData;
    d[0] = this.canvas.width;
    d[1] = this.canvas.height;
    d[2] = this.elapsed;
    // d[3] (timeDelta) is written in the RAF loop.
    d[4] = this.mouse.x;
    d[5] = this.mouse.y;
    d[6] = this.mouse.pressX;
    d[7] = this.mouse.pressY;
    d[8] = this.frameCount;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, d);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private readonly frame = (now: number) => {
    this.rafId = requestAnimationFrame(this.frame);
    if (this.lastFrameTime === 0) this.lastFrameTime = now;
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.elapsed += delta;
    this.uniformData[3] = delta;
    this.renderFrame();
    this.frameCount++;
  };

  private start() {
    if (this.rafId != null || this.disposed || !this.pipeline) return;
    this.lastFrameTime = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private resize() {
    const density = this.dpr > 0 ? this.dpr : 1;
    const fixed = this.width != null && this.height != null;

    let cssW: number;
    let cssH: number;
    if (fixed) {
      cssW = this.width!;
      cssH = this.height!;
    } else {
      const rect = this.el.getBoundingClientRect();
      cssW = rect.width || 300;
      cssH = rect.height || 150;
    }

    const maxDim = this.device?.limits?.maxTextureDimension2D || 8192;
    const w = Math.min(maxDim, Math.max(1, Math.round(cssW * density)));
    const h = Math.min(maxDim, Math.max(1, Math.round(cssH * density)));

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.canvas.style.width = fixed ? `${cssW}px` : "100%";
    this.canvas.style.height = fixed ? `${cssH}px` : "100%";

    // A resize while paused would otherwise leave a stale/blank frame.
    if (this.paused) this.renderFrame();
  }

  private observeResize() {
    if (this.width != null && this.height != null) return;
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.el);
  }

  private setupPointerEvents() {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
  }

  private teardownPointerEvents() {
    this.canvas?.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas?.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas?.removeEventListener("pointerup", this.handlePointerUp);
  }

  private pointerToPixels(event: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    return [
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY,
    ];
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    const [x, y] = this.pointerToPixels(event);
    this.mouse.x = x;
    this.mouse.y = y;
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    const [x, y] = this.pointerToPixels(event);
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.pressX = x;
    this.mouse.pressY = y;
    this.mouse.down = true;
  };

  private readonly handlePointerUp = () => {
    this.mouse.down = false;
  };

  private readonly handleSlotChange = () => {
    const next = this.readShaderSource();
    if (next === this.shaderSource) return;
    this.shaderSource = next;
    this.buildPipeline();
  };

  /**
   * Read the WGSL source from a `<script type="wgsl">` child. Script content is
   * opaque to the HTML parser, so angle brackets need no escaping. Falls back to
   * the element's raw text content when no such script is present.
   */
  private readShaderSource(): string {
    const script = this.el.querySelector(
      'script[type="wgsl"], script[type="text/wgsl"], script[type="x-shader/x-wgsl"]',
    ) as HTMLScriptElement | null;
    return (script ?? this.el).textContent ?? "";
  }

  private bufferUsage(...names: string[]): number {
    const flags = (globalThis as any).GPUBufferUsage;
    return names.reduce((acc, name) => acc | flags[name], 0);
  }

  private fail(
    message: string,
    opts: { line?: number; unsupported?: boolean } = {},
  ) {
    this.unsupported = !!opts.unsupported;
    this.error = opts.line != null ? `Line ${opts.line}: ${message}` : message;
    this.stop();
    this.shaderError.emit({
      message,
      line: opts.line,
      unsupported: !!opts.unsupported,
    });
  }

  render() {
    return (
      <Host>
        <canvas ref={(el) => (this.canvas = el)} part="canvas" />
        {this.error && (
          <div
            class={{ overlay: true, unsupported: this.unsupported }}
            part="error"
            role="alert"
          >
            <pre>{this.error}</pre>
          </div>
        )}
        <div class="source" aria-hidden="true">
          <slot onSlotchange={this.handleSlotChange}></slot>
        </div>
      </Host>
    );
  }
}
