import { redirect } from "next/navigation";

export default function ReportRedirectPage() {
  redirect("/business?v=report");
}
