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
