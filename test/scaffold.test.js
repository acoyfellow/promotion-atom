import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePromotion } from "../src/index.js";

test("public API exports the frozen synchronous evaluator", () => {
  assert.equal(typeof evaluatePromotion, "function");
  assert.equal(evaluatePromotion.constructor.name, "Function");
});
