const v = process.versions.node;
const major = v.split(".")[0];
const ok = major === "22";

console.log(`Node ${v} — ${ok ? "OK" : "Mismatch (need 22.x)"}`);
process.exit(ok ? 0 : 1);

