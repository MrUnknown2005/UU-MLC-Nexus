import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button.jsx";
import { ConfirmContext } from "./confirm-context.js";
import { Icon } from "./Icon.jsx";
import { Modal } from "./Modal.jsx";
import { TextInput } from "./TextInput.jsx";

/**
 * Confirmation host.
 *
 * Replaces `window.confirm()`. Beyond styling, this buys three things the
 * native dialog cannot: it can spell out the consequences, it can demand the
 * member type a phrase before a wipe is possible, and it is one dialog instead
 * of the two stacked confirms the destructive actions used to chain — which
 * trained people to click through both without reading either.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const [typed, setTyped] = useState("");
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        // A second request while one is open would orphan the first promise.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setTyped("");
        setRequest(options);
      }),
    []
  );

  const settle = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    setTyped("");
    resolve?.(result);
  }, []);

  // An unmount mid-dialog must not leave the caller awaiting forever.
  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    []
  );

  const isDanger = request?.tone === "danger";
  const gate = request?.requireText;
  const gateSatisfied = !gate || typed.trim() === gate;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Modal
        open={Boolean(request)}
        onClose={() => settle(false)}
        title={request?.title}
        description={request?.description}
        size="sm"
        // A wipe must be answered, not dismissed by a stray Escape.
        dismissible={!gate}
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {request?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={isDanger ? "danger" : "primary"}
              disabled={!gateSatisfied}
              onClick={() => settle(true)}
              data-autofocus={gate ? undefined : ""}
            >
              {request?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {request?.consequences?.length > 0 && (
          <ul className="mb-4 space-y-2">
            {request.consequences.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[0.8125rem]">
                <Icon
                  name={isDanger ? "trash" : "arrow-right"}
                  size={13}
                  className={`mt-1 shrink-0 ${isDanger ? "text-danger" : "text-ink-subtle"}`}
                />
                <span className="text-ink-muted">{line}</span>
              </li>
            ))}
          </ul>
        )}

        {gate && (
          <TextInput
            label={`Type ${gate} to continue`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={gate}
            data-autofocus=""
          />
        )}

        {isDanger && !gate && !request?.consequences?.length && (
          <p className="text-[0.8125rem] text-ink-muted">
            This action cannot be undone from the app.
          </p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
