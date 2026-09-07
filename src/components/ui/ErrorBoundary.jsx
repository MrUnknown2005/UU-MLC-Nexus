import { Component } from "react";
import { Button } from "./Button.jsx";
import { Icon } from "./Icon.jsx";

/**
 * Last line of defence for a render-time crash.
 *
 * Without this a single thrown error inside any page unmounts the whole tree
 * and leaves a blank white document with no way back — the worst possible
 * failure mode, because it looks like the app simply stopped existing.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as console output on purpose: there is no error-reporting service
    // wired up, and swallowing it silently would make triage impossible.
    console.error("Unhandled error in Nexus UI", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    const message = error.message || String(error);

    // Page-scoped boundary: the shell and its navigation are still mounted
    // above this one, so the fallback stays inside the content area and offers
    // a retry instead of taking over the whole viewport.
    if (this.props.inline) {
      return (
        <div className="rounded-card border border-line bg-surface px-5 py-12 text-center">
          <div className="mx-auto w-full max-w-sm">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
              <Icon name="alert-triangle" size={20} />
            </span>

            <h2 className="nx-display mt-4 text-lg">This page hit an error</h2>

            <p className="mt-2 text-[0.8125rem] text-ink-muted">
              The rest of Nexus is still working — switch to another tab, or try
              this page again. If it keeps happening, tell an administrator.
            </p>

            <pre className="nx-well mt-4 max-h-32 overflow-auto px-3 py-2 text-left font-mono text-[0.6875rem] whitespace-pre-wrap text-ink-muted">
              {message}
            </pre>

            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
            <Icon name="alert-triangle" size={22} />
          </span>

          <h1 className="nx-display mt-5 text-xl">Something broke on this screen</h1>

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
      </div>
    );
  }
}

export default ErrorBoundary;
