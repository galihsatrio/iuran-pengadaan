import assert from "node:assert/strict";
import { validateBendaharaInput } from "../lib/validation";

// 1. Valid input with local 08 format
{
  const res = validateBendaharaInput({
    nama_bendahara: " Bpk. Subarjo ",
    no_wa_bendahara: " 0812-3456-7890 ",
  });
  assert.equal(res.valid, true);
  assert.equal(res.sanitized?.nama_bendahara, "Bpk. Subarjo");
  assert.equal(res.sanitized?.no_wa_bendahara, "0812-3456-7890");
}

// 2. Valid input with international +62 format
{
  const res = validateBendaharaInput({
    nama_bendahara: "Ibu Siti",
    no_wa_bendahara: "+628123456789",
  });
  assert.equal(res.valid, true);
  assert.equal(res.sanitized?.nama_bendahara, "Ibu Siti");
  assert.equal(res.sanitized?.no_wa_bendahara, "+628123456789");
}

// 3. Optional/empty input
{
  const res = validateBendaharaInput({
    nama_bendahara: "",
    no_wa_bendahara: "",
  });
  assert.equal(res.valid, true);
  assert.equal(res.sanitized?.nama_bendahara, "");
  assert.equal(res.sanitized?.no_wa_bendahara, "");
}

// 4. Invalid phone number format
{
  const res = validateBendaharaInput({
    nama_bendahara: "Test",
    no_wa_bendahara: "bukan-nomor-hp",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.no_wa_bendahara);
}

// 5. Name too long (>100 chars)
{
  const res = validateBendaharaInput({
    nama_bendahara: "A".repeat(101),
    no_wa_bendahara: "081234567890",
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.nama_bendahara);
}

console.log("All validation checks passed!");
