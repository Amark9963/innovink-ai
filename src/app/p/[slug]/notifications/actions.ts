"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCurrentUserOrNull,
  getParticipantNotificationsDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const notificationBaseSchema = z.object({
  slug: z.string().trim().min(1),
});

const notificationItemSchema = notificationBaseSchema.extend({
  notificationId: z.string().trim().uuid(),
  nextPath: z.string().trim().min(1).optional(),
});

export async function markAllNotificationsReadAction(formData: FormData) {
  const parsed = notificationBaseSchema.safeParse({
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/notifications`)}`);
  }

  const notifications = await getParticipantNotificationsDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!notifications) {
    redirect(`/p/${parsed.data.slug}/dashboard`);
  }

  const unreadIds = notifications.notifications
    .filter((item) => item.status === "unread")
    .map((item) => item.id);

  if (unreadIds.length > 0) {
    const { error } = await supabase
      .from("notification_inbox_items")
      .update({ status: "read" })
      .in("id", unreadIds)
      .eq("user_id", user.id);

    if (error) {
      redirect(`/p/${parsed.data.slug}/notifications?error=mark-all-failed`);
    }
  }

  redirect(`/p/${parsed.data.slug}/notifications?status=all-read`);
}

export async function openNotificationAction(formData: FormData) {
  const parsed = notificationItemSchema.safeParse({
    slug: formData.get("slug"),
    notificationId: formData.get("notificationId"),
    nextPath: formData.get("nextPath"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/notifications`)}`);
  }

  const { error } = await supabase
    .from("notification_inbox_items")
    .update({ status: "read" })
    .eq("id", parsed.data.notificationId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/p/${parsed.data.slug}/notifications?error=notification-open-failed`);
  }

  redirect(parsed.data.nextPath ?? `/p/${parsed.data.slug}/notifications?status=notification-read`);
}
