import { redirect } from "next/navigation";

export default function LeadRedirectPage() {
  redirect("/business?v=lead");
}
