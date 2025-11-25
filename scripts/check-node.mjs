const v = process.versions.node;
const [majorStr] = v.split(".");
const ok = Number(majorStr) === 24;

console.log(`Node ${v} — ${ok ? "OK" : "Mismatch (need 24.x)"}`);
process.exitCode = ok ? 0 : 1;
