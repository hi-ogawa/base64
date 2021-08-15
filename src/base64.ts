const LO2 = 0b00000011;
const LO4 = 0b00001111;
const LO6 = 0b00111111;
const HI2 = 0b11000000;
const HI4 = 0b11110000;
const HI6 = 0b11111100;

const PAD = "=".codePointAt(0)!;
const INVALID = 255;

const ENCODE = new TextEncoder().encode(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
);
const DECODE = new Uint8Array(Array(255).fill(INVALID));
for (const [i, x] of ENCODE.entries()) {
  DECODE[x] = i;
}

export function toBase64(xs: Uint8Array): Uint8Array {
  const lenx = xs.length;
  const lenchunk = (lenx - (lenx % 3)) / 3;
  const leny = Math.ceil(lenx / 3) * 4;
  const ys = new Uint8Array(leny);

  // Simple loop for clean chunks
  for (let i = 0; i < lenchunk; i++) {
    const x0 = xs[3 * i + 0];
    const x1 = xs[3 * i + 1];
    const x2 = xs[3 * i + 2];
    ys[4 * i + 0] = ENCODE[(x0 & HI6) >> 2];
    ys[4 * i + 1] = ENCODE[((x0 & LO2) << 4) | ((x1 & HI4) >> 4)];
    ys[4 * i + 2] = ENCODE[((x1 & LO4) << 2) | ((x2 & HI2) >> 6)];
    ys[4 * i + 3] = ENCODE[x2 & LO6];
  }

  // Take care of paddings
  if (lenx % 3 === 1) {
    const x0 = xs[lenx - 1];
    ys[4 * lenchunk + 0] = ENCODE[(x0 & HI6) >> 2];
    ys[4 * lenchunk + 1] = ENCODE[(x0 & LO2) << 4];
    ys[4 * lenchunk + 2] = PAD;
    ys[4 * lenchunk + 3] = PAD;
  } else if (lenx % 3 === 2) {
    const x0 = xs[lenx - 2];
    const x1 = xs[lenx - 1];
    ys[4 * lenchunk + 0] = ENCODE[(x0 & HI6) >> 2];
    ys[4 * lenchunk + 1] = ENCODE[((x0 & LO2) << 4) | ((x1 & HI4) >> 4)];
    ys[4 * lenchunk + 2] = ENCODE[(x1 & LO4) << 2];
    ys[4 * lenchunk + 3] = PAD;
  }
  return ys;
}

export function fromBase64(ys: Uint8Array): Uint8Array {
  // Check length
  const leny = ys.length;
  if (leny % 4 !== 0) {
    throw new Error("Invalid length");
  }

  // Check padding length
  let lenpad = 0;
  for (; lenpad < leny; lenpad++) {
    if (ys[leny - 1 - lenpad] !== PAD) break;
  }
  if (lenpad >= 3) {
    throw new Error("Invalid padding length");
  }

  // Check data
  for (let i = 0; i < leny - lenpad; i++) {
    if (DECODE[ys[i]] === INVALID) {
      throw new Error("Invalid data");
    }
  }

  const lenchunk = leny / 4 - Number(lenpad > 0);
  const lenx = Math.ceil(leny / 4) * 3 - lenpad;
  const xs = new Uint8Array(lenx);

  // Take care of paddings first since it can throw
  if (lenpad === 2) {
    const y0 = DECODE[ys[4 * lenchunk + 0]];
    const y1 = DECODE[ys[4 * lenchunk + 1]];
    if ((y1 & LO4) !== 0) {
      throw new Error("Invalid padding data");
    }
    xs[3 * lenchunk + 0] = (y0 << 2) | ((y1 & HI4) >> 4);
  } else if (lenpad === 1) {
    const y0 = DECODE[ys[4 * lenchunk + 0]];
    const y1 = DECODE[ys[4 * lenchunk + 1]];
    const y2 = DECODE[ys[4 * lenchunk + 2]];
    if ((y2 & LO2) !== 0) {
      throw new Error("Invalid padding data");
    }
    xs[3 * lenchunk + 0] = (y0 << 2) | ((y1 & HI4) >> 4);
    xs[3 * lenchunk + 1] = ((y1 & LO4) << 4) | ((y2 & HI6) >> 2);
  }

  // Simple loop for clean chunks
  for (let i = 0; i < lenchunk; i++) {
    const y0 = DECODE[ys[4 * i + 0]];
    const y1 = DECODE[ys[4 * i + 1]];
    const y2 = DECODE[ys[4 * i + 2]];
    const y3 = DECODE[ys[4 * i + 3]];
    xs[3 * i + 0] = (y0 << 2) | ((y1 & HI4) >> 4);
    xs[3 * i + 1] = ((y1 & LO4) << 4) | ((y2 & HI6) >> 2);
    xs[3 * i + 2] = ((y2 & LO2) << 6) | y3;
  }

  return xs;
}
