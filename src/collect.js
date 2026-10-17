// ---------- Des blocs de texte aux « atomes » / from text frames to "atoms" ----------
// Un descripteur de bloc (construit depuis Illustrator ou simulé dans les tests) :
// A frame descriptor (built from Illustrator or simulated in tests):
// { contents, bounds:[l,t,r,b], point:bool, anchor:[x,y], metric(offset)->{size,leading}, rtl(para)->bool|null }
HP.isArabicCode = function (c) { return (c >= 0x600 && c <= 0x6FF) || (c >= 0x750 && c <= 0x77F) || (c >= 0xFB50 && c <= 0xFEFF); };
HP.rtlGuess = function (s) {
    var ar = 0, la = 0, i, c;
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (HP.isArabicCode(c) && !(c >= 0x660 && c <= 0x669)) { ar++; }
        else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0xC0 && c <= 0x24F)) { la++; }
    }
    return ar > la;
};
HP.splitLines = function (s) {
    var out = [], st = 0, para = 0, i, c;
    for (i = 0; i <= s.length; i++) {
        c = (i < s.length) ? s.charAt(i) : null;
        if (c === null || c === '\r' || c === '\n' || c === '\u0003') {
            out.push({ start: st, text: s.substring(st, i), para: para });
            st = i + 1;
            if (c === '\r' || c === '\n') { para++; }
        }
    }
    return out;
};
HP.allLabels = function (s) {
    var t = HP.normAr(s), out = [], i, re, m;
    for (i = 0; i < HP.LABELS.length; i++) {
        re = new RegExp(HP.LABELS[i][1].source, 'gi');
        while ((m = re.exec(t)) !== null) {
            var clash = false;
            for (var j = 0; j < out.length; j++) { if (Math.abs(out[j].pos - m.index) < 2) { clash = true; } }
            if (!clash) { out.push({ key: HP.LABELS[i][0], pos: m.index, len: m[0].length }); }
            if (m[0].length === 0) { re.lastIndex++; }
        }
    }
    out.sort(function (a, b) { return a.pos - b.pos; });
    return out;
};
// Découpe une ligne en cellules / split a line into cells
// -> [{start (dans la ligne), text, id}] ; id = n° de tabulation, ou n° d'heure + 'R' pour le reste
HP.cellsOfLine = function (text) {
    var cells = [], i, st = 0;
    if (text.indexOf('\t') >= 0) {
        var n = 0;
        for (i = 0; i <= text.length; i++) {
            if (i === text.length || text.charAt(i) === '\t') { cells.push({ start: st, text: text.substring(st, i), id: String(n) }); n++; st = i + 1; }
        }
        return { cells: cells, tabbed: true };
    }
    var pc = HP.parseCell(text), toks = [], k;
    for (k = 0; k < pc.times.length; k++) { toks.push({ s: pc.times[k].start, e: pc.times[k].end + pc.times[k].suffix.length }); }
    for (k = 0; k < pc.placeholders.length; k++) { toks.push({ s: pc.placeholders[k].start, e: pc.placeholders[k].end }); }
    toks.sort(function (a, b) { return a.s - b.s; });
    if (toks.length <= 1) { return { cells: [{ start: 0, text: text, id: '0' }], tabbed: false, single: true }; }
    var rest = text;
    for (k = 0; k < toks.length; k++) {
        cells.push({ start: toks[k].s, text: text.substring(toks[k].s, toks[k].e), id: String(k) });
        var blank = ''; for (i = toks[k].s; i < toks[k].e; i++) { blank += ' '; }
        rest = rest.substring(0, toks[k].s) + blank + rest.substring(toks[k].e);
    }
    if (HP.trim(rest)) { cells.push({ start: 0, text: rest, id: 'R' }); }
    return { cells: cells, tabbed: false };
};
// Atomes d'une cellule / atoms of a cell
HP.atomsOfCell = function (cellText, absStart, base) {
    var pc = HP.parseCell(cellText), out = [], k, a;
    function mk(kind, extra, relS, relE) {
        var o = { kind: kind, fi: base.fi, start: absStart + relS, end: absStart + relE, cellId: base.cellId, line: base.line, para: base.para };
        for (var p in extra) { if (extra.hasOwnProperty(p)) { o[p] = extra[p]; } }
        return o;
    }
    for (k = 0; k < pc.times.length; k++) {
        var t = pc.times[k];
        a = mk('time', { h: t.h, m: t.m, hourDigits: t.hourDigits, sep: t.sep, suffix: t.suffix, pm: t.pm, digits: t.digits, text: t.text }, t.start, t.end + t.suffix.length);
        a.sub = k; if (pc.times.length === 1 && pc.label) { a.label = pc.label; }
        out.push(a);
    }
    for (k = 0; k < pc.placeholders.length; k++) {
        var p2 = pc.placeholders[k];
        a = mk('ph', { hourDigits: p2.hourDigits, sep: p2.sep, suffix: '', digits: p2.digits, text: p2.text }, p2.start, p2.end);
        a.sub = pc.times.length + k; if (pc.placeholders.length === 1 && !pc.times.length && pc.label) { a.label = pc.label; }
        out.push(a);
    }
    if (!pc.times.length && !pc.placeholders.length) {
        if (pc.date) { out.push(mk('date', { date: pc.date, weekday: pc.weekday, text: cellText }, 0, cellText.length)); }
        else {
            if (pc.integer !== null) { out.push(mk('int', { value: pc.integer, text: cellText }, 0, cellText.length)); }
            if (pc.weekday >= 0) { out.push(mk('wd', { weekday: pc.weekday, text: cellText }, 0, cellText.length)); }
        }
        var labs = HP.allLabels(cellText);
        for (k = 0; k < labs.length; k++) { a = mk('label', { label: labs[k].key, text: cellText.substr(labs[k].pos, labs[k].len), relPos: labs[k].pos }, labs[k].pos, labs[k].pos + labs[k].len); a.sub = k; out.push(a); }
    }
    return out;
};
// Tous les atomes d'un ensemble de blocs / all atoms of a set of frames
HP.atomsFromFrames = function (frames) {
    var atoms = [], singles = [], fi, li, ci, k, nR = 0, nL = 0, rowFrames = [];
    for (fi = 0; fi < frames.length; fi++) {
        var cs = String(frames[fi].contents);
        if (/[A-Za-z\u00C0-\u024F\u0621-\u064A]/.test(cs)) { if (HP.rtlGuess(cs)) { nR++; } else { nL++; } }
    }
    var globalRtl = nR > nL;
    for (fi = 0; fi < frames.length; fi++) {
        var F = frames[fi], s = String(F.contents), lines = HP.splitLines(s), info = [];
        var l = F.bounds[0], tp = F.bounds[1], r = F.bounds[2], w = Math.max(1, r - l);
        var hasLetters = /[A-Za-z\u00C0-\u024F\u0621-\u064A]/.test(s);
        var y = 0, frameRtl = hasLetters ? HP.rtlGuess(s) : globalRtl, timeLines = 0, perLine = [];
        if (hasLetters && frames.length > 1) { frameRtl = globalRtl; }
        for (li = 0; li < lines.length; li++) {
            var met = F.metric ? F.metric(lines[li].start) : { size: 12, leading: 14.4 };
            if (li === 0) { y = F.point ? F.anchor[1] : tp - met.size * 0.8; } else { y -= met.leading; }
            var rtl = F.rtl ? F.rtl(lines[li].para) : null; if (rtl === null || rtl === undefined) { rtl = frameRtl; }
            var cl = HP.cellsOfLine(lines[li].text), lineAtoms = [];
            for (ci = 0; ci < cl.cells.length; ci++) {
                var cell = cl.cells[ci], absS = lines[li].start + cell.start;
                var ats = HP.atomsOfCell(cell.text, absS, { fi: fi, cellId: cell.id, line: li, para: lines[li].para });
                for (k = 0; k < ats.length; k++) {
                    var a = ats[k], len = Math.max(1, lines[li].text.length);
                    var mid = (a.kind === 'label' ? cell.start + a.relPos : cell.start + (a.kind === 'time' || a.kind === 'ph' ? (a.start - absS) : 0)) + Math.max(1, a.end - a.start) / 2;
                    if (a.kind === 'time' || a.kind === 'ph') { mid = (a.start - lines[li].start) + (a.end - a.start) / 2; }
                    a.x = rtl ? r - w * (mid / len) : l + w * (mid / len);
                    a.y = y; a.size = met.size; a.leading = met.leading; a.rtl = rtl;
                    a.tabbed = cl.tabbed; a.cellIndex = cell.id;
                    a.subKey = cell.id + (a.kind === 'int' ? ':i' : (a.kind === 'wd' ? ':w' : (a.kind === 'date' ? ':d' : (a.kind === 'label' ? ':l' + a.sub : (cl.tabbed && a.sub ? '.' + a.sub : '')))));
                    a.lineStart = lines[li].start; a.lineLen = lines[li].text.length;
                    lineAtoms.push(a);
                }
            }
            var nt = 0; for (k = 0; k < lineAtoms.length; k++) { if (lineAtoms[k].kind === 'time' || lineAtoms[k].kind === 'ph') { nt++; } }
            if (nt) { timeLines++; }
            perLine.push({ atoms: lineAtoms, nCells: cl.cells.length, single: !!cl.single });
        }
        var multi = timeLines >= 2;
        var nonEmpty = []; for (li = 0; li < perLine.length; li++) { if (perLine[li].atoms.length) { nonEmpty.push(perLine[li]); } }
        for (li = 0; li < perLine.length; li++) {
            var pl = perLine[li];
            for (k = 0; k < pl.atoms.length; k++) {
                var at = pl.atoms[k];
                at.frameBounds = F.bounds;
                if (multi) { at.key = 'F' + fi + ':' + at.subKey; }
                else if (nonEmpty.length === 1 && pl.nCells >= 2) {
                    at.key = null; at.rowFrame = fi; at.nCells = pl.nCells;
                    if (HP.idx(rowFrames, fi) < 0) { rowFrames.push(fi); }
                } else if (nonEmpty.length === 1 && pl.single && pl.atoms.length >= 1) {
                    at.x = (l + r) / 2; at.key = null; at.singleFrame = true; singles.push(at);
                } else { at.key = 'F' + fi + ':' + at.subKey; }
                atoms.push(at);
            }
        }
    }
    // Blocs d'une ligne à plusieurs cellules : regroupés s'ils se chevauchent en x et ont autant de cellules
    // One-line multi-cell frames: grouped when they overlap in x and have the same number of cells
    if (rowFrames.length) {
        var parent = [], nc = {}, a1, b1, ov;
        for (k = 0; k < rowFrames.length; k++) { parent.push(k); }
        var find = function (q) { while (parent[q] !== q) { parent[q] = parent[parent[q]]; q = parent[q]; } return q; };
        for (k = 0; k < atoms.length; k++) { if (atoms[k].rowFrame !== undefined) { nc[atoms[k].rowFrame] = atoms[k].nCells; } }
        for (k = 0; k < rowFrames.length; k++) {
            for (var k2 = k + 1; k2 < rowFrames.length; k2++) {
                a1 = frames[rowFrames[k]].bounds; b1 = frames[rowFrames[k2]].bounds;
                ov = Math.min(a1[2], b1[2]) - Math.max(a1[0], b1[0]);
                if (nc[rowFrames[k]] === nc[rowFrames[k2]] && ov > 0.5 * Math.min(a1[2] - a1[0], b1[2] - b1[0])) { parent[find(k)] = find(k2); }
            }
        }
        for (k = 0; k < atoms.length; k++) {
            if (atoms[k].rowFrame === undefined) { continue; }
            atoms[k].key = 'L' + find(HP.idx(rowFrames, atoms[k].rowFrame)) + ':' + atoms[k].subKey;
        }
    }
    // Blocs à une seule cellule : colonnes par position horizontale / single-cell frames: columns by x
    if (singles.length) {
        var ws = [];
        for (k = 0; k < singles.length; k++) { ws.push(singles[k].frameBounds[2] - singles[k].frameBounds[0]); }
        var tol = Math.max(2, 0.5 * HP.median(ws));
        singles.sort(function (a, b) { return a.x - b.x; });
        var xs = []; for (k = 0; k < singles.length; k++) { xs.push(singles[k].x); }
        var g = HP.clusterSorted(xs, tol);
        for (k = 0; k < singles.length; k++) {
            var suffix = singles[k].kind === 'int' ? ':i' : (singles[k].kind === 'wd' ? ':w' : (singles[k].kind === 'date' ? ':d' : (singles[k].kind === 'label' ? ':l' : '')));
            singles[k].key = 'X' + g[k] + suffix;
        }
    }
    return atoms;
};
// ---------- Application des corrections (indépendante du DOM) / applying fixes (DOM-agnostic) ----------
// api : { text(), replaceChar(i, s), removeChar(i), insertAfter(i, s) }
// items : éléments du plan pour UN bloc / plan items for ONE frame
HP.applyToFrame = function (api, items) {
    var done = [], failed = [], i, e, k;
    items.sort(function (a, b) { return b.atom.start - a.atom.start; });
    for (i = 0; i < items.length; i++) {
        var it = items[i], st = it.atom.start, cur = api.text();
        if (cur.substr(st, it.oldText.length) !== it.oldText) { failed.push({ item: it, why: 'changed' }); continue; }
        var edits = HP.charEdits(it.oldText, it.newText);
        try {
            for (k = edits.length - 1; k >= 0; k--) {
                e = edits[k];
                var at = st + e.pos;
                if (e.del === 1 && e.ins.length === 1) { api.replaceChar(at, e.ins); continue; }
                if (e.del > 0) {
                    if (e.ins.length) { api.replaceChar(at, e.ins); }
                    var rm = e.ins.length ? e.del - 1 : e.del, startRm = e.ins.length ? at + e.ins.length : at;
                    for (var q = 0; q < rm; q++) { api.removeChar(startRm); }
                } else if (e.ins.length) {
                    if (at > 0) { api.insertAfter(at - 1, e.ins); } else { api.replaceChar(0, e.ins + api.text().charAt(0)); }
                }
            }
        } catch (err) { failed.push({ item: it, why: String(err) }); continue; }
        if (api.text().substr(st, it.newText.length) === it.newText) { done.push(it); } else { failed.push({ item: it, why: 'verify' }); }
    }
    return { done: done, failed: failed };
};
