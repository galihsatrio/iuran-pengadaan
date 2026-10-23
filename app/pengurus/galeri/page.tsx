import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAllGalleryItems } from "@/lib/gallery";
import { formatDateOnlyID } from "@/lib/format";
import { LogoutButton } from "../logout-button";
import { PengurusNavLink } from "../nav-link";
import GalleryUploadForm from "./upload-form";
import DeleteGalleryPhotoButton from "./delete-photo-button";

export const instant = false;

// ponytail: Pengurus gallery management page enforcing allowlist on both page render and RLS.
export default async function PengurusGaleriPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">
            Konfigurasi Supabase Belum Terpasang
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pengaturan Supabase diperlukan untuk mengakses area pengurus. Silakan atur variabel lingkungan terlebih dahulu.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Kembali ke Rekap Warga
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-rose-200 shadow-sm text-center">
          <div className="text-3xl mb-3">🚫</div>
          <h1 className="text-lg font-bold text-slate-900">
            Akses Ditolak (Bukan Pengurus)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Akun <strong>{user.email}</strong> berhasil masuk, namun ID Anda (
            <code className="bg-slate-100 text-xs px-1 py-0.5 rounded font-mono">
              {user.id}
            </code>
            ) belum terdaftar dalam tabel <code className="text-xs font-mono font-semibold">pengurus_allowlist</code>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Lihat Rekap Publik
            </Link>
            <LogoutButton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  const galleryItems = await getAllGalleryItems(supabase);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Pengurus Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              IP
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none truncate">
                  Portal Pengurus
                </h1>
                <span className="hidden xs:inline-flex sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                  Allowlisted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[130px] sm:max-w-xs">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/galeri"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              Lihat Galeri Publik
            </Link>
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              Tampilan Publik
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Navigation Subheader / Breadcrumb Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
          <PengurusNavLink
            href="/pengurus"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Data Iuran Warga
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/master-bendahara"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Master Bendahara &amp; QRIS
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/pengeluaran"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Pengeluaran Kas
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/galeri"
            isActive
            className="py-3 border-b-2 border-emerald-600 text-emerald-700 font-semibold shrink-0 min-h-[44px]"
          >
            Galeri Kegiatan
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/pengaturan"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Pengaturan
          </PengurusNavLink>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Upload Form */}
        <section aria-labelledby="upload-heading">
          <GalleryUploadForm />
        </section>

        {/* Gallery Items List */}
        <section aria-labelledby="list-heading" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 id="list-heading" className="text-base sm:text-lg font-bold text-slate-900">
                Daftar Foto Dokumentasi Galeri
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total {galleryItems.length} foto tersimpan dalam galeri kerja bakti warga.
              </p>
            </div>
            <Link
              href="/galeri"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start sm:self-auto"
            >
              <span>Buka Galeri Publik</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>

          {galleryItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
                📷
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Belum ada foto yang diunggah
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Gunakan formulir di atas untuk mengunggah foto dokumentasi kegiatan kerja bakti atau hasil pengadaan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4 w-20">Foto</th>
                    <th scope="col" className="py-3 px-4">Judul &amp; Keterangan</th>
                    <th scope="col" className="py-3 px-4 w-32">Kategori</th>
                    <th scope="col" className="py-3 px-4 w-28">Tanggal</th>
                    <th scope="col" className="py-3 px-4 w-24 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {galleryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        {item.caption && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.caption}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.category === "kegiatan" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200/50">
                            Kegiatan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50">
                            Hasil
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatDateOnlyID(item.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DeleteGalleryPhotoButton id={item.id} title={item.title} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
