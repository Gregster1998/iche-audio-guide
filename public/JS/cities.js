// cities.js - Stadtdaten für ICHE Audio Guide
// WICHTIG: Kein "export" - das macht es zu einer globalen Variable

const citiesData = {
  cities: {
    Milan: [
      {
        name: "Mailänder Dom",
        lat: 45.4642,
        lng: 9.1916,
        audio: "audio/duomo.mp3",
        info: "Der Mailänder Dom ist das ikonische Wahrzeichen von Mailand.",
        radius: 150,
        line: 1
      },
      {
        name: "Galleria Vittorio Emanuele II",
        lat: 45.4665,
        lng: 9.1911,
        audio: "audio/galleria.mp3",
        info: "Eine der ältesten Einkaufsgalerien der Welt.",
        radius: 70,
        line: 1
      },
      {
        name: "Sforza Castle",
        lat: 45.4700,
        lng: 9.1790,
        audio: "audio/sforza.mp3",
        info: "Ein historisches Schloss mit Museen und Kunstgalerien.",
        radius: 100,
        line: 5
      }
    ],
    Vienna: [
      {
        name: "Stephansdom",
        lat: 48.2082,
        lng: 16.3738,
        audio: "audio/stephansdom.mp3",
        info: "Der Stephansdom ist das Wahrzeichen Wiens.",
        radius: 150
      },
      {
        name: "Schönbrunn Palace",
        lat: 48.1855,
        lng: 16.3122,
        audio: "audio/schoenbrunn.mp3",
        info: "Ein UNESCO-Weltkulturerbe und ehemalige kaiserliche Sommerresidenz.",
        radius: 200
      },
      {
        name: "Belvedere Palace",
        lat: 48.1915,
        lng: 16.3732,
        audio: "audio/belvedere.mp3",
        info: "Ein barockes Schloss mit einer beeindruckenden Kunstsammlung.",
        radius: 100
      }
    ]
  }
};

// Debug: Log beim Laden der Datei
console.log("✅ cities.js loaded successfully");
console.log("📋 Available cities:", Object.keys(citiesData.cities));