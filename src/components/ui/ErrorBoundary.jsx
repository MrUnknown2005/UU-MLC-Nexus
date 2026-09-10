import { Component, createRef } from "react";
import { Button } from "./Button.jsx";
import { Icon } from "./Icon.jsx";

/**
 * Last line of defence for a render-time crash.
 *
 * Without this a single thrown error inside any page unmounts the whole tree
 * and leaves a blank white document with no way back — the worst possible
 * failure mode, because it looks like the app simply stopped existing.
 *
 * Two placements: the default full-screen boundary wraps the whole app in
 * main.jsx, and an `inline` variant wraps each dashboard page so one tab's
 * crash stays contained and the surrounding nav shell keeps working.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.headingRef = createRef();
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as console output on purpose: there is no error-reporting service
    // wired up, and swallowing it silently would make triage impossible.
    console.error("Unhandled error in Nexus UI", error, info?.componentStack);
  }

  componentDidUpdate(prevProps, prevState) {
    // Move focus to the fallback heading the instant a crash swaps the page
    // out, so keyboard and screen-reader users land on the recovery UI instead
    // of being stranded on a control that just unmounted. role="alert" on the
    // panel announces the message in parallel (WCAG 4.1.3 / 2.4.3).
    if (!prevState.error && this.state.error) {
      this.headingRef.current?.focus();
    }
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    // `inline` scopes the fallback to the region it wraps (see Dashboard): the
    // surrounding nav shell stays mounted, so a crash in one tab does not black
    // out the whole app. It also drops the heading to an <h2> to keep the
    // single-<h1> page structure intact. The default (outermost, in main.jsx)
    // is the full-screen last resort.
    const inline = this.props.inline;
    const Heading = inline ? "h2" : "h1";

    const card = (
      <div role="alert" className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
          <Icon name="alert-triangle" size={22} />
        </span>

        <Heading
          ref={this.headingRef}
          tabIndex={-1}
          className="nx-display mt-5 text-xl outline-none"
        >
          Something broke on this screen
        </Heading>

        <p className="mt-2 text-sm text-ink-muted">
          The rest of your data is safe. Reloading usually clears it — if it
          keeps happening, send this message to an administrator.
        </p>

        <pre className="nx-well mt-5 max-h-40 overflow-auto px-3 py-2.5 text-left font-mono text-[0.75rem] whitespace-pre-wrap text-ink-muted">
          {error.message || String(error)}
        </pre>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            variant="primary"
            icon="refresh"
            onClick={() => window.location.reload()}
          >
            Reload Nexus
          </Button>
          <Button
            variant="ghost"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      </div>
    );

    return (
      <div
        className={
          inline
            ? "grid min-h-[50vh] place-items-center px-5 py-12"
            : "grid min-h-dvh place-items-center bg-canvas px-5 py-16"
        }
      >
        {card}
      </div>
    );
  }
}

export default ErrorBoundary;
