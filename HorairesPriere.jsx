//@target illustrator
/*
 * HorairesPriere.jsx — v1.0.0
 * Contrôle (et remplit) les horaires de prière écrits dans un tableau Illustrator :
 * imsakiya de Ramadan, calendrier mensuel ou annuel des prières, affiche de mosquée.
 * Checks (and fills) the prayer times written in an Illustrator timetable:
 * Ramadan imsakiya, monthly or yearly prayer calendar, mosque poster.
 *
 * - Recalcule hors ligne (aucun accès réseau, aucune collecte de données) les heures
 *   de Imsak, Fajr, Chourouk, Dhuhr, Asr, Maghrib, Isha pour la ville et la méthode choisies.
 *   Recomputes offline (no network access, no data collection) the times for the chosen city and method.
 * - Reconnaît seul les colonnes (en-têtes FR/AR/EN ou valeurs), les lignes et les dates.
 *   Recognises columns (FR/AR/EN headers or values), rows and dates on its own.
 * - Signale les écarts, fautes de frappe, colonnes inversées, décalages (jour, heure d'été,
 *   ville, méthode, Asr hanafite) ; corrige ou remplit chiffre par chiffre en gardant la mise en forme.
 *   Flags gaps, typos, swapped columns, shifts; fixes or fills digit by digit keeping formatting.
 *
 * Illustrator CC 2018 et plus récents / and later. Non testé dans Illustrator / not tested in Illustrator.
 * Conseil : travaillez sur une copie. / Tip: work on a copy.
 * Licence MIT — (c) 2026 Amirouche Amwanes
 * Formules solaires : Jean Meeus, « Astronomical Algorithms » (ch. 25, faible précision), équation du temps
 * de la NOAA ; code entièrement original. / Solar formulas from Meeus & NOAA; fully original code.
 */
(function () {
// =====================================================================
//  MOTEUR (fonctions pures, sans Illustrator) / ENGINE (pure functions)
//  Calcul astronomique, lecture des heures, reconstruction du tableau,
//  comparaison et diagnostics.
//  Astronomical computation, time parsing, table rebuilding,
//  comparison and diagnostics.
// =====================================================================
var HP = {};
HP.VERSION = '1.0.0';
HP.DEG = Math.PI / 180;
HP.KEYS = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

// ---------- Petits outils / small helpers (ES3, sans forEach/map/indexOf) ----------
HP.idx = function (arr, v) { for (var i = 0; i < arr.length; i++) { if (arr[i] === v) { return i; } } return -1; };
HP.trim = function (s) { return String(s).replace(/^[\s\u00A0\u2009\u202F\u200E\u200F]+|[\s\u00A0\u2009\u202F\u200E\u200F]+$/g, ''); };
HP.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
HP.median = function (a) {
    if (!a || !a.length) { return NaN; }
    var b = a.slice(0); b.sort(function (x, y) { return x - y; });
    var n = b.length;
    return (n % 2) ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
};
HP.absArr = function (a) { var r = []; for (var i = 0; i < a.length; i++) { r.push(Math.abs(a[i])); } return r; };
HP.round1 = function (x) { return Math.round(x * 10) / 10; };

// ---------- Dates (numéro de jour julien) / dates (Julian day number) ----------
HP.jdn = function (y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};
HP.fromJdn = function (J) {
    var a = J + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    var d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10), d: e - Math.floor((153 * m + 2) / 5) + 1 };
};
HP.weekday = function (J) { return (J + 1) % 7; }; // 0 = dimanche / Sunday
HP.validYmd = function (y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1600 || y > 3000) { return false; }
    var t = HP.fromJdn(HP.jdn(y, m, d));
    return t.y === y && t.m === m && t.d === d;
};
HP.fmtDate = function (J) { var t = HP.fromJdn(J); return HP.pad2(t.d) + '/' + HP.pad2(t.m) + '/' + t.y; };
// "2026-03-01", "01/03/2026", "1.3.2026" -> JDN ou NaN
HP.parseUserDate = function (s) {
    s = HP.trim(HP.toAsciiDigits(s));
    var m = s.match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
    if (m) { return HP.validYmd(+m[1], +m[2], +m[3]) ? HP.jdn(+m[1], +m[2], +m[3]) : NaN; }
    m = s.match(/^(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{4})$/);
    if (m) { return HP.validYmd(+m[3], +m[2], +m[1]) ? HP.jdn(+m[3], +m[2], +m[1]) : NaN; }
    return NaN;
};

// ---------- Heure d'été / daylight saving time ----------
HP.lastWeekday = function (y, m, wd) { // dernier jour wd du mois / last weekday wd of month
    var last = HP.fromJdn(HP.jdn(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - 1);
    var J = HP.jdn(y, m, last.d);
    return J - ((HP.weekday(J) - wd + 7) % 7);
};
HP.nthWeekday = function (y, m, wd, n) {
    var J = HP.jdn(y, m, 1);
    return J + ((wd - HP.weekday(J) + 7) % 7) + 7 * (n - 1);
};
HP.isDST = function (J, rule) {
    if (!rule || rule === 'none') { return false; }
    var y = HP.fromJdn(J).y;
    if (rule === 'eu') { return J >= HP.lastWeekday(y, 3, 0) && J < HP.lastWeekday(y, 10, 0); }
    if (rule === 'us') { return J >= HP.nthWeekday(y, 3, 0, 2) && J < HP.nthWeekday(y, 11, 0, 1); }
    if (rule === 'eg') { return J >= HP.lastWeekday(y, 4, 5) && J <= HP.lastWeekday(y, 10, 4); }
    return false;
};

// ---------- Position du Soleil (Meeus, ch. 25, faible précision) / Sun position ----------
HP.sun = function (jd) {
    var D = HP.DEG, T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + T * (36000.76983 + 0.0003032 * T);
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var Mr = M * D;
    var C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mr) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
    var om = (125.04 - 1934.136 * T) * D;
    var lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(om)) * D;
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = (eps0 + 0.00256 * Math.cos(om)) * D;
    var decl = Math.asin(Math.sin(eps) * Math.sin(lam));
    var y = Math.tan(eps / 2); y = y * y;
    var L0r = L0 * D;
    var E = y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr);
    return { decl: decl, eqt: E * 12 / Math.PI };
};

HP.jdnToJd = function (J0, utHours) { return J0 - 0.5 + utHours / 24; };
// Heure UT (heures) d'un évènement solaire / UT time (hours) of a solar event.
// altFn(decl) -> hauteur du Soleil en degrés ; sign -1 matin, +1 soir, 0 passage au méridien.
HP.solarEvent = function (J0, lat, lon, altFn, sign) {
    var D = HP.DEG, t = 12 - lon / 15 + sign * 6, k, s, noon, cosH, alt;
    for (k = 0; k < 3; k++) {
        s = HP.sun(J0 - 0.5 + t / 24);
        noon = 12 - lon / 15 - s.eqt;
        if (sign === 0) { t = noon; continue; }
        alt = altFn(s.decl);
        cosH = (Math.sin(alt * D) - Math.sin(lat * D) * Math.sin(s.decl)) / (Math.cos(lat * D) * Math.cos(s.decl));
        if (cosH < -1 || cosH > 1 || isNaN(cosH)) { return NaN; }
        t = noon + sign * Math.acos(cosH) / D / 15;
    }
    return t;
};

// ---------- Méthodes de calcul / calculation methods ----------
// Valeurs publiques des méthodes (angles, minutes). Indicatives : réglez les minutes de
// précaution sur le calendrier officiel que vous suivez.
// Public method values (angles, minutes). Indicative: set the precaution minutes to the
// official calendar you follow.
HP.METHODS = [
    { id: 'dz', fr: 'Algérie - Ministère des Affaires religieuses (18° / 17°, Maghrib +3)', en: 'Algeria - Ministry of Religious Affairs (18° / 17°, Maghrib +3)', fajr: 18, isha: 17, ishaMin: 0, adj: { maghrib: 3 } },
    { id: 'ma', fr: 'Maroc - angles 19° / 17° (sans minutes de précaution)', en: 'Morocco - angles 19° / 17° (no precaution minutes)', fajr: 19, isha: 17, ishaMin: 0, adj: {} },
    { id: 'tn', fr: 'Tunisie - angles 18° / 18°', en: 'Tunisia - angles 18° / 18°', fajr: 18, isha: 18, ishaMin: 0, adj: {} },
    { id: 'mwl', fr: 'Ligue islamique mondiale (18° / 17°)', en: 'Muslim World League (18° / 17°)', fajr: 18, isha: 17, ishaMin: 0, adj: { dhuhr: 1 } },
    { id: 'eg', fr: 'Égypte - Autorité générale (19,5° / 17,5°)', en: 'Egyptian General Authority (19.5° / 17.5°)', fajr: 19.5, isha: 17.5, ishaMin: 0, adj: { dhuhr: 1 } },
    { id: 'uaq', fr: 'Umm al-Qura, La Mecque (18,5° / Isha 90 min)', en: 'Umm al-Qura, Makkah (18.5° / Isha 90 min)', fajr: 18.5, isha: 0, ishaMin: 90, adj: {} },
    { id: 'dubai', fr: 'Dubaï (18,2° / 18,2°)', en: 'Dubai (18.2° / 18.2°)', fajr: 18.2, isha: 18.2, ishaMin: 0, adj: { sunrise: -3, dhuhr: 3, asr: 3, maghrib: 3 } },
    { id: 'qatar', fr: 'Qatar (18° / Isha 90 min)', en: 'Qatar (18° / Isha 90 min)', fajr: 18, isha: 0, ishaMin: 90, adj: {} },
    { id: 'kw', fr: 'Koweït (18° / 17,5°)', en: 'Kuwait (18° / 17.5°)', fajr: 18, isha: 17.5, ishaMin: 0, adj: {} },
    { id: 'tr', fr: 'Turquie - Diyanet (18° / 17°)', en: 'Turkey - Diyanet (18° / 17°)', fajr: 18, isha: 17, ishaMin: 0, adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
    { id: 'karachi', fr: 'Karachi (18° / 18°)', en: 'Karachi (18° / 18°)', fajr: 18, isha: 18, ishaMin: 0, adj: { dhuhr: 1 } },
    { id: 'isna', fr: 'ISNA Amérique du Nord (15° / 15°)', en: 'ISNA North America (15° / 15°)', fajr: 15, isha: 15, ishaMin: 0, adj: { dhuhr: 1 } },
    { id: 'fr12', fr: 'France 12° / 12°', en: 'France 12° / 12°', fajr: 12, isha: 12, ishaMin: 0, adj: {} },
    { id: 'custom', fr: 'Personnalisée (valeurs ci-dessous)', en: 'Custom (values below)', fajr: 18, isha: 17, ishaMin: 0, adj: {} }
];
HP.methodById = function (id) { for (var i = 0; i < HP.METHODS.length; i++) { if (HP.METHODS[i].id === id) { return HP.METHODS[i]; } } return null; };

// Paramètres complets depuis une méthode / full parameters from a method
HP.paramsFromMethod = function (id, base) {
    var m = HP.methodById(id) || HP.METHODS[0], k, p = {};
    base = base || {};
    p.method = m.id; p.fajrAngle = m.fajr; p.ishaAngle = m.isha; p.ishaMinutes = m.ishaMin;
    p.asrFactor = base.asrFactor || 1;
    p.imsakMinutes = (base.imsakMinutes === undefined) ? 10 : base.imsakMinutes;
    p.highLat = base.highLat || 'middle';
    p.rounding = base.rounding || 'nearest';
    p.adj = {};
    for (k = 0; k < HP.KEYS.length; k++) { p.adj[HP.KEYS[k]] = (m.adj[HP.KEYS[k]] || 0); }
    return p;
};

// ---------- Calcul d'une journée / one day ----------
// Retourne les minutes locales depuis minuit (non arrondies : raw, arrondies : t)
// Returns local minutes since midnight (raw unrounded, t rounded)
HP.computeDay = function (J0, loc, P) {
    var lat = loc.lat, lon = loc.lon;
    var tz = loc.tz + (HP.isDST(J0, loc.dst) ? 1 : 0);
    var fa = P.fajrAngle, ia = P.ishaAngle, af = P.asrFactor || 1;
    var dhuhr = HP.solarEvent(J0, lat, lon, null, 0);
    var sunrise = HP.solarEvent(J0, lat, lon, function () { return -0.8333; }, -1);
    var sunset = HP.solarEvent(J0, lat, lon, function () { return -0.8333; }, 1);
    var fajr = HP.solarEvent(J0, lat, lon, function () { return -fa; }, -1);
    // Ombre de midi : déclinaison au passage au méridien / noon shadow: declination at transit
    var decNoon = HP.sun(HP.jdnToJd(J0, dhuhr)).decl;
    var asr = HP.solarEvent(J0, lat, lon, function () {
        return Math.atan(1 / (af + Math.tan(Math.abs(lat * HP.DEG - decNoon)))) / HP.DEG;
    }, 1);
    var isha = (P.ishaMinutes > 0) ? sunset + P.ishaMinutes / 60 : HP.solarEvent(J0, lat, lon, function () { return -ia; }, 1);
    // Hautes latitudes / high latitudes (comme adhan : borne de sécurité / safe bound)
    var night = 24 - (sunset - sunrise), portion = NaN;
    if (P.highLat === 'middle') { portion = 0.5; } else if (P.highLat === 'seventh') { portion = 1 / 7; }
    var fPortion = (P.highLat === 'angle') ? fa / 60 : portion, iPortion = (P.highLat === 'angle') ? ia / 60 : portion;
    if (!isNaN(sunrise) && !isNaN(sunset)) {
        if (!isNaN(fPortion)) { var safeF = sunrise - fPortion * night; if (isNaN(fajr) || safeF > fajr) { fajr = safeF; } }
        if (!isNaN(iPortion) && !(P.ishaMinutes > 0)) { var safeI = sunset + iPortion * night; if (isNaN(isha) || safeI < isha) { isha = safeI; } }
    }
    var raw = { fajr: fajr, sunrise: sunrise, dhuhr: dhuhr, asr: asr, maghrib: sunset, isha: isha };
    var out = { raw: {}, t: {} }, k, v, key;
    for (k = 0; k < HP.KEYS.length; k++) {
        key = HP.KEYS[k];
        if (key === 'imsak') { v = raw.fajr; } else { v = raw[key]; }
        if (isNaN(v)) { out.raw[key] = NaN; out.t[key] = NaN; continue; }
        v = (v + tz) * 60 + (P.adj[key] || 0);
        if (key === 'imsak') { v = v + (P.adj.fajr || 0) - (P.imsakMinutes || 0); }
        out.raw[key] = v;
        out.t[key] = (P.rounding === 'up') ? Math.ceil(v - 1e-9) : (P.rounding === 'none' ? v : Math.floor(v + 0.5));
    }
    return out;
};

// Cache de journées / day cache
HP.makeCalc = function (loc, P) {
    var cache = {};
    return function (J) {
        var c = cache[J];
        if (!c) { c = HP.computeDay(J, loc, P).t; cache[J] = c; }
        return c;
    };
};

// ---------- Chiffres / digits ----------
HP.toAsciiDigits = function (s) {
    s = String(s);
    var out = '', i, c;
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c >= 0x660 && c <= 0x669) { out += String.fromCharCode(48 + c - 0x660); }
        else if (c >= 0x6F0 && c <= 0x6F9) { out += String.fromCharCode(48 + c - 0x6F0); }
        else { out += s.charAt(i); }
    }
    return out;
};
HP.digitStyle = function (s) {
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 0x660 && c <= 0x669) { return 'arabic'; }
        if (c >= 0x6F0 && c <= 0x6F9) { return 'persian'; }
    }
    return 'latin';
};
HP.applyDigits = function (s, style) {
    if (style !== 'arabic' && style !== 'persian') { return s; }
    var base = (style === 'arabic') ? 0x660 : 0x6F0, out = '', i, c;
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        out += (c >= 48 && c <= 57) ? String.fromCharCode(base + c - 48) : s.charAt(i);
    }
    return out;
};

// ---------- Noms des prières (en-têtes) / prayer names (headers) ----------
HP.normAr = function (s) {
    return String(s).replace(/[\u064B-\u0652\u0640]/g, '').replace(/[\u0622\u0623\u0625]/g, '\u0627');
};
HP.LABELS = [
    ['imsak', /imsa+k|suhoo?r|sahu?r|sohour|souhour|\u0627\u0645\u0633\u0627\u0643|\u0627\u0644\u0633\u062D\u0648\u0631/i],
    ['sunrise', /cho?u?rou?[kq]|shuru+q|shurooq|sunrise|lever du soleil|\blever\b|\u0634\u0631\u0648\u0642/i],
    ['fajr', /\bfa[dj]{1,2}r\b|\bfedjr\b|\bsob?h\b|\bsubh\b|dawn|\baube\b|\u0627\u0644\u0641\u062C\u0631|\u0641\u062C\u0631|\u0627\u0644\u0635\u0628\u062D|\u0635\u0628\u062D/i],
    ['dhuhr', /dh?o?u?hr|\bdohr\b|zuhr|zohr|dhohr|thuhr|\bmidi\b|\u0627\u0644\u0638\u0647\u0631|\u0638\u0647\u0631/i],
    ['asr', /\basr\b|\bal-?asr|\u0627\u0644\u0639\u0635\u0631|\u0639\u0635\u0631/i],
    ['maghrib', /maghr[ie]b|moghreb|iftar|ftour|f'tour|sunset|coucher|\u0627\u0644\u0645\u063A\u0631\u0628|\u0645\u063A\u0631\u0628|\u0627\u0641\u0637\u0627\u0631/i],
    ['isha', /\bi[cs]ha+\b|\bisha'?a?\b|\u0627\u0644\u0639\u0634\u0627\u0621|\u0639\u0634\u0627\u0621/i]
];
HP.labelOf = function (s) {
    var t = HP.normAr(s), i;
    for (i = 0; i < HP.LABELS.length; i++) { if (HP.LABELS[i][1].test(t)) { return HP.LABELS[i][0]; } }
    return null;
};

// ---------- Mois et jours / months and weekdays ----------
HP.stripAcc = function (s) {
    return String(s).toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûùü]/g, 'u').replace(/ç/g, 'c');
};
HP.MONTHS = [
    // [forme normalisée, mois] ; les noms arabes sont normalisés par normAr (alif sans hamza)
    ['janvier', 1], ['janv', 1], ['fevrier', 2], ['fevr', 2], ['fev', 2], ['mars', 3], ['avril', 4], ['avr', 4], ['mai', 5], ['juin', 6], ['juillet', 7], ['juil', 7],
    ['aout', 8], ['septembre', 9], ['sept', 9], ['octobre', 10], ['oct', 10], ['novembre', 11], ['nov', 11], ['decembre', 12], ['dec', 12],
    ['january', 1], ['jan', 1], ['february', 2], ['feb', 2], ['march', 3], ['mar', 3], ['april', 4], ['apr', 4], ['may', 5], ['june', 6], ['jun', 6], ['july', 7], ['jul', 7],
    ['august', 8], ['aug', 8], ['september', 9], ['sep', 9], ['october', 10], ['november', 11], ['december', 12],
    ['\u062C\u0627\u0646\u0641\u064A', 1], ['\u0641\u064A\u0641\u0631\u064A', 2], ['\u0645\u0627\u0631\u0633', 3], ['\u0627\u0641\u0631\u064A\u0644', 4], ['\u0645\u0627\u064A', 5], ['\u062C\u0648\u0627\u0646', 6], ['\u062C\u0648\u064A\u0644\u064A\u0629', 7], ['\u0627\u0648\u062A', 8],
    ['\u0633\u0628\u062A\u0645\u0628\u0631', 9], ['\u0627\u0643\u062A\u0648\u0628\u0631', 10], ['\u0646\u0648\u0641\u0645\u0628\u0631', 11], ['\u062F\u064A\u0633\u0645\u0628\u0631', 12],
    ['\u064A\u0646\u0627\u064A\u0631', 1], ['\u0641\u0628\u0631\u0627\u064A\u0631', 2], ['\u0627\u0628\u0631\u064A\u0644', 4], ['\u0645\u0627\u064A\u0648', 5], ['\u064A\u0648\u0646\u064A\u0648', 6], ['\u064A\u0648\u0644\u064A\u0648', 7], ['\u064A\u0648\u0644\u064A\u0648\u0632', 7], ['\u0627\u063A\u0633\u0637\u0633', 8], ['\u063A\u0634\u062A', 8],
    ['\u0634\u062A\u0646\u0628\u0631', 9], ['\u0646\u0648\u0646\u0628\u0631', 11], ['\u062F\u062C\u0646\u0628\u0631', 12],
    ['\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A', 1], ['\u0634\u0628\u0627\u0637', 2], ['\u0627\u0630\u0627\u0631', 3], ['\u0646\u064A\u0633\u0627\u0646', 4], ['\u0627\u064A\u0627\u0631', 5], ['\u062D\u0632\u064A\u0631\u0627\u0646', 6], ['\u062A\u0645\u0648\u0632', 7], ['\u0627\u0628', 8],
    ['\u0627\u064A\u0644\u0648\u0644', 9], ['\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0627\u0648\u0644', 10], ['\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A', 11], ['\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0627\u0648\u0644', 12]
];
HP.WEEKDAYS = [ // index 0 = dimanche / Sunday
    ['dimanche', 'dim', 'sunday', 'sun', '\u0627\u0644\u0627\u062D\u062F', '\u0627\u062D\u062F'],
    ['lundi', 'lun', 'monday', 'mon', '\u0627\u0644\u0627\u062B\u0646\u064A\u0646', '\u0627\u062B\u0646\u064A\u0646'],
    ['mardi', 'mar', 'tuesday', 'tue', 'tues', '\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621', '\u062B\u0644\u0627\u062B\u0627\u0621'],
    ['mercredi', 'mer', 'wednesday', 'wed', '\u0627\u0644\u0627\u0631\u0628\u0639\u0627\u0621', '\u0627\u0631\u0628\u0639\u0627\u0621'],
    ['jeudi', 'jeu', 'thursday', 'thu', 'thur', 'thurs', '\u0627\u0644\u062E\u0645\u064A\u0633', '\u062E\u0645\u064A\u0633'],
    ['vendredi', 'ven', 'friday', 'fri', '\u0627\u0644\u062C\u0645\u0639\u0629', '\u062C\u0645\u0639\u0629'],
    ['samedi', 'sam', 'saturday', 'sat', '\u0627\u0644\u0633\u0628\u062A', '\u0633\u0628\u062A']
];
// Découpe en mots (lettres latines/arabes) / split into words
HP.words = function (s) {
    var t = HP.normAr(HP.stripAcc(s)).replace(/[^a-z\u0621-\u064A]+/g, ' ');
    t = HP.trim(t);
    return t ? t.split(' ') : [];
};
HP.weekdayOf = function (s) {
    var w = HP.words(s), i, j, k, found = -1;
    for (i = 0; i < w.length; i++) {
        for (j = 0; j < 7; j++) {
            for (k = 0; k < HP.WEEKDAYS[j].length; k++) {
                if (w[i] === HP.WEEKDAYS[j][k]) {
                    // « mar » = mardi ou mars : ambigu si suivi d'un nombre / ambiguous
                    if (w[i] === 'mar' && /\d/.test(s.split(/mar/i)[0] || '')) { continue; }
                    if (found >= 0 && found !== j) { return -1; }
                    found = j;
                }
            }
        }
    }
    return found;
};
HP.monthOf = function (s) {
    var t = ' ' + HP.words(s).join(' ') + ' ', i, best = null;
    for (i = 0; i < HP.MONTHS.length; i++) {
        if (t.indexOf(' ' + HP.MONTHS[i][0] + ' ') >= 0) {
            if (!best || HP.MONTHS[i][0].length > best[0].length) { best = HP.MONTHS[i]; }
        }
    }
    return best ? best[1] : 0;
};

// ---------- Lecture des cellules / cell parsing ----------
// Analyse un morceau de texte (cellule) : heures, emplacements vides, entier seul, date, jour, en-tête.
// Parses a text piece (cell): times, placeholders, lone integer, date, weekday, header.
// Les positions renvoyées sont relatives au morceau / offsets are relative to the piece.
HP.parseCell = function (raw) {
    var s = HP.toAsciiDigits(raw), res = { times: [], placeholders: [], integer: null, date: null, weekday: -1, label: null };
    var re = /(\d{1,2})(\s?[:hH.\u066B]\s?)(\d{2})(?!\d)/g, m, st, en, h, mi, prev, next, suf, sm;
    while ((m = re.exec(s)) !== null) {
        st = m.index; en = st + m[0].length;
        prev = st > 0 ? s.charAt(st - 1) : '';
        next = s.charAt(en);
        if (/[\d.,:\/]/.test(prev) && prev !== '') { continue; }
        if (/[.\/\-]/.test(next) && /\d/.test(s.charAt(en + 1))) { continue; } // 12.03.2026
        if (/[,%]/.test(next) && /\d/.test(s.charAt(en + 1))) { continue; }
        h = +m[1]; mi = +m[3];
        if (h > 24 || mi > 59) { continue; }
        suf = '';
        sm = s.substring(en).match(/^\s?(am|pm|a\.m\.|p\.m\.|AM|PM|A\.M\.|P\.M\.|\u0635|\u0645)(?![A-Za-z\u0621-\u064A])/);
        if (sm) { suf = sm[0]; }
        res.times.push({ start: st, end: en, h: h, m: mi, hourDigits: m[1].length, sep: m[2], suffix: suf,
            pm: suf ? /p|\u0645/i.test(suf) : null, digits: HP.digitStyle(raw.substring(st, en)), text: raw.substring(st, en + suf.length) });
    }
    var reP = /(^|[^\d])([\-\u2013\u2014_xX?\u00B7*]{1,2}|00?)(\s?[:hH.]\s?)([\-\u2013\u2014_xX?\u00B7*]{2}|00)(?![\d])/g;
    while ((m = reP.exec(s)) !== null) {
        st = m.index + m[1].length; en = st + m[2].length + m[3].length + m[4].length;
        var overlap = false;
        for (var q = 0; q < res.times.length; q++) { if (res.times[q].start < en && res.times[q].end > st) { overlap = true; } }
        if (overlap && !(+m[2] === 0 && m[4] === '00')) { continue; }
        if (overlap) { // 00:00 pris d'abord comme heure : on le requalifie / 00:00 becomes a placeholder
            var keep = [];
            for (q = 0; q < res.times.length; q++) { if (!(res.times[q].start < en && res.times[q].end > st)) { keep.push(res.times[q]); } }
            res.times = keep;
        }
        res.placeholders.push({ start: st, end: en, hourDigits: (m[2].length === 2 ? 2 : (+m[2] === 0 && m[2].length === 1 ? 1 : 2)),
            sep: m[3], suffix: '', digits: HP.digitStyle(raw), text: raw.substring(st, en) });
        reP.lastIndex = en;
    }
    var t = HP.trim(s);
    if (!res.times.length && !res.placeholders.length) {
        var dm = t.match(/(^|[^\d])(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?(?![\d])/) || t.match(/(^|[^\d])(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?![\d])/);
        var iso = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (iso) { res.date = { d: +iso[3], m: +iso[2], y: +iso[1] }; }
        else if (dm && +dm[3] >= 1 && +dm[3] <= 12 && +dm[2] >= 1 && +dm[2] <= 31) {
            var yy = dm[4] ? +dm[4] : 0; if (yy && yy < 100) { yy += 2000; }
            res.date = { d: +dm[2], m: +dm[3], y: yy };
        } else {
            var mo = HP.monthOf(raw);
            if (mo) {
                var nums = t.match(/\d+/g) || [], dd = 0, y4 = 0;
                for (var z = 0; z < nums.length; z++) { if (nums[z].length === 4) { y4 = +nums[z]; } else if (+nums[z] >= 1 && +nums[z] <= 31 && !dd) { dd = +nums[z]; } }
                if (dd) { res.date = { d: dd, m: mo, y: y4 }; }
            }
        }
        if (!res.date) {
            var im = t.match(/^\D{0,12}?(\d{1,2})\D{0,14}$/);
            if (im && +im[1] >= 1 && +im[1] <= 31 && t.replace(/\d/g, '').length <= 14) { res.integer = +im[1]; }
        }
        res.weekday = HP.weekdayOf(raw);
    }
    res.label = HP.labelOf(raw);
    return res;
};

// ---------- Reconstruction du tableau / table rebuilding ----------
// atoms : [{kind:'time'|'ph'|'int'|'date'|'wd'|'label', x, y, key, ref, ...}]
// Regroupe en blocs (côte à côte), colonnes et lignes. / Groups into blocks, columns and rows.
HP.clusterSorted = function (vals, tol) { // vals triés croissants -> indices de groupe
    var g = [], c = 0, i;
    for (i = 0; i < vals.length; i++) { if (i > 0 && vals[i] - vals[i - 1] > tol) { c++; } g.push(c); }
    return g;
};
HP.buildTable = function (atoms, opt) {
    opt = opt || {};
    var i, j, k, a, cols = {}, colList = [], keys = [];
    // colonnes par clé / columns by key
    for (i = 0; i < atoms.length; i++) {
        a = atoms[i];
        if (!cols[a.key]) { cols[a.key] = { key: a.key, xs: [], atoms: [], label: null, nTime: 0, nPh: 0 }; colList.push(cols[a.key]); }
        cols[a.key].xs.push(a.x); cols[a.key].atoms.push(a);
        if (a.kind === 'time') { cols[a.key].nTime++; }
        if (a.kind === 'ph') { cols[a.key].nPh++; }
    }
    for (i = 0; i < colList.length; i++) { colList[i].x = HP.median(colList[i].xs); }
    colList.sort(function (p, q) { return p.x - q.x; });
    // blocs : on coupe aux plus grands écarts entre colonnes qui portent des heures
    var nb = Math.max(1, opt.blocks || 1), timeCols = [];
    for (i = 0; i < colList.length; i++) { if (colList[i].nTime + colList[i].nPh > 0) { timeCols.push(colList[i]); } }
    var cuts = [];
    if (nb > 1 && timeCols.length >= nb) {
        var gaps = [];
        for (i = 1; i < timeCols.length; i++) { gaps.push({ i: i, g: timeCols[i].x - timeCols[i - 1].x }); }
        gaps.sort(function (p, q) { return q.g - p.g; });
        for (i = 0; i < nb - 1 && i < gaps.length; i++) { cuts.push((timeCols[gaps[i].i].x + timeCols[gaps[i].i - 1].x) / 2); }
        cuts.sort(function (p, q) { return p - q; });
    }
    var blocks = [];
    for (i = 0; i <= cuts.length; i++) { blocks.push({ cols: [], rows: [] }); }
    for (i = 0; i < colList.length; i++) {
        var b = 0;
        for (j = 0; j < cuts.length; j++) { if (colList[i].x > cuts[j]) { b = j + 1; } }
        colList[i].block = b; blocks[b].cols.push(colList[i]);
    }
    if (opt.rtlBlocks) { blocks.reverse(); }
    // lignes par bloc / rows per block
    for (k = 0; k < blocks.length; k++) {
        var bl = blocks[k], ats = [];
        for (i = 0; i < bl.cols.length; i++) { for (j = 0; j < bl.cols[i].atoms.length; j++) { ats.push(bl.cols[i].atoms[j]); } }
        ats.sort(function (p, q) { return q.y - p.y; });
        var ys = [], gapsY = [];
        for (i = 0; i < ats.length; i++) { ys.push(-ats[i].y); }
        for (i = 1; i < ys.length; i++) { if (ys[i] - ys[i - 1] > 1.5) { gapsY.push(ys[i] - ys[i - 1]); } }
        var pitch = gapsY.length ? HP.median(gapsY) : 10;
        var tolY = Math.max(1.2, 0.45 * pitch);
        var grp = HP.clusterSorted(ys, tolY), rows = [], cur = null;
        for (i = 0; i < ats.length; i++) {
            if (!cur || cur.g !== grp[i]) { cur = { g: grp[i], cells: {}, atoms: [], y: 0 }; rows.push(cur); }
            cur.atoms.push(ats[i]);
            if (!cur.cells[ats[i].key]) { cur.cells[ats[i].key] = []; }
            cur.cells[ats[i].key].push(ats[i]);
        }
        for (i = 0; i < rows.length; i++) {
            var sy = 0; for (j = 0; j < rows[i].atoms.length; j++) { sy += rows[i].atoms[j].y; }
            rows[i].y = sy / rows[i].atoms.length;
        }
        // lignes de données (heures) et lignes d'en-tête / data rows and header rows
        var data = [], nT = [];
        for (i = 0; i < rows.length; i++) {
            var cnt = 0;
            for (j = 0; j < rows[i].atoms.length; j++) { if (rows[i].atoms[j].kind === 'time' || rows[i].atoms[j].kind === 'ph') { cnt++; } }
            rows[i].nTimes = cnt; if (cnt) { nT.push(cnt); }
        }
        var medT = nT.length ? HP.median(nT) : 0;
        bl.headerAtoms = []; bl.ignoredRows = [];
        for (i = 0; i < rows.length; i++) {
            if (rows[i].nTimes === 0) {
                for (j = 0; j < rows[i].atoms.length; j++) { if (rows[i].atoms[j].kind === 'label') { bl.headerAtoms.push(rows[i].atoms[j]); } }
            } else if (medT >= 3 && rows[i].nTimes < medT / 2) {
                bl.ignoredRows.push(rows[i]);
            } else { data.push(rows[i]); }
        }
        bl.rows = data;
        // libellés des colonnes / column labels
        // 1) même cellule ou même colonne logique (tabulations) / same cell or same logical column
        var byKey = {};
        for (i = 0; i < bl.cols.length; i++) { byKey[bl.cols[i].key] = bl.cols[i]; }
        var pending = [];
        for (i = 0; i < bl.cols.length; i++) {
            var c = bl.cols[i];
            for (j = 0; j < c.atoms.length; j++) {
                var at = c.atoms[j];
                if (at.kind === 'time' || at.kind === 'ph') { if (at.label && !c.label) { c.label = at.label; } continue; }
                if (at.kind !== 'label') { continue; }
                var baseKey = String(c.key).replace(/:l\d*$/, ''), tc = byKey[baseKey];
                if (at.tabbed && at.sub === 0 && tc && tc !== c && (tc.nTime + tc.nPh) > 0) { if (!tc.label) { tc.label = at.label; } }
                else { pending.push(at); }
            }
        }
        // 2) ligne d'en-tête sans tabulation dans un bloc multiligne : même ordre logique
        //    header line without tabs inside a multi-line frame: same logical order
        var groups = {}, gk, rest = [];
        for (j = 0; j < pending.length; j++) {
            gk = pending[j].fi + '/' + pending[j].line;
            if (pending[j].tabbed || pending[j].singleFrame) { rest.push(pending[j]); continue; }
            if (!groups[gk]) { groups[gk] = []; }
            groups[gk].push(pending[j]);
        }
        for (gk in groups) {
            if (!groups.hasOwnProperty(gk)) { continue; }
            var g = groups[gk], fcols = [], fi0 = g[0].fi;
            for (i = 0; i < bl.cols.length; i++) {
                var cc = bl.cols[i];
                if ((cc.nTime + cc.nPh) > 0 && String(cc.key).indexOf('F' + fi0 + ':') === 0 && /^F\d+:\d+$/.test(cc.key)) { fcols.push(cc); }
            }
            if (fcols.length === g.length) {
                fcols.sort(function (p, q) { return (+p.key.split(':')[1]) - (+q.key.split(':')[1]); });
                g.sort(function (p, q) { return p.start - q.start; });
                for (i = 0; i < g.length; i++) { if (!fcols[i].label) { fcols[i].label = g[i].label; } }
            } else { for (i = 0; i < g.length; i++) { rest.push(g[i]); } }
        }
        pending = rest;
        // 3) en-têtes séparés : colonne la plus proche en x / separate headers: nearest column in x
        var tcs = [];
        for (i = 0; i < bl.cols.length; i++) { if (bl.cols[i].nTime + bl.cols[i].nPh > 0) { tcs.push(bl.cols[i]); } }
        var pitchX = [];
        for (i = 1; i < tcs.length; i++) { pitchX.push(Math.abs(tcs[i].x - tcs[i - 1].x)); }
        var maxD = pitchX.length ? 0.6 * HP.median(pitchX) : 1e9;
        pending.sort(function (p, q) { return q.y - p.y; });
        for (j = 0; j < pending.length; j++) {
            var ha = pending[j], best = null, bd = 1e9;
            for (i = 0; i < tcs.length; i++) {
                if (tcs[i].label) { continue; }
                var dd = Math.abs(tcs[i].x - ha.x);
                if (dd < bd) { bd = dd; best = tcs[i]; }
            }
            if (best && bd <= maxD) { best.label = ha.label; }
        }
    }
    return { blocks: blocks, cols: colList };
};

// ---------- Dates des lignes / row dates ----------
HP.assignDates = function (table, startJ) {
    var b, i, j, n = 0, info = { fromCells: 0, total: 0 };
    for (b = 0; b < table.blocks.length; b++) {
        var rows = table.blocks[b].rows;
        for (i = 0; i < rows.length; i++) {
            rows[i].index = n; rows[i].J = startJ + n; rows[i].dateCell = null; n++;
            for (j = 0; j < rows[i].atoms.length; j++) {
                var a = rows[i].atoms[j];
                if (a.kind === 'date' && a.date) { rows[i].dateCell = a; }
            }
        }
    }
    // Dates écrites dans le tableau : priorité si au moins la moitié des lignes en ont
    // Dates written in the table win when at least half of the rows carry one
    var all = [], withD = 0, ref = HP.fromJdn(startJ);
    for (b = 0; b < table.blocks.length; b++) { for (i = 0; i < table.blocks[b].rows.length; i++) { all.push(table.blocks[b].rows[i]); } }
    for (i = 0; i < all.length; i++) {
        var dc = all[i].dateCell;
        if (dc) {
            var y = dc.date.y, best = NaN, bd = 1e9, cand, dy;
            if (y && HP.validYmd(y, dc.date.m, dc.date.d)) { best = HP.jdn(y, dc.date.m, dc.date.d); }
            else {
                for (dy = -1; dy <= 1; dy++) {
                    if (!HP.validYmd(ref.y + dy, dc.date.m, dc.date.d)) { continue; }
                    cand = HP.jdn(ref.y + dy, dc.date.m, dc.date.d);
                    if (Math.abs(cand - all[i].J) < bd) { bd = Math.abs(cand - all[i].J); best = cand; }
                }
            }
            all[i].writtenJ = best;
            if (!isNaN(best)) { withD++; }
        }
    }
    info.total = all.length;
    if (all.length && withD >= all.length / 2) {
        info.fromCells = withD;
        for (i = 0; i < all.length; i++) {
            if (!isNaN(all[i].writtenJ) && all[i].writtenJ !== undefined) { all[i].J = all[i].writtenJ; }
            else if (i > 0) { all[i].J = all[i - 1].J + 1; all[i].guessed = true; }
        }
    }
    return info;
};

// ---------- Comparaison / comparison ----------
HP.wrap = function (d) { while (d > 720) { d -= 1440; } while (d < -720) { d += 1440; } return d; };
HP.obsMinutes = function (a, mode12) {
    var v = a.h * 60 + a.m;
    if (a.pm === true && a.h < 12) { v += 720; }
    else if (a.pm === false && a.h === 12) { v -= 720; }
    else if (mode12 && a.pm === null && a.h >= 1 && a.h < 12) { v += 720; }
    return v;
};
// Coût d'une colonne pour une prière / cost of a column for a prayer
HP.colCost = function (col, rows, key, calc, shift) {
    var d24 = [], d12 = [], i, j, a, e;
    for (i = 0; i < rows.length; i++) {
        var cell = rows[i].cells[col.key];
        if (!cell) { continue; }
        for (j = 0; j < cell.length; j++) {
            a = cell[j]; if (a.kind !== 'time') { continue; }
            e = calc(rows[i].J + (shift || 0))[key];
            if (isNaN(e)) { continue; }
            d24.push(HP.wrap(HP.obsMinutes(a, false) - e));
            d12.push(HP.wrap(HP.obsMinutes(a, true) - e));
            break;
        }
    }
    if (!d24.length) { return { cost: 1e9, n: 0 }; }
    var m24 = HP.median(HP.absArr(d24)), m12 = HP.median(HP.absArr(d12));
    var use12 = m12 + 0.5 < m24, d = use12 ? d12 : d24, base = use12 ? m12 : m24;
    var med = HP.median(d), res = { cost: base, n: d.length, mode12: use12, hourShift: 0, med: med };
    // décalage d'une heure (heure d'été / fuseau) / one hour shift (DST / time zone)
    var dm = [], dp = [];
    for (i = 0; i < d.length; i++) { dm.push(d[i] - 60); dp.push(d[i] + 60); }
    var cm = 3 + HP.median(HP.absArr(dm)), cp = 3 + HP.median(HP.absArr(dp));
    if (cm < res.cost) { res.cost = cm; res.hourShift = 60; }
    if (cp < res.cost) { res.cost = cp; res.hourShift = -60; }
    return res;
};
// Affectation optimale colonnes -> prières (programmation dynamique sur les sous-ensembles)
// Optimal column -> prayer assignment (dynamic programming over subsets)
HP.assignColumns = function (block, calc, opt) {
    var cols = [], i, p, NONE = opt.noneCost || 25;
    for (i = 0; i < block.cols.length; i++) { if (block.cols[i].nTime + block.cols[i].nPh > 0) { cols.push(block.cols[i]); } }
    var K = HP.KEYS.length, cost = [], info = [], bestBase = [];
    for (p = 0; p < K; p++) { bestBase.push(1e9); }
    for (i = 0; i < cols.length; i++) {
        info.push([]);
        for (p = 0; p < K; p++) {
            var r0 = HP.colCost(cols[i], block.rows, HP.KEYS[p], calc, opt.shift || 0);
            info[i].push(r0);
            if (r0.cost < bestBase[p]) { bestBase[p] = r0.cost; }
        }
    }
    // Variantes seulement pour les prières qu'aucune colonne ne suit bien / variants only for poorly matched prayers
    if (opt.variants) {
        for (p = 0; p < K; p++) {
            if (bestBase[p] <= 3) { continue; }
            for (var vi = 0; vi < opt.variants.length; vi++) {
                var vv = opt.variants[vi];
                if (HP.idx(vv.keys, HP.KEYS[p]) < 0) { continue; }
                for (i = 0; i < cols.length; i++) {
                    if (info[i][p].cost > 100) { continue; }
                    var rv = HP.colCost(cols[i], block.rows, HP.KEYS[p], vv.calc, opt.shift || 0);
                    if (rv.cost + 1.5 < info[i][p].cost) { rv.variant = vv.name; rv.cost += 1.5; info[i][p] = rv; }
                }
            }
        }
    }
    for (i = 0; i < cols.length; i++) {
        cost.push([]);
        for (p = 0; p < K; p++) {
            var c = info[i][p].cost;
            if (cols[i].nTime === 0) { c = (cols[i].label === HP.KEYS[p]) ? 0 : 1e9; }
            else if (cols[i].label) { c = (cols[i].label === HP.KEYS[p]) ? Math.max(0, c - 2) : c + 8; }
            cost[i].push(c);
        }
    }
    var S = 1 << K, INF = 1e18, dp = [], ch = [], s, best;
    for (i = 0; i <= cols.length; i++) { dp.push([]); ch.push([]); for (s = 0; s < S; s++) { dp[i].push(INF); ch[i].push(-2); } }
    dp[0][0] = 0;
    for (i = 0; i < cols.length; i++) {
        for (s = 0; s < S; s++) {
            if (dp[i][s] >= INF) { continue; }
            if (dp[i][s] + NONE < dp[i + 1][s]) { dp[i + 1][s] = dp[i][s] + NONE; ch[i + 1][s] = -1; }
            for (p = 0; p < K; p++) {
                if (s & (1 << p)) { continue; }
                if (cost[i][p] >= NONE) { continue; }
                var ns = s | (1 << p);
                if (dp[i][s] + cost[i][p] < dp[i + 1][ns]) { dp[i + 1][ns] = dp[i][s] + cost[i][p]; ch[i + 1][ns] = p; }
            }
        }
    }
    best = 0;
    for (s = 0; s < S; s++) { if (dp[cols.length][s] < dp[cols.length][best]) { best = s; } }
    var res = [];
    for (i = cols.length; i > 0; i--) {
        var pp = ch[i][best];
        res.unshift(pp);
        if (pp >= 0) { best = best & ~(1 << pp); }
    }
    // Colonnes vides (à remplir) sans en-tête : ordre donné par l'utilisateur
    // Empty (to fill) columns without header: user-given order
    if (opt.fillOrder && opt.fillOrder.length) {
        var used = {}, order = [];
        for (i = 0; i < cols.length; i++) { if (res[i] >= 0) { used[HP.KEYS[res[i]]] = true; } }
        for (i = 0; i < cols.length; i++) { order.push(i); }
        if (opt.rtlColumns) { order.reverse(); }
        var fo = 0;
        for (var oi = 0; oi < order.length; oi++) {
            i = order[oi];
            if (res[i] >= 0 || cols[i].nTime > 0) { if (res[i] >= 0) { fo++; } continue; }
            while (fo < opt.fillOrder.length && used[opt.fillOrder[fo]]) { fo++; }
            if (fo < opt.fillOrder.length) { res[i] = HP.idx(HP.KEYS, opt.fillOrder[fo]); used[opt.fillOrder[fo]] = true; fo++; }
        }
    }
    var out = [];
    for (i = 0; i < cols.length; i++) {
        cols[i].prayer = res[i] >= 0 ? HP.KEYS[res[i]] : null;
        cols[i].fit = res[i] >= 0 ? info[i][res[i]] : null;
        out.push(cols[i]);
    }
    return out;
};

// Variantes courantes (Asr hanafite, autres angles) pour reconnaître les colonnes malgré un autre réglage
// Common variants (Hanafi Asr, other angles) to recognise columns despite different settings
HP.copyParams = function (P) { var o = {}, k; for (k in P) { if (P.hasOwnProperty(k)) { o[k] = P[k]; } } return o; };
HP.variants = function (S) {
    if (S._variants) { return S._variants; }
    var out = [], P2, i, ang = [15, 17, 18, 18.5, 19, 19.5, 20];
    P2 = HP.copyParams(S.P); P2.asrFactor = (S.P.asrFactor === 2) ? 1 : 2;
    out.push({ name: 'asr' + P2.asrFactor, keys: ['asr'], calc: HP.makeCalc(S.loc, P2) });
    for (i = 0; i < ang.length; i++) {
        P2 = HP.copyParams(S.P); P2.fajrAngle = ang[i]; P2.ishaAngle = ang[i] < 18 ? ang[i] : 17; P2.ishaMinutes = 0;
        out.push({ name: 'a' + ang[i], keys: ['imsak', 'fajr'], calc: HP.makeCalc(S.loc, P2) });
        P2 = HP.copyParams(S.P); P2.ishaAngle = ang[i]; P2.ishaMinutes = 0;
        out.push({ name: 'i' + ang[i], keys: ['isha'], calc: HP.makeCalc(S.loc, P2) });
    }
    P2 = HP.copyParams(S.P); P2.ishaMinutes = 90;
    out.push({ name: 'i90', keys: ['isha'], calc: HP.makeCalc(S.loc, P2) });
    S._variants = out;
    return out;
};

// Analyse complète / full analysis
// settings: {startJ, loc, P, tol, blocks, rtlBlocks, rtlColumns, fillOrder, search:true}
HP.analyze = function (table, S, calcFactory) {
    var calc = (calcFactory || HP.makeCalc)(S.loc, S.P), b, i, j, r, c;
    var A = { cells: [], diags: [], rows: 0, cols: [], dateInfo: null, stats: {}, placeholders: [] };
    A.dateInfo = HP.assignDates(table, S.startJ);
    var tol = S.tol === undefined ? 2 : S.tol;
    for (b = 0; b < table.blocks.length; b++) {
        var bl = table.blocks[b];
        if (!bl.rows.length) { continue; }
        A.rows += bl.rows.length;
        var cols = HP.assignColumns(bl, calc, { fillOrder: S.fillOrder, rtlColumns: S.rtlColumns, variants: HP.variants(S) });
        for (i = 0; i < cols.length; i++) {
            c = cols[i];
            A.cols.push(c);
            if (c.label && c.prayer && c.label !== c.prayer && c.nTime > 0) {
                A.diags.push({ level: 'error', code: 'labelMismatch', col: c, a: c.label, b: c.prayer });
            }
            if (!c.prayer) { if (c.nTime > 0) { A.diags.push({ level: 'info', code: 'colUnknown', col: c, n: c.nTime }); } continue; }
            var diffs = [], cellsCol = [];
            for (r = 0; r < bl.rows.length; r++) {
                var row = bl.rows[r], cell = row.cells[c.key];
                if (!cell) { continue; }
                for (j = 0; j < cell.length; j++) {
                    var a = cell[j], e = calc(row.J)[c.prayer];
                    if (a.kind === 'ph') { A.placeholders.push({ atom: a, row: row, col: c, expected: e }); break; }
                    if (a.kind !== 'time') { continue; }
                    var mode12 = c.fit ? c.fit.mode12 : false;
                    var o = HP.obsMinutes(a, mode12), d = HP.wrap(o - e);
                    var ce = { atom: a, row: row, col: c, prayer: c.prayer, obs: o, expected: e, diff: d, mode12: mode12, status: Math.abs(d) <= tol ? 'ok' : 'error' };
                    A.cells.push(ce); cellsCol.push(ce); diffs.push(d);
                    break;
                }
            }
            // Décalage systématique de la colonne / systematic column offset
            if (diffs.length >= 3) {
                var med = HP.median(diffs), dev = [];
                for (j = 0; j < diffs.length; j++) { dev.push(Math.abs(diffs[j] - med)); }
                var mad = HP.median(dev);
                c.offset = med; c.mad = mad;
                if (Math.abs(med) > tol && mad <= 1.5) {
                    var code = (Math.abs(Math.abs(med) - 60) <= 3) ? 'colHour' : 'colOffset';
                    A.diags.push({ level: 'warn', code: code, col: c, v: Math.round(med) });
                }
                // Anomalies internes : écart à la médiane glissante de la colonne
                // Internal anomalies: gap to the running median of the column
                for (j = 0; j < cellsCol.length; j++) {
                    var win = [];
                    for (var w = Math.max(0, j - 3); w <= Math.min(cellsCol.length - 1, j + 3); w++) { win.push(cellsCol[w].diff); }
                    var lm = HP.median(win);
                    cellsCol[j].localOffset = lm;
                    // ...et à la médiane de toute la colonne (évite de marquer une bonne valeur entourée d'erreurs)
                    // ...and to the whole-column median (avoids flagging a good value surrounded by errors)
                    var thr = Math.max(tol, 1.5);
                    cellsCol[j].internal = Math.abs(cellsCol[j].diff - lm) > thr && Math.abs(cellsCol[j].diff - med) > thr;
                }
            }
            if (c.fit && c.fit.mode12) { A.diags.push({ level: 'info', code: 'mode12', col: c }); }
        }
        // Ordre des prières dans chaque ligne / order of prayers within each row
        for (r = 0; r < bl.rows.length; r++) {
            var seq = [], rw = bl.rows[r];
            for (i = 0; i < A.cells.length; i++) { if (A.cells[i].row === rw) { seq.push(A.cells[i]); } }
            seq.sort(function (p, q) { return HP.idx(HP.KEYS, p.prayer) - HP.idx(HP.KEYS, q.prayer); });
            for (i = 1; i < seq.length; i++) {
                if (seq[i].obs <= seq[i - 1].obs) { A.diags.push({ level: 'error', code: 'order', row: rw, a: seq[i - 1].prayer, b: seq[i].prayer, cell: seq[i] }); }
            }
            // ligne identique à la précédente / row identical to the previous one
            if (r > 0) {
                var prevRow = bl.rows[r - 1], same = 0, tot = 0;
                for (i = 0; i < A.cells.length; i++) {
                    if (A.cells[i].row !== rw) { continue; }
                    var pc = prevRow.cells[A.cells[i].col.key];
                    if (!pc) { continue; }
                    for (j = 0; j < pc.length; j++) {
                        if (pc[j].kind === 'time') { tot++; if (pc[j].h === A.cells[i].atom.h && pc[j].m === A.cells[i].atom.m) { same++; } break; }
                    }
                }
                if (tot >= 4 && same === tot) { A.diags.push({ level: 'warn', code: 'dupRow', row: rw }); }
            }
        }
        // Jours écrits (entiers, jours de la semaine) / written days (integers, weekdays)
        HP.checkDayColumns(bl, A);
    }
    // Statistiques globales / global statistics
    var absd = [], nErr = 0, nInt = 0;
    for (i = 0; i < A.cells.length; i++) {
        absd.push(Math.abs(A.cells[i].diff));
        if (A.cells[i].status === 'error') { nErr++; }
        if (A.cells[i].internal) { nInt++; }
    }
    A.stats = { n: A.cells.length, errors: nErr, internal: nInt, medAbs: absd.length ? HP.median(absd) : NaN };
    if (S.search !== false && A.cells.length) { HP.searchCauses(table, S, A, calc); }
    return A;
};

HP.checkDayColumns = function (bl, A) {
    var i, r, c, j;
    for (i = 0; i < bl.cols.length; i++) {
        c = bl.cols[i];
        var ints = [], wds = [];
        for (r = 0; r < bl.rows.length; r++) {
            var cell = bl.rows[r].cells[c.key];
            if (!cell) { continue; }
            for (j = 0; j < cell.length; j++) {
                if (cell[j].kind === 'int') { ints.push({ row: bl.rows[r], v: cell[j].value, atom: cell[j] }); break; }
                if (cell[j].kind === 'wd') { wds.push({ row: bl.rows[r], v: cell[j].weekday, atom: cell[j] }); break; }
                if (cell[j].kind === 'date' && cell[j].weekday >= 0) { wds.push({ row: bl.rows[r], v: cell[j].weekday, atom: cell[j] }); }
            }
        }
        if (ints.length >= 3) {
            var match = 0;
            for (j = 0; j < ints.length; j++) { if (ints[j].v === HP.fromJdn(ints[j].row.J).d) { match++; } }
            if (match >= ints.length * 0.6) {
                for (j = 0; j < ints.length; j++) {
                    var want = HP.fromJdn(ints[j].row.J).d;
                    if (ints[j].v !== want) { A.diags.push({ level: 'error', code: 'dayNum', row: ints[j].row, a: ints[j].v, b: want, atom: ints[j].atom }); }
                }
            } else {
                // numérotation propre (jours de Ramadan…) : suite de 1 en 1
                for (j = 1; j < ints.length; j++) {
                    var exp = ints[j - 1].v + 1;
                    if (ints[j].v !== exp && !(ints[j].v === 1 && ints[j - 1].v >= 29)) {
                        A.diags.push({ level: 'warn', code: 'seqNum', row: ints[j].row, a: ints[j].v, b: exp, atom: ints[j].atom });
                    }
                }
            }
        }
        if (wds.length >= 2) {
            for (j = 0; j < wds.length; j++) {
                var wd = HP.weekday(wds[j].row.J);
                if (wds[j].v !== wd) { A.diags.push({ level: 'error', code: 'weekday', row: wds[j].row, a: wds[j].v, b: wd, atom: wds[j].atom }); }
            }
        }
    }
    // dates écrites : suite continue / written dates: continuous sequence
    for (r = 1; r < bl.rows.length; r++) {
        var a0 = bl.rows[r - 1].writtenJ, a1 = bl.rows[r].writtenJ;
        if (a0 && a1 && !isNaN(a0) && !isNaN(a1) && a1 !== a0 + 1) { A.diags.push({ level: 'warn', code: 'dateGap', row: bl.rows[r], a: a1 - a0 }); }
    }
};

// Moyenne tronquée (90 %) des écarts absolus pour un calcul donné / trimmed mean of abs gaps
HP.scoreWith = function (cells, calc, shift, keysOnly) {
    var d = [], i, ce, e;
    for (i = 0; i < cells.length; i++) {
        ce = cells[i];
        if (keysOnly && HP.idx(keysOnly, ce.prayer) < 0) { continue; }
        e = calc(ce.row.J + shift)[ce.prayer];
        if (isNaN(e)) { continue; }
        d.push(Math.abs(HP.wrap(ce.obs - e)));
    }
    if (!d.length) { return NaN; }
    d.sort(function (x, y) { return x - y; });
    var n = Math.max(1, Math.ceil(d.length * 0.9)), sum = 0;
    for (i = 0; i < n; i++) { sum += d[i]; }
    return sum / n;
};
// Échantillon de lignes régulièrement espacées (recherche rapide) / evenly spaced row sample
HP.sampleCells = function (cells, maxRows) {
    var rows = [], i, seen = {}, keep = {}, out = [];
    for (i = 0; i < cells.length; i++) { if (!seen[cells[i].row.index]) { seen[cells[i].row.index] = true; rows.push(cells[i].row.index); } }
    if (rows.length <= maxRows) { return cells; }
    rows.sort(function (a, b) { return a - b; });
    for (i = 0; i < maxRows; i++) { keep[rows[Math.round(i * (rows.length - 1) / (maxRows - 1))]] = true; }
    for (i = 0; i < cells.length; i++) { if (keep[cells[i].row.index]) { out.push(cells[i]); } }
    return out;
};
// Recherche des causes probables / likely causes
HP.searchCauses = function (table, S, A, calc) {
    var tol = S.tol === undefined ? 2 : S.tol, cells = A.cells, few = HP.sampleCells(A.cells, 12), base = HP.scoreWith(cells, calc, 0), i, k, best, bk, sc, found = false;
    A.stats.score = base;
    if (base > tol * 0.5) {
        // 1. lignes décalées de quelques jours / rows shifted by a few days
        best = base; bk = 0;
        for (k = -3; k <= 3; k++) { if (!k) { continue; } sc = HP.scoreWith(cells, calc, k); if (sc < best) { best = sc; bk = k; } }
        if (bk && best <= Math.max(1, tol / 2) && best < base * 0.5) { A.diags.push({ level: 'warn', code: 'shift', v: bk, a: HP.round1(base), b: HP.round1(best) }); return; }
        // 2. autre date de début (écart important) / other start date (large gap)
        if (base > 12) {
            best = base; bk = 0;
            var fb = HP.scoreWith(few, calc, 0);
            for (k = -200; k <= 200; k++) { if (!k) { continue; } sc = HP.scoreWith(few, calc, k); if (sc < best) { best = sc; bk = k; } }
            if (bk) { best = HP.scoreWith(cells, calc, bk); }
            if (bk && best <= tol + 1) { A.diags.push({ level: 'warn', code: 'startDate', v: bk, a: HP.round1(base), b: HP.round1(best), J: S.startJ + bk }); return; }
        }
        // 3. autre ville (même réglage) / other city (same settings)
        if (S.cities && S.cities.length) {
            var ranks = [], dh = [], lonEst = null;
            // longitude estimée par le décalage de Dhuhr (4 min par degré) / longitude estimated from Dhuhr (4 min per degree)
            for (i = 0; i < cells.length; i++) { if (cells[i].prayer === 'dhuhr') { dh.push(cells[i].diff); } }
            if (dh.length >= 3) { lonEst = S.loc.lon - HP.median(dh) / 4; }
            for (i = 0; i < S.cities.length; i++) {
                var ct = S.cities[i];
                if (Math.abs(ct.lat - S.loc.lat) < 1e-6 && Math.abs(ct.lon - S.loc.lon) < 1e-6) { continue; }
                if (lonEst !== null && ct.tz === S.loc.tz && Math.abs(ct.lon - lonEst) > 1.5) { continue; }
                var cc = HP.makeCalc({ lat: ct.lat, lon: ct.lon, tz: ct.tz, dst: ct.dst }, S.P);
                ranks.push({ c: ct, s: HP.scoreWith(few, cc, 0), cc: cc });
            }
            ranks.sort(function (p, q) { return p.s - q.s; });
            for (i = 0; i < ranks.length && i < 3; i++) { ranks[i].s = HP.scoreWith(cells, ranks[i].cc, 0); }
            ranks.sort(function (p, q) { return p.s - q.s; });
            if (ranks.length && ranks[0].s <= Math.max(1, tol / 2) && ranks[0].s < base * 0.5) {
                A.diags.push({ level: 'warn', code: 'city', city: ranks[0].c, a: HP.round1(base), b: HP.round1(ranks[0].s), alt: ranks.length > 1 ? ranks[1] : null });
                found = true;
            }
        }
    }
    if (found) { return; }
    // 4. angles d'une autre méthode pour Fajr / Isha / other method angles for Fajr / Isha
    var fi = ['imsak', 'fajr', 'isha'], baseFI = HP.scoreWith(cells, calc, 0, fi);
    if (baseFI > tol * 0.5) {
        var bm = null, bs = baseFI;
        for (i = 0; i < HP.METHODS.length; i++) {
            var M = HP.METHODS[i]; if (M.id === 'custom' || M.id === S.P.method) { continue; }
            var P2 = HP.copyParams(S.P);
            P2.fajrAngle = M.fajr; P2.ishaAngle = M.isha; P2.ishaMinutes = M.ishaMin;
            sc = HP.scoreWith(few, HP.makeCalc(S.loc, P2), 0, fi);
            if (sc < bs - 1e-9) { bs = sc; bm = M; }
        }
        if (bm) { bs = HP.scoreWith(cells, HP.makeCalc(S.loc, (function () { var q = HP.copyParams(S.P); q.fajrAngle = bm.fajr; q.ishaAngle = bm.isha; q.ishaMinutes = bm.ishaMin; return q; })()), 0, fi); }
        if (bm && bs <= Math.max(1, tol / 2) && bs < baseFI * 0.5) { A.diags.push({ level: 'warn', code: 'method', m: bm, a: HP.round1(baseFI), b: HP.round1(bs) }); }
    }
    // 5. Asr hanafite / standard / Hanafi vs standard Asr
    var baseA = HP.scoreWith(cells, calc, 0, ['asr']);
    if (baseA > tol * 0.5) {
        var P3 = HP.copyParams(S.P);
        P3.asrFactor = (S.P.asrFactor === 2) ? 1 : 2;
        sc = HP.scoreWith(cells, HP.makeCalc(S.loc, P3), 0, ['asr']);
        if (sc <= Math.max(1, tol / 2) && sc < baseA * 0.5) { A.diags.push({ level: 'warn', code: 'asr', v: P3.asrFactor, a: HP.round1(baseA), b: HP.round1(sc) }); }
    }
};

// ---------- Écriture / writing ----------
HP.formatTime = function (min, tpl, mode12) {
    var v = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(v / 60), mi = v % 60, suffix = tpl.suffix || '';
    if (mode12 || suffix) {
        var pm = h >= 12;
        h = h % 12; if (h === 0) { h = 12; }
        if (suffix) {
            var sp = suffix.match(/^\s*/)[0], core = HP.trim(suffix), out;
            if (/[\u0635\u0645]/.test(core)) { out = pm ? '\u0645' : '\u0635'; }
            else {
                var dots = core.indexOf('.') >= 0, up = core === core.toUpperCase();
                out = pm ? (dots ? 'p.m.' : 'pm') : (dots ? 'a.m.' : 'am');
                if (up) { out = out.toUpperCase(); }
            }
            suffix = sp + out;
        }
    }
    var hs = (tpl.hourDigits === 2 && h < 10) ? '0' + h : String(h);
    return HP.applyDigits(hs + tpl.sep + HP.pad2(mi), tpl.digits) + HP.applyDigits(suffix, tpl.digits);
};
// Plan des corrections / correction plan
// mode 'calc' : valeur calculée ; 'internal' : seulement les anomalies internes, en gardant le décalage de la colonne
HP.planFixes = function (A, mode, fill) {
    var plan = [], i, ce, v;
    for (i = 0; i < A.cells.length; i++) {
        ce = A.cells[i];
        if (mode === 'calc' && ce.status === 'error') { v = ce.expected; }
        else if (mode === 'internal' && ce.internal) { v = ce.expected + Math.round(ce.localOffset || 0); }
        else { continue; }
        var nt = HP.formatTime(v, ce.atom, ce.mode12);
        if (nt !== ce.atom.text) { plan.push({ atom: ce.atom, oldText: ce.atom.text, newText: nt, cell: ce }); }
    }
    if (fill) {
        for (i = 0; i < A.placeholders.length; i++) {
            var ph = A.placeholders[i];
            if (isNaN(ph.expected)) { continue; }
            var tpl = ph.atom;
            if (fill.digits) { tpl = { hourDigits: tpl.hourDigits, sep: tpl.sep, suffix: '', digits: fill.digits }; }
            plan.push({ atom: ph.atom, oldText: ph.atom.text, newText: HP.formatTime(ph.expected, tpl, !!fill.mode12), fillCell: ph });
        }
    }
    return plan;
};
// Remplacement minimal caractère par caractère / minimal char-by-char replacement
// Renvoie [{pos, del, ins}] relatifs au jeton / returns edits relative to the token
HP.charEdits = function (oldT, newT) {
    var edits = [], i;
    if (oldT.length === newT.length) {
        for (i = 0; i < oldT.length; i++) { if (oldT.charAt(i) !== newT.charAt(i)) { edits.push({ pos: i, del: 1, ins: newT.charAt(i) }); } }
        return edits;
    }
    var p = 0; while (p < oldT.length && p < newT.length && oldT.charAt(p) === newT.charAt(p)) { p++; }
    var so = oldT.length, sn = newT.length;
    while (so > p && sn > p && oldT.charAt(so - 1) === newT.charAt(sn - 1)) { so--; sn--; }
    edits.push({ pos: p, del: so - p, ins: newT.substring(p, sn) });
    return edits;
};

// ---------- Villes intégrées / built-in cities ----------
// Coordonnées approximatives du centre-ville (chef-lieu pour les 58 wilayas), vérifiées
// contre OpenStreetMap (écart ≤ 0,02° ≈ 5 s de temps). Fuseau en heures, règle d'heure d'été.
// Approximate city-centre coordinates (wilaya seat for the 58 Algerian wilayas), checked
// against OpenStreetMap (gap ≤ 0.02° ≈ 5 s of time). UTC offset in hours, DST rule.
HP.CITIES_RAW = [
    'DZ|01 Adrar|27.874|-0.294|1|none', 'DZ|02 Chlef|36.165|1.335|1|none', 'DZ|03 Laghouat|33.800|2.865|1|none',
    'DZ|04 Oum El Bouaghi|35.877|7.113|1|none', 'DZ|05 Batna|35.556|6.174|1|none', 'DZ|06 Béjaïa|36.751|5.056|1|none',
    'DZ|07 Biskra|34.851|5.728|1|none', 'DZ|08 Béchar|31.617|-2.217|1|none', 'DZ|09 Blida|36.470|2.828|1|none',
    'DZ|10 Bouira|36.375|3.902|1|none', 'DZ|11 Tamanrasset|22.785|5.523|1|none', 'DZ|12 Tébessa|35.404|8.124|1|none',
    'DZ|13 Tlemcen|34.878|-1.315|1|none', 'DZ|14 Tiaret|35.371|1.317|1|none', 'DZ|15 Tizi Ouzou|36.712|4.046|1|none',
    'DZ|16 Alger|36.754|3.059|1|none', 'DZ|17 Djelfa|34.673|3.263|1|none', 'DZ|18 Jijel|36.820|5.766|1|none',
    'DZ|19 Sétif|36.190|5.414|1|none', 'DZ|20 Saïda|34.831|0.152|1|none', 'DZ|21 Skikda|36.876|6.909|1|none',
    'DZ|22 Sidi Bel Abbès|35.190|-0.631|1|none', 'DZ|23 Annaba|36.900|7.766|1|none', 'DZ|24 Guelma|36.462|7.426|1|none',
    'DZ|25 Constantine|36.365|6.615|1|none', 'DZ|26 Médéa|36.264|2.754|1|none', 'DZ|27 Mostaganem|35.931|0.089|1|none',
    "DZ|28 M'Sila|35.706|4.541|1|none", 'DZ|29 Mascara|35.397|0.140|1|none', 'DZ|30 Ouargla|31.949|5.325|1|none',
    'DZ|31 Oran|35.697|-0.633|1|none', 'DZ|32 El Bayadh|33.683|1.020|1|none', 'DZ|33 Illizi|26.483|8.467|1|none',
    'DZ|34 Bordj Bou Arréridj|36.073|4.761|1|none', 'DZ|35 Boumerdès|36.766|3.477|1|none', 'DZ|36 El Tarf|36.767|8.314|1|none',
    'DZ|37 Tindouf|27.674|-8.147|1|none', 'DZ|38 Tissemsilt|35.607|1.811|1|none', 'DZ|39 El Oued|33.368|6.867|1|none',
    'DZ|40 Khenchela|35.436|7.143|1|none', 'DZ|41 Souk Ahras|36.286|7.951|1|none', 'DZ|42 Tipaza|36.589|2.448|1|none',
    'DZ|43 Mila|36.450|6.264|1|none', 'DZ|44 Aïn Defla|36.264|1.968|1|none', 'DZ|45 Naâma|33.267|-0.313|1|none',
    'DZ|46 Aïn Témouchent|35.297|-1.140|1|none', 'DZ|47 Ghardaïa|32.490|3.674|1|none', 'DZ|48 Relizane|35.737|0.556|1|none',
    'DZ|49 Timimoun|29.263|0.231|1|none', 'DZ|50 Bordj Badji Mokhtar|21.328|0.955|1|none', 'DZ|51 Ouled Djellal|34.420|5.065|1|none',
    'DZ|52 Béni Abbès|30.131|-2.167|1|none', 'DZ|53 In Salah|27.197|2.483|1|none', 'DZ|54 In Guezzam|19.567|5.767|1|none',
    'DZ|55 Touggourt|33.106|6.064|1|none', 'DZ|56 Djanet|24.555|9.485|1|none', "DZ|57 El M'Ghair|33.950|5.917|1|none",
    'DZ|58 El Meniaa|30.583|2.883|1|none',
    'TN|Tunis|36.806|10.181|1|none', 'TN|Sfax|34.740|10.760|1|none', 'TN|Sousse|35.826|10.637|1|none',
    'MA|Rabat|34.020|-6.841|1|none', 'MA|Casablanca|33.573|-7.590|1|none', 'MA|Fès|34.033|-5.000|1|none',
    'MA|Marrakech|31.630|-8.008|1|none', 'MA|Tanger|35.759|-5.834|1|none', 'MA|Oujda|34.682|-1.911|1|none',
    'MR|Nouakchott|18.079|-15.965|0|none', 'LY|Tripoli|32.887|13.191|2|none', 'LY|Benghazi|32.116|20.067|2|none',
    'EG|Le Caire / Cairo|30.044|31.236|2|eg', 'SD|Khartoum|15.501|32.560|2|none',
    'SA|Riyad / Riyadh|24.713|46.675|3|none', 'SA|La Mecque / Makkah|21.389|39.858|3|none', 'SA|Médine / Madinah|24.467|39.611|3|none',
    'SA|Djeddah / Jeddah|21.486|39.193|3|none', 'AE|Dubaï / Dubai|25.205|55.271|4|none', 'AE|Abou Dhabi / Abu Dhabi|24.454|54.377|4|none',
    'QA|Doha|25.285|51.531|3|none', 'KW|Koweït / Kuwait City|29.376|47.977|3|none', 'BH|Manama|26.228|50.586|3|none',
    'OM|Mascate / Muscat|23.588|58.383|4|none', 'JO|Amman|31.954|35.911|3|none', 'LB|Beyrouth / Beirut|33.894|35.502|2|eu',
    'SY|Damas / Damascus|33.513|36.292|3|none', 'IQ|Bagdad / Baghdad|33.315|44.366|3|none', 'TR|Istanbul|41.008|28.978|3|none',
    'FR|Paris|48.857|2.352|1|eu', 'FR|Marseille|43.296|5.370|1|eu', 'FR|Lyon|45.764|4.836|1|eu', 'FR|Lille|50.629|3.057|1|eu',
    'FR|Toulouse|43.605|1.444|1|eu', 'FR|Nice|43.710|7.262|1|eu', 'FR|Strasbourg|48.573|7.752|1|eu',
    'BE|Bruxelles / Brussels|50.850|4.352|1|eu', 'CH|Genève / Geneva|46.204|6.143|1|eu', 'GB|Londres / London|51.507|-0.128|0|eu',
    'ES|Madrid|40.417|-3.704|1|eu', 'ES|Barcelone / Barcelona|41.385|2.173|1|eu', 'DE|Berlin|52.520|13.405|1|eu',
    'CA|Montréal|45.502|-73.567|-5|us', 'US|New York|40.713|-74.006|-5|us',
    'SN|Dakar|14.716|-17.467|0|none', 'ML|Bamako|12.639|-8.003|0|none', 'NE|Niamey|13.512|2.112|1|none', "TD|N'Djamena|12.134|15.056|1|none"
];
HP.cities = function () {
    var out = [], i, p;
    for (i = 0; i < HP.CITIES_RAW.length; i++) {
        p = HP.CITIES_RAW[i].split('|');
        out.push({ country: p[0], name: p[1], lat: +p[2], lon: +p[3], tz: +p[4], dst: p[5] });
    }
    return out;
};

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

    try { main(); } catch (err) { alert('HorairesPriere — erreur / error : ' + err + (err.line ? ' (ligne / line ' + err.line + ')' : '')); }
})();
