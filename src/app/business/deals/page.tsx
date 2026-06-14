import { redirect } from "next/navigation";

export default function DealsRedirectPage() {
  redirect("/business?v=deals");
}
