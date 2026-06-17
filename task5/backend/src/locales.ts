import { Faker, de, en, uk, base } from "@faker-js/faker";

export type LocaleId = "en" | "de" | "uk";

export const SUPPORTED_LOCALES: LocaleId[] = ["en", "de", "uk"];
export const DEFAULT_LOCALE: LocaleId = "en";

export function normalizeLocale(input: unknown): LocaleId {
  const value = String(input ?? "").toLowerCase();
  if (value.startsWith("de")) return "de";
  if (value.startsWith("uk") || value.startsWith("ua")) return "uk";
  return "en";
}

/**
 * Localized vocabulary used to compose realistic-looking song/album/artist
 * names, genres, reviews and lyrics. Each locale is fully independent so the
 * generated content reads naturally in that language (no Lorem Ipsum, no
 * cross-language bleed).
 */
export interface LocaleBank {
  faker: Faker;
  single: string; // word for a non-album release
  genres: string[];
  titleAdjectives: string[];
  titleNouns: string[];
  bandPrefixes: string[];
  bandNouns: string[];
  albumWords: string[];
  reviewSentences: string[]; // realistic review phrases
  lyricLines: string[]; // pool of lyric lines
  chorusWords: string[];
}

const enFaker = new Faker({ locale: [en, base] });
const deFaker = new Faker({ locale: [de, base] });
const ukFaker = new Faker({ locale: [uk, base] });

const BANKS: Record<LocaleId, LocaleBank> = {
  en: {
    faker: enFaker,
    single: "Single",
    genres: [
      "Indie Rock", "Synthwave", "Lo-fi Hip Hop", "Dream Pop", "Folk",
      "Techno", "Jazz Fusion", "Ambient", "Punk", "Soul",
      "Drum & Bass", "Shoegaze", "Country", "R&B", "Post-Rock",
    ],
    titleAdjectives: [
      "Midnight", "Electric", "Golden", "Silent", "Broken", "Velvet",
      "Endless", "Crimson", "Hollow", "Neon", "Frozen", "Wild",
      "Distant", "Restless", "Burning", "Faded",
    ],
    titleNouns: [
      "Dreams", "Highway", "Rivers", "Echoes", "Shadows", "Hearts",
      "City", "Skyline", "Memories", "Storm", "Horizon", "Reverie",
      "Letters", "Machines", "Gardens", "Tides",
    ],
    bandPrefixes: ["The", "Royal", "Electric", "Midnight", "Velvet", "Neon", "Silver"],
    bandNouns: [
      "Foxes", "Astronauts", "Tigers", "Mirrors", "Ravens", "Saints",
      "Pilots", "Lanterns", "Wolves", "Embers", "Cardinals", "Drifters",
    ],
    albumWords: [
      "Aftermath", "Origins", "Parallel", "Solstice", "Afterglow",
      "Continuum", "Wanderlust", "Threshold", "Momentum", "Equinox",
    ],
    reviewSentences: [
      "Absolutely hypnotic from the first beat.",
      "The production is crisp and the melody lingers for days.",
      "Not my favorite, but the bridge is genuinely beautiful.",
      "I've had this on repeat all week.",
      "A little repetitive, yet undeniably catchy.",
      "The vocals carry so much emotion here.",
      "Perfect late-night driving music.",
      "Feels like a warm memory wrapped in sound.",
      "The drop took me completely by surprise.",
      "Solid track, though it ends a bit too soon.",
    ],
    lyricLines: [
      "Underneath the falling light",
      "I keep chasing what I lost",
      "Every road leads back to you",
      "Hold on to the fading sound",
      "We were running out of time",
      "Echoes of a brighter day",
      "Dancing on a broken line",
      "Carry me across the night",
      "Nothing left but open skies",
      "Whispers of a distant song",
      "Let the morning find us here",
      "Burning like a quiet flame",
    ],
    chorusWords: ["Oh, take me higher", "We won't fade away", "Hold the line tonight", "Run until the dawn"],
  },
  de: {
    faker: deFaker,
    single: "Single",
    genres: [
      "Indie-Rock", "Synthwave", "Lo-fi Hip-Hop", "Dream Pop", "Volksmusik",
      "Techno", "Jazz", "Ambient", "Punk", "Soul",
      "Drum & Bass", "Schlager", "Klassik", "Liedermacher", "Post-Rock",
    ],
    titleAdjectives: [
      "Mitternachts", "Elektrische", "Goldene", "Stille", "Zerbrochene", "Samtene",
      "Endlose", "Rote", "Hohle", "Wilde", "Ferne", "Brennende",
      "Verlorene", "Leise", "Dunkle", "Kalte",
    ],
    titleNouns: [
      "Träume", "Straße", "Flüsse", "Echos", "Schatten", "Herzen",
      "Stadt", "Horizont", "Erinnerungen", "Sturm", "Sterne", "Gärten",
      "Briefe", "Maschinen", "Wellen", "Lichter",
    ],
    bandPrefixes: ["Die", "Königliche", "Elektrische", "Mitternacht", "Samt", "Neon", "Silberne"],
    bandNouns: [
      "Füchse", "Astronauten", "Tiger", "Spiegel", "Raben", "Heiligen",
      "Piloten", "Laternen", "Wölfe", "Funken", "Wanderer", "Kardinäle",
    ],
    albumWords: [
      "Nachwirkung", "Ursprung", "Parallele", "Sonnenwende", "Abendrot",
      "Kontinuum", "Fernweh", "Schwelle", "Schwung", "Tagundnachtgleiche",
    ],
    reviewSentences: [
      "Vom ersten Ton an absolut hypnotisch.",
      "Die Produktion ist klar und die Melodie bleibt tagelang im Kopf.",
      "Nicht mein Favorit, aber die Bridge ist wirklich schön.",
      "Ich höre das die ganze Woche in Dauerschleife.",
      "Etwas repetitiv, aber zweifellos eingängig.",
      "Der Gesang trägt hier so viel Gefühl.",
      "Perfekte Musik für nächtliche Autofahrten.",
      "Fühlt sich an wie eine warme Erinnerung in Klang gehüllt.",
      "Der Drop hat mich völlig überrascht.",
      "Solider Track, endet aber etwas zu früh.",
    ],
    lyricLines: [
      "Unter dem fallenden Licht",
      "Ich jage dem nach, was ich verlor",
      "Jeder Weg führt zurück zu dir",
      "Halt den verklingenden Klang",
      "Uns lief die Zeit davon",
      "Echos eines helleren Tags",
      "Tanzend auf gebrochener Linie",
      "Trag mich durch die Nacht",
      "Nichts bleibt als offener Himmel",
      "Flüstern eines fernen Lieds",
      "Lass uns der Morgen finden",
      "Brennend wie eine stille Flamme",
    ],
    chorusWords: ["Oh, trag mich höher", "Wir vergehen nicht", "Halt die Linie heut Nacht", "Lauf bis zum Morgen"],
  },
  uk: {
    faker: ukFaker,
    single: "Сингл",
    genres: [
      "Інді-рок", "Синтвейв", "Lo-fi хіп-хоп", "Дрім-поп", "Фолк",
      "Техно", "Джаз", "Ембієнт", "Панк", "Соул",
      "Драм-н-бейс", "Шугейз", "Етно", "Ритм-н-блюз", "Пост-рок",
    ],
    titleAdjectives: [
      "Опівнічні", "Електричні", "Золоті", "Тихі", "Розбиті", "Оксамитові",
      "Безкінечні", "Багряні", "Порожні", "Дикі", "Далекі", "Палаючі",
      "Втрачені", "Холодні", "Темні", "Згаслі",
    ],
    titleNouns: [
      "Мрії", "Дорога", "Ріки", "Відлуння", "Тіні", "Серця",
      "Місто", "Обрій", "Спогади", "Буря", "Зорі", "Сади",
      "Листи", "Машини", "Хвилі", "Вогні",
    ],
    bandPrefixes: ["Королівські", "Електричні", "Опівнічні", "Оксамитові", "Неонові", "Срібні", "Дикі"],
    bandNouns: [
      "Лиси", "Космонавти", "Тигри", "Дзеркала", "Круки", "Святі",
      "Пілоти", "Ліхтарі", "Вовки", "Іскри", "Мандрівники", "Кардинали",
    ],
    albumWords: [
      "Наслідки", "Витоки", "Паралель", "Сонцестояння", "Заграва",
      "Континуум", "Жага мандрів", "Поріг", "Рух", "Рівнодення",
    ],
    reviewSentences: [
      "Абсолютно гіпнотично з першого біту.",
      "Продакшн чистий, а мелодія крутиться в голові днями.",
      "Не мій улюблений трек, але бридж справді чудовий.",
      "Слухаю це на повторі весь тиждень.",
      "Трохи повторюється, але безперечно чіпляє.",
      "Вокал тут несе стільки емоцій.",
      "Ідеальна музика для нічних поїздок.",
      "Відчувається як теплий спогад, загорнутий у звук.",
      "Дроп заскочив мене зненацька.",
      "Гідний трек, хоча закінчується трохи зарано.",
    ],
    lyricLines: [
      "Під світлом, що спадає вниз",
      "Я все женусь за тим, що втратив",
      "Всі дороги ведуть до тебе",
      "Тримай цей звук, що згасає",
      "У нас закінчувався час",
      "Відлуння світлішого дня",
      "Танцюючи на розбитій лінії",
      "Неси мене крізь ніч",
      "Лишилось тільки чисте небо",
      "Шепіт далекої пісні",
      "Нехай нас знайде ранок тут",
      "Палаючи, як тихе полум’я",
    ],
    chorusWords: ["О, неси мене вище", "Ми не згаснемо", "Тримай цю лінію вночі", "Біжи до світанку"],
  },
};

export function getBank(locale: LocaleId): LocaleBank {
  return BANKS[locale];
}
