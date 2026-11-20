/** Icons for the channel's buttons. Each is drawn with `currentColor`, so it follows the text color. */

/** Stencil passes a functional component's children as its second argument, not in its props */
const Svg = (props: any, children: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
  >
    {children}
  </svg>
);

/**
 * The plane's box is centered, but its ink sits up and to the right, so it's shifted
 * until the ink's center is the middle of the button. `overflow` lets the shift leave the box.
 */
export function ArrowUpIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="m18 15-6-6-6 6" />
    </Svg>
  );
}

export function ArrowDownIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function LinkIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  );
}

export function RefreshIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  );
}

export function StopIcon(props: any) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

export function SendIcon(props: any) {
  return (
    <Svg {...props} overflow="visible">
      <g transform="translate(-1.85 1.85)">
        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
        <path d="m21.854 2.147-10.94 10.939" />
      </g>
    </Svg>
  );
}

/** The icon of an action that has no `slot="icon"` child */
export function PlusIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Svg>
  );
}

export function PaperclipIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </Svg>
  );
}

export function SmilePlusIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M22 11v1a10 10 0 1 1-9-10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
      <path d="M16 5h6" />
      <path d="M19 2v6" />
    </Svg>
  );
}

export function ReplyIcon(props: any) {
  return (
    <Svg {...props}>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </Svg>
  );
}

export function PencilIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

export function TrashIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </Svg>
  );
}

export function FlagIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </Svg>
  );
}

export function PinIcon(props: any) {
  return (
    <Svg {...props}>
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M5 17h14v-1.8a2 2 0 0 0-1.1-1.8L16 12V6l1-2H7l1 2v4l-1.9 1.4A2 2 0 0 0 5 15.2z" />
    </Svg>
  );
}

export function MuteIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </Svg>
  );
}
