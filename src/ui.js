// =====================================================================
//  PARTIE ILLUSTRATOR / ILLUSTRATOR PART
// =====================================================================
var LANG = 'fr';
var L10N = {
    fr: {
        title: 'Horaires de prière — contrôle', noDoc: 'Aucun document ouvert.\nOuvrez le document qui contient le tableau des horaires.',
        noSel: 'Rien de sélectionné.\nSélectionnez les textes du tableau (blocs, groupes ou le bloc entier) puis relancez le script.',
        noTimes: 'Aucune heure (05:12, 5h12, ٠٥:١٢, --:--) trouvée dans la sélection.',
        lang: 'Langue / Language :', place: 'Lieu', city: 'Ville :', custom: '— Personnalisé —', lat: 'Latitude :', lon: 'Longitude :', tz: 'UTC + :',
        dst: 'Heure d\'été :', dstNone: 'aucune', dstEu: 'Europe (mars → octobre)', dstUs: 'Amérique du Nord', dstEg: 'Égypte',
        calc: 'Calcul', method: 'Méthode :', fajrA: 'Angle Fajr (°) :', ishaA: 'Angle Isha (°) :', ishaM: 'ou Isha = Maghrib + min (0 = angle) :',
        asr: 'Asr :', asr1: 'standard (malékite, chaféite, hanbalite)', asr2: 'hanafite', imsak: 'Imsak = Fajr − min :',
        hl: 'Hautes latitudes :', hlMid: 'milieu de la nuit', hl7: 'septième de la nuit', hlAng: 'selon l\'angle', hlNone: 'aucune règle',
        round: 'Arrondi :', rNear: 'à la minute la plus proche', rUp: 'à la minute supérieure',
        adj: 'Minutes de précaution (+/−) :', tableP: 'Tableau', start: 'Date de la 1re ligne (JJ/MM/AAAA) :', tol: 'Tolérance (min) :',
        blocks: 'Blocs côte à côte :', rtlBlocks: 'blocs lus de droite à gauche', order: 'Ordre des colonnes vides sans en-tête :', rtlCols: 'colonnes de droite à gauche',
        action: 'Action', aAnalyse: 'Analyser seulement (rien n\'est modifié)', aCalc: 'Corriger les heures fausses (valeur calculée)',
        aInternal: 'Corriger seulement les fautes de frappe (garder le décalage propre au tableau)', fill: 'Remplir les cases vides (--:--, 00:00)',
        markers: 'Poser des repères sur un calque non imprimable', search: 'Chercher les causes probables (date, ville, méthode, Asr)',
        tip: 'Conseil : travaillez sur une copie du fichier. Les modifications s\'annulent avec Ctrl+Z / Cmd+Z.\nLes heures calculées sont astronomiques : le calendrier officiel de votre pays fait foi.',
        ok: 'Analyser', cancel: 'Annuler', badNum: 'Valeur incorrecte : ', badDate: 'Date de la 1re ligne incorrecte (JJ/MM/AAAA).',
        res: 'Résultat', close: 'Fermer', apply: 'Appliquer', save: 'Enregistrer le rapport…', select: 'Sélectionner les textes concernés',
        cRow: 'Ligne / date', cPr: 'Prière', cWr: 'Écrit', cCa: 'Calculé', cDi: 'Écart', cSt: 'Remarque',
        stErr: 'faux', stInt: 'faute de frappe probable', stFill: 'à remplir', stOk: 'juste',
        summary: '%1 heures lues sur %2 lignes, %3 colonnes reconnues. Hors tolérance : %4. Fautes de frappe probables : %5. Cases à remplir : %6.',
        nothing: 'Aucun écart : toutes les heures lues correspondent au calcul (tolérance %1 min).',
        confirmSys: 'Des causes systématiques ont été trouvées (voir la liste). Corriger quand même toutes les cellules ?',
        applied: '%1 cellule(s) modifiée(s). %2 échec(s).', layer: 'Contrôle horaires de prière', saved: 'Rapport enregistré : ',
        diagT: 'Diagnostic', none: '(aucun)', colsT: 'Colonnes reconnues : ', unk: 'inconnue', dateFrom: 'Dates lues dans le tableau : %1 ligne(s).'
    },
    en: {
        title: 'Prayer times — check', noDoc: 'No document is open.\nOpen the document that contains the prayer timetable.',
        noSel: 'Nothing is selected.\nSelect the timetable texts (frames, groups or the whole frame) and run the script again.',
        noTimes: 'No time (05:12, 5h12, ٠٥:١٢, --:--) found in the selection.',
        lang: 'Langue / Language:', place: 'Location', city: 'City:', custom: '— Custom —', lat: 'Latitude:', lon: 'Longitude:', tz: 'UTC +:',
        dst: 'Daylight saving:', dstNone: 'none', dstEu: 'Europe (March → October)', dstUs: 'North America', dstEg: 'Egypt',
        calc: 'Calculation', method: 'Method:', fajrA: 'Fajr angle (°):', ishaA: 'Isha angle (°):', ishaM: 'or Isha = Maghrib + min (0 = angle):',
        asr: 'Asr:', asr1: 'standard (Maliki, Shafi\'i, Hanbali)', asr2: 'Hanafi', imsak: 'Imsak = Fajr − min:',
        hl: 'High latitudes:', hlMid: 'middle of the night', hl7: 'seventh of the night', hlAng: 'angle based', hlNone: 'no rule',
        round: 'Rounding:', rNear: 'to the nearest minute', rUp: 'up to the next minute',
        adj: 'Precaution minutes (+/−):', tableP: 'Timetable', start: 'Date of the 1st row (DD/MM/YYYY):', tol: 'Tolerance (min):',
        blocks: 'Blocks side by side:', rtlBlocks: 'blocks read right to left', order: 'Order of empty columns without header:', rtlCols: 'columns right to left',
        action: 'Action', aAnalyse: 'Analyse only (nothing is changed)', aCalc: 'Fix wrong times (calculated value)',
        aInternal: 'Fix typos only (keep the timetable\'s own offset)', fill: 'Fill empty cells (--:--, 00:00)',
        markers: 'Draw markers on a non-printing layer', search: 'Look for likely causes (date, city, method, Asr)',
        tip: 'Tip: work on a copy of the file. Changes can be undone with Ctrl+Z / Cmd+Z.\nCalculated times are astronomical: your country\'s official calendar prevails.',
        ok: 'Analyse', cancel: 'Cancel', badNum: 'Wrong value: ', badDate: 'Wrong date of the 1st row (DD/MM/YYYY).',
        res: 'Result', close: 'Close', apply: 'Apply', save: 'Save report…', select: 'Select the texts concerned',
        cRow: 'Row / date', cPr: 'Prayer', cWr: 'Written', cCa: 'Calculated', cDi: 'Gap', cSt: 'Note',
        stErr: 'wrong', stInt: 'likely typo', stFill: 'to fill', stOk: 'right',
        summary: '%1 times read on %2 rows, %3 columns recognised. Out of tolerance: %4. Likely typos: %5. Cells to fill: %6.',
        nothing: 'No gap: every time read matches the calculation (tolerance %1 min).',
        confirmSys: 'Systematic causes were found (see the list). Fix every cell anyway?',
        applied: '%1 cell(s) changed. %2 failure(s).', layer: 'Prayer times check', saved: 'Report saved: ',
        diagT: 'Diagnosis', none: '(none)', colsT: 'Recognised columns: ', unk: 'unknown', dateFrom: 'Dates read in the table: %1 row(s).'
    }
};
function T(k) { return (L10N[LANG] && L10N[LANG][k] !== undefined) ? L10N[LANG][k] : k; }
function F(s) { var a = arguments, i; for (i = 1; i < a.length; i++) { s = s.split('%' + i).join(String(a[i])); } return s; }
var PNAMES = {
    fr: { imsak: 'Imsak', fajr: 'Fajr', sunrise: 'Chourouk', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    en: { imsak: 'Imsak', fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }
};
var WDN = { fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
function pn(k) { return PNAMES[LANG][k] || k; }
function hm(v) { if (isNaN(v)) { return '—'; } v = ((Math.round(v) % 1440) + 1440) % 1440; return HP.pad2(Math.floor(v / 60)) + ':' + HP.pad2(v % 60); }
function sgn(d) { d = Math.round(d); return (d > 0 ? '+' : '') + d + ' min'; }
function rowLabel(row) { return (row.index + 1) + ' (' + HP.fmtDate(row.J) + ')'; }

// Texte d'un diagnostic / diagnosis text
function diagText(d) {
    var fr = LANG === 'fr', c = d.col ? pn(d.col.prayer || d.col.label) : '';
    switch (d.code) {
    case 'labelMismatch': return fr ? 'Colonne titrée « ' + pn(d.a) + ' » mais ses heures sont celles de ' + pn(d.b) + ' (colonnes inversées ?).'
        : 'Column titled "' + pn(d.a) + '" but its times are those of ' + pn(d.b) + ' (swapped columns?).';
    case 'colUnknown': return fr ? 'Une colonne de ' + d.n + ' heure(s) ne correspond à aucune prière (iqama, autre ville, autre mois ?) : non contrôlée.'
        : 'A column of ' + d.n + ' time(s) matches no prayer (iqama, other city, other month?): not checked.';
    case 'colOffset': return fr ? c + ' : toute la colonne est décalée de ' + sgn(d.v) + ' par rapport au calcul (minutes de précaution, autre méthode ou autre ville). Si le tableau suit le calendrier officiel, réglez « Minutes de précaution » ou corrigez seulement les fautes de frappe.'
        : c + ': the whole column is shifted by ' + sgn(d.v) + ' from the calculation (precaution minutes, other method or other city). If the table follows the official calendar, set "Precaution minutes" or fix typos only.';
    case 'colHour': return fr ? c + ' : décalage d\'une heure (' + sgn(d.v) + ') — heure d\'été ou fuseau horaire faux.'
        : c + ': one-hour shift (' + sgn(d.v) + ') — wrong daylight saving or time zone.';
    case 'mode12': return fr ? c + ' : heures écrites sur 12 h (ex. 7:30 pour 19:30), lues comme telles.' : c + ': times written in 12-hour form (e.g. 7:30 for 19:30), read as such.';
    case 'order': return fr ? 'Ligne ' + rowLabel(d.row) + ' : ' + pn(d.b) + ' n\'est pas après ' + pn(d.a) + '.' : 'Row ' + rowLabel(d.row) + ': ' + pn(d.b) + ' is not after ' + pn(d.a) + '.';
    case 'dupRow': return fr ? 'Ligne ' + rowLabel(d.row) + ' : heures identiques à la ligne précédente (copier-coller ?).' : 'Row ' + rowLabel(d.row) + ': same times as the previous row (copy-paste?).';
    case 'dayNum': return fr ? 'Ligne ' + rowLabel(d.row) + ' : jour écrit ' + d.a + ', attendu ' + d.b + '.' : 'Row ' + rowLabel(d.row) + ': day written ' + d.a + ', expected ' + d.b + '.';
    case 'seqNum': return fr ? 'Ligne ' + rowLabel(d.row) + ' : numéro ' + d.a + ' au lieu de ' + d.b + ' (suite interrompue).' : 'Row ' + rowLabel(d.row) + ': number ' + d.a + ' instead of ' + d.b + ' (broken sequence).';
    case 'weekday': return fr ? 'Ligne ' + rowLabel(d.row) + ' : jour de la semaine écrit ' + WDN.fr[d.a] + ', c\'est un ' + WDN.fr[d.b] + '.' : 'Row ' + rowLabel(d.row) + ': weekday written ' + WDN.en[d.a] + ', it is a ' + WDN.en[d.b] + '.';
    case 'dateGap': return fr ? 'Ligne ' + rowLabel(d.row) + ' : les dates écrites sautent de ' + d.a + ' jour(s).' : 'Row ' + rowLabel(d.row) + ': written dates jump by ' + d.a + ' day(s).';
    case 'shift': return fr ? 'Les heures correspondent aux dates décalées de ' + (d.v > 0 ? '+' : '') + d.v + ' jour(s) (écart moyen ' + d.a + ' → ' + d.b + ' min) : date de 1re ligne fausse ou heures recopiées d\'un autre jour.'
        : 'The times match the dates shifted by ' + (d.v > 0 ? '+' : '') + d.v + ' day(s) (mean gap ' + d.a + ' → ' + d.b + ' min): wrong 1st-row date or times copied from another day.';
    case 'startDate': return fr ? 'Les heures correspondent plutôt à un tableau commençant le ' + HP.fmtDate(d.J) + ' (écart moyen ' + d.a + ' → ' + d.b + ' min).'
        : 'The times rather match a table starting on ' + HP.fmtDate(d.J) + ' (mean gap ' + d.a + ' → ' + d.b + ' min).';
    case 'city': return fr ? 'Les heures correspondent plutôt à : ' + d.city.name + ' (écart moyen ' + d.a + ' → ' + d.b + ' min). Vérifiez la ville du tableau.'
        : 'The times rather match: ' + d.city.name + ' (mean gap ' + d.a + ' → ' + d.b + ' min). Check the city of the table.';
    case 'method': return fr ? 'Fajr / Isha correspondent plutôt à la méthode « ' + d.m.fr + ' » (écart moyen ' + d.a + ' → ' + d.b + ' min).'
        : 'Fajr / Isha rather match the method "' + d.m.en + '" (mean gap ' + d.a + ' → ' + d.b + ' min).';
    case 'asr': return fr ? 'Asr correspond plutôt au calcul ' + (d.v === 2 ? 'hanafite' : 'standard') + ' (écart moyen ' + d.a + ' → ' + d.b + ' min).'
        : 'Asr rather matches the ' + (d.v === 2 ? 'Hanafi' : 'standard') + ' calculation (mean gap ' + d.a + ' → ' + d.b + ' min).';
    }
    return d.code;
}
function isSystematic(A) {
    for (var i = 0; i < A.diags.length; i++) { if (HP.idx(['colOffset', 'colHour', 'shift', 'startDate', 'city', 'method', 'asr'], A.diags[i].code) >= 0) { return true; } }
    return false;
}

// ---------- Réglages mémorisés / remembered settings ----------
var CFG_FILE = 'HorairesPriere_reglages.txt';
function defaults() {
    var d = new Date();
    return { lang: (String($.locale).indexOf('fr') === 0 ? 'fr' : 'en'), city: '16 Alger', lat: '36.754', lon: '3.059', tz: '1', dst: 'none', method: 'dz',
        fajr: '18', isha: '17', ishaMin: '0', asr: '1', imsak: '10', highLat: 'middle', rounding: 'nearest',
        adj_fajr: '0', adj_sunrise: '0', adj_dhuhr: '0', adj_asr: '0', adj_maghrib: '3', adj_isha: '0',
        tol: '2', start: HP.pad2(d.getDate()) + '/' + HP.pad2(d.getMonth() + 1) + '/' + d.getFullYear(), blocks: '1', rtlBlocks: '0',
        fillOrder: 'fajr sunrise dhuhr asr maghrib isha', rtlCols: '0', action: 'analyse', fill: '0', markers: '1', search: '1' };
}
function loadSettings() {
    var c = defaults(), f, line, p;
    try {
        f = new File(Folder.userData + '/' + CFG_FILE);
        if (f.exists && f.open('r')) {
            f.encoding = 'UTF-8';
            while (!f.eof) { line = f.readln(); p = line.indexOf('='); if (p > 0 && c.hasOwnProperty(line.substring(0, p))) { c[line.substring(0, p)] = line.substring(p + 1); } }
            f.close();
        }
    } catch (e) { }
    return c;
}
function saveSettings(c) {
    try {
        var f = new File(Folder.userData + '/' + CFG_FILE), k;
        f.encoding = 'UTF-8';
        if (f.open('w')) { for (k in c) { if (c.hasOwnProperty(k)) { f.writeln(k + '=' + c[k]); } } f.close(); }
    } catch (e) { }
}

// ---------- Dialogue des réglages / settings dialog ----------
function num(s) { return parseFloat(String(s).replace(',', '.')); }
function settingsDialog(c, cities) {
    var w = new Window('dialog', T('title') + ' v' + HP.VERSION), i;
    w.orientation = 'column'; w.alignChildren = 'fill';
    var gl = w.add('group'); gl.add('statictext', undefined, T('lang'));
    var ddLang = gl.add('dropdownlist', undefined, ['Français', 'English']); ddLang.selection = (LANG === 'fr') ? 0 : 1;
    var top = w.add('group'); top.orientation = 'row'; top.alignChildren = 'top';
    var colA = top.add('group'); colA.orientation = 'column'; colA.alignChildren = 'fill';
    var colB = top.add('group'); colB.orientation = 'column'; colB.alignChildren = 'fill';
    function row(parent, label, value, width) { var g = parent.add('group'); g.add('statictext', undefined, label); var e = g.add('edittext', undefined, value); e.characters = width || 7; return e; }
    // Lieu / location
    var pL = colA.add('panel', undefined, T('place')); pL.alignChildren = 'left';
    var gC = pL.add('group'); gC.add('statictext', undefined, T('city'));
    var names = [T('custom')]; for (i = 0; i < cities.length; i++) { names.push(cities[i].name); }
    var ddCity = gC.add('dropdownlist', undefined, names); ddCity.selection = 0;
    for (i = 0; i < cities.length; i++) { if (cities[i].name === c.city) { ddCity.selection = i + 1; } }
    var gLL = pL.add('group'); var eLat = row(gLL, T('lat'), c.lat), eLon = row(gLL, T('lon'), c.lon);
    var gTZ = pL.add('group'); var eTz = row(gTZ, T('tz'), c.tz, 4);
    gTZ.add('statictext', undefined, T('dst'));
    var DSTS = ['none', 'eu', 'us', 'eg'], ddDst = gTZ.add('dropdownlist', undefined, [T('dstNone'), T('dstEu'), T('dstUs'), T('dstEg')]);
    ddDst.selection = Math.max(0, HP.idx(DSTS, c.dst));
    ddCity.onChange = function () {
        if (!ddCity.selection || ddCity.selection.index === 0) { return; }
        var ct = cities[ddCity.selection.index - 1];
        eLat.text = String(ct.lat); eLon.text = String(ct.lon); eTz.text = String(ct.tz); ddDst.selection = Math.max(0, HP.idx(DSTS, ct.dst));
    };
    // Calcul / calculation
    var pC = colA.add('panel', undefined, T('calc')); pC.alignChildren = 'left';
    var gM = pC.add('group'); gM.add('statictext', undefined, T('method'));
    var mNames = []; for (i = 0; i < HP.METHODS.length; i++) { mNames.push(HP.METHODS[i][LANG]); }
    var ddM = gM.add('dropdownlist', undefined, mNames); ddM.selection = 0;
    for (i = 0; i < HP.METHODS.length; i++) { if (HP.METHODS[i].id === c.method) { ddM.selection = i; } }
    var gA = pC.add('group'); var eFa = row(gA, T('fajrA'), c.fajr, 5), eIa = row(gA, T('ishaA'), c.isha, 5);
    var eIm = row(pC, T('ishaM'), c.ishaMin, 4);
    var gAs = pC.add('group'); gAs.add('statictext', undefined, T('asr'));
    var ddAsr = gAs.add('dropdownlist', undefined, [T('asr1'), T('asr2')]); ddAsr.selection = (c.asr === '2') ? 1 : 0;
    var eImsak = row(pC, T('imsak'), c.imsak, 4);
    var gH = pC.add('group'); gH.add('statictext', undefined, T('hl'));
    var HLS = ['middle', 'seventh', 'angle', 'none'], ddHL = gH.add('dropdownlist', undefined, [T('hlMid'), T('hl7'), T('hlAng'), T('hlNone')]); ddHL.selection = Math.max(0, HP.idx(HLS, c.highLat));
    var gR = pC.add('group'); gR.add('statictext', undefined, T('round'));
    var RS = ['nearest', 'up'], ddR = gR.add('dropdownlist', undefined, [T('rNear'), T('rUp')]); ddR.selection = Math.max(0, HP.idx(RS, c.rounding));
    pC.add('statictext', undefined, T('adj'));
    var gAdj = pC.add('group'), eAdj = {}, AK = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (i = 0; i < AK.length; i++) { gAdj.add('statictext', undefined, pn(AK[i])); eAdj[AK[i]] = gAdj.add('edittext', undefined, c['adj_' + AK[i]]); eAdj[AK[i]].characters = 3; }
    ddM.onChange = function () {
        var M = HP.METHODS[ddM.selection.index]; if (M.id === 'custom') { return; }
        eFa.text = String(M.fajr); eIa.text = String(M.isha); eIm.text = String(M.ishaMin);
        for (var j = 0; j < AK.length; j++) { eAdj[AK[j]].text = String(M.adj[AK[j]] || 0); }
    };
    // Tableau / table
    var pT = colB.add('panel', undefined, T('tableP')); pT.alignChildren = 'left';
    var eStart = row(pT, T('start'), c.start, 11), eTol = row(pT, T('tol'), c.tol, 4);
    var gB = pT.add('group'); var eBl = row(gB, T('blocks'), c.blocks, 3); var cbRB = gB.add('checkbox', undefined, T('rtlBlocks')); cbRB.value = c.rtlBlocks === '1';
    pT.add('statictext', undefined, T('order'));
    var eOrd = pT.add('edittext', undefined, c.fillOrder); eOrd.characters = 40;
    var cbRC = pT.add('checkbox', undefined, T('rtlCols')); cbRC.value = c.rtlCols === '1';
    // Action
    var pA = colB.add('panel', undefined, T('action')); pA.alignChildren = 'left';
    var r1 = pA.add('radiobutton', undefined, T('aAnalyse')), r2 = pA.add('radiobutton', undefined, T('aCalc')), r3 = pA.add('radiobutton', undefined, T('aInternal'));
    r1.value = c.action === 'analyse'; r2.value = c.action === 'calc'; r3.value = c.action === 'internal'; if (!r2.value && !r3.value) { r1.value = true; }
    var cbFill = pA.add('checkbox', undefined, T('fill')); cbFill.value = c.fill === '1';
    var cbMk = pA.add('checkbox', undefined, T('markers')); cbMk.value = c.markers === '1';
    var cbSe = pA.add('checkbox', undefined, T('search')); cbSe.value = c.search === '1';
    var tip = colB.add('statictext', undefined, T('tip'), { multiline: true }); tip.preferredSize = [380, 60];
    var gBt = w.add('group'); gBt.alignment = 'right';
    gBt.add('button', undefined, T('cancel'), { name: 'cancel' }); var bOk = gBt.add('button', undefined, T('ok'), { name: 'ok' });
    var langChanged = false;
    ddLang.onChange = function () { var nl = ddLang.selection.index === 0 ? 'fr' : 'en'; if (nl !== LANG) { LANG = nl; langChanged = true; w.close(3); } };
    bOk.onClick = function () {
        var checks = [[eLat, -89, 89], [eLon, -180, 180], [eTz, -12, 14], [eFa, 0, 30], [eIa, 0, 30], [eIm, 0, 240], [eImsak, 0, 60], [eTol, 0, 60], [eBl, 1, 6]], j, v;
        for (j = 0; j < checks.length; j++) { v = num(checks[j][0].text); if (isNaN(v) || v < checks[j][1] || v > checks[j][2]) { alert(T('badNum') + checks[j][0].text); return; } }
        for (j = 0; j < AK.length; j++) { v = num(eAdj[AK[j]].text); if (isNaN(v) || Math.abs(v) > 60) { alert(T('badNum') + eAdj[AK[j]].text); return; } }
        if (isNaN(HP.parseUserDate(eStart.text))) { alert(T('badDate')); return; }
        w.close(1);
    };
    var r = w.show();
    if (r === 3 && langChanged) { c.lang = LANG; return 'relang'; }
    if (r !== 1) { return null; }
    c.lang = LANG; c.city = (ddCity.selection && ddCity.selection.index > 0) ? cities[ddCity.selection.index - 1].name : '';
    c.lat = eLat.text; c.lon = eLon.text; c.tz = eTz.text; c.dst = DSTS[ddDst.selection.index];
    c.method = HP.METHODS[ddM.selection.index].id; c.fajr = eFa.text; c.isha = eIa.text; c.ishaMin = eIm.text;
    c.asr = ddAsr.selection.index === 1 ? '2' : '1'; c.imsak = eImsak.text; c.highLat = HLS[ddHL.selection.index]; c.rounding = RS[ddR.selection.index];
    for (i = 0; i < AK.length; i++) { c['adj_' + AK[i]] = eAdj[AK[i]].text; }
    c.start = eStart.text; c.tol = eTol.text; c.blocks = eBl.text; c.rtlBlocks = cbRB.value ? '1' : '0';
    c.fillOrder = eOrd.text; c.rtlCols = cbRC.value ? '1' : '0';
    c.action = r2.value ? 'calc' : (r3.value ? 'internal' : 'analyse'); c.fill = cbFill.value ? '1' : '0';
    c.markers = cbMk.value ? '1' : '0'; c.search = cbSe.value ? '1' : '0';
    return 'ok';
}
function settingsFromCfg(c, cities) {
    var P = { method: c.method, fajrAngle: num(c.fajr), ishaAngle: num(c.isha), ishaMinutes: num(c.ishaMin), asrFactor: c.asr === '2' ? 2 : 1,
        imsakMinutes: num(c.imsak), highLat: c.highLat, rounding: c.rounding, adj: {} };
    var AK = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'], i, order = [], words = HP.words(c.fillOrder);
    for (i = 0; i < AK.length; i++) { P.adj[AK[i]] = num(c['adj_' + AK[i]]) || 0; }
    P.adj.imsak = 0;
    for (i = 0; i < words.length; i++) { var lk = HP.labelOf(words[i]) || (HP.idx(HP.KEYS, words[i]) >= 0 ? words[i] : null); if (lk) { order.push(lk); } }
    return { startJ: HP.parseUserDate(c.start), loc: { lat: num(c.lat), lon: num(c.lon), tz: num(c.tz), dst: c.dst }, P: P, tol: num(c.tol),
        blocks: Math.round(num(c.blocks)), rtlBlocks: c.rtlBlocks === '1', fillOrder: order, rtlColumns: c.rtlCols === '1',
        search: c.search === '1', cities: c.search === '1' ? cities : [] };
}

// ---------- Lecture du document / reading the document ----------
function collectTextFrames(sel) {
    var out = [];
    function add(it) {
        if (!it) { return; }
        var t = it.typename;
        if (t === 'TextFrame') { for (var q = 0; q < out.length; q++) { if (out[q] === it) { return; } } out.push(it); }
        else if (t === 'GroupItem') { for (var j = 0; j < it.pageItems.length; j++) { add(it.pageItems[j]); } }
        else if (t === 'TextRange') { try { var fr = it.story.textFrames; for (var k = 0; k < fr.length; k++) { add(fr[k]); } } catch (e) { } }
    }
    if (!sel) { return out; }
    if (sel.typename === 'TextRange') { add(sel); return out; }
    for (var i = 0; i < sel.length; i++) { add(sel[i]); }
    return out;
}
function descriptor(tf) {
    var gb = tf.geometricBounds, isPoint = false, nChars = 0, cacheM = {}, cacheR = {};
    try { isPoint = (tf.kind === TextType.POINTTEXT); } catch (e) { }
    try { nChars = tf.characters.length; } catch (e2) { }
    return {
        contents: tf.contents, bounds: [gb[0], gb[1], gb[2], gb[3]], point: isPoint,
        anchor: isPoint ? [tf.anchor[0], tf.anchor[1]] : [gb[0], gb[1]],
        metric: function (off) {
            if (cacheM[off]) { return cacheM[off]; }
            var m = { size: 12, leading: 14.4 };
            try {
                var a = tf.characters[Math.max(0, Math.min(off, nChars - 1))].characterAttributes, sz = a.size;
                m = { size: sz, leading: a.autoLeading ? sz * 1.2 : (a.leading || sz * 1.2) };
            } catch (e3) { }
            cacheM[off] = m; return m;
        },
        rtl: function (p) {
            if (cacheR.hasOwnProperty(p)) { return cacheR[p]; }
            var v = null;
            try { var d = tf.paragraphs[p].paragraphAttributes.paragraphDirection; if (d !== undefined && d !== null) { v = String(d).indexOf('RIGHT_TO_LEFT') >= 0; } } catch (e4) { }
            cacheR[p] = v; return v;
        }
    };
}
function domApi(tf) {
    return {
        text: function () { return tf.contents; },
        replaceChar: function (i, s) { tf.characters[i].contents = s; },
        removeChar: function (i) { tf.characters[i].remove(); },
        insertAfter: function (i, s) { var ch = tf.characters[i]; ch.contents = ch.contents + s; }
    };
}

// ---------- Repères / markers ----------
function makeColor(doc, r, g, b, cc, mm, yy, kk) {
    var col;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) { col = new CMYKColor(); col.cyan = cc; col.magenta = mm; col.yellow = yy; col.black = kk; }
    else { col = new RGBColor(); col.red = r; col.green = g; col.blue = b; }
    return col;
}
function markerLayer(doc) {
    var L = null, i;
    for (i = 0; i < doc.layers.length; i++) { if (doc.layers[i].name === L10N.fr.layer || doc.layers[i].name === L10N.en.layer) { L = doc.layers[i]; } }
    if (!L) { L = doc.layers.add(); L.name = T('layer'); }
    L.locked = false; L.visible = true;
    while (L.pageItems.length) { L.pageItems[0].remove(); }
    try { L.printable = false; } catch (e) { }
    try { L.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e2) { }
    return L;
}
function atomBox(a) {
    var b = a.frameBounds;
    if (a.singleFrame) { return [b[0] - 1.5, b[1] + 1.5, b[2] + 1.5, b[3] - 1.5]; }
    var w = Math.max(1, b[2] - b[0]), len = Math.max(1, a.lineLen || 1);
    var half = Math.max(a.size * 0.9, w * (Math.max(1, a.end - a.start) / len) / 2 + 1);
    return [a.x - half, a.y + a.size * 0.85, a.x + half, a.y - a.size * 0.35];
}
function drawMarkers(doc, A, plan) {
    var L = markerLayer(doc), red = makeColor(doc, 230, 0, 0, 0, 100, 100, 0), orange = makeColor(doc, 255, 140, 0, 0, 50, 100, 0), blue = makeColor(doc, 0, 110, 230, 100, 40, 0, 0);
    var i, n = 0;
    function box(a, color, label) {
        var bx = atomBox(a), r = L.pathItems.rectangle(bx[1], bx[0], bx[2] - bx[0], bx[1] - bx[3]);
        r.filled = false; r.stroked = true; r.strokeColor = color; r.strokeWidth = 0.75;
        if (label) {
            var t = L.textFrames.add(); t.contents = label; t.position = [bx[2] + 1, bx[1]];
            try { t.textRange.characterAttributes.size = Math.max(4, Math.min(8, a.size * 0.6)); t.textRange.characterAttributes.fillColor = color; } catch (e) { }
        }
        n++;
    }
    for (i = 0; i < A.cells.length; i++) {
        var ce = A.cells[i];
        if (ce.status === 'error') { box(ce.atom, ce.internal ? red : orange, sgn(ce.diff) + ' → ' + hm(ce.expected)); }
        else if (ce.internal) { box(ce.atom, red, '?'); }
    }
    for (i = 0; i < A.placeholders.length; i++) { box(A.placeholders[i].atom, blue, hm(A.placeholders[i].expected)); }
    for (i = 0; i < A.diags.length; i++) { if (A.diags[i].atom) { box(A.diags[i].atom, red, ''); } }
    return n;
}

// ---------- Rapport / report ----------
function reportText(A, S, cfg, plan) {
    var out = [], i, fr = LANG === 'fr';
    out.push(T('title') + ' v' + HP.VERSION + ' — ' + new Date().toString());
    out.push((fr ? 'Lieu : ' : 'Location: ') + (cfg.city || T('custom')) + ' (' + S.loc.lat + ', ' + S.loc.lon + ', UTC' + (S.loc.tz >= 0 ? '+' : '') + S.loc.tz + ', ' + S.loc.dst + ')');
    out.push((fr ? 'Méthode : ' : 'Method: ') + (HP.methodById(S.P.method) || HP.METHODS[0])[LANG] + ' — Fajr ' + S.P.fajrAngle + '°, Isha ' + (S.P.ishaMinutes > 0 ? '+' + S.P.ishaMinutes + ' min' : S.P.ishaAngle + '°') + ', Asr ×' + S.P.asrFactor + ', Imsak −' + S.P.imsakMinutes + ' min');
    var adj = []; for (var k in S.P.adj) { if (S.P.adj.hasOwnProperty(k) && S.P.adj[k]) { adj.push(pn(k) + ' ' + (S.P.adj[k] > 0 ? '+' : '') + S.P.adj[k]); } }
    out.push((fr ? 'Minutes de précaution : ' : 'Precaution minutes: ') + (adj.length ? adj.join(', ') : '0'));
    out.push((fr ? '1re ligne : ' : '1st row: ') + HP.fmtDate(S.startJ) + ' — ' + (fr ? 'tolérance ' : 'tolerance ') + S.tol + ' min');
    out.push('');
    out.push(F(T('summary'), A.stats.n, A.rows, countCols(A), A.stats.errors, A.stats.internal, A.placeholders.length));
    out.push(T('colsT') + colsText(A));
    if (A.dateInfo && A.dateInfo.fromCells) { out.push(F(T('dateFrom'), A.dateInfo.fromCells)); }
    out.push(''); out.push(T('diagT') + ' :');
    if (!A.diags.length) { out.push('  ' + T('none')); }
    for (i = 0; i < A.diags.length; i++) { out.push('  - ' + diagText(A.diags[i])); }
    out.push(''); out.push([T('cRow'), T('cPr'), T('cWr'), T('cCa'), T('cDi'), T('cSt')].join('\t'));
    var lines = findingLines(A);
    for (i = 0; i < lines.length; i++) { out.push(lines[i].join('\t')); }
    if (plan && plan.length) { out.push(''); out.push(fr ? 'Modifications prévues :' : 'Planned changes:'); for (i = 0; i < plan.length; i++) { out.push('  ' + plan[i].oldText + ' → ' + plan[i].newText); } }
    out.push('');
    out.push(fr ? 'Heures astronomiques calculées hors ligne (aucune connexion). Le calendrier officiel de votre pays fait foi.' : 'Astronomical times calculated offline (no connection). Your country\'s official calendar prevails.');
    return out.join('\n');
}
function countCols(A) { var n = 0; for (var i = 0; i < A.cols.length; i++) { if (A.cols[i].prayer) { n++; } } return n; }
function colsText(A) {
    var s = [], i, c;
    for (i = 0; i < A.cols.length; i++) {
        c = A.cols[i];
        s.push(c.prayer ? pn(c.prayer) + (c.label && c.label !== c.prayer ? ' (' + pn(c.label) + ' ?)' : '') : T('unk'));
    }
    return s.join(', ');
}
function findingLines(A) {
    var rows = [], i, ce;
    for (i = 0; i < A.cells.length; i++) {
        ce = A.cells[i];
        if (ce.status !== 'error' && !ce.internal) { continue; }
        rows.push([rowLabel(ce.row), pn(ce.prayer), ce.atom.text, hm(ce.expected), sgn(ce.diff), ce.internal ? T('stInt') : T('stErr')]);
    }
    for (i = 0; i < A.placeholders.length; i++) {
        var ph = A.placeholders[i];
        rows.push([rowLabel(ph.row), pn(ph.col.prayer), ph.atom.text, hm(ph.expected), '', T('stFill')]);
    }
    return rows;
}
function saveReport(txt) {
    var f = File.saveDialog(T('save'), '*.txt');
    if (!f) { return; }
    if (!/\.txt$/i.test(f.name)) { f = new File(f.fsName + '.txt'); }
    f.encoding = 'UTF-8'; f.lineFeed = 'Windows';
    if (f.open('w')) { f.write('\uFEFF' + txt); f.close(); alert(T('saved') + f.fsName); }
}

// ---------- Fenêtre des résultats / results window ----------
function resultsDialog(A, S, cfg, plan, reportFn) {
    var w = new Window('dialog', T('res') + ' — ' + T('title'));
    w.orientation = 'column'; w.alignChildren = 'fill';
    var sum = (A.stats.errors || A.stats.internal || A.placeholders.length || A.diags.length) ?
        F(T('summary'), A.stats.n, A.rows, countCols(A), A.stats.errors, A.stats.internal, A.placeholders.length) : F(T('nothing'), S.tol);
    var st = w.add('statictext', undefined, sum + '\n' + T('colsT') + colsText(A), { multiline: true }); st.preferredSize = [700, 36];
    w.add('statictext', undefined, T('diagT') + ' :');
    var dl = [], i; for (i = 0; i < A.diags.length; i++) { dl.push('• ' + diagText(A.diags[i])); }
    var et = w.add('edittext', undefined, dl.length ? dl.join('\n') : T('none'), { multiline: true, readonly: true, scrolling: true }); et.preferredSize = [700, 110];
    var lb = w.add('listbox', undefined, undefined, { numberOfColumns: 6, showHeaders: true,
        columnTitles: [T('cRow'), T('cPr'), T('cWr'), T('cCa'), T('cDi'), T('cSt')], columnWidths: [130, 80, 80, 80, 70, 200] });
    lb.preferredSize = [700, 230];
    var lines = findingLines(A);
    for (i = 0; i < lines.length && i < 1000; i++) {
        var it = lb.add('item', lines[i][0]);
        for (var j = 1; j < 6; j++) { it.subItems[j - 1].text = lines[i][j]; }
    }
    var g = w.add('group'); g.alignment = 'right';
    var bSave = g.add('button', undefined, T('save')), bSel = g.add('button', undefined, T('select'));
    var bApply = null;
    if (plan && plan.length) { bApply = g.add('button', undefined, T('apply') + ' (' + plan.length + ')'); }
    var bClose = g.add('button', undefined, T('close'), { name: 'cancel' });
    var choice = 'close';
    bSave.onClick = function () { saveReport(reportFn()); };
    bSel.onClick = function () { choice = 'select'; w.close(); };
    if (bApply) { bApply.onClick = function () { if (isSystematic(A) && !confirm(T('confirmSys'))) { return; } choice = 'apply'; w.close(); }; }
    bClose.onClick = function () { choice = 'close'; w.close(); };
    w.show();
    return choice;
}

// ---------- Programme principal / main ----------
function main() {
    if (app.documents.length === 0) { alert(L10N[String($.locale).indexOf('fr') === 0 ? 'fr' : 'en'].noDoc); return; }
    var doc = app.activeDocument, cfg = loadSettings();
    LANG = cfg.lang === 'en' ? 'en' : 'fr';
    var tfs = collectTextFrames(doc.selection);
    if (!tfs.length) { alert(T('noSel')); return; }
    var cities = HP.cities(), r;
    do { r = settingsDialog(cfg, cities); } while (r === 'relang');
    if (r !== 'ok') { return; }
    saveSettings(cfg);
    var S = settingsFromCfg(cfg, cities), frames = [], i;
    for (i = 0; i < tfs.length; i++) { frames.push(descriptor(tfs[i])); }
    var atoms = HP.atomsFromFrames(frames), nt = 0;
    for (i = 0; i < atoms.length; i++) { if (atoms[i].kind === 'time' || atoms[i].kind === 'ph') { nt++; } }
    if (!nt) { alert(T('noTimes')); return; }
    var table = HP.buildTable(atoms, { blocks: S.blocks, rtlBlocks: S.rtlBlocks });
    var A = HP.analyze(table, S);
    var mode = cfg.action === 'calc' ? 'calc' : (cfg.action === 'internal' ? 'internal' : null);
    var fill = cfg.fill === '1' ? {} : null;
    var plan = (mode || fill) ? HP.planFixes(A, mode || 'none', fill) : [];
    var reportFn = function () { return reportText(A, S, cfg, plan); };
    var choice = resultsDialog(A, S, cfg, plan, reportFn);
    if (cfg.markers === '1') { drawMarkers(doc, A, plan); }
    if (choice === 'select') {
        var sel = [], seen = {};
        for (i = 0; i < A.cells.length; i++) { if ((A.cells[i].status === 'error' || A.cells[i].internal) && !seen[A.cells[i].atom.fi]) { seen[A.cells[i].atom.fi] = true; sel.push(tfs[A.cells[i].atom.fi]); } }
        for (i = 0; i < A.diags.length; i++) { if (A.diags[i].atom && !seen[A.diags[i].atom.fi]) { seen[A.diags[i].atom.fi] = true; sel.push(tfs[A.diags[i].atom.fi]); } }
        try { doc.selection = null; doc.selection = sel; } catch (e) { }
        return;
    }
    if (choice !== 'apply') { return; }
    var byF = {}, done = 0, failed = 0, key;
    for (i = 0; i < plan.length; i++) { key = plan[i].atom.fi; if (!byF[key]) { byF[key] = []; } byF[key].push(plan[i]); }
    for (key in byF) {
        if (!byF.hasOwnProperty(key)) { continue; }
        var tf = tfs[+key];
        try { if (tf.locked || (tf.layer && tf.layer.locked)) { failed += byF[key].length; continue; } } catch (e5) { }
        var res = HP.applyToFrame(domApi(tf), byF[key]);
        done += res.done.length; failed += res.failed.length;
    }
    alert(F(T('applied'), done, failed));
}
