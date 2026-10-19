"use client";

import { useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// ponytail: Basic email/password authentication using Supabase Auth. Upgrade to MFA or OAuth if neighborhood committee requires enterprise SSO.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!configured) {
      setErrorMsg(
        "Koneksi Supabase belum terkonfigurasi. Periksa berkas .env.local Anda."
      );
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      setErrorMsg("Klien Supabase tidak tersedia.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak sesuai."
            : error.message
        );
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Full document navigation ensures fresh cookies reach server and avoids stale Next router cache
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/pengurus");
        return;
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat masuk."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            IP
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Iuran Warga Pengadaan Portal
        </h1>
        <h2 className="mt-2 text-center text-base font-semibold text-slate-700">
          Masuk Area Pengurus
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Khusus panitia & pengurus untuk mencatat iuran warga
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {!configured && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <strong>Pemberitahuan:</strong> Supabase belum dikonfigurasi. Form
              login ini memerlukan environment variable yang valid.
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Alamat Email Pengurus
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pengurus@lingkungan.id"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-base sm:text-sm shadow-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Kata Sandi
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-base sm:text-sm shadow-xs"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !configured}
                className="w-full flex justify-center items-center py-2.5 px-4 min-h-[44px] border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-500 mb-3">
              Pendaftaran publik dinonaktifkan demi keamanan. Pengurus baru
              ditambahkan secara manual oleh administrator.
            </p>
            <Link
              href="/"
              className="min-h-[44px] inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              &larr; Kembali ke Rekap Warga
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
