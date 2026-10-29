/**
 * Toolbar icons for `orb-rich-text`, in the same Lucide style as
 * `utils/icons`. They live here instead of the shared icon file so other
 * components don't load them.
 */

function Icon(props: any, children: any) {
  return (
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
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const UndoIcon = (props: any) =>
  Icon(props, [<path d="M9 14 4 9l5-5" />, <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />]);

export const RedoIcon = (props: any) =>
  Icon(props, [<path d="m15 14 5-5-5-5" />, <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />]);

export const BoldIcon = (props: any) =>
  Icon(props, [<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />]);

export const ItalicIcon = (props: any) =>
  Icon(props, [
    <line x1="19" x2="10" y1="4" y2="4" />,
    <line x1="14" x2="5" y1="20" y2="20" />,
    <line x1="15" x2="9" y1="4" y2="20" />,
  ]);

export const UnderlineIcon = (props: any) =>
  Icon(props, [<path d="M6 4v6a6 6 0 0 0 12 0V4" />, <line x1="4" x2="20" y1="20" y2="20" />]);

export const StrikethroughIcon = (props: any) =>
  Icon(props, [
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />,
    <path d="M14 12a4 4 0 0 1 0 8H6" />,
    <line x1="4" x2="20" y1="12" y2="12" />,
  ]);

export const Heading1Icon = (props: any) =>
  Icon(props, [
    <path d="M4 12h8" />,
    <path d="M4 18V6" />,
    <path d="M12 18V6" />,
    <path d="m17 12 3-2v8" />,
  ]);

export const Heading2Icon = (props: any) =>
  Icon(props, [
    <path d="M4 12h8" />,
    <path d="M4 18V6" />,
    <path d="M12 18V6" />,
    <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />,
  ]);

export const ParagraphIcon = (props: any) =>
  Icon(props, [<path d="M13 4v16" />, <path d="M17 4v16" />, <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />]);

export const OrderedListIcon = (props: any) =>
  Icon(props, [
    <path d="M10 12h11" />,
    <path d="M10 18h11" />,
    <path d="M10 6h11" />,
    <path d="M4 10h2" />,
    <path d="M4 6h1v4" />,
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />,
  ]);

export const UnorderedListIcon = (props: any) =>
  Icon(props, [
    <path d="M3 12h.01" />,
    <path d="M3 18h.01" />,
    <path d="M3 6h.01" />,
    <path d="M8 12h13" />,
    <path d="M8 18h13" />,
    <path d="M8 6h13" />,
  ]);

export const AlignLeftIcon = (props: any) =>
  Icon(props, [<path d="M15 12H3" />, <path d="M17 18H3" />, <path d="M21 6H3" />]);

export const AlignCenterIcon = (props: any) =>
  Icon(props, [<path d="M17 12H7" />, <path d="M19 18H5" />, <path d="M21 6H3" />]);

export const AlignRightIcon = (props: any) =>
  Icon(props, [<path d="M21 12H9" />, <path d="M21 18H7" />, <path d="M21 6H3" />]);

export const AlignJustifyIcon = (props: any) =>
  Icon(props, [<path d="M3 12h18" />, <path d="M3 18h18" />, <path d="M3 6h18" />]);

export const LinkIcon = (props: any) =>
  Icon(props, [
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />,
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  ]);

export const ImageIcon = (props: any) =>
  Icon(props, [
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />,
    <circle cx="9" cy="9" r="2" />,
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />,
  ]);

export const ClearFormattingIcon = (props: any) =>
  Icon(props, [
    <path d="M4 7V4h16v3" />,
    <path d="M5 20h6" />,
    <path d="M13 4 8 20" />,
    <path d="m15 15 5 5" />,
    <path d="m20 15-5 5" />,
  ]);
