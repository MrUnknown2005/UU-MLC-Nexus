import { useId } from "react";
import { Icon } from "./Icon.jsx";
import { cn } from "../../lib/cn.js";

const SIZES = {
  sm: "h-9 px-3 text-[0.8125rem] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
};

/**
 * A file picker that looks like a button.
 *
 * `<input type="file">` cannot be styled, so the real input is visually hidden
 * inside the `<label>` and a styled span stands in for it. The label keeps the
 * click and the accessible name, and `peer-focus-visible` moves the focus ring
 * onto the visible element — a keyboard user needs to see where they are.
 *
 * Pass `inputRef` when the caller has to clear the selection: assigning
 * `input.value = ""` is the only way to make the same file fire `change` twice.
 */
export function FileButton({
  id: providedId,
  label = "Choose a file",
  hint,
  accept,
  multiple = false,
  disabled = false,
  icon = "upload",
  size = "md",
  inputRef,
  onChange,
  className,
}) {
  const autoId = useId();
  const id = providedId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="inline-flex cursor-pointer">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onChange}
          aria-describedby={hintId}
          className="nx-file peer"
        />
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-control whitespace-nowrap",
            "border border-line-strong bg-surface-2 font-medium text-ink",
            "transition-colors hover:border-brand-line hover:bg-surface-3",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas",
            "peer-disabled:pointer-events-none peer-disabled:opacity-50",
            SIZES[size]
          )}
        >
          <Icon name={icon} size={size === "sm" ? 15 : 17} />
          {label}
        </span>
      </label>

      {hint && (
        <p id={hintId} className="mt-1.5 text-[0.75rem] text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export default FileButton;
