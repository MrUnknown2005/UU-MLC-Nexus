import { useEffect, useState } from "react";
import logo from "../../assets/club-logo.png";
import { supabase } from "../../lib/supabaseClient";
import { ROLE_NAMES } from "../../constants/roles";
import SafeImage from "../common/SafeImage";

function Profile({ profile, reloadProfile, onLogAction }) {
  const [fullName, setFullName] = useState(profile.full_name || "");

  const [nickname, setNickname] = useState(profile.nickname || "");

  const [bio, setBio] = useState(profile.bio || "");

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [editMode, setEditMode] = useState(false);

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
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be smaller than 5 MB.");
      return;
    }

    setSaving(true);
    setMessage("");

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

        setMessage(`Upload failed: ${uploadError.message}`);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (!publicUrl) {
        setMessage("The image uploaded, but no public URL was returned.");
        return;
      }

      const finalUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalUrl,
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Avatar profile update error:", profileError);

        setMessage(
          `Image uploaded, but profile update failed: ${profileError.message}`,
        );
        return;
      }

      setAvatarUrl(finalUrl);

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

      setMessage("Profile picture updated successfully.");

      if (onLogAction) {
        await onLogAction({
          action: "PROFILE_PICTURE_UPDATED",
          targetUserId: profile.id,
          details: "Updated profile picture.",
        });
      }

      await reloadProfile();
    } catch (error) {
      console.error("Unexpected avatar error:", error);

      setMessage("Something went wrong while changing the profile picture.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const resetEdits = () => {
    setFullName(profile.full_name || "");
    setNickname(profile.nickname || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
    setMessage("");
    setEditMode(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Profile saved successfully.");

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
    };

    loadProfileStats();

    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.points, profile.role, profile.is_active]);

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  const displayName = profile.nickname || profile.full_name || "UU MLC Member";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M";

  return (
    <div className="space-y-6">
      {/* Profile hero */}
      <section className="relative overflow-hidden nexus-glass-strong rounded-3xl p-6 md:p-8">
        <div className="nexus-glow-purple w-96 h-96 -right-24 -top-32" />
        <div className="nexus-glow-pink w-72 h-72 -left-16 -bottom-24" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-3xl bg-gradient-aurora blur-xl opacity-50" />
            <div className="relative w-32 h-32 rounded-3xl overflow-hidden nexus-image-frame-yellow">
              {avatarUrl ? (
                <SafeImage
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black nexus-text-aurora">
                  {initials}
                </div>
              )}
            </div>

            {editMode && (
              <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl nexus-morphic-button cursor-pointer p-0 hover:scale-110">
                ✎
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={saving}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="nexus-badge-yellow text-[10px] tracking-[0.25em]">
              Member Profile
            </span>

            <h2 className="text-3xl md:text-5xl font-black mt-3 truncate">
              <span className="nexus-text-aurora">{displayName}</span>
            </h2>

            {profile.nickname &&
              profile.full_name &&
              profile.nickname !== profile.full_name && (
                <p className="text-gray-500 mt-1">{profile.full_name}</p>
              )}

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="nexus-badge-yellow">
                {ROLE_NAMES[profile.role]}
              </span>

              <span className="nexus-badge-purple">
                {profile.points ?? 0} points
              </span>

              <span className="nexus-badge-cyan">
                {profileStats.rank ? `Rank #${profileStats.rank}` : "Rank —"}
              </span>

              <span className="nexus-badge">
                Joined {joinDate}
              </span>
            </div>
          </div>

          {!editMode && (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditMode(true);
              }}
              className="nexus-morphic-button px-5 py-3 shrink-0"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* Profile stats */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-stat nexus-stat-stat-yellow">
          <p className="text-gray-500 text-xs uppercase tracking-wider">
            Current Points
          </p>

          <p className="text-3xl font-black mt-2 nexus-text-aurora">
            {profile.points ?? 0}
          </p>

          <p className="text-gray-500 text-xs mt-1">Current club points</p>
        </div>

        <div className="nexus-stat nexus-stat-stat-cyan">
          <p className="text-gray-500 text-xs uppercase tracking-wider">
            Current Rank
          </p>

          <p className="text-3xl font-black mt-2 text-cyan-300">
            {profileStats.rank ? `#${profileStats.rank}` : "—"}
          </p>

          <p className="text-gray-500 text-xs mt-1">
            Of {profileStats.totalMembers} active members
          </p>
        </div>

        <div className="nexus-stat nexus-stat-stat-purple">
          <p className="text-gray-500 text-xs uppercase tracking-wider">
            Point Entries
          </p>

          <p className="text-3xl font-black mt-2 text-purple-300">
            {profileStats.pointEntries}
          </p>

          <p className="text-gray-500 text-xs mt-1">Recorded point changes</p>
        </div>

        <div className="nexus-stat nexus-stat-stat-pink">
          <p className="text-gray-500 text-xs uppercase tracking-wider">
            Club Tasks Done
          </p>

          <p className="text-3xl font-black mt-2 text-pink-300">
            {profileStats.completedClubTasks}
          </p>

          <p className="text-gray-500 text-xs mt-1">
            Completed across the club
          </p>
        </div>
      </section>

      {/* Membership */}
      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
            Membership
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-2xl nexus-glass-flat p-4">
              <p className="text-gray-600 text-xs uppercase">Joined</p>

              <p className="font-bold mt-2">{joinDate}</p>
            </div>

            <div className="rounded-2xl nexus-glass-flat p-4">
              <p className="text-gray-600 text-xs uppercase">Status</p>

              <p className="font-bold text-green-300 mt-2">Active</p>
            </div>
          </div>
        </div>
      </section>

      {/* Profile editor / bio */}
      <section className="nexus-glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
        <div className="absolute -bottom-10 left-1/3 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {!editMode ? (
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6">
            <div>
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                About
              </p>

              <h3 className="text-xl font-black mt-1">Bio</h3>

              <p className="text-gray-400 leading-relaxed mt-4 whitespace-pre-wrap">
                {profile.bio ||
                  "Add a short introduction about yourself, your interests, or what you work on in the club."}
              </p>
            </div>

            <div className="rounded-2xl nexus-glass-flat p-5 md:w-64">
              <p className="text-gray-600 text-xs uppercase tracking-wider">
                Profile picture
              </p>

              <p className="text-gray-400 text-sm mt-2">
                Click Edit Profile to upload a new picture.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="relative space-y-5">
            <div>
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                Edit Profile
              </p>

              <h3 className="text-2xl font-black mt-1">Your Information</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Full Name
                </label>

                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  className="nexus-input"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Nickname
                </label>

                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Nickname"
                  className="nexus-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Bio</label>

              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell the club a little about yourself..."
                rows={5}
                className="nexus-textarea"
              />
            </div>

            <div className="rounded-2xl nexus-glass-flat p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden nexus-image-frame">
                  <SafeImage
                    src={avatarUrl || logo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Profile Picture</p>

                  <p className="text-gray-600 text-xs mt-1">
                    Maximum 5 MB. Use the edit button on the profile photo to
                    replace it.
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div className="nexus-badge-yellow rounded-xl px-3 py-2">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="nexus-morphic-button px-6 py-3 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <button
                type="button"
                onClick={resetEdits}
                disabled={saving}
                className="nexus-morphic-button-ghost px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default Profile;
