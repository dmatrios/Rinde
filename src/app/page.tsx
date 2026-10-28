import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/config";
export default function Home() {
  redirect(getSupabaseConfig() ? "/app" : "/preview");
}
