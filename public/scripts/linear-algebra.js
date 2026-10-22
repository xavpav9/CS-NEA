function det2(m) {
  return m[0] * m[3] - m[1] * m[2];
}

function det3(m) {
  let d = 0;

  for (let i=0; i<3; ++i) {
    d += Math.pow(-1, i) * m[i] * det2(m.filter((val, inx) => inx > 2 && inx % 3 !== i));
  }

  return d;
}

function det4(m) {
  let d = 0;

  for (let i=0; i<4; ++i) {
    d += Math.pow(-1, i) * m[i] * det3(m.filter((val, inx) => inx > 3 && inx % 4 !== i));
  }

  return d;
}

const v3 = (function() {
  function cross(a, b) {
    return [
      det2([a[1], a[2], b[1], b[2]]),
      -det2([a[0], a[2], b[0], b[2]]),
      det2([a[0], a[1], b[0], b[1]]),
    ];
  }

  function magnitude(v) {
    return Math.sqrt(v.reduce((acc, val) => acc + Math.pow(val, 2), 0));
  }

  function normalise(v) {
    const mag = magnitude(v);
    if (mag <= 0.000000001) return [0, 0, 0];

    return v.map(val => val / mag); 
  }

  function subtract(a, b) {
    return a.map((val, inx) => val - b[inx]);
  }
  
  return {
    cross,
    magnitude,
    normalise,
    subtract,
  };
})();

const m3 = (function() {
  function multiply(a, b) {
    const m = [];

    for (let r=0; r<3; ++r) {
      for (let c=0; c<3; ++c) {
        let val = 0;
        for (let i=0; i<3; ++i) {
          val += a[c + i*3] * b[r*3 + i];
        }
        m.push(val);
      }
    }

    return m;
  }

  function inverse(m) {
    const newM = [];
    const det = det3(m);

    if (det < 0.000000001 && det > -0.000000001) return [
      0, 0, 0,
      0, 0, 0,
      0, 0, 0
    ] // This should never happen in the real program.

    for (let r=0; r<3; ++r) {
      for (let c=0; c<3; ++c) {
        const minor = m.filter((val, inx) => Math.floor(inx / 3) !== r && inx % 3 !== c);
        newM.push(Math.pow(-1, r+c) * det2(minor) / det);
      }
    }

    return transpose(newM);
  }

  function projection(w, h) {
    return [
      2/w, 0, 0,
      0, -2/h, 0,
      -1, 1, 1,
    ];
  }

  function transpose(m) {
    return [
      m[0], m[3], m[6],
      m[1], m[4], m[7],
      m[2], m[5], m[8],
    ];
  }

  function translation(tx, ty) {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ];
  }

  function scaling(sx, sy) {
    return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1,
    ];
  }

  function rotation(rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return [
      c, s, 0,
      -s, c, 0,
      0, 0, 1,
    ];
  }

  const translate = (m, tx, ty) => multiply(translation(tx, ty), m);
  const scale = (m, sx, sy) => multiply(scaling(sx, sy), m);
  const rotate = (m, rad) => multiply(rotation(rad), m);

  const identity = () => [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ];

  return {
    multiply,
    inverse,
    projection,
    transpose,

    translation,
    scaling,
    rotation,

    translate,
    scale,
    rotate,

    identity,
  };
})();

const m4 = (function() {
  function multiply(a, b) {
    const m = [];

    for (let r=0; r<4; ++r) {
      for (let c=0; c<4; ++c) {
        let val = 0;
        for (let i=0; i<4; ++i) {
          val += a[c + i*4] * b[r*4 + i];
        }
        m.push(val);
      }
    }

    return m;
  }

  function inverse(m) {
    const newM = [];
    const det = det4(m);

    if (det < 0.000000001 && det > -0.000000001) return [
      0, 0, 0,
      0, 0, 0,
      0, 0, 0
    ] // This should never happen in the real program.

    for (let r=0; r<4; ++r) {
      for (let c=0; c<4; ++c) {
        const minor = m.filter((val, inx) => Math.floor(inx / 4) !== r && inx % 4 !== c);
        newM.push(Math.pow(-1, r+c) * det3(minor) / det);
      }
    }

    return transpose(newM);
  }

  function perspective(fov, aspect, near, far) {
    const f = Math.tan((Math.PI - fov) >> 1); // Equivalent to 1 / tan(fov >> 1)
    const rInv = 1 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rInv, -1,
      0, 0, 2 * near * far * rInv, 0,
    ];
  }

  function transpose(m) {
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  }

  function lookAt(position, target, up=[0,1,0]) {
    const zAxis = v3.normalise(v3.subtract(position, target));
    const xAxis = v3.normalise(v3.cross(up, zAxis));
    const yAxis = v3.normalise(v3.cross(zAxis, xAxis));

    return [
      ...xAxis, 0,
      ...yAxis, 0,
      ...zAxis, 0,
      ...position, 1,
    ]
  }

  function translation(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  }

  function scaling(sx, sy, sz) {
    return [
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1,
    ];
  }

  function rollRotation(rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  }

  function pitchRotation(rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  }

  function yawRotation(rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return [
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
  }

  const translate = (m, tx, ty, tz) => multiply(translation(tx, ty, tz), m);
  const scale = (m, sx, sy, sz) => multiply(scaling(sx, sy, sz), m);
  const roll = (m, rad) => multiply(rollRotation(rad), m);
  const pitch = (m, rad) => multiply(pitchRotation(rad), m);
  const yaw = (m, rad) => multiply(yawRotation(rad), m);

  const identity = () => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  return {
    multiply,
    inverse,
    perspective,
    transpose,
    lookAt,

    translation,
    scaling,
    rollRotation,
    pitchRotation,
    yawRotation,

    translate,
    scale,
    roll,
    pitch,
    yaw,

    identity,
  };
})();

export {m3, m4, v3, det2, det3, det4};
