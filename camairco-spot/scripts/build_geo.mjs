// Extract the country shapes the spot needs from world-atlas into src/geo.js.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

const load = (res) => JSON.parse(readFileSync(`node_modules/world-atlas/countries-${res}.json`, "utf8"));
const fc = (res) => feature(load(res), load(res).objects.countries);
const round = (geom) => JSON.parse(JSON.stringify(geom, (k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v)));

const bboxOf = (f) => {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c) => (typeof c[0] === "number" ? ((x0 = Math.min(x0, c[0])), (x1 = Math.max(x1, c[0])), (y0 = Math.min(y0, c[1])), (y1 = Math.max(y1, c[1]))) : c.forEach(walk));
  walk(f.geometry.coordinates);
  return [x0, y0, x1, y1];
};
const inBox = (f, [a, b, c, d]) => { const [x0, y0, x1, y1] = bboxOf(f); return x1 >= a && x0 <= c && y1 >= b && y0 <= d; };
const slim = (f) => ({ type: "Feature", id: f.id, properties: {}, geometry: round(f.geometry) });

const w110 = fc("110m").features.filter((f) => f.geometry).map(slim);
const w50 = fc("50m").features.filter((f) => f.geometry && inBox(f, [-30, -40, 60, 42])).map(slim);
const NEAR = new Set(["120", "566", "148", "140", "178", "266", "226", "562"]);
const n10 = fc("10m").features.filter((f) => f.geometry && NEAR.has(String(f.id))).map(slim);

const out = { w110: { type: "FeatureCollection", features: w110 }, w50: { type: "FeatureCollection", features: w50 }, n10: { type: "FeatureCollection", features: n10 } };
writeFileSync("src/geo.js", "window.GEO=" + JSON.stringify(out) + ";\n");
console.log("w110", w110.length, "w50", w50.length, "n10", n10.length, "bytes", JSON.stringify(out).length);
