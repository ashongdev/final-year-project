// Regression check: does HarfBuzz (client/src/lib/textShaping.ts, the live
// editor's text renderer) still agree with Pillow (server/app/util.py's
// process_image, what a real download actually contains)?
//
// This exists because the two have drifted apart for real, non-obvious
// reasons twice already — once from an ascent/descent metric-table
// mismatch, once from HarfBuzz silently applying GSUB ligatures/GPOS
// kerning that Pillow's raqm-less layout never does (a 16% advance-width
// error on "hello world" in Bickham Script). Both times this surfaced as a
// confusing "the editor looks a bit off" report, not an obvious bug. Run
// this whenever textShaping.ts's shaping logic changes, so a regression
// shows up as a failing script instead.
//
// Usage: node client/scripts/verify-text-metrics.mjs
// (regenerate the fixture first with
//  server/scripts/export_text_metrics_fixture.py if a font changed)

import * as hb from "harfbuzzjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, "..");

// Keep in sync with textShaping.ts's PILLOW_INCOMPATIBLE_FEATURE_TAGS —
// see that constant's comment for why this can't just be imported here.
const PILLOW_INCOMPATIBLE_FEATURE_TAGS = [
	"liga",
	"clig",
	"calt",
	"dlig",
	"hlig",
	"swsh",
	"salt",
	"rlig",
	"hist",
	"rclt",
	"kern",
];

// Real-world usage is nowhere near these lengths, so a few % of drift on a
// long, repeated-character edge case (e.g. "------------------") is noise,
// not a regression — these thresholds are deliberately loose enough to
// stay quiet on that kind of case while still catching a true shaping
// mismatch (which shows up as single- or double-digit percent, not this).
const MAX_ASCENT_DESCENT_DIFF = 2; // font units, at the fixture's reference size
const MAX_WIDTH_DIFF_PCT = 3;

const fixturePath = path.join(
	CLIENT_ROOT,
	"src/lib/__fixtures__/pillow-text-metrics.json",
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
const REFERENCE_SIZE = fixture.referenceSize;

const fontCache = new Map();
function loadFont(name) {
	if (fontCache.has(name)) return fontCache.get(name);
	const buf = fs.readFileSync(
		path.join(CLIENT_ROOT, "public/fonts", `${name}.ttf`),
	);
	const arrayBuffer = buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength,
	);
	const font = new hb.Font(new hb.Face(new hb.Blob(arrayBuffer)));
	font.setScale(font.face.upem, font.face.upem);
	const entry = { font, upem: font.face.upem, hExtents: font.hExtents() };
	fontCache.set(name, entry);
	return entry;
}

const disabledFeatures = PILLOW_INCOMPATIBLE_FEATURE_TAGS.map(
	(tag) => new hb.Feature(tag, 0),
);

function advanceWidth(font, text) {
	const buffer = new hb.Buffer();
	buffer.addText(text);
	buffer.guessSegmentProperties();
	hb.shape(font, buffer, disabledFeatures);
	let total = 0;
	for (const p of buffer.getGlyphPositions()) total += p.xAdvance;
	return total;
}

let failures = [];

for (const row of fixture.results) {
	const { font, upem, hExtents } = loadFont(row.font);
	const scale = REFERENCE_SIZE / upem;

	const hbAscent = hExtents.ascender * scale;
	const hbDescent = -hExtents.descender * scale;
	const hbWidth = advanceWidth(font, row.text) * scale;

	const ascentDiff = Math.abs(hbAscent - row.ascent);
	const descentDiff = Math.abs(hbDescent - row.descent);
	const widthDiffPct = (Math.abs(hbWidth - row.advanceWidth) / row.advanceWidth) * 100;

	if (
		ascentDiff > MAX_ASCENT_DESCENT_DIFF ||
		descentDiff > MAX_ASCENT_DESCENT_DIFF ||
		widthDiffPct > MAX_WIDTH_DIFF_PCT
	) {
		failures.push({
			font: row.font,
			text: row.label,
			ascentDiff: ascentDiff.toFixed(2),
			descentDiff: descentDiff.toFixed(2),
			widthDiffPct: widthDiffPct.toFixed(2),
		});
	}
}

if (failures.length > 0) {
	console.error(
		`FAIL: ${failures.length}/${fixture.results.length} rows exceeded tolerance ` +
			`(ascent/descent > ${MAX_ASCENT_DESCENT_DIFF} units, width > ${MAX_WIDTH_DIFF_PCT}%):\n`,
	);
	console.table(failures);
	process.exit(1);
}

console.log(
	`OK: all ${fixture.results.length} rows within tolerance ` +
		`(ascent/descent <= ${MAX_ASCENT_DESCENT_DIFF} units, width <= ${MAX_WIDTH_DIFF_PCT}%).`,
);
