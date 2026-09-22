import { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { TextInput, PasswordInput } from "../ui/TextInput.jsx";
import { useToast } from "../ui/toast-context.js";
import {
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
} from "../../services/authService";

/**
 * In-app password reset by one-time code.
 *
 * The old flow emailed a magic link, which is a dead end inside the packaged
 * Android app: an email link opens the phone's external browser, not this
 * WebView, so the recovery session never reaches the app. Instead we email a
 * 6-digit code (Supabase's `{{ .Token }}`), the member types it here, and we
 * verify it in place — no browser hop, identical on web and native.
 *
 * Three linear steps: request (send code) → verify (enter code) → set (new
 * password). verifyOtp establishes a real session, so this whole flow is
 * mounted *above* App's session routing (otherwise the moment the code
 * verifies, the app would route to the dashboard / "no profile yet"). Splitting
 * verify and set also means the single-use OTP is consumed only at the verify
 * step, so a failed password update is retried from the set step without
 * burning the code.
 *
 * `entry === "link"` starts at the set step: a web recovery link has already
 * signed the tab in, and only a new password is left to choose.
 */
export default function PasswordResetFlow({
  entry = "otp",
  initialEmail = "",
  onComplete,
  onExit,
}) {
  const [step, setStep] = useState(entry === "link" ? "set" : "request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // request → send the code
  const sendCode = async (event) => {
    event.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email you signed up with.");
      return;
    }

    setBusy(true);
    try {
      const { error: resetError } = await requestPasswordReset(trimmed);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setEmail(trimmed);
      setCode("");
      setStep("verify");
    } catch (err) {
      setError(err?.message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // verify → check the code (this also signs the tab in)
  const verifyCode = async (event) => {
    event.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }

    setBusy(true);
    try {
      const { error: verifyError } = await verifyPasswordResetCode({
        email: email.trim(),
        token: code,
      });
      if (verifyError) {
        setError("That code is invalid or has expired. Request a new one.");
        return;
      }
      setStep("set");
    } catch (err) {
      setError(err?.message || "Couldn't verify the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // verify → send a fresh code without leaving the step
  const resend = async () => {
    setError("");
    setBusy(true);
    try {
      const { error: resetError } = await requestPasswordReset(email.trim());
      if (resetError) {
        setError(resetError.message);
        return;
      }
      toast.success("Code sent", {
        description: `A fresh code is on its way to ${email.trim()}.`,
      });
    } catch (err) {
      setError(err?.message || "Couldn't resend the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const backToRequest = () => {
    setError("");
    setStep("request");
  };

  // set → choose the new password (a recovery session already exists here)
  const savePassword = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError.message);
        setBusy(false);
        return;
      }

      toast.success("Password updated", {
        description: "You're signed in with your new password.",
      });

      await onComplete();
      // No setBusy(false) on success: onComplete() reloads the session, which
      // unmounts this screen — the button never gets a chance to spin idle.
    } catch (err) {
      // A thrown update (network drop) or a rejected onComplete must never leave
      // the button stuck spinning. The OTP was already consumed at the verify
      // step, so retrying here re-runs only updateUser on the still-valid
      // recovery session. (M-6)
      console.error("Password reset error:", err);
      setError(
        err?.message ?? "Something went wrong updating your password. Try again."
      );
      setBusy(false);
    }
  };

  if (step === "request") {
    return (
      <AuthLayout
        onBack={onExit}
        title="Reset your password"
        subtitle="We'll email you a 6-digit code to set a new one."
      >
        <form onSubmit={sendCode} className="space-y-4" noValidate>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            icon="mail"
            required
          />

          <Notice>{error}</Notice>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={busy}
            icon="send"
          >
            Send code
          </Button>

          <Button variant="ghost" fullWidth onClick={onExit}>
            Back to sign in
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === "verify") {
    return (
      <AuthLayout
        onBack={backToRequest}
        title="Enter your code"
        subtitle={`If an account exists for ${email.trim()}, a 6-digit code is on its way. It expires in one hour.`}
      >
        <form onSubmit={verifyCode} className="space-y-4" noValidate>
          <TextInput
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            icon="key"
            required
          />

          <Notice>{error}</Notice>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={busy}
            iconRight="arrow-right"
          >
            Verify code
          </Button>

          <div className="flex items-center justify-between text-[0.8125rem]">
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={backToRequest}
              className="text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
            >
              Change email
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // step === "set"
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Set a password to finish and sign in."
    >
      <form onSubmit={savePassword} className="space-y-4" noValidate>
        <PasswordInput
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Type it once more"
          autoComplete="new-password"
          error={confirm && confirm !== password ? "Doesn't match." : undefined}
          required
        />

        <Notice>{error}</Notice>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={busy}
          icon="key"
        >
          Save new password
        </Button>

        <Button variant="ghost" fullWidth onClick={onExit}>
          Cancel and sign out
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Inline status/error banner — mirrors the one in AuthScreen. */
function Notice({ tone = "danger", children }) {
  if (!children) return null;

  const isError = tone === "danger";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-[0.8125rem] text-danger"
          : "flex items-start gap-2 rounded-control border border-success-line bg-success-soft px-3 py-2.5 text-[0.8125rem] text-success"
      }
    >
      <Icon
        name={isError ? "alert-triangle" : "check-circle"}
        size={15}
        className="mt-px shrink-0"
      />
      <span>{children}</span>
    </div>
  );
}
