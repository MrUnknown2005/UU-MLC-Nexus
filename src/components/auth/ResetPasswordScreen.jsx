import { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { PasswordInput } from "../ui/TextInput.jsx";
import { useToast } from "../ui/toast-context.js";
import { updatePassword } from "../../services/authService";

/**
 * Shown when Supabase signs the tab in from a recovery email link.
 *
 * That session is a live, authenticated session — so this screen has to come
 * *before* the dashboard in App's routing, or a recovery link would silently
 * drop the member into the app without ever letting them set a password.
 */
export default function ResetPasswordScreen({ onDone, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (event) => {
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

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    toast.success("Password updated", {
      description: "You're signed in with your new password.",
    });

    await onDone();
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="This link signed you in once. Set a password to keep the account."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
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

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-[0.8125rem] text-danger"
          >
            <Icon name="alert-triangle" size={15} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

        <Button variant="ghost" fullWidth onClick={onCancel}>
          Cancel and sign out
        </Button>
      </form>
    </AuthLayout>
  );
}
