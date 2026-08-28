import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfilePageClient from "@/features/employees/components/ProfilePageClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ProfilePageClient user={session.user} />;
}
