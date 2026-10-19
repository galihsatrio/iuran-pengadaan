export const DUES_TARGET = 75000;
export const STAGE_1_THRESHOLD = 25000;
export const STAGE_2_THRESHOLD = 50000;
export const STAGE_3_THRESHOLD = 75000;

export interface ResidentDuesStatus {
  totalPaid: number;
  target: number;
  stage: number;
  stageLabel: string;
  outstandingBalance: number;
}

export interface ResidentExcessDonation {
  residentKey: string;
  namaBlok: string;
  nomorBlok: string;
  namaKepalaKeluarga: string;
  cumulativePaid: number;
  excessAmount: number;
}

// ponytail: Calculate resident stage from cumulative paid amount. Target Rp75.000, 3 stages of Rp25.000. Upgrade to dynamic stages if config is moved to DB.
export function calculateResidentDuesStatus(totalPaid: number): ResidentDuesStatus {
  const safeTotal = Math.max(0, Number(totalPaid) || 0);

  let stage = 0;
  let stageLabel = "Belum Bayar";

  if (safeTotal >= STAGE_3_THRESHOLD) {
    stage = 3;
    stageLabel = "Tahap 3 (Lunas)";
  } else if (safeTotal >= STAGE_2_THRESHOLD) {
    stage = 2;
    stageLabel = "Tahap 2";
  } else if (safeTotal >= STAGE_1_THRESHOLD) {
    stage = 1;
    stageLabel = "Tahap 1";
  } else if (safeTotal > 0) {
    stage = 0;
    stageLabel = "Sebagian (< Tahap 1)";
  }

  const outstandingBalance = Math.max(0, DUES_TARGET - safeTotal);

  return {
    totalPaid: safeTotal,
    target: DUES_TARGET,
    stage,
    stageLabel,
    outstandingBalance,
  };
}

export function getResidentKey(item: { nama_blok: string; nomor_blok: string }): string {
  return `${(item.nama_blok || "").trim().toLowerCase()}::${(item.nomor_blok || "").trim().toLowerCase()}`;
}

export function calculateResidentTotals<T extends { nama_blok: string; nomor_blok: string; amount: number }>(
  records: T[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = getResidentKey(r);
    const curr = totals.get(key) || 0;
    totals.set(key, curr + (Number(r.amount) || 0));
  }
  return totals;
}

// ponytail: Stable sort records within a block by cumulative resident paid descending. Upgrade to user-configurable sort column when requested.
export function sortRecordsByCumulativePaidDesc<T extends { nama_blok: string; nomor_blok: string; amount: number }>(
  records: T[],
  residentTotals?: Map<string, number>
): T[] {
  const totals = residentTotals || calculateResidentTotals(records);
  return records
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const totalA = totals.get(getResidentKey(a.item)) ?? Number(a.item.amount || 0);
      const totalB = totals.get(getResidentKey(b.item)) ?? Number(b.item.amount || 0);
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

// ponytail: Calculate resident voluntary excess (donations) beyond cumulative dues target of Rp75.000. Upgrade to dynamic threshold parameter if dues target becomes configurable in DB.
export function calculateResidentExcessDonations<
  T extends { nama_blok: string; nomor_blok: string; nama_kepala_keluarga?: string | null; amount: number }
>(records: T[], target = DUES_TARGET): ResidentExcessDonation[] {
  const residentMap = new Map<
    string,
    {
      namaBlok: string;
      nomorBlok: string;
      namaKepalaKeluarga: string;
      cumulativePaid: number;
    }
  >();

  for (const r of records) {
    const key = getResidentKey(r);
    const existing = residentMap.get(key);
    const amount = Number(r.amount) || 0;

    if (!existing) {
      residentMap.set(key, {
        namaBlok: (r.nama_blok || "").trim(),
        nomorBlok: (r.nomor_blok || "").trim(),
        namaKepalaKeluarga: (r.nama_kepala_keluarga || "").trim(),
        cumulativePaid: amount,
      });
    } else {
      existing.cumulativePaid += amount;
      if (!existing.namaKepalaKeluarga && r.nama_kepala_keluarga) {
        existing.namaKepalaKeluarga = r.nama_kepala_keluarga.trim();
      }
    }
  }

  const donations: ResidentExcessDonation[] = [];
  for (const [residentKey, data] of residentMap.entries()) {
    if (data.cumulativePaid > target) {
      donations.push({
        residentKey,
        namaBlok: data.namaBlok,
        nomorBlok: data.nomorBlok,
        namaKepalaKeluarga: data.namaKepalaKeluarga,
        cumulativePaid: data.cumulativePaid,
        excessAmount: data.cumulativePaid - target,
      });
    }
  }

  // Sort donations by highest excess amount first, then stable alphabetical
  return donations.sort((a, b) => {
    if (b.excessAmount !== a.excessAmount) {
      return b.excessAmount - a.excessAmount;
    }
    const blokComp = a.namaBlok.localeCompare(b.namaBlok, "id", { numeric: true });
    if (blokComp !== 0) return blokComp;
    return a.nomorBlok.localeCompare(b.nomorBlok, "id", { numeric: true });
  });
}


