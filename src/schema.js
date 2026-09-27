const HEX64 = /^[0-9a-f]{64}$/;

const CANDIDATE_ALLOWED = new Set([
  "schemaVersion",
  "owner",
  "kind",
  "source",
  "sourceHash",
  "language",
  "declaredCapabilities",
  "portable",
  "signals",
  "extraction",
  "proposedName",
  "proposedDescription",
  "inputSchema",
]);
const CANDIDATE_REQUIRED = [
  "schemaVersion",
  "owner",
  "kind",
  "source",
  "sourceHash",
  "language",
  "declaredCapabilities",
  "portable",
  "signals",
  "extraction",
];
const CANDIDATE_SIGNALS_ALLOWED = new Set([
  "explicitMarker",
  "parameterizedInput",
  "embeddedSecretRisk",
  "nondeterminismRisk",
  "externalWriteWithoutRollback",
  "concreteLiteralOnly",
]);
const CANDIDATE_SIGNALS_REQUIRED = [...CANDIDATE_SIGNALS_ALLOWED];
const CANDIDATE_EXTRACTION_ALLOWED = new Set([
  "source",
  "extractorId",
  "extractorVersion",
]);
const CANDIDATE_EXTRACTION_REQUIRED = ["source"];
const EXTRACTION_SOURCES = new Set(["runtime", "llm", "human", "import"]);
const KINDS = new Set(["tool", "skill", "procedure", "prompt"]);

const EVIDENCE_ALLOWED = new Set([
  "schemaVersion",
  "receiptId",
  "owner",
  "candidateSourceHash",
  "structureFingerprint",
  "inputFingerprint",
  "resultFingerprint",
  "outcome",
  "executedCapabilities",
  "verification",
  "interventionCount",
  "retryCount",
  "sideEffectClass",
  "replay",
  "provenance",
]);
const EVIDENCE_REQUIRED = [
  "schemaVersion",
  "receiptId",
  "owner",
  "candidateSourceHash",
  "structureFingerprint",
  "outcome",
  "executedCapabilities",
  "verification",
  "interventionCount",
  "retryCount",
  "sideEffectClass",
  "replay",
  "provenance",
];
const OUTCOMES = new Set(["ok", "error", "cancelled", "timeout", "inconclusive"]);
const SIDE_EFFECTS = new Set(["read", "bounded-write", "external-write", "unknown"]);
const REPLAYS = new Set(["not-run", "passed", "failed"]);
const VERIFY_KINDS = new Set([
  "assertion",
  "downstream-receipt",
  "objective-eval",
  "user-approval",
]);
const VERIFY_ALLOWED = new Set(["kind", "ok"]);
const PROVENANCE_ALLOWED = new Set(["harness", "harnessVersion", "signer"]);
const PROVENANCE_REQUIRED = ["harness"];

const CATALOG_ALLOWED = new Set([
  "schemaVersion",
  "owner",
  "entries",
  "recentCandidateCount",
]);
const CATALOG_REQUIRED = [...CATALOG_ALLOWED];
const CATALOG_ENTRY_ALLOWED = new Set([
  "candidateKey",
  "familyKey",
  "declaredCapabilities",
  "status",
  "evidenceCount",
  "distinctInputCount",
]);
const CATALOG_ENTRY_REQUIRED = [...CATALOG_ENTRY_ALLOWED];
const ENTRY_STATUS = new Set([
  "observed",
  "reviewable",
  "promoted",
  "enabled",
  "suppressed",
  "disabled",
  "deprecated",
  "superseded",
]);

const POLICY_ALLOWED = new Set([
  "schemaVersion",
  "policyVersion",
  "owner",
  "allowedKinds",
  "allowedCapabilities",
  "autoEnableCapabilities",
  "forbiddenCapabilityPrefixes",
  "maxSourceBytes",
  "minSourceBytes",
  "maxCandidatesPerWindow",
  "historyWindowSize",
  "minDistinctInputsForPromote",
  "minIndependentSuccessesForPromote",
  "maxRetriesForReview",
  "requireObjectiveVerificationForPromote",
  "requireReplayForPromote",
  "autoEnable",
]);
const POLICY_REQUIRED = [...POLICY_ALLOWED];

function isPlainObject(v) {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}
function isJsonValue(v) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return true;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (isPlainObject(v)) return Object.keys(v).every((key) => v[key] !== undefined && isJsonValue(v[key]));
  return false;
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}
function isBoolean(v) {
  return typeof v === "boolean";
}
function isNonNegativeInteger(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
function isPositiveInteger(v) {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}
function isUniqueStringArray(v) {
  if (!Array.isArray(v)) return false;
  const s = new Set();
  for (const x of v) {
    if (typeof x !== "string") return false;
    if (s.has(x)) return false;
    s.add(x);
  }
  return true;
}
function hasOnlyKeys(obj, allowed) {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) return false;
  }
  return true;
}
function hasAllKeys(obj, required) {
  for (const k of required) {
    if (!(k in obj)) return false;
  }
  return true;
}

const FAIL = { ok: false };
const PASS = { ok: true };

export function validateCandidate(c) {
  if (!isPlainObject(c)) return FAIL;
  if (!hasAllKeys(c, CANDIDATE_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(c, CANDIDATE_ALLOWED)) return FAIL;
  if (c.schemaVersion !== 1) return FAIL;
  if (!isNonEmptyString(c.owner)) return FAIL;
  if (!KINDS.has(c.kind)) return FAIL;
  if (typeof c.source !== "string") return FAIL;
  if (typeof c.sourceHash !== "string" || !HEX64.test(c.sourceHash)) return FAIL;
  if (!isNonEmptyString(c.language)) return FAIL;
  if (!isUniqueStringArray(c.declaredCapabilities)) return FAIL;
  if (!isBoolean(c.portable)) return FAIL;

  if (!isPlainObject(c.signals)) return FAIL;
  if (!hasAllKeys(c.signals, CANDIDATE_SIGNALS_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(c.signals, CANDIDATE_SIGNALS_ALLOWED)) return FAIL;
  for (const k of CANDIDATE_SIGNALS_REQUIRED) {
    if (!isBoolean(c.signals[k])) return FAIL;
  }

  if (!isPlainObject(c.extraction)) return FAIL;
  if (!hasAllKeys(c.extraction, CANDIDATE_EXTRACTION_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(c.extraction, CANDIDATE_EXTRACTION_ALLOWED)) return FAIL;
  if (!EXTRACTION_SOURCES.has(c.extraction.source)) return FAIL;
  if (
    "extractorId" in c.extraction &&
    typeof c.extraction.extractorId !== "string"
  )
    return FAIL;
  if (
    "extractorVersion" in c.extraction &&
    typeof c.extraction.extractorVersion !== "string"
  )
    return FAIL;

  if ("proposedName" in c && typeof c.proposedName !== "string") return FAIL;
  if ("proposedDescription" in c && typeof c.proposedDescription !== "string")
    return FAIL;
  if ("inputSchema" in c && (!isPlainObject(c.inputSchema) || !isJsonValue(c.inputSchema))) return FAIL;

  return PASS;
}

export function validateEvidenceItem(e) {
  if (!isPlainObject(e)) return FAIL;
  if (!hasAllKeys(e, EVIDENCE_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(e, EVIDENCE_ALLOWED)) return FAIL;
  if (e.schemaVersion !== 1) return FAIL;
  if (!isNonEmptyString(e.receiptId)) return FAIL;
  if (!isNonEmptyString(e.owner)) return FAIL;
  if (typeof e.candidateSourceHash !== "string" || !HEX64.test(e.candidateSourceHash))
    return FAIL;
  if (!isNonEmptyString(e.structureFingerprint)) return FAIL;
  if ("inputFingerprint" in e && typeof e.inputFingerprint !== "string")
    return FAIL;
  if ("resultFingerprint" in e && typeof e.resultFingerprint !== "string")
    return FAIL;
  if (!OUTCOMES.has(e.outcome)) return FAIL;
  if (!isUniqueStringArray(e.executedCapabilities)) return FAIL;
  if (!Array.isArray(e.verification)) return FAIL;
  for (const v of e.verification) {
    if (!isPlainObject(v)) return FAIL;
    if (!("kind" in v) || !("ok" in v)) return FAIL;
    if (!hasOnlyKeys(v, VERIFY_ALLOWED)) return FAIL;
    if (!VERIFY_KINDS.has(v.kind)) return FAIL;
    if (!isBoolean(v.ok)) return FAIL;
  }
  if (!isNonNegativeInteger(e.interventionCount)) return FAIL;
  if (!isNonNegativeInteger(e.retryCount)) return FAIL;
  if (!SIDE_EFFECTS.has(e.sideEffectClass)) return FAIL;
  if (!REPLAYS.has(e.replay)) return FAIL;
  if (!isPlainObject(e.provenance)) return FAIL;
  if (!hasAllKeys(e.provenance, PROVENANCE_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(e.provenance, PROVENANCE_ALLOWED)) return FAIL;
  if (!isNonEmptyString(e.provenance.harness)) return FAIL;
  if (
    "harnessVersion" in e.provenance &&
    typeof e.provenance.harnessVersion !== "string"
  )
    return FAIL;
  if ("signer" in e.provenance && typeof e.provenance.signer !== "string")
    return FAIL;
  return PASS;
}

export function validateCatalog(c) {
  if (!isPlainObject(c)) return FAIL;
  if (!hasAllKeys(c, CATALOG_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(c, CATALOG_ALLOWED)) return FAIL;
  if (c.schemaVersion !== 1) return FAIL;
  if (!isNonEmptyString(c.owner)) return FAIL;
  if (!Array.isArray(c.entries)) return FAIL;
  for (const entry of c.entries) {
    if (!isPlainObject(entry)) return FAIL;
    if (!hasAllKeys(entry, CATALOG_ENTRY_REQUIRED)) return FAIL;
    if (!hasOnlyKeys(entry, CATALOG_ENTRY_ALLOWED)) return FAIL;
    if (typeof entry.candidateKey !== "string") return FAIL;
    if (typeof entry.familyKey !== "string") return FAIL;
    if (!isUniqueStringArray(entry.declaredCapabilities)) return FAIL;
    if (!ENTRY_STATUS.has(entry.status)) return FAIL;
    if (!isNonNegativeInteger(entry.evidenceCount)) return FAIL;
    if (!isNonNegativeInteger(entry.distinctInputCount)) return FAIL;
  }
  if (!isNonNegativeInteger(c.recentCandidateCount)) return FAIL;
  return PASS;
}

export function validatePolicy(p) {
  if (!isPlainObject(p)) return FAIL;
  if (!hasAllKeys(p, POLICY_REQUIRED)) return FAIL;
  if (!hasOnlyKeys(p, POLICY_ALLOWED)) return FAIL;
  if (p.schemaVersion !== 1) return FAIL;
  if (!isNonEmptyString(p.policyVersion)) return FAIL;
  if (!isNonEmptyString(p.owner)) return FAIL;
  if (!isUniqueStringArray(p.allowedKinds)) return FAIL;
  for (const k of p.allowedKinds) {
    if (!KINDS.has(k)) return FAIL;
  }
  if (!isUniqueStringArray(p.allowedCapabilities)) return FAIL;
  if (!isUniqueStringArray(p.autoEnableCapabilities)) return FAIL;
  {
    const allowed = new Set(p.allowedCapabilities);
    for (const c of p.autoEnableCapabilities) {
      if (!allowed.has(c)) return FAIL;
    }
  }
  if (!isUniqueStringArray(p.forbiddenCapabilityPrefixes)) return FAIL;
  if (!isPositiveInteger(p.maxSourceBytes)) return FAIL;
  if (!isNonNegativeInteger(p.minSourceBytes)) return FAIL;
  if (p.minSourceBytes > p.maxSourceBytes) return FAIL;
  if (!isNonNegativeInteger(p.maxCandidatesPerWindow)) return FAIL;
  if (!isNonNegativeInteger(p.historyWindowSize)) return FAIL;
  if (!isPositiveInteger(p.minDistinctInputsForPromote)) return FAIL;
  if (!isPositiveInteger(p.minIndependentSuccessesForPromote)) return FAIL;
  if (!isNonNegativeInteger(p.maxRetriesForReview)) return FAIL;
  if (!isBoolean(p.requireObjectiveVerificationForPromote)) return FAIL;
  if (!isBoolean(p.requireReplayForPromote)) return FAIL;
  if (!isBoolean(p.autoEnable)) return FAIL;
  return PASS;
}

export function validateEvidenceList(list) {
  if (!Array.isArray(list)) return FAIL;
  for (const e of list) {
    const r = validateEvidenceItem(e);
    if (!r.ok) return FAIL;
  }
  return PASS;
}
