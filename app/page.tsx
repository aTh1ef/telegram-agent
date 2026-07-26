import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function Home() {
  const authenticated = await isAdminAuthenticated();
  redirect(authenticated ? "/dashboard" : "/login");
}
