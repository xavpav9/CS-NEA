import {m3, m4, v3, det2, det3, det4} from "../../public/scripts/linear-algebra.js";

describe("3Matrix", () => {
  const I = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]

  const matrix1 = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
  ]

  const matrix2 = [
    4, 7, 2,
    9, 5, 8,
    1, 4, 5,
  ]

  test("Multiplication with identity matrix", () => {
    expect(m3.multiply(I, I)).toEqual(I);
    expect(m3.multiply(matrix1, I)).toEqual(matrix1);
    expect(m3.multiply(I, matrix2)).toEqual(matrix2);
  });

  test("Multiplication with non-identity matrix", () => {
    expect(m3.multiply(matrix1, matrix2)).toEqual([
      46, 59, 72,
      85, 107, 129,
      52, 62, 72,
    ]);
    expect(m3.multiply(matrix2, matrix1)).toEqual([
      25, 29, 33,
      67, 77, 78,
      109, 125, 123,
    ]);
  });

  test("Determinants", () => {
    expect(det3(I)).toBe(1);
    expect(det3(matrix1)).toBe(0);
    expect(det3(matrix2)).toBe(-225);
  });

  test("Inverse", () => {
    expect(m3.inverse(I).map(val => (val === -0) ? 0 : val)).toEqual(I); // Does not like -0
    expect(m3.inverse(matrix1)).toEqual([
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
    ]);
    expect(m3.inverse(matrix2)).toEqual([
      7/225, 3/25, -46/225,
      37/225, -2/25, 14/225,
      -31/225, 1/25, 43/225,
    ]);
  });
});

describe("4Matrix", () => {
  const I = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]

  const matrix1 = [
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 16,
  ]

  const matrix2 = [
    4, 7, 2, 8,
    9, 5, 8, 6,
    1, 4, 5, 3,
    0, 1.5, 20, 16,
  ]

  test("Multiplication with identity matrix", () => {
    expect(m4.multiply(I, I)).toEqual(I);
    expect(m4.multiply(matrix1, I)).toEqual(matrix1);
    expect(m4.multiply(I, matrix2)).toEqual(matrix2);
  });

  test("Multiplication with non-identity matrix", () => {
    expect(m4.multiply(matrix1, matrix2)).toEqual([
      161, 182, 203, 224,
      184, 212, 240, 268,
      105, 118, 131, 144,
      791/2, 433, 941/2, 508,
    ]);
    expect(m4.multiply(matrix2, matrix1)).toEqual([
      25, 35, 113, 93,
      81, 105, 253, 225,
      137, 175, 393, 357,
      193, 245, 533, 489,
    ]);
  });

  test("Determinants", () => {
    expect(det4(I)).toBe(1);
    expect(det4(matrix1)).toBe(0);
    expect(det4(matrix2)).toBe(-4555);
  });

  test("Inverse", () => {
    expect(m4.inverse(I).map(val => (val === -0) ? 0 : val)).toEqual(I); // Does not like -0
    expect(m4.inverse(matrix1)).toEqual([
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
    ]);
    expect(m4.inverse(matrix2)).toEqual([
      -59/4555, 601/4555, -618/4555, -16/911,
      172/4555, -208/4555, 1184/4555, -46/911,
      -929/9110, 138/4555, 616/4555, 13/911,
      1129/9110, -153/4555, -881/4555, 45/911,
    ]);
  });
});

describe("3Vector", () => {
  const vector1 = [
    1,
    2,
    3,
  ]

  const vector2 = [
    8,
    5,
    25.5,
  ]

  const vector3 = [
    0,
    8,
    0,
  ]

  test("Cross Product", () => {
    expect(v3.cross(vector1, vector2)).toEqual([36, -1.5, -11]);;
    expect(v3.cross(vector2, vector1)).toEqual([-36, 1.5, 11]);
    expect(v3.cross(vector3, vector2).map(val => (val === -0) ? 0 : val)).toEqual([204, 0, -64]); // Does not like -0
  });
});
