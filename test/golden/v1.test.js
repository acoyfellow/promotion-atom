import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { evaluatePromotion, serializeDecision, sha256OfCanonical } from "../../src/index.js";
import { syntheticFixtures } from "../../corpus/v1-fixtures.js";

const manifest = JSON.parse(readFileSync(new URL("../../corpus/v1-manifest.json", import.meta.url)));
const expected = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));

test("all 16 frozen fixtures have concrete inputs and expected decisions", () => {
  assert.equal(syntheticFixtures.length, 16);
  assert.deepEqual(syntheticFixtures.map((fixture) => fixture.id), manifest.fixtures.map((fixture) => fixture.id));
  for (const fixture of syntheticFixtures) {
    const want = expected.get(fixture.id);
    const decision = evaluatePromotion(fixture.candidate, fixture.evidence, fixture.catalog, fixture.policy);
    assert.equal(decision.disposition, want.disposition, fixture.id);
    assert.equal(decision.activationEligible, want.activationEligible, fixture.id);
    for (const reason of want.requiredReasons) assert.ok(decision.reasons.includes(reason), `${fixture.id} requires ${reason}; got ${decision.reasons}`);
    for (const reason of want.forbiddenReasons) assert.ok(!decision.reasons.includes(reason), `${fixture.id} forbids ${reason}; got ${decision.reasons}`);
    assert.equal(decision.gates.length, 10, fixture.id);
    assert.equal(serializeDecision(decision), serializeDecision(evaluatePromotion(fixture.candidate, fixture.evidence, fixture.catalog, fixture.policy)), fixture.id);
  }
});

test("machine-readable freeze hashes bind base artifacts, fixtures, and exact decision projection", () => {
  const freeze = JSON.parse(readFileSync(new URL("../../contracts/v1-freeze.json", import.meta.url)));
  const lines = freeze.baseArtifacts.map((item) => {
    const bytes = readFileSync(new URL(`../../${item.path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.path);
    return `${item.sha256}  ${item.path}\n`;
  }).join("");
  assert.equal(createHash("sha256").update(lines).digest("hex"), freeze.baseAggregateSha256);
  const fixtureBytes = readFileSync(new URL("../../corpus/v1-fixtures.js", import.meta.url));
  assert.equal(createHash("sha256").update(fixtureBytes).digest("hex"), freeze.syntheticFixtures.rawSha256);
  assert.equal(sha256OfCanonical(syntheticFixtures), freeze.syntheticFixtures.canonicalSha256);
  const decisionProjection = syntheticFixtures.map((fixture) => ({id:fixture.id,decision:evaluatePromotion(fixture.candidate,fixture.evidence,fixture.catalog,fixture.policy)}));
  assert.equal(sha256OfCanonical(decisionProjection), freeze.syntheticFixtures.decisionCorpusCanonicalSha256);
});
