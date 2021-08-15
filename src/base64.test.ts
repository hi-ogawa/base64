import "mocha";
import { expect } from "chai";
import * as assert from "assert/strict";
import { toBase64, fromBase64 } from "./base64";
import { randomBytes, randomInt } from "crypto";
import * as child_process from "child_process";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const reference = {
  toBase64(data: Uint8Array): Uint8Array {
    let res = child_process.execFileSync("base64", ["-w", "0"], {
      input: data,
    });
    return new Uint8Array(res);
  },
};

function assertEqualArray(x: Uint8Array, y: Uint8Array) {
  assert.equal(x.length, y.length);
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) {
      assert.fail(`${x[i]} == ${y[i]} (i = ${i})`);
    }
  }
}

describe("base64", () => {
  describe("toBase64", () => {
    it("case1", () => {
      const NUM_TRIALS = 2 ** 7;
      const MAX_LENGTH = 2 ** 15;

      for (const _ of Array(NUM_TRIALS)) {
        const length = randomInt(0, MAX_LENGTH);
        const data = randomBytes(length);
        const actual = toBase64(data);
        const expected = reference.toBase64(data);
        expect(decoder.decode(actual)).to.equal(decoder.decode(expected));
      }
    });

    it("case2", () => {
      // prettier-ignore
      const cases: [number[], string][] = [
        [[],            ""],
        [[0],           "AA=="],
        [[0, 0],        "AAA="],
        [[0, 0, 0],     "AAAA"],
        [[0, 0, 0, 0],  "AAAAAA=="],
        [[1],           "AQ=="],
        [[0, 1],        "AAE="],
        [[65, 66],      "QUI="],
        [[65, 66, 67],  "QUJD"],
        [[65, 66, 255], "QUL/"],
      ];
      for (const [data, expected] of cases) {
        const actual = decoder.decode(toBase64(new Uint8Array(data)));
        expect(actual).to.equal(expected);
      }
    });
  });

  describe("fromBase64", () => {
    it("case1", () => {
      // prettier-ignore
      const cases: [string, string][] = [
        ["A",         "Invalid length"],
        ["====",      "Invalid padding length"],
        ["AAA=====",  "Invalid padding length"],
        ["AAA@",      "Invalid data"],
        ["QUJ=",      "Invalid padding data"],
      ];
      for (const [data, error] of cases) {
        expect(() => fromBase64(encoder.encode(data))).to.throw(Error, error);
      }
    });
  });

  describe("roundtrip", () => {
    it("case1", () => {
      const NUM_TRIALS = 2 ** 10;
      const MAX_LENGTH = 2 ** 17;

      for (const _ of Array(NUM_TRIALS)) {
        const length = randomInt(0, MAX_LENGTH);
        const data1 = randomBytes(length);
        const data2 = toBase64(data1);
        const data3 = fromBase64(data2);
        assertEqualArray(data1, data3);
      }
    });
  });
});
