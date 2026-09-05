#!/usr/bin/env node
// Markdown homework → editable .docx (and read back).
//   node scripts/homework.mjs build <homework.md> [--out file.docx]
//   node scripts/homework.mjs read  <filled.docx> [--out file.md]
//
// Conventions: ## section (new page) · ### sub · - question · indented note ·
// - [ ] capture. ## Closed / ## Settled sections are NOT rendered (answered Qs
// stay in the .md for the record). Put ## Photographs (or Capture) first.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";

const [cmd, target, ...rest] = process.argv.slice(2);
if (!cmd || !target) {
  console.error("usage: homework.mjs build <homework.md> [--out <file.docx>]");
  console.error("       homework.mjs read  <filled.docx> [--out <file.md>]");
  process.exit(1);
}
const outFlag = rest.indexOf("--out");
const outArg = outFlag === -1 ? null : resolve(rest[outFlag + 1]);

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Markdown emphasis is noise in a form. Strip it rather than rendering it.
const plain = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const FONT = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>';

const run = (text, { size = 24, bold = false, italic = false, color = null } = {}) =>
  `<w:r><w:rPr>${FONT}${bold ? "<w:b/><w:bCs/>" : ""}${italic ? "<w:i/><w:iCs/>" : ""}` +
  `${color ? `<w:color w:val="${color}"/>` : ""}` +
  `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>` +
  `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const para = (
  text,
  {
    size = 24,
    bold = false,
    italic = false,
    color = null,
    before = 0,
    after = 80,
    line = null,
    shade = null,
  } = {},
) =>
  "<w:p><w:pPr>" +
  (shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : "") +
  `<w:spacing w:before="${before}" w:after="${after}"` +
  (line ? ` w:line="${line}" w:lineRule="auto"` : "") +
  "/></w:pPr>" +
  (text ? run(text, { size, bold, italic, color }) : "") +
  "</w:p>";

const pageBreak = () =>
  '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' +
  '<w:r><w:br w:type="page"/></w:r></w:p>';

const borders = (color, size = 8) =>
  "<w:tblBorders>" +
  ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((e) => `<w:${e} w:val="single" w:sz="${size}" w:space="0" w:color="${color}"/>`)
    .join("") +
  "</w:tblBorders>";

// One question is one table: a shaded cell carrying the number, the question and
// any note, then a white cell to answer in. Stacked rather than side by side so a
// long question does not wrap into a column two words wide, and so the answer
// space is the full width of the page whether it is typed into or written on.
// The white box is deliberately taller than one line: a larger answer space
// produces longer answers (Christian & Dillman 2004), and it has to hold
// handwriting if this gets printed.
const CONTENT_WIDTH = 9638; // A4 minus the 1134-twip margins on each side

const tableGrid = () => `<w:tblGrid><w:gridCol w:w="${CONTENT_WIDTH}"/></w:tblGrid>`;

const tableProps = (borderColor) =>
  "<w:tblPr>" +
  '<w:tblStyle w:val="TableGrid"/>' +
  `<w:tblW w:w="${CONTENT_WIDTH}" w:type="dxa"/>` +
  '<w:tblLayout w:type="fixed"/>' +
  borders(borderColor) +
  '<w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:left w:w="200" w:type="dxa"/>' +
  '<w:bottom w:w="140" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tblCellMar>' +
  "</w:tblPr>" +
  tableGrid();

const cellProps = (fill, { spanHeight = null } = {}) =>
  "<w:tcPr>" +
  `<w:tcW w:w="${CONTENT_WIDTH}" w:type="dxa"/>` +
  `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` +
  (spanHeight
    ? `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/></w:tcMar>`
    : "") +
  "</w:tcPr>";

// A band, not a shaded paragraph — paragraph shading does not reliably fill the
// line, so a one-cell table is what actually reads as a section divider.
const sectionBand = (label, title) =>
  "<w:tbl>" +
  tableProps("B8C9D9") +
  "<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc>" +
  cellProps("E8F0F7") +
  para(label, { size: 20, bold: true, color: "4A6478", after: 60 }) +
  para(title, { size: 32, bold: true, after: 40, line: 276 }) +
  "</w:tc></w:tr></w:tbl>" +
  para("", { size: 20, after: 120, before: 0 });

// One question is one table: shaded prompt on top, white answer space below.
const questionBlock = (n, question, note, tick) => {
  const answerHeight = tick ? 560 : 1200;
  return (
    "<w:tbl>" +
    tableProps("C5C5C5") +
    "<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc>" +
    cellProps("F3F3F3") +
    para(`${n}.`, {
      size: 20,
      bold: true,
      color: "666666",
      after: 60,
    }) +
    para((tick ? "\u2610  " : "") + question, {
      size: 24,
      bold: true,
      after: note ? 60 : 40,
      line: 276,
    }) +
    (note ? para(note, { size: 22, italic: true, color: "555555", after: 40, line: 276 }) : "") +
    "</w:tc></w:tr>" +
    `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${answerHeight}" w:hRule="atLeast"/></w:trPr><w:tc>` +
    cellProps("FFFFFF") +
    para("Your answer:", { size: 18, color: "A0A0A0", after: 40 }) +
    para("", { size: 24, after: 0, before: 0 }) +
    "</w:tc></w:tr>" +
    "</w:tbl>" +
    // More space between questions than inside one.
    para("", { size: 20, after: 160, before: 0 })
  );
};

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  `<w:styles ${W}>` +
  "<w:docDefaults>" +
  "<w:rPrDefault><w:rPr>" +
  FONT +
  '<w:sz w:val="24"/><w:szCs w:val="24"/>' +
  '<w:lang w:val="en-IN" w:eastAsia="en-IN" w:bidi="hi-IN"/>' +
  "</w:rPr></w:rPrDefault>" +
  '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
  "</w:docDefaults>" +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">' +
  '<w:name w:val="Normal"/>' +
  `<w:qFormat/><w:rPr>${FONT}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>` +
  "</w:style>" +
  '<w:style w:type="table" w:styleId="TableGrid">' +
  '<w:name w:val="Table Grid"/>' +
  '<w:basedOn w:val="TableNormal"/>' +
  "<w:tblPr>" +
  borders("C5C5C5", 4) +
  "</w:tblPr>" +
  "</w:style>" +
  "</w:styles>";

const CLOSED_H2 = /^(closed|settled|answered|do not send)$/i;

function build(mdPath) {
  const md = readFileSync(mdPath, "utf8");

  // Pass one: parse. Indented lines under a question are notes. Hard-wrapped
  // prose joins into one paragraph. ## Closed / Settled / Answered are skipped
  // so the Word pack only carries open asks.
  const items = [];
  let prose = [];
  let skip = false;

  const flushProse = () => {
    if (prose.length > 0) {
      items.push({ type: "prose", text: prose.join(" ") });
      prose = [];
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.trim();

    if (!line || /^---+$/.test(line)) {
      flushProse();
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushProse();
      const level = h[1].length;
      const title = plain(h[2]);
      if (level === 2) skip = CLOSED_H2.test(title);
      if (skip) continue;
      items.push({ type: `h${level}`, text: title });
      continue;
    }

    if (skip) continue;

    const tick = line.match(/^[-*]\s+\[[ xX]?\]\s+(.*)$/);
    if (tick) {
      flushProse();
      items.push({ type: "q", text: plain(tick[1]), tick: true });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushProse();
      items.push({ type: "q", text: plain(bullet[1]), tick: false });
      continue;
    }

    const last = items[items.length - 1];
    if (prose.length === 0 && /^\s\s+\S/.test(raw) && last?.type === "q" && !last.note) {
      last.note = plain(line);
      continue;
    }

    prose.push(plain(line.replace(/^>\s?/, "")));
  }
  flushProse();

  // Pass two: render, now that the totals are known — progress is only
  // reassuring if it says what it is progress towards.
  const totalSections = items.filter((i) => i.type === "h2").length;

  const body = [];
  let n = 0;
  let section = 0;
  let seenSection = false;
  let seenFirstQuestion = false;

  for (const item of items) {
    if (item.type === "h1") {
      body.push(para(item.text, { size: 44, bold: true, after: 160, line: 276 }));
      continue;
    }
    if (item.type === "h2") {
      section += 1;
      if (seenSection) body.push(pageBreak());
      body.push(sectionBand(`Section ${section} of ${totalSections}`, item.text));
      seenSection = true;
      continue;
    }
    if (item.type === "h3") {
      body.push(para(item.text, { size: 26, bold: true, before: 200, after: 120 }));
      continue;
    }
    if (item.type === "q") {
      if (!seenFirstQuestion) {
        body.push(
          para(
            "If you do not know an answer, write \u201cdon\u2019t know\u201d and move on \u2014 that is a " +
              "useful answer too. Nothing here has to be filled in perfectly, and you can " +
              "answer in any language.",
            { size: 20, italic: true, color: "5A5A5A", after: 200, line: 276 },
          ),
        );
        seenFirstQuestion = true;
      }
      n += 1;
      body.push(questionBlock(n, item.text, item.note, item.tick));
      continue;
    }
    body.push(para(item.text, { size: 22, after: 140, line: 276 }));
  }

  const doc =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document ${W}><w:body>${body.join("")}` +
    "<w:sectPr>" +
    '<w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>' +
    "</w:sectPr>" +
    "</w:body></w:document>";

  const dir = mkdtempSync(join(tmpdir(), "homework-"));
  mkdirSync(join(dir, "_rels"));
  mkdirSync(join(dir, "word"));
  mkdirSync(join(dir, "word", "_rels"));
  writeFileSync(
    join(dir, "[Content_Types].xml"),
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      "</Types>",
  );
  writeFileSync(
    join(dir, "_rels", ".rels"),
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
  );
  writeFileSync(
    join(dir, "word", "_rels", "document.xml.rels"),
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>",
  );
  writeFileSync(join(dir, "word", "styles.xml"), STYLES_XML);
  writeFileSync(join(dir, "word", "document.xml"), doc);

  const out = outArg ?? resolve(`${basename(mdPath, extname(mdPath))}.docx`);
  rmSync(out, { force: true });
  execFileSync("zip", ["-q", "-X", "-r", out, ".", "-i", "*"], { cwd: dir });
  rmSync(dir, { recursive: true, force: true });
  return out;
}

function read(docxPath) {
  const xml = execFileSync("unzip", ["-p", docxPath, "word/document.xml"], {
    maxBuffer: 64 * 1024 * 1024,
  }).toString();

  // Join runs inside a paragraph, but keep paragraph breaks — a question and its
  // note are separate paragraphs in one cell, and so are multi-line answers.
  const cellText = (cell) =>
    (cell.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [cell])
      .map((p) =>
        (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
          .map((t) => t.replace(/<[^>]+>/g, ""))
          .join(""),
      )
      .filter(Boolean)
      .join("\n")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

  const out = [];
  let answered = 0;
  let total = 0;

  // Walk paragraphs and table rows in document order so headings keep their place.
  for (const block of xml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g) ?? []) {
    if (block.startsWith("<w:tbl")) {
      const cells = block.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [];
      // Section bands are one-cell tables. They are headings, not questions, and
      // counting them would inflate the answered/total the done_when checks.
      if (cells.length < 2) {
        const band = cellText(cells[0] ?? "").split("\n");
        if (band.length > 1) out.push(`\n## ${band[band.length - 1]}\n`);
        continue;
      }
      const q = cellText(cells[0] ?? "")
        .replace(/^Question \d+ of \d+\s*/, "")
        .replace(/^\d+\.\s*/, "");
      const a = cellText(cells[1] ?? "")
        .replace(/^Your answer:\s*/i, "")
        .trim();
      if (!q) continue;
      total += 1;
      if (a) answered += 1;
      out.push(`- ${q}`);
      out.push(a ? `  > ${a.split("\n").join("\n  > ")}` : "  > _(unanswered)_");
      continue;
    }
    // Paragraphs inside table cells were consumed above; this is body text only.
    const t = cellText(block);
    if (!t) continue;
    const heading = /<w:b\/>/.test(block);
    out.push(heading ? `\n## ${t}\n` : t);
  }

  const md = `# ${basename(docxPath, extname(docxPath))}\n\n${answered}/${total} answered.\n\n${out.join("\n")}\n`;
  if (outArg) {
    writeFileSync(outArg, md);
    return { path: outArg, answered, total };
  }
  process.stdout.write(md);
  return { path: null, answered, total };
}

if (cmd === "build") {
  console.log(build(resolve(target)));
} else if (cmd === "read") {
  const r = read(resolve(target));
  if (r.path) console.log(`${r.path} — ${r.answered}/${r.total} answered`);
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
