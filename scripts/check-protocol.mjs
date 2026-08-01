#!/usr/bin/env node
/**
 * Verify that the shared source in this repo matches the sibling repo's.
 *
 * The two applications live in separate repositories on purpose — they deploy
 * to different places and have different lifecycles — but the contract between
 * them, and the transports that carry it, have to be one thing. Duplicating
 * those directories and checking them is the cheapest arrangement that keeps
 * `git clone` of either repo working on its own, with no package registry and
 * no submodule.
 *
 * Usage:
 *   node scripts/check-protocol.mjs             # compare against the sibling
 *   node scripts/check-protocol.mjs --write      # copy ours over theirs
 *   node scripts/check-protocol.mjs --peer ../X  # explicit peer repo root
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Directories that must be byte-identical in both repositories. */
const SHARED_DIRS = ["src/protocol", "src/services/transports"];

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const args = process.argv.slice(2);
const write = args.includes("--write");
const peerFlag = args.indexOf("--peer");

/** Both repos are normally cloned side by side. */
const PEER_CANDIDATES = ["CRTRemote", "CRTHost"].map((name) => resolve(repoRoot, "..", name));

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findPeer() {
  if (peerFlag !== -1 && args[peerFlag + 1]) return resolve(args[peerFlag + 1]);
  for (const candidate of PEER_CANDIDATES) {
    if (candidate === repoRoot) continue;
    if (await exists(join(candidate, "package.json"))) return candidate;
  }
  return null;
}

async function readTree(dir) {
  const files = new Map();
  if (!(await exists(dir))) return files;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    files.set(entry.name, await readFile(join(dir, entry.name), "utf8"));
  }
  return files;
}

const digest = (text) => createHash("sha256").update(text).digest("hex").slice(0, 12);

const peerRoot = await findPeer();
if (!peerRoot) {
  console.log("· shared-source check skipped — no sibling repo found next to this one.");
  console.log("  Clone CRTHost and CRTRemote into the same parent directory to enable it.");
  process.exit(0);
}

const problems = [];
let checked = 0;
let copied = 0;

for (const shared of SHARED_DIRS) {
  const ourDir = join(repoRoot, shared);
  const peerDir = join(peerRoot, shared);
  const ours = await readTree(ourDir);
  const theirs = await readTree(peerDir);

  if (ours.size === 0) {
    problems.push(`${shared}: nothing here to share`);
    continue;
  }

  if (write) {
    await mkdir(peerDir, { recursive: true });
    for (const [name, text] of ours) {
      await writeFile(join(peerDir, name), text, "utf8");
      copied += 1;
    }
    for (const name of theirs.keys()) {
      if (!ours.has(name)) problems.push(`${shared}/${name}: exists only in the peer and was not removed`);
    }
    continue;
  }

  for (const name of [...new Set([...ours.keys(), ...theirs.keys()])].sort()) {
    checked += 1;
    const a = ours.get(name);
    const b = theirs.get(name);
    if (a === undefined) problems.push(`only in peer:  ${shared}/${name}`);
    else if (b === undefined) problems.push(`only in ours:  ${shared}/${name}`);
    else if (a !== b) problems.push(`differs:       ${shared}/${name}  (${digest(a)} vs ${digest(b)})`);
  }
}

if (write) {
  console.log(`✓ copied ${copied} shared files to ${relative(process.cwd(), peerRoot) || peerRoot}`);
  for (const problem of problems) console.log(`  note: ${problem}`);
  process.exit(0);
}

if (problems.length === 0) {
  console.log(`✓ shared source is identical in both repos (${checked} files across ${SHARED_DIRS.length} directories)`);
  process.exit(0);
}

console.error("✗ shared source has drifted between the two repos:\n");
for (const problem of problems) console.error(`   ${problem}`);
console.error(`\n   ours:  ${repoRoot}`);
console.error(`   peer:  ${peerRoot}`);
console.error("\n   Re-run with --write from whichever repo holds the version you want to keep.");
process.exit(1);
