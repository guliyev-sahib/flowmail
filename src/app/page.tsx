import { redirect } from "next/navigation";

/**
 * The root of the domain shows the marketing landing. The app dashboard lives
 * at /dashboard.
 */
export default function Home() {
  redirect("/waitlist");
}
