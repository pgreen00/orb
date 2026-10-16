import { Prop } from '@stencil/core';

export class ReadyController {
  #resolve: Function;
  /**
   * A promise that resolves when the component has completed it's initial render
   */
  @Prop() ready = new Promise((res) => (this.#resolve = res));

  componentDidLoad() {
    this.#resolve();
  }
}
