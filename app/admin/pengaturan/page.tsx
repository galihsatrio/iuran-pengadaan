import { redirect } from "next/navigation";

// ponytail: Compatibility route redirecting admin url to pengurus dashboard settings.
export default function AdminPengaturanPage() {
  redirect("/pengurus/pengaturan");
}
