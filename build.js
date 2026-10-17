const fs=require('fs');
const header=`//@target illustrator
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
`;
const footer=`
    try { main(); } catch (err) { alert('HorairesPriere — erreur / error : ' + err + (err.line ? ' (ligne / line ' + err.line + ')' : '')); }
})();
`;
const body=['engine','cities','collect','ui'].map(f=>fs.readFileSync(__dirname+'/src/'+f+'.js','utf8')).join('\n');
fs.writeFileSync(__dirname+'/HorairesPriere.jsx', header+body+footer);
console.log('built', (header+body+footer).length, 'chars');
