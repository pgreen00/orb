import { Component, Host, h } from '@stencil/core';

export interface SpinnerConfig {
  dur: number;
  circles?: number;
  lines?: number;
  elmDuration?: boolean;
  fn: (dur: number, index: number, total: number) => SpinnerData;
}

export interface SpinnerData {
  r?: number;
  y1?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  style: { [key: string]: string | undefined };
  viewBox?: string;
  transform?: string;
}

const spinners = {
  lines: {
    dur: 1000,
    lines: 8,
    fn: (dur: number, index: number, total: number) => {
      const transform = `rotate(${(360 / total) * index + (index < total / 2 ? 180 : -180)}deg)`;
      const animationDelay = `${(dur * index) / total - dur}ms`;

      return {
        y1: 14,
        y2: 26,
        style: {
          transform: transform,
          'animation-delay': animationDelay,
        },
      };
    },
  },
}

const buildLine = (spinner: SpinnerConfig, duration: number, index: number, total: number) => {
  const data = spinner.fn(duration, index, total);
  data.style['animation-duration'] = duration + 'ms';

  return (
    <svg viewBox={data.viewBox || '0 0 64 64'} style={data.style}>
      <line transform="translate(32,32)" y1={data.y1} y2={data.y2} />
    </svg>
  );
};

@Component({
  tag: 'je-loading',
  styleUrl: 'je-loading.css',
  shadow: true,
})
export class JeLoading {
  render() {
    const spinner = spinners['lines'];
    const duration = spinner.dur;
    const svgs: SVGElement[] = [];

    for (let i = 0; i < spinner.lines; i++) {
      svgs.push(buildLine(spinner, duration, i, spinner.lines));
    }

    return (
      <Host class={{ [`spinner-lines`]: true }}>
        {svgs}
      </Host>
    );
  }
}
