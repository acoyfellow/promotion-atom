import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJSON, evaluatePromotion, sha256Hex, serializeDecision } from "../../src/index.js";
import { syntheticFixtures } from "../../corpus/v1-fixtures.js";

const byId = (prefix) => syntheticFixtures.find((fixture) => fixture.id.startsWith(prefix));
const clone = (value) => JSON.parse(JSON.stringify(value));
const run = (fixture) => evaluatePromotion(fixture.candidate, fixture.evidence, fixture.catalog, fixture.policy);

test("portable SHA-256 matches standard vectors", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("canonical JSON is key-order stable and NFC-normalized", () => {
  assert.equal(canonicalJSON({b:"e\u0301",a:1}), canonicalJSON({a:1,b:"é"}));
});

test("decisions are byte-stable, input-immutable, and evidence-order invariant", () => {
  const fixture = clone(byId("F04"));
  const before = JSON.stringify(fixture);
  const first = serializeDecision(run(fixture));
  fixture.evidence.reverse();
  assert.equal(serializeDecision(run(fixture)), first);
  fixture.evidence.reverse();
  assert.equal(JSON.stringify(fixture), before);
});

test("identical duplicate receipts are idempotent", () => {
  const fixture = clone(byId("F04"));
  const first = run(fixture);
  fixture.evidence.push(clone(fixture.evidence[0]));
  const duplicate = run(fixture);
  assert.equal(serializeDecision(duplicate), serializeDecision(first));
});

test("set and catalog ordering do not alter promote or forbidden decision bytes", () => {
  for (const prefix of ["F04", "F02"]) {
    const fixture = clone(byId(prefix));
    fixture.catalog.entries.push({candidateKey:"z-key",familyKey:"z-family",declaredCapabilities:[],status:"observed",evidenceCount:0,distinctInputCount:0});
    const first = serializeDecision(run(fixture));
    fixture.candidate.declaredCapabilities.reverse();
    fixture.evidence.forEach((item) => item.executedCapabilities.reverse());
    fixture.policy.allowedKinds.reverse();
    fixture.policy.allowedCapabilities.reverse();
    fixture.policy.autoEnableCapabilities.reverse();
    fixture.policy.forbiddenCapabilityPrefixes.reverse();
    fixture.catalog.entries.reverse();
    assert.equal(serializeDecision(run(fixture)), first, prefix);
  }
});

test("different structures cannot count as corroboration", () => {
  const fixture = clone(byId("F04"));
  fixture.evidence[1].structureFingerprint = "different-family";
  const decision = run(fixture);
  assert.equal(decision.disposition, "review");
  assert.ok(!decision.reasons.includes("distinct_input_corroboration"));
  assert.equal(decision.activationEligible, false);
});

test("conflicting duplicate receipt IDs fail closed independent of order", () => {
  const fixture = clone(byId("F04"));
  const conflict = clone(fixture.evidence[0]); conflict.outcome = "error";
  fixture.evidence.push(conflict);
  const first = run(fixture);
  fixture.evidence.reverse();
  const second = run(fixture);
  assert.equal(first.disposition, "suppress");
  assert.deepEqual(first.reasons, ["schema_invalid"]);
  assert.equal(serializeDecision(first), serializeDecision(second));
});

test("marker and extractor identity do not upgrade an otherwise-safe candidate", () => {
  const unmarkedFixture = clone(byId("F01"));
  const unmarked = run(unmarkedFixture);
  const markedFixture = clone(unmarkedFixture);
  markedFixture.candidate.signals.explicitMarker = true;
  markedFixture.candidate.extraction = {source:"llm",extractorId:"trusted-sounding",extractorVersion:"999"};
  const marked = run(markedFixture);
  assert.equal(unmarked.disposition, "review");
  assert.equal(marked.disposition, "review");
  assert.equal(unmarked.activationEligible, false);
  assert.equal(marked.activationEligible, false);
  assert.ok(marked.reasons.includes("explicit_marker_present"));
});

test("single success and high authority never activate even when owner enables automation", () => {
  for (const prefix of ["F03","F10"]) {
    const fixture = clone(byId(prefix));
    fixture.policy.autoEnable = true;
    assert.equal(run(fixture).activationEligible, false, prefix);
  }
});

test("safe corroboration can become activation eligible without performing activation", () => {
  const fixture = clone(byId("F04"));
  fixture.policy.autoEnable = true;
  const decision = run(fixture);
  assert.equal(decision.disposition, "promote");
  assert.equal(decision.activationEligible, true);
  assert.ok(decision.reasons.includes("owner_auto_enable_allowed"));
});

test("authority widening on one family cannot improve disposition", () => {
  const fixture = clone(byId("F01"));
  const safe = run(fixture);
  fixture.candidate.declaredCapabilities.push("fs.writeBounded");
  fixture.evidence[0].executedCapabilities.push("fs.writeBounded");
  fixture.catalog.entries = [{candidateKey:"prior-key",familyKey:safe.familyKey,declaredCapabilities:["fs.read"],status:"reviewable",evidenceCount:1,distinctInputCount:1}];
  const widened = run(fixture);
  assert.equal(safe.disposition, "review");
  assert.equal(widened.disposition, "suppress");
  assert.ok(widened.reasons.includes("capability_widened"));
});

test("external-write evidence fails closed without rollback proof", () => {
  const fixture = clone(byId("F04"));
  fixture.evidence[0].sideEffectClass = "external-write";
  const decision = run(fixture);
  assert.equal(decision.disposition, "suppress");
  assert.ok(decision.reasons.includes("external_write_without_rollback"));
  assert.equal(decision.activationEligible, false);
});

test("owner isolation fails independently of budget", () => {
  const fixture = clone(byId("F16"));
  fixture.catalog.entries = [];
  fixture.catalog.recentCandidateCount = 0;
  const decision = run(fixture);
  assert.equal(decision.disposition, "suppress");
  assert.ok(decision.reasons.includes("owner_mismatch"));
  assert.ok(!decision.reasons.includes("candidate_budget_exceeded"));
});

test("review budget fails independently of owner isolation", () => {
  const fixture = clone(byId("F16"));
  fixture.candidate.owner = fixture.policy.owner;
  fixture.catalog.entries = [];
  const decision = run(fixture);
  assert.equal(decision.disposition, "suppress");
  assert.ok(decision.reasons.includes("candidate_budget_exceeded"));
  assert.ok(!decision.reasons.includes("owner_mismatch"));
});

test("unknown fields and versions fail closed without throwing", () => {
  const fixture = clone(byId("F01")); fixture.candidate.unknown = true;
  assert.deepEqual(run(fixture).reasons, ["schema_invalid"]);
  const versioned = clone(byId("F01")); versioned.policy.schemaVersion = 2;
  assert.deepEqual(run(versioned).reasons, ["schema_invalid"]);
});
