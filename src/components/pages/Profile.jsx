import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { FileButton } from "../ui/FileButton.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { StatCard } from "../ui/StatCard.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput, PasswordInput } from "../ui/TextInput.jsx";
import { useToast } from "../ui/toast-context.js";
import { useConfirm } from "../ui/confirm-context.js";
import { changePassword, deleteOwnAccount } from "../../services/authService";
import { roleLabel } from "../../lib/roles.js";
import { formatDate, formatNumber, ordinal } from "../../lib/format.js";

/**
 * Your own profile — the one page where a member edits their own record.
 *
 * The view/edit split is kept, because reading your profile and rewriting it are
 * different jobs, but the editor is now a real form: labelled fields instead of
 * placeholder-only inputs, a submit button that reports progress, and an error
 * that stays on screen next to the thing that failed.
 *
 * Feedback used to be a single `message` string doing four jobs at once — upload
 * validation, upload failure, save failure and save success all rendered in the
 * same yellow pill, which meant "Upload failed" looked exactly like "Profile
 * saved successfully." Outcomes now go to toasts, and only a save failure stays
 * pinned in the form, where a retry is.
 *
 * The avatar pipeline is unchanged and deliberately so: upload to a fixed path,
 * cache-bust the public URL, write it to the profile, then sweep any older files
 * left in the member's folder. The cache-bust matters — the path never changes,
 * so without it the browser keeps showing last week's face.
 */
function Profile({ profile, reloadProfile, onLogAction }) {
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [statsLoading, setStatsLoading] = useState(true);
  const [profileStats, setProfileStats] = useState({
    rank: null,
    totalMembers: 0,
    pointEntries: 0,
    completedClubTasks: 0,
  });

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const filePath = `${profile.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);

        toast.error("Upload failed", { description: uploadError.message });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (!publicUrl) {
        toast.error("The image uploaded, but no public URL was returned.");
        return;
      }

      // The storage path is fixed, so the URL is identical every time. Without a
      // cache-buster the browser would keep serving the previous picture.
      const finalUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalUrl,
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Avatar profile update error:", profileError);

        toast.error("Image uploaded, but the profile update failed", {
          description: profileError.message,
        });
        return;
      }

      setAvatarUrl(finalUrl);

      // Sweep anything left over from older uploads that used a different name.
      // A failure here is logged and swallowed on purpose: the new picture is
      // already live, and an orphaned file is not the member's problem.
      const { data: oldFiles, error: listError } = await supabase.storage
        .from("avatars")
        .list(profile.id);

      if (listError) {
        console.error("Avatar cleanup list error:", listError);
      } else if (oldFiles && oldFiles.length > 0) {
        const filesToDelete = oldFiles
          .filter((item) => item.name !== "avatar")
          .map((item) => `${profile.id}/${item.name}`);

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("avatars")
            .remove(filesToDelete);

          if (deleteError) {
            console.error("Old avatar cleanup error:", deleteError);
          }
        }
      }

      toast.success("Profile picture updated successfully.");

      if (onLogAction) {
        await onLogAction({
          action: "PROFILE_PICTURE_UPDATED",
          targetUserId: profile.id,
          details: "Updated profile picture.",
        });
      }

      await reloadProfile();
    } catch (unexpected) {
      console.error("Unexpected avatar error:", unexpected);

      toast.error("Something went wrong while changing the profile picture.");
    } finally {
      setSaving(false);
      // Clearing the input is what lets the same file fire `change` twice —
      // otherwise a failed upload cannot be retried with the same picture.
      event.target.value = "";
    }
  };

  const resetEdits = () => {
    setFullName(profile.full_name || "");
    setNickname(profile.nickname || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
    setError("");
    setEditMode(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    toast.success("Profile saved successfully.");

    if (onLogAction) {
      await onLogAction({
        action: "PROFILE_UPDATED",
        targetUserId: profile.id,
        details: "Updated profile name, nickname, bio, or avatar settings.",
      });
    }

    await reloadProfile();

    setEditMode(false);
    setSaving(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfileStats = async () => {
      const [memberResult, pointResult, todoResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, points")
          .neq("role", "guest")
          .eq("is_active", true)
          .order("points", {
            ascending: false,
          }),

        supabase
          .from("point_history")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("member_id", profile.id),

        supabase
          .from("todos")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("completed", true),
      ]);

      if (cancelled) {
        return;
      }

      const activeMembers = memberResult.data || [];

      const rank =
        activeMembers.findIndex((member) => member.id === profile.id) + 1;

      setProfileStats({
        rank: rank > 0 ? rank : null,
        totalMembers: activeMembers.length,
        pointEntries: pointResult.count || 0,
        completedClubTasks: todoResult.count || 0,
      });
      setStatsLoading(false);
    };

    loadProfileStats();

    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.points, profile.role, profile.is_active]);

  const joinDate = profile.created_at
    ? formatDate(profile.created_at)
    : "Unknown";

  const name = profile.nickname || profile.full_name || "UU MLC Member";

  // Shown only when the nickname is doing the talking and the legal name adds
  // something — repeating the same string twice is noise.
  const showFullName =
    profile.nickname &&
    profile.full_name &&
    profile.nickname !== profile.full_name;

  return (
    <div className="space-y-5">
      <section className="nx-panel p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <Avatar
            size="2xl"
            ring
            src={avatarUrl}
            name={name}
            seed={profile.id}
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <p className="nx-eyebrow">Member Profile</p>

            <h1 className="nx-display mt-2 truncate text-[1.75rem] md:text-[2.5rem]">
              {name}
            </h1>

            {showFullName && (
              <p className="mt-1 truncate text-sm text-ink-muted">
                {profile.full_name}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="brand" icon="shield">
                {roleLabel(profile.role)}
              </Badge>

              <Badge tone="violet" icon="trophy">
                {formatNumber(profile.points ?? 0)} points
              </Badge>

              <Badge tone="info" icon="medal">
                {profileStats.rank ? `Rank #${profileStats.rank}` : "Rank —"}
              </Badge>

              <Badge tone="neutral" icon="calendar">
                Joined {joinDate}
              </Badge>
            </div>
          </div>

          {!editMode && (
            <Button
              variant="primary"
              icon="pencil"
              className="shrink-0"
              onClick={() => {
                setError("");
                setEditMode(true);
              }}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Points"
          value={formatNumber(profile.points ?? 0)}
          hint="Current club points"
          icon="trophy"
          tone="brand"
        />

        <StatCard
          label="Current Rank"
          value={profileStats.rank ? ordinal(profileStats.rank) : "—"}
          hint={`Of ${formatNumber(profileStats.totalMembers)} active members`}
          icon="medal"
          tone="info"
          loading={statsLoading}
        />

        <StatCard
          label="Point Entries"
          value={formatNumber(profileStats.pointEntries)}
          hint="Recorded point changes"
          icon="history"
          tone="violet"
          loading={statsLoading}
        />

        <StatCard
          label="Club Tasks Done"
          value={formatNumber(profileStats.completedClubTasks)}
          hint="Completed across the club"
          icon="check-circle"
          tone="success"
          loading={statsLoading}
        />
      </section>

      <Panel
        eyebrow="Membership"
        title="Account"
        icon="user-check"
        bodyClassName="grid gap-3 sm:grid-cols-2"
      >
        <div className="nx-well p-4">
          <p className="nx-eyebrow">Joined</p>
          <p className="mt-1.5 font-semibold">{joinDate}</p>
        </div>

        <div className="nx-well p-4">
          <p className="nx-eyebrow">Status</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-success">
            <Icon name="check-circle" size={15} />
            Active
          </p>
        </div>
      </Panel>

      <PasswordPanel onLogAction={onLogAction} profileId={profile.id} />

      {!editMode ? (
        <Panel eyebrow="About" title="Bio" icon="book-open">
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <p
              className={
                profile.bio
                  ? "text-sm leading-relaxed whitespace-pre-wrap text-ink-muted"
                  : "text-sm leading-relaxed text-ink-subtle italic"
              }
            >
              {profile.bio ||
                "Add a short introduction about yourself, your interests, or what you work on in the club."}
            </p>

            <div className="nx-well p-4">
              <p className="nx-eyebrow">Profile picture</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                Click Edit Profile to upload a new picture.
              </p>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel eyebrow="Edit Profile" title="Your Information" icon="pencil">
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                disabled={saving}
              />

              <TextInput
                label="Nickname"
                hint="What the club calls you. Used everywhere your name appears."
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                autoComplete="nickname"
                disabled={saving}
              />
            </div>

            <TextArea
              label="Bio"
              hint="Shown on your card in the member directory."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={5}
              disabled={saving}
            />

            <div className="nx-well p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar
                  size="lg"
                  src={avatarUrl}
                  name={name}
                  seed={profile.id}
                />

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Profile Picture</p>
                  <p className="mt-1 text-[0.75rem] text-ink-subtle">
                    Maximum 5 MB. A new picture is saved as soon as you choose
                    it — you do not need to submit the form for it.
                  </p>
                </div>

                <FileButton
                  label="Change picture"
                  size="sm"
                  accept="image/*"
                  icon="image"
                  disabled={saving}
                  onChange={uploadAvatar}
                />
              </div>
            </div>

            {/* Stays put rather than fading away: this is the one message that
                means "nothing was saved, try again". */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-[0.8125rem] text-danger"
              >
                <Icon name="alert-triangle" size={15} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <Button
                type="submit"
                variant="primary"
                icon="check"
                loading={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={resetEdits}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <DangerZonePanel />
    </div>
  );
}

/**
 * Change-password panel for the signed-in member.
 *
 * Kept as its own component with its own state so Profile's larger edit form
 * doesn't grow four more fields it has to reset. The heavy lifting — verifying
 * the current password before setting the new one — lives in
 * authService.changePassword; this is just the form around it.
 */
function PasswordPanel({ onLogAction, profileId }) {
  const { toast } = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("Your new password needs at least 8 characters.");
      return;
    }
    if (next === current) {
      setError("Your new password must be different from the current one.");
      return;
    }
    if (next !== confirm) {
      setError("Those two new passwords don't match.");
      return;
    }

    setSaving(true);

    const { error: changeError } = await changePassword({
      currentPassword: current,
      newPassword: next,
    });

    if (changeError) {
      setError(changeError.message);
      setSaving(false);
      return;
    }

    toast.success("Password changed", {
      description: "Use your new password next time you sign in.",
    });

    // Best-effort audit trail. Never records the password itself — only that a
    // change happened, and by whom.
    if (onLogAction) {
      await onLogAction({
        action: "PASSWORD_CHANGED",
        targetUserId: profileId,
        details: "Changed their account password.",
      });
    }

    reset();
    setSaving(false);
  };

  return (
    <Panel eyebrow="Security" title="Password" icon="key">
      <form onSubmit={submit} className="max-w-md space-y-4">
        <PasswordInput
          label="Current password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          placeholder="Your current password"
          autoComplete="current-password"
          disabled={saving}
          required
        />

        <PasswordInput
          label="New password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          disabled={saving}
          required
        />

        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Type the new password again"
          autoComplete="new-password"
          error={confirm && confirm !== next ? "Doesn't match." : undefined}
          disabled={saving}
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

        <Button type="submit" variant="primary" icon="check" loading={saving}>
          {saving ? "Changing..." : "Change password"}
        </Button>
      </form>
    </Panel>
  );
}

/**
 * Danger zone — permanent, self-service account deletion.
 *
 * The heaviest action a member can take on their own record, so it carries the
 * two gates the app reserves for destructive work: the current password is
 * re-verified (a live session alone must not be able to erase the account —
 * see authService.deleteOwnAccount), and the shared typed-phrase confirm dialog
 * spells out exactly what disappears before it enables the button.
 *
 * The erasure and the farewell email happen server-side in the
 * `delete_own_account` RPC; on success the session signs out, which returns the
 * app to the login screen — so there is no success state to render here.
 */
function DangerZonePanel() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("Enter your current password to confirm.");
      return;
    }

    const ok = await confirm({
      title: "Permanently delete your account?",
      tone: "danger",
      confirmLabel: "Delete my account",
      requireText: "DELETE MY ACCOUNT",
      description:
        "This erases your account and everything tied to it. It cannot be undone, and we cannot bring it back.",
      consequences: [
        "Your profile, points and point history are permanently deleted",
        "Your notifications are removed and you are signed out",
        "We email you a short goodbye — then your address is gone from our records",
        "Club tasks and other members' data are not affected",
      ],
    });

    if (!ok) return;

    setBusy(true);

    const { error: deleteError } = await deleteOwnAccount({
      currentPassword: password,
    });

    if (deleteError) {
      setError(deleteError.message);
      setBusy(false);
      return;
    }

    // No lingering success state: signOut inside deleteOwnAccount tears the
    // session down and the app falls back to the login screen. The toast is the
    // last thing shown on the way out.
    toast.success("Your account has been deleted. Take care.");
  };

  return (
    <Panel eyebrow="Danger zone" title="Delete account" icon="alert-triangle">
      <form onSubmit={submit} className="max-w-md space-y-4">
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          Deleting your account is permanent — everything tied to it is erased
          and cannot be recovered. If you're sure, confirm your password below.
        </p>

        <PasswordInput
          label="Current password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Confirm your password to continue"
          autoComplete="current-password"
          disabled={busy}
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

        <Button type="submit" variant="danger-soft" icon="trash" loading={busy}>
          {busy ? "Deleting..." : "Delete my account"}
        </Button>
      </form>
    </Panel>
  );
}

export default Profile;
