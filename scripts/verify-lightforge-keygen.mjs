#!/usr/bin/env node
/**
 * Verify that the LightForge keygen produces valid, deterministic keys.
 * Run: node scripts/verify-lightforge-keygen.mjs
 */

const SECRET = "DMXRecPlay2026#Bz";

function mul32(a, b) {
    const aLo = a % 65536;
    const aHi = (a - aLo) / 65536;
    const bLo = b % 65536;
    const bHi = (b - bLo) / 65536;
    const mid = (aHi * bLo + aLo * bHi) % 65536;
    return (mid * 65536 + aLo * bLo) % 4294967296;
}

function xorLowByte(h, b) {
    let hm = h % 256, bm = b % 256;
    let xor8 = 0, p = 1;
    for (let bit = 0; bit < 8; bit++) {
        const ha = hm % 2, ba = bm % 2;
        if (ha !== ba) xor8 += p;
        hm = Math.floor(hm / 2);
        bm = Math.floor(bm / 2);
        p *= 2;
    }
    return (h - (h % 256)) + xor8;
}

function licHash(id, secret) {
    let h = 2166136261;
    const salt = secret || SECRET;
    const lenHex = id.length.toString(16).toUpperCase().padStart(2, "0");
    const data = salt + "|" + id + "|" + lenHex + "|" + salt;

    for (let i = 0; i < data.length; i++) {
        h = xorLowByte(h, data.charCodeAt(i));
        h = mul32(h, 16777619);
    }

    const r2 = (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
    for (let i = 0; i < r2.length; i++) {
        h = xorLowByte(h, r2.charCodeAt(i));
        h = mul32(h, 16777619);
    }

    return h >>> 0;
}

function generateKey(coreID) {
    const h1 = licHash(coreID, SECRET);
    const h2 = licHash((h1 >>> 0).toString(16).toUpperCase().padStart(8, "0"), "s2:" + SECRET);
    const h3 = licHash((h2 >>> 0).toString(16).toUpperCase().padStart(8, "0"), "s3:" + SECRET);
    const p1 = (h1 % 65536).toString(16).toUpperCase().padStart(4, "0");
    const p2 = (h2 % 65536).toString(16).toUpperCase().padStart(4, "0");
    const p3 = (h3 % 65536).toString(16).toUpperCase().padStart(4, "0");
    return `DMXR-${p1}-${p2}-${p3}`;
}

const testCases = [
    "EMULATION",
    "ABC123",
    "CORE-1234-5678-ABCD",
    "QSC-Q-SYS-CORE-110F",
    "X",
    "A".repeat(64),
];

console.log("LightForge Keygen Verification");
console.log("==============================\n");

let allPass = true;
for (const coreID of testCases) {
    const key = generateKey(coreID);
    const formatOk = /^DMXR-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key);
    const key2 = generateKey(coreID);
    const deterministicOk = key === key2;

    const pass = formatOk && deterministicOk;
    if (!pass) allPass = false;

    console.log(`Core ID: ${coreID.length > 20 ? coreID.substring(0, 20) + "..." : coreID}`);
    console.log(`  Key:           ${key}`);
    console.log(`  Format OK:     ${formatOk ? "PASS" : "FAIL"}`);
    console.log(`  Deterministic: ${deterministicOk ? "PASS" : "FAIL"}`);
    console.log();
}

console.log(allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED");
process.exit(allPass ? 0 : 1);
