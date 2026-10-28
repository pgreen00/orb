import {
  Component,
  EventEmitter,
  Host,
  Listen,
  Prop,
  Event,
  Element,
  AttachInternals,
  Watch,
} from "@stencil/core";
import { ReadyController } from "../../utils/ready-controller";

@Component({
  tag: "orb-toggle",
  styleUrl: "toggle.css",
  shadow: true,
  formAssociated: true,
})
export class Toggle extends ReadyController {
  @AttachInternals({
    states: {
      on: false,
      off: true,
    },
  })
  internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Original value form will reset to
   */
  @Prop() defaultChecked: boolean;

  /**
   * Whether or not the toggle is active
   */
  @Prop({ mutable: true }) checked = false;

  /**
   * If the label should be placed at the start or end of the toggle
   */
  @Prop() labelPlacement: "start" | "end" = "end";

  /**
   * Emits the new value whenever toggle is clicked
   */
  @Event({ bubbles: false }) orbCheckedChange: EventEmitter<boolean>;

  componentWillLoad() {
    this.internals.role = "switch";
    this.el.tabIndex = 0;
    if (this.defaultChecked === undefined) {
      this.defaultChecked = this.checked;
    }
  }

  formResetCallback() {
    this.checked = this.defaultChecked;
  }

  @Watch("checked", { immediate: true })
  async onCheckedChange() {
    await this.ready;
    this.internals.states.add(this.checked ? "on" : "off");
    this.internals.states.delete(!this.checked ? "on" : "off");
    this.internals.ariaChecked = this.checked ? "true" : "false";
    this.internals.setFormValue(this.checked ? "on" : "off");
  }

  @Listen("click")
  onClick() {
    this.checked = !this.checked;
    this.orbCheckedChange.emit(this.checked);
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === " ") {
      ev.preventDefault();
      ev.stopPropagation();
      this.checked = !this.checked;
      this.orbCheckedChange.emit(this.checked);
    }
  }

  render() {
    return (
      <Host>
        {this.labelPlacement == "start" && <slot />}
        <div class="toggle-container">
          <div class="toggle-thumb"></div>
        </div>
        {this.labelPlacement == "end" && <slot />}
      </Host>
    );
  }
}
