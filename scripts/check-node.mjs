const v = process.versions.node;
const [majorStr] = v.split(".");
const ok = Number(majorStr) === 22;

console.log(`Node ${v} — ${ok ? "OK" : "Mismatch (need 22.x)"}`);
process.exitCode = ok ? 0 : 1;

