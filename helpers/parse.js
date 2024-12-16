"use strict";

export const decodeOBJ = (content) => {
  const pos = [[0, 0, 0]], tex = [[0, 0]], norm = [[0, 0, 0]], color = [[0, 0, 0]];
  const vData = [pos, tex, norm, color];
  let glData = [[], [], [], []], materials = [], shapes = [];
  let shape, groups = ["default"], mat = "default", obj = "default";

  const newShape = () => { if (shape && shape.data.position.length) shape = null; };
  
  const defineShape = () => {
    if (!shape) {
      const data = { position: [], texcoord: [], normal: [], color: [] };
      glData = [data.position, data.texcoord, data.normal, data.color];
      shape = { object: obj, groups, material: mat, data };
      shapes.push(shape);
    }
  };

  const addVertex = (v) => {
    const parts = v.split("/").map((x) => parseInt(x));
    parts.forEach((i, idx) => {
      if (i) {
        const correctedIdx = i + (i >= 0 ? 0 : vData[idx].length);
        glData[idx].push(...vData[idx][correctedIdx]);
        if (idx === 0 && color.length > 1) shape.data.color.push(...color[correctedIdx]);
      }
    });
  };

  const handleKeywords = {
    v: (p) => p.length > 3 ? (pos.push(p.slice(0, 3).map(parseFloat)), color.push(p.slice(3).map(parseFloat))) : pos.push(p.map(parseFloat)),
    vn: (p) => norm.push(p.map(parseFloat)),
    vt: (p) => tex.push(p.map(parseFloat)),
    f: (p) => {
      defineShape();
      p.forEach((_, i) => i < p.length - 2 && [p[0], p[i + 1], p[i + 2]].forEach(addVertex));
    },
    s: () => {},
    mtllib: (p, args) => materials.push(args),
    usemtl: (p, args) => { mat = args; newShape(); },
    g: (p) => { groups = p; newShape(); },
    o: (p, args) => { obj = args; newShape(); }
  };

  content.split("\n").forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) return;
    const [_, key, args] = /(\w*)\s*(.*)/.exec(cleanLine) || [];
    if (!key) return;
    const parts = cleanLine.split(/\s+/).slice(1);
    handleKeywords[key]?.(parts, args);
  });

  shapes.forEach((shape) => {
    shape.data = Object.fromEntries(Object.entries(shape.data).filter(([, arr]) => arr.length));
  });

  return { geometries: shapes, materialLibs: materials };
};

export const parseMaterialArgs = (rawArgs) => rawArgs;

export const decodeMTL = (content) => {
  let material = {};
  const materials = {};

  const mtlHandlers = {
    newmtl: (args) => { material = {}; materials[args] = material; },
    Ns: (p) => { material.shininess = parseFloat(p[0]); },
    Ka: (p) => { material.ambient = p.map(parseFloat); },
    Kd: (p) => { material.diffuse = p.map(parseFloat); },
    Ks: (p) => { material.specular = p.map(parseFloat); },
    Ke: (p) => { material.emissive = p.map(parseFloat); },
    Ni: (p) => { material.opticalDensity = parseFloat(p[0]); },
    d: (p) => { material.opacity = parseFloat(p[0]); },
    illum: (p) => { material.illumination = parseInt(p[0]); }
  };

  content.split("\n").forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) return;
    const [_, key, args] = /(\w*)\s*(.*)/.exec(cleanLine) || [];
    if (!key) return;
    const parts = cleanLine.split(/\s+/).slice(1);
    mtlHandlers[key]?.(parts, args);
  });

  return materials;
};
