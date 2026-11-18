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

export const MoreIcon = (props: any) =>
  Icon(props, [<circle cx="12" cy="12" r="1" />, <circle cx="19" cy="12" r="1" />, <circle cx="5" cy="12" r="1" />]);

export const CodeIcon = (props: any) =>
  Icon(props, [<polyline points="16 18 22 12 16 6" />, <polyline points="8 6 2 12 8 18" />]);

export const QuoteIcon = (props: any) =>
  Icon(props, [
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />,
    <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />,
  ]);

export const ParamIcon = (props: any) =>
  Icon(props, [
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />,
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />,
  ]);

export const TemplatesIcon = (props: any) =>
  Icon(props, [
    <rect width="18" height="7" x="3" y="3" rx="1" />,
    <rect width="9" height="7" x="3" y="14" rx="1" />,
    <rect width="5" height="7" x="16" y="14" rx="1" />,
  ]);

export const TocIcon = (props: any) =>
  Icon(props, [
    <line x1="3" x2="11" y1="6" y2="6" />,
    <line x1="7" x2="15" y1="12" y2="12" />,
    <line x1="11" x2="21" y1="18" y2="18" />,
  ]);

export const TableIcon = (props: any) =>
  Icon(props, [
    <rect width="18" height="18" x="3" y="3" rx="2" />,
    <path d="M3 9h18" />,
    <path d="M3 15h18" />,
    <path d="M9 3v18" />,
    <path d="M15 3v18" />,
  ]);

export const TableRowsIcon = (props: any) =>
  Icon(props, [<rect width="18" height="18" x="3" y="3" rx="2" />, <path d="M3 9h18" />, <path d="M3 15h18" />]);

export const TableColumnsIcon = (props: any) =>
  Icon(props, [<rect width="18" height="18" x="3" y="3" rx="2" />, <path d="M9 3v18" />, <path d="M15 3v18" />]);

export const TableHeaderIcon = (props: any) =>
  Icon(props, [<rect width="18" height="18" x="3" y="3" rx="2" />, <path d="M3 9h18" />, <path d="M3 3v6h18" />]);

export const TableDeleteIcon = (props: any) =>
  Icon(props, [
    <path d="M3 6h18" />,
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />,
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  ]);

export const SeparatorIcon = (props: any) => Icon(props, [<path d="M5 12h14" />]);

export const IndentIcon = (props: any) =>
  Icon(props, [
    <polyline points="3 8 7 12 3 16" />,
    <line x1="21" x2="11" y1="6" y2="6" />,
    <line x1="21" x2="11" y1="12" y2="12" />,
    <line x1="21" x2="11" y1="18" y2="18" />,
  ]);

export const OutdentIcon = (props: any) =>
  Icon(props, [
    <polyline points="7 8 3 12 7 16" />,
    <line x1="21" x2="11" y1="6" y2="6" />,
    <line x1="21" x2="11" y1="12" y2="12" />,
    <line x1="21" x2="11" y1="18" y2="18" />,
  ]);

export const LineHeightIcon = (props: any) =>
  Icon(props, [
    <line x1="3" x2="21" y1="4" y2="4" />,
    <line x1="3" x2="21" y1="20" y2="20" />,
    <line x1="12" x2="12" y1="8" y2="16" />,
    <polyline points="9 10 12 7 15 10" />,
    <polyline points="9 14 12 17 15 14" />,
  ]);

export const TaskListIcon = (props: any) =>
  Icon(props, [
    <path d="m3 17 2 2 4-4" />,
    <path d="m3 7 2 2 4-4" />,
    <path d="M13 6h8" />,
    <path d="M13 12h8" />,
    <path d="M13 18h8" />,
  ]);

export const BlockTypeIcon = (props: any) =>
  Icon(props, [
    <polyline points="4 7 4 4 20 4 20 7" />,
    <line x1="9" x2="15" y1="20" y2="20" />,
    <line x1="12" x2="12" y1="4" y2="20" />,
  ]);

export const ListStyleIcon = (props: any) =>
  Icon(props, [
    <line x1="9" x2="21" y1="6" y2="6" />,
    <line x1="9" x2="21" y1="12" y2="12" />,
    <line x1="9" x2="21" y1="18" y2="18" />,
    <circle cx="4" cy="6" r="1.5" fill="currentColor" />,
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />,
    <circle cx="4" cy="18" r="1.5" fill="currentColor" />,
  ]);

export const CodeLanguageIcon = (props: any) =>
  Icon(props, [<polyline points="4 17 10 11 4 5" />, <line x1="12" x2="20" y1="19" y2="19" />]);

export const FontFamilyIcon = (props: any) =>
  Icon(props, [<path d="M4 20 9 6l5 14" />, <path d="M6.2 15h5.6" />, <path d="M16 12h5" />, <path d="M18.5 9v9" />]);

export const FontSizeIcon = (props: any) =>
  Icon(props, [<path d="m3 16 4-9 4 9" />, <path d="M4.5 13h5" />, <path d="M17 14V7" />, <path d="m14 10 3-3 3 3" />]);

export const ColorIcon = (props: any) =>
  Icon(props, [<path d="M4 20h16" />, <path d="m6 16 6-12 6 12" />, <path d="M8 12h8" />]);

export const BackgroundIcon = (props: any) =>
  Icon(props, [
    <path d="m9 11-6 6v3h9l3-3" />,
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />,
  ]);

export const SpecialCharacterIcon = (props: any) =>
  Icon(props, [<path d="M3 20h5.5c-1.6-1.2-3-3.4-3-7a7.5 7.5 0 1 1 15 0c0 3.6-1.4 5.8-3 7H21" />]);

export const EmojiIcon = (props: any) =>
  Icon(props, [
    <circle cx="12" cy="12" r="10" />,
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />,
    <line x1="9" x2="9.01" y1="9" y2="9" />,
    <line x1="15" x2="15.01" y1="9" y2="9" />,
  ]);

export const ClearFormattingIcon = (props: any) =>
  Icon(props, [
    <path d="M4 7V4h16v3" />,
    <path d="M5 20h6" />,
    <path d="M13 4 8 20" />,
    <path d="m15 15 5 5" />,
    <path d="m20 15-5 5" />,
  ]);
