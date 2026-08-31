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
