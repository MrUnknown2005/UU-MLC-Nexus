import { supabase } from "../lib/supabaseClient";

export const awardPoints = (memberId, points, reason) =>
  supabase.rpc("award_points", {
    p_member_id: memberId,
    p_points: Number(points),
    p_reason: reason,
  });

export const updateMemberRole = (memberId, newRole) =>
  supabase.from("profiles").update({ role: newRole }).eq("id", memberId);

export const updateMemberActive = (memberId, isActive) =>
  supabase.from("profiles").update({ is_active: isActive }).eq("id", memberId);

export const resetAllPoints = () => supabase.rpc("reset_all_points");

export const resetMemberPoints = (memberId) =>
  supabase.rpc("reset_member_points", { p_member_id: memberId });

export const deleteAllPointData = () =>
  supabase.rpc("delete_all_point_data");

export const deleteMonthlyLeaderboard = () =>
  supabase.rpc("delete_monthly_leaderboard");

export const deleteAdminActivityLog = () =>
  supabase.rpc("delete_all_admin_activity_log");
