import assert from "node:assert/strict";
import {
  calculateResidentDuesStatus,
  DUES_TARGET,
  getResidentKey,
  calculateResidentTotals,
  sortRecordsByCumulativePaidDesc,
} from "../lib/dues";

console.log("Running dues logic verification...");

// 1. Partial below Stage 1 (< 25k) -> stage 0, not complete
{
  const status = calculateResidentDuesStatus(10000);
  assert.equal(status.stage, 0, "Partial < 25k must be stage 0");
  assert.equal(status.stageLabel, "Sebagian (< Tahap 1)");
  assert.equal(status.outstandingBalance, 65000);
  assert.equal(status.target, DUES_TARGET);
}

// 2. Exactly Stage 1 (25k)
{
  const status = calculateResidentDuesStatus(25000);
  assert.equal(status.stage, 1, "25k must be stage 1");
  assert.equal(status.stageLabel, "Tahap 1");
  assert.equal(status.outstandingBalance, 50000);
}

// 3. Between Stage 1 and Stage 2 (40k)
{
  const status = calculateResidentDuesStatus(40000);
  assert.equal(status.stage, 1, "40k must be stage 1");
  assert.equal(status.outstandingBalance, 35000);
}

// 4. Exactly Stage 2 (50k)
{
  const status = calculateResidentDuesStatus(50000);
  assert.equal(status.stage, 2, "50k must be stage 2");
  assert.equal(status.stageLabel, "Tahap 2");
  assert.equal(status.outstandingBalance, 25000);
}

// 5. Between Stage 2 and Stage 3 (60k)
{
  const status = calculateResidentDuesStatus(60000);
  assert.equal(status.stage, 2, "60k must be stage 2");
  assert.equal(status.outstandingBalance, 15000);
}

// 6. Exactly Stage 3 (75k) -> Lunas
{
  const status = calculateResidentDuesStatus(75000);
  assert.equal(status.stage, 3, "75k must be stage 3");
  assert.equal(status.stageLabel, "Tahap 3 (Lunas)");
  assert.equal(status.outstandingBalance, 0);
}

// 7. Overpayment (> 75k) -> stage 3, outstanding balance clamped to 0
{
  const status = calculateResidentDuesStatus(100000);
  assert.equal(status.stage, 3, "100k must be stage 3");
  assert.equal(status.outstandingBalance, 0, "Outstanding balance must not be negative");
}

// 8. Zero paid
{
  const status = calculateResidentDuesStatus(0);
  assert.equal(status.stage, 0);
  assert.equal(status.stageLabel, "Belum Bayar");
  assert.equal(status.outstandingBalance, 75000);
}

// 9. Cumulative accumulation by resident (block + house number)
{
  const mockRecords = [
    { nama_blok: "Blok A", nomor_blok: "12", amount: 25000 },
    { nama_blok: "blok a ", nomor_blok: " 12", amount: 25000 },
    { nama_blok: "Blok A", nomor_blok: "13", amount: 20000 },
  ];

  const totals = calculateResidentTotals(mockRecords);
  const keyA12 = getResidentKey({ nama_blok: "Blok A", nomor_blok: "12" });
  const keyA13 = getResidentKey({ nama_blok: "Blok A", nomor_blok: "13" });

  assert.equal(totals.get(keyA12), 50000, "Cumulative total for A-12 should be 50k");
  assert.equal(totals.get(keyA13), 20000, "Cumulative total for A-13 should be 20k");

  const statusA12 = calculateResidentDuesStatus(totals.get(keyA12)!);
  assert.equal(statusA12.stage, 2);
  assert.equal(statusA12.outstandingBalance, 25000);

  const statusA13 = calculateResidentDuesStatus(totals.get(keyA13)!);
  assert.equal(statusA13.stage, 0);
  assert.equal(statusA13.outstandingBalance, 55000);
}

// 10. sortRecordsByCumulativePaidDesc - Descending order by cumulative amount
{
  const records = [
    { id: 1, nama_blok: "Blok A", nomor_blok: "01", amount: 25000 },
    { id: 2, nama_blok: "Blok A", nomor_blok: "02", amount: 75000 },
    { id: 3, nama_blok: "Blok A", nomor_blok: "03", amount: 50000 },
  ];

  const sorted = sortRecordsByCumulativePaidDesc(records);
  assert.deepEqual(
    sorted.map((r) => r.id),
    [2, 3, 1],
    "Rows must be sorted descending by cumulative total (75k, 50k, 25k)"
  );
}

// 11. sortRecordsByCumulativePaidDesc - Multiple payments by same resident
{
  // Resident A-01 has 2 payments: 25k + 50k = 75k cumulative total.
  // Resident A-02 has 1 payment: 60k cumulative total.
  // Resident A-03 has 1 payment: 25k cumulative total.
  const records = [
    { id: "p1", nama_blok: "Blok A", nomor_blok: "03", amount: 25000 },
    { id: "p2", nama_blok: "Blok A", nomor_blok: "01", amount: 25000 },
    { id: "p3", nama_blok: "Blok A", nomor_blok: "02", amount: 60000 },
    { id: "p4", nama_blok: "Blok A", nomor_blok: "01", amount: 50000 },
  ];

  const residentTotals = calculateResidentTotals(records);
  const sorted = sortRecordsByCumulativePaidDesc(records, residentTotals);

  // A-01 total is 75k (p2, p4) -> comes first
  // A-02 total is 60k (p3) -> comes second
  // A-03 total is 25k (p1) -> comes third
  // Between p2 and p4 (both A-01), existing relative order (p2 before p4) is preserved
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["p2", "p4", "p3", "p1"],
    "Multiple payments for same resident must use cumulative total and preserve relative order"
  );
}

// 12. sortRecordsByCumulativePaidDesc - Stable sort on ties
{
  // Three residents with equal cumulative total 50k.
  // Initial order: A-10 (id: 10), A-20 (id: 20), A-30 (id: 30)
  const records = [
    { id: 10, nama_blok: "Blok A", nomor_blok: "10", amount: 50000 },
    { id: 20, nama_blok: "Blok A", nomor_blok: "20", amount: 50000 },
    { id: 30, nama_blok: "Blok A", nomor_blok: "30", amount: 50000 },
  ];

  const sorted = sortRecordsByCumulativePaidDesc(records);
  assert.deepEqual(
    sorted.map((r) => r.id),
    [10, 20, 30],
    "Equal cumulative totals must preserve original stable order"
  );
}

// 13. sortRecordsByCumulativePaidDesc - Non-mutation check
{
  const original = [
    { id: 1, nama_blok: "Blok A", nomor_blok: "01", amount: 10000 },
    { id: 2, nama_blok: "Blok A", nomor_blok: "02", amount: 80000 },
  ];
  const originalCopy = [...original];

  const sorted = sortRecordsByCumulativePaidDesc(original);
  assert.notEqual(sorted, original, "Must return a new array instance");
  assert.deepEqual(original, originalCopy, "Must not mutate original array");
}

console.log("All dues checks passed successfully!");
