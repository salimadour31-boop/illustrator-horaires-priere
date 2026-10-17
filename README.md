# HorairesPriere.jsx — contrôle des horaires de prière dans Illustrator

Script Adobe Illustrator (ExtendScript) qui **recalcule hors ligne et contrôle les horaires de prière écrits dans un tableau mis en page** : imsakiya de Ramadan, calendrier mensuel ou annuel des prières, affiche ou écran de mosquée, agenda d'association. Il lit les textes sélectionnés, reconnaît seul les colonnes (Imsak, Fajr, Chourouk, Dhuhr, Asr, Maghrib, Isha), les lignes et les dates, compare chaque heure au calcul astronomique pour la ville et la méthode choisies, explique les écarts, puis corrige ou remplit les cases chiffre par chiffre sans toucher à la mise en forme.

> **Non testé dans Illustrator.** La syntaxe et toute la logique ont été vérifiées dans Node (voir « Tests »), sur un DOM Illustrator et un ScriptUI simulés, mais le script n'a pas encore été exécuté dans Illustrator. Travaillez sur une copie du fichier.

- Version : 1.0.0
- Cible : Illustrator CC 2018 à 2026 (Windows et macOS), ExtendScript ES3
- Licence : MIT — © 2026 Amirouche Amwanes
- Aucun accès réseau, aucune collecte de données. Les réglages sont seulement mémorisés dans un petit fichier texte local (`HorairesPriere_reglages.txt` du dossier de données utilisateur).

## Ce que fait le script

**Lecture du tableau**
- Toutes les mises en page courantes : un bloc avec tabulations, une cellule par bloc de texte, une colonne par bloc, une ligne par bloc, des heures séparées par des espaces, textes groupés ou non, plusieurs tableaux côte à côte (option).
- Heures `05:12`, `5h12`, `5.12`, `05 : 12`, sur 12 h (`7:30` pour 19:30, `7:30 pm`, `٧:٣٠ م`), chiffres arabes-indiens `٠٥:١٢` et persans ; cases vides `--:--`, `00:00`, `__:__`.
- En-têtes en français, arabe et anglais (« Fajr / Sobh / الفجر », « Chourouk / الشروق », « Dohr / الظهر », « Maghreb / المغرب », « Icha / العشاء », « Imsak / الإمساك »…), sens droite-gauche des tableaux arabes.
- Dates : la date de la 1re ligne se règle dans le dialogue, et les dates écrites dans le tableau (`08/02/2027`, `8 février`, `٨ فبراير`, `8 فيفري`, `2027-02-08`) prennent le dessus quand elles existent. Les numéros de jour et les noms des jours de la semaine sont aussi contrôlés.

**Calcul (formules originales, sans bibliothèque)**
- Position du Soleil selon Meeus (*Astronomical Algorithms*, basse précision) et équation du temps de la NOAA, angle horaire itéré, lever et coucher à −0,833°, Asr standard ou hanafite (ombre de midi), Fajr et Isha par angle ou Isha = Maghrib + minutes, Imsak = Fajr − minutes.
- Méthodes : Algérie (18°/17°, Maghrib +3 min, par défaut), Maroc (19°/17°), Tunisie (18°/18°), Ligue islamique mondiale, Égypte, Umm al-Qura, Dubaï, Qatar, Koweït, Turquie (Diyanet), Karachi, ISNA, France 12°, et méthode personnalisée. Minutes de précaution par prière, arrondi au plus proche ou à la minute supérieure, règles des hautes latitudes (milieu de la nuit, septième, angle).
- 106 villes intégrées : les 58 wilayas d'Algérie, Tunisie, Maroc, Mauritanie, Libye, Égypte, Soudan, pays du Golfe, Jordanie, Liban, Syrie, Irak, Istanbul, France, Europe, Montréal, New York, Dakar, Bamako, Niamey, N'Djamena ; ou latitude/longitude libres. Fuseau horaire et heure d'été (Europe, Amérique du Nord, Égypte) appliqués jour par jour.

**Diagnostic**
- Cellule par cellule : heure écrite, heure calculée, écart, remarque (faux / faute de frappe probable / à remplir).
- Colonnes inversées (« Asr » titré mais contenant Maghrib), colonne qui ne correspond à aucune prière (iqama…), colonne entière décalée (minutes de précaution, autre méthode), décalage d'une heure (heure d'été oubliée), heures sur 12 h, prière avant la précédente, ligne copiée-collée, numéro de jour ou jour de la semaine faux, trou dans les dates.
- **Recherche des causes** : tableau décalé d'un ou plusieurs jours, mauvaise date de départ, mauvaise ville (préfiltre par la longitude déduite de Dhuhr), autre méthode, Asr hanafite.
- **Fautes de frappe internes** : même si le tableau suit un calendrier officiel décalé de quelques minutes du calcul, une heure qui s'écarte de ses voisines dans sa colonne est repérée.

**Action**
- Analyser seulement, corriger avec la valeur calculée, ou corriger seulement les fautes de frappe en gardant le décalage propre au tableau ; remplir les cases vides.
- Les modifications se font **caractère par caractère** : police, graisse, couleur, crénage et chiffres (latins, arabes, persans), séparateur, nombre de chiffres de l'heure et suffixe 12 h sont conservés. Les textes verrouillés ne sont jamais modifiés.
- Repères orange (faux), rouges (faute de frappe) et bleus (rempli) sur un calque non imprimable « Contrôle horaires de prière », recréé à chaque passage. Rapport `.txt` (UTF-8). Sélection des textes concernés. Dialogue en français ou en anglais.
- Tout s'annule avec Ctrl+Z / Cmd+Z (plusieurs pas si beaucoup de cellules sont modifiées).

## Pourquoi c'est nouveau

Les outils existants **génèrent** des horaires (PrayTimes.org, adhan-js, Niyat, Mawaqit, IslamicFinder, exports CSV/PDF à fusionner avec la fusion de données d'InDesign, offres « imsakiya » de MasjidConnect ou Ad-Din, demandes Freelancer d'automatisation InDesign), ou importent par OCR un calendrier vers un écran de mosquée (Ihsan). Aucun ne **relit un tableau déjà mis en page** pour vérifier ses heures, retrouver la cause d'un décalage (jour, ville, méthode, Asr, heure d'été) et corriger chiffre par chiffre en gardant la mise en forme. Rien d'équivalent n'a été trouvé dans Illustrator ni dans InDesign : pas de fonction native, rien sur GitHub, Adobe Community, Reddit, Graphic Design Stack Exchange, ni chez creold (Sergey Osokin), Hiroyuki Sato, John Wundes, Alexander Ladygin, wckdtall, Kelso Cartography, Astute Graphics, aescripts ou dans les boutiques de scripts. Les erreurs d'imsakiya imprimées (jour décalé, colonnes inversées, mauvaise ville copiée) sont pourtant fréquentes et visibles.

## Installation

1. Téléchargez `HorairesPriere.jsx`.
2. Soit **Fichier > Scripts > Autre script…** (Ctrl+F12 / Cmd+F12) et choisissez le fichier,
3. soit copiez-le dans le dossier des scripts d'Illustrator puis relancez Illustrator :
   - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\<langue>\Scripts\` (ex. `fr_FR`)
   - macOS : `/Applications/Adobe Illustrator <version>/Presets/<langue>/Scripts/`

   Le script apparaît alors dans **Fichier > Scripts**.

## Utilisation

1. Ouvrez une **copie** du document et sélectionnez les textes du tableau (ou le groupe qui le contient).
2. Lancez le script. Choisissez la ville (ou saisissez latitude, longitude, fuseau et heure d'été), la méthode, la date de la 1re ligne et la tolérance (2 min par défaut), puis l'action.
3. La fenêtre des résultats montre le résumé, les colonnes reconnues, le diagnostic et la liste des cellules. Vous pouvez enregistrer le rapport, sélectionner les textes concernés ou appliquer les corrections.
4. Vérifiez visuellement, puis masquez ou supprimez le calque « Contrôle horaires de prière » avant l'export (il n'est pas imprimable de toute façon).

Conseil : si toutes les colonnes sont décalées de la même valeur, le tableau suit sans doute le calendrier officiel de votre pays (ministère des Affaires religieuses, Habous, Diyanet…). Réglez alors les minutes de précaution, ou choisissez « Corriger seulement les fautes de frappe ».

## Limites connues

- Les heures calculées sont astronomiques ; **le calendrier officiel de votre pays fait foi**. L'altitude n'est pas prise en compte, et le changement d'heure du Maroc pendant le Ramadan se règle à la main (fuseau UTC+0 pour la période).
- Les coordonnées intégrées sont celles des centres-villes (OpenStreetMap) ; pour une autre commune, saisissez ses coordonnées.
- Textes pivotés ou déformés, textes sur tracé : non pris en charge. La position des repères est approximative (estimée d'après le corps et l'interlignage), et la position horizontale dans une ligne est proportionnelle au rang du caractère.
- Les colonnes iqama/jamaat (heures fixes ou décalées) sont signalées comme « non contrôlées ».

## Tests

**Non testé dans Illustrator.** Tests réellement exécutés (Node 18+, `npm install && npm test`) :

- Syntaxe : `HorairesPriere.jsx` analysé par acorn en ECMAScript 3 strict (mots réservés refusés même comme noms de propriétés) et en ECMAScript 5, plus une recherche d'API ES5+ (`forEach`, `map`, `JSON`, `trim`…) : aucune.
- Astronomie, contre la bibliothèque **adhan-js** (MIT, utilisée seulement pour les tests et non incluse dans le script) : 36 000 heures sur des dates et lieux tirés au hasard (latitudes −45° à 48°, longitudes −170° à 170°) : environ 94 % identiques à la minute, les autres à ±1 min, au plus 2 min (Asr) ; écart médian avant arrondi d'environ 1 s (10 s pour Asr). Règles d'heure d'été 2026 vérifiées (Europe, États-Unis, Égypte). Jour de la semaine et jour julien contrôlés sur 20 000 dates contre `Date` de JavaScript.
- Tableaux : 300 tableaux générés au hasard (5 mises en page, en-têtes français ou arabes, chiffres arabes-indiens, 12 h, dates écrites, 2 204 vérifications) : 1 826 erreurs injectées sur 1 826 trouvées, 0 faux positif, 1 826 corrections justes, colonnes reconnues 300 fois sur 300, aucune erreur restante après correction, second passage sans modification.
- Diagnostic : 84 vérifications (décalage d'un jour, mauvaise ville Oran/Alger, heure d'été oubliée, Asr hanafite, méthode égyptienne, date de départ fausse, 12 h, remplissage de 90 cases exact, ordre droite-gauche, numéro et nom du jour, ligne dupliquée, deux blocs côte à côte, Paris au changement d'heure, mode « fautes de frappe ») : 0 échec.
- DOM Illustrator et ScriptUI simulés (`test/dommock.js`) : 42 vérifications sur le script complet — alertes sans document, sans sélection ou sans heure ; 5 mises en page corrigées de bout en bout ; mise en forme par caractère conservée ; textes verrouillés intacts ; mode « analyser » sans modification ; remplissage ; repères ; réglages mémorisés ; interface anglaise ; rapport UTF-8 : 0 échec.
- Mutations (`npm run mutate`) : 6 défauts volontaires (Asr, heure d'été, réfraction, écriture caractère par caractère, miroir droite-gauche, tolérance des lignes) : 6 sur 6 détectés par les tests.
- Performance (Node) : tableau de 30 lignes en ~30 ms, recherche de ville ~170 ms, tableau annuel de 365 lignes ~0,2 s.

## Structure

- `HorairesPriere.jsx` : le script à utiliser (assemblé par `node build.js`).
- `src/` : sources (`engine.js` calcul et analyse, `cities.js` villes, `collect.js` lecture des textes, `ui.js` dialogues et DOM Illustrator).
- `test/` : tests Node.

## Licence

MIT — voir [LICENSE](LICENSE). Formules : Jean Meeus, *Astronomical Algorithms* ; équation du temps de la NOAA (domaine public). Code entièrement original.
