/* =============================================================
   Icon
   -------------------------------------------------------------
   One 24×24 stroke grid, one weight, one join. Replaces every
   emoji the product used to render as an icon — emoji change
   shape per platform, cannot inherit colour, and read as content
   to a screen reader rather than decoration.

   Icons are decorative by default (`aria-hidden`). When an icon
   IS the only content of a control, label the control, not the
   icon: <button aria-label="Notifications"><Icon name="bell" /></button>
   ============================================================= */

const PATHS = {
  /* ---- Navigation ---- */
  home: (
    <>
      <path d="M3 10.4 12 3l9 7.4" />
      <path d="M5.6 9.4V20a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9.4" />
      <path d="M9.6 21v-6.2h4.8V21" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20.2a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.4 5.2a3.2 3.2 0 0 1 0 5.8" />
      <path d="M17.4 14.5a6.2 6.2 0 0 1 3.8 5.7" />
    </>
  ),
  tasks: (
    <>
      <path d="M3.5 7.4 5.4 9.3 8.9 5.8" />
      <path d="M3.5 16.9 5.4 18.8 8.9 15.3" />
      <path d="M12.5 7.6H20.5" />
      <path d="M12.5 17.1H20.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4.6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.4H5.6A2.4 2.4 0 0 0 8 9.6" />
      <path d="M16 5.4h2.4A2.4 2.4 0 0 1 16 9.6" />
      <path d="M12 12.6v4.2" />
      <path d="M8.4 20.5h7.2" />
      <path d="M9.6 20.5c0-2 1.1-3.7 2.4-3.7s2.4 1.7 2.4 3.7" />
    </>
  ),
  history: (
    <>
      <path d="M3.4 8.3V4.4h3.9" />
      <path d="M3.6 8.2A9 9 0 1 1 3 12" />
      <path d="M12 7.6v4.8l3.4 2" />
    </>
  ),
  newspaper: (
    <>
      <path d="M4 5.6h11a1 1 0 0 1 1 1v11.9H5.5A1.5 1.5 0 0 1 4 17V5.6Z" />
      <path d="M16 8.6h2.5A1.5 1.5 0 0 1 20 10.1V17a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M7 9h6" />
      <path d="M7 12h6" />
      <path d="M7 15h3.5" />
    </>
  ),
  shield: <path d="M12 3.2 19 6v5.3c0 4.3-2.9 8-7 9.4-4.1-1.4-7-5.1-7-9.4V6l7-2.8Z" />,
  "shield-check": (
    <>
      <path d="M12 3.2 19 6v5.3c0 4.3-2.9 8-7 9.4-4.1-1.4-7-5.1-7-9.4V6l7-2.8Z" />
      <path d="m8.9 11.7 2.2 2.2 4-4.3" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  sliders: (
    <>
      <path d="M3.5 7.5h9" />
      <path d="M17 7.5h3.5" />
      <circle cx="14.8" cy="7.5" r="2.2" />
      <path d="M3.5 16.5H7" />
      <path d="M11.5 16.5h9" />
      <circle cx="9.2" cy="16.5" r="2.2" />
    </>
  ),

  /* ---- Actions ---- */
  bell: (
    <>
      <path d="M6.4 10a5.6 5.6 0 0 1 11.2 0c0 3.3.8 5.1 1.7 6.1H4.7c.9-1 1.7-2.8 1.7-6.1Z" />
      <path d="M9.9 19.4a2.4 2.4 0 0 0 4.2 0" />
    </>
  ),
  menu: (
    <>
      <path d="M3.5 7h17" />
      <path d="M3.5 12h17" />
      <path d="M3.5 17h17" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  plus: (
    <>
      <path d="M12 4.8v14.4" />
      <path d="M4.8 12h14.4" />
    </>
  ),
  minus: <path d="M4.8 12h14.4" />,
  check: <path d="m4.6 12.4 5 5L19.4 6.6" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m8 12.3 2.8 2.8 5.2-5.6" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="8.8" />,
  search: (
    <>
      <circle cx="10.7" cy="10.7" r="6.2" />
      <path d="m15.3 15.3 5.2 5.2" />
    </>
  ),
  filter: (
    <>
      <path d="M3.8 6.4h16.4" />
      <path d="M6.8 12h10.4" />
      <path d="M10 17.6h4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7.4h15" />
      <path d="M9.4 7.4V5.8a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3v1.6" />
      <path d="m6.6 7.4.9 11.2a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-11.2" />
      <path d="M10.4 11v5.4" />
      <path d="M13.6 11v5.4" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.5 19.5h3.2L19 8.2a1.7 1.7 0 0 0 0-2.4l-.8-.8a1.7 1.7 0 0 0-2.4 0L4.5 16.3Z" />
      <path d="m14.8 6.8 2.4 2.4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.8V4.4" />
      <path d="M7.6 8.8 12 4.4l4.4 4.4" />
      <path d="M4.6 15v3.5A1.5 1.5 0 0 0 6.1 20h11.8a1.5 1.5 0 0 0 1.5-1.5V15" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.4v11.4" />
      <path d="M7.6 11.4 12 15.8l4.4-4.4" />
      <path d="M4.6 17v1.5A1.5 1.5 0 0 0 6.1 20h11.8a1.5 1.5 0 0 0 1.5-1.5V17" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.6" width="17" height="14.8" rx="2" />
      <circle cx="9" cy="9.8" r="1.7" />
      <path d="m4 17.6 5.5-5.4 3.5 3.4 2.6-2.4 4.4 4" />
    </>
  ),
  paperclip: (
    <path d="M19.6 11.5 12 19.1a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5a3 3 0 0 1 4.3 4.3l-7.5 7.5a1.6 1.6 0 0 1-2.2-2.2l6.9-6.9" />
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.6" width="17" height="14.8" rx="2" />
      <path d="M3.5 10.2h17" />
      <path d="M8 3.6v4" />
      <path d="M16 3.6v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4v4.9l3.3 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M3.4 8.3V4.4h3.9" />
      <path d="M3.6 8.2A9 9 0 1 1 3 12" />
    </>
  ),
  "log-out": (
    <>
      <path d="M9.6 20.4H6.1A1.5 1.5 0 0 1 4.6 19V5a1.5 1.5 0 0 1 1.5-1.5h3.5" />
      <path d="m15 8 4 4-4 4" />
      <path d="M19 12H9.2" />
    </>
  ),
  "log-in": (
    <>
      <path d="M14.4 3.6h3.5A1.5 1.5 0 0 1 19.4 5v14a1.5 1.5 0 0 1-1.5 1.5h-3.5" />
      <path d="m9 8 4 4-4 4" />
      <path d="M13 12H3.2" />
    </>
  ),
  send: (
    <>
      <path d="M20.4 3.6 3.6 10.2l6.6 2.6 2.6 6.6Z" />
      <path d="M10.2 12.8 20.4 3.6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11.4" height="11.4" rx="2" />
      <path d="M15 6.2V5.6a2 2 0 0 0-2-2H5.6a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h.6" />
    </>
  ),
  link: (
    <>
      <path d="M9.8 14.2a3.6 3.6 0 0 0 5.1 0l3.6-3.6a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2" />
      <path d="M14.2 9.8a3.6 3.6 0 0 0-5.1 0l-3.6 3.6a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2" />
    </>
  ),
  "external-link": (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11.2 12.8" />
      <path d="M18 14.4v4.1a1.5 1.5 0 0 1-1.5 1.5H5.9a1.5 1.5 0 0 1-1.5-1.5V7.9a1.5 1.5 0 0 1 1.5-1.5H10" />
    </>
  ),
  "more-horizontal": (
    <>
      <circle cx="5.4" cy="12" r="1.35" />
      <circle cx="12" cy="12" r="1.35" />
      <circle cx="18.6" cy="12" r="1.35" />
    </>
  ),

  /* ---- Status ---- */
  "alert-triangle": (
    <>
      <path d="M10.6 4.5 3.3 17a1.6 1.6 0 0 0 1.4 2.4h14.6a1.6 1.6 0 0 0 1.4-2.4L13.4 4.5a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 9.4v4.4" />
      <path d="M12 16.7h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11.2v5.4" />
      <path d="M12 7.8h.01" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M5.8 5.8l12.4 12.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="9.8" rx="2" />
      <path d="M8 10.4V8a4 4 0 0 1 8 0v2.4" />
    </>
  ),
  key: (
    <>
      <circle cx="8.2" cy="15.8" r="3.6" />
      <path d="m10.9 13.2 8.5-8.5" />
      <path d="m15.4 8.7 2.2 2.2" />
      <path d="m17.6 6.5 2.2 2.2" />
    </>
  ),
  mail: (
    <>
      <rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2" />
      <path d="m3.6 7.4 7.5 5.2a1.6 1.6 0 0 0 1.8 0l7.5-5.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6.1 6.6 12 6.6 21.4 12 21.4 12 17.9 17.4 12 17.4 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m4 4.4 16 15.2" />
      <path d="M9.7 7.1A9.7 9.7 0 0 1 12 6.8c5.9 0 9.4 5.2 9.4 5.2a17.2 17.2 0 0 1-3 3.6" />
      <path d="M6.5 8.7A16.8 16.8 0 0 0 2.6 12S6.1 17.2 12 17.2a9.8 9.8 0 0 0 3-.5" />
      <path d="M10.2 10.4a2.6 2.6 0 0 0 3.5 3.7" />
    </>
  ),

  /* ---- Rank / medal ---- */
  medal: (
    <>
      <circle cx="12" cy="14.8" r="4.8" />
      <path d="M8.6 10.1 6.2 3.6h4.6l1.8 3.6" />
      <path d="M15.4 10.1 17.8 3.6h-4.6" />
    </>
  ),
  crown: (
    <path d="M3.6 7 7.2 11.8 12 4.6l4.8 7.2L20.4 7l-1.2 10.4a1.5 1.5 0 0 1-1.5 1.3H6.3a1.5 1.5 0 0 1-1.5-1.3L3.6 7Z" />
  ),
  star: (
    <path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.8Z" />
  ),
  sparkles: (
    <>
      <path d="m12 3.6 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4Z" />
      <path d="m18.4 14.6.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </>
  ),
  "trending-up": (
    <>
      <path d="m3.6 16.4 5.4-5.4 3.5 3.5 7.5-7.5" />
      <path d="M15 7h5v5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  zap: <path d="M13.4 3.2 5.6 13.4h5.2l-.6 7.4 7.8-10.2h-5.2l.6-7.4Z" />,

  /* ---- Members ---- */
  "user-check": (
    <>
      <circle cx="9.4" cy="8" r="3.3" />
      <path d="M3.2 20.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="m16.6 11.2 1.8 1.8 3.2-3.4" />
    </>
  ),
  "user-x": (
    <>
      <circle cx="9.4" cy="8" r="3.3" />
      <path d="M3.2 20.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="m17.2 9 4 4" />
      <path d="m21.2 9-4 4" />
    </>
  ),
  "user-plus": (
    <>
      <circle cx="9.4" cy="8" r="3.3" />
      <path d="M3.2 20.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="M19.2 8.6v4.8" />
      <path d="M16.8 11h4.8" />
    </>
  ),

  /* ---- Chevrons & arrows ---- */
  "chevron-down": <path d="m6.4 9.6 5.6 5.4 5.6-5.4" />,
  "chevron-up": <path d="m6.4 14.4 5.6-5.4 5.6 5.4" />,
  "chevron-left": <path d="M14.4 6.4 9 12l5.4 5.6" />,
  "chevron-right": <path d="M9.6 6.4 15 12l-5.4 5.6" />,
  "chevrons-up-down": (
    <>
      <path d="m7.6 9 4.4-4.2L16.4 9" />
      <path d="m7.6 15 4.4 4.2L16.4 15" />
    </>
  ),
  "arrow-up": (
    <>
      <path d="M12 19.4V4.8" />
      <path d="M6.4 10.4 12 4.8l5.6 5.6" />
    </>
  ),
  "arrow-down": (
    <>
      <path d="M12 4.6v14.6" />
      <path d="M6.4 13.6 12 19.2l5.6-5.6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M4.6 12h14.6" />
      <path d="m13.6 6.4 5.6 5.6-5.6 5.6" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19.4 12H4.8" />
      <path d="m10.4 6.4-5.6 5.6 5.6 5.6" />
    </>
  ),

  /* ---- Theme ---- */
  sun: (
    <>
      <circle cx="12" cy="12" r="3.9" />
      <path d="M12 2.8v2.2" />
      <path d="M12 19v2.2" />
      <path d="M2.8 12H5" />
      <path d="M19 12h2.2" />
      <path d="m5.5 5.5 1.6 1.6" />
      <path d="m16.9 16.9 1.6 1.6" />
      <path d="m18.5 5.5-1.6 1.6" />
      <path d="m7.1 16.9-1.6 1.6" />
    </>
  ),
  moon: <path d="M20.2 14.4A8.5 8.5 0 0 1 9.6 3.8 8.6 8.6 0 1 0 20.2 14.4Z" />,
  monitor: (
    <>
      <rect x="3.2" y="4.6" width="17.6" height="11.8" rx="2" />
      <path d="M8.4 20.4h7.2" />
      <path d="M12 16.4v4" />
    </>
  ),

  /* ---- Misc ---- */
  command: (
    <path d="M17.6 3.4a2.9 2.9 0 0 0-2.9 2.9v11.4a2.9 2.9 0 1 0 2.9-2.9H6.4a2.9 2.9 0 1 0 2.9 2.9V6.3a2.9 2.9 0 1 0-2.9 2.9h11.2a2.9 2.9 0 0 0 0-5.8Z" />
  ),
  inbox: (
    <>
      <path d="M3.6 12.6h4l1.5 3h5.8l1.5-3h4" />
      <path d="M5.4 5.7 3.7 11.4a2 2 0 0 0-.1.6v3.5A1.5 1.5 0 0 0 5.1 17h13.8a1.5 1.5 0 0 0 1.5-1.5V12a2 2 0 0 0-.1-.6l-1.7-5.7a1.5 1.5 0 0 0-1.4-1.1H6.8a1.5 1.5 0 0 0-1.4 1.1Z" />
    </>
  ),
  "book-open": (
    <>
      <path d="M12 6.6v13" />
      <path d="M12 6.6C10.6 5.3 8.6 4.6 6 4.6H3.6v12.6H6c2.6 0 4.6.7 6 2" />
      <path d="M12 6.6c1.4-1.3 3.4-2 6-2h2.4v12.6H18c-2.6 0-4.6.7-6 2" />
    </>
  ),
  hash: (
    <>
      <path d="M4.4 9.4h15.2" />
      <path d="M4.4 14.6h15.2" />
      <path d="M10.4 3.8 8.8 20.2" />
      <path d="M15.2 3.8 13.6 20.2" />
    </>
  ),
  spinner: <path d="M12 3.2a8.8 8.8 0 1 0 8.8 8.8" />,
  github: (
    <path d="M9.4 20.6v-2.9c-3 .6-3.7-1.4-3.7-1.4-.5-1.2-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2.9a2.5 2.5 0 0 1 .7-1.6c-2.4-.3-4.9-1.2-4.9-5.4a4.2 4.2 0 0 1 1.1-2.9 3.9 3.9 0 0 1 .1-2.9s.9-.3 3 1.1a7.4 7.4 0 0 1 3.9 0c2.1-1.4 3-1.1 3-1.1a3.9 3.9 0 0 1 .1 2.9 4.2 4.2 0 0 1 1.1 2.9c0 4.2-2.5 5.1-4.9 5.4a2.8 2.8 0 0 1 .8 2.1v3.9" />
  ),
};

/**
 * @param {object} props
 * @param {keyof typeof PATHS} props.name
 * @param {number} [props.size]  Rendered box in px. 16 inline, 18 in controls, 20+ for feature icons.
 * @param {number} [props.strokeWidth]  Bump to 2 for very small sizes so strokes stay visible.
 * @param {string} [props.title]  Only for an icon that carries meaning nothing else conveys.
 */
export function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  className,
  title,
  ...rest
}) {
  const content = PATHS[name];

  if (!content) {
    if (import.meta.env.DEV) {
      console.warn(`<Icon /> has no glyph named "${name}"`);
    }
    return null;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {content}
    </svg>
  );
}

export default Icon;
