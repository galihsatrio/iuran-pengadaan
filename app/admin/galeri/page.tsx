import { redirect } from "next/navigation";

// ponytail: Compatibility route redirecting admin url to pengurus dashboard gallery.
export default function AdminGaleriPage() {
  redirect("/pengurus/galeri");
}
