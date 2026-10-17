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
