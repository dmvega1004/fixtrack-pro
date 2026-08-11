const UNITS = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
];
const TEENS = [
  "diez", "once", "doce", "trece", "catorce", "quince",
  "dieciséis", "diecisiete", "dieciocho", "diecinueve",
];
const TENS = [
  "", "", "veinte", "treinta", "cuarenta", "cincuenta",
  "sesenta", "setenta", "ochenta", "noventa",
];
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

/** 0-999 en palabras. "100" exacto es "cien" (no "ciento"). */
function convertUpTo999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";

  const hundredsDigit = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (hundredsDigit > 0) parts.push(HUNDREDS[hundredsDigit]);

  if (rest > 0) {
    if (rest < 10) parts.push(UNITS[rest]);
    else if (rest < 20) parts.push(TEENS[rest - 10]);
    else if (rest === 20) parts.push("veinte");
    else if (rest < 30) parts.push(`veinti${UNITS[rest - 20]}`);
    else {
      const tensDigit = Math.floor(rest / 10);
      const unitsDigit = rest % 10;
      parts.push(
        unitsDigit > 0 ? `${TENS[tensDigit]} y ${UNITS[unitsDigit]}` : TENS[tensDigit],
      );
    }
  }

  return parts.join(" ");
}

/** Apócope ante sustantivo masculino: "uno"→"un", "veintiuno"→"veintiún". */
function apocopate(words: string): string {
  if (words.endsWith("veintiuno")) return `${words.slice(0, -2)}ún`;
  if (words.endsWith("uno")) return `${words.slice(0, -3)}un`;
  return words;
}

/**
 * Convierte un entero no negativo a palabras en español (hasta 999.999.999).
 * Usada para el "Total en letras" de la cuenta de cobro — casos cubiertos:
 * decenas especiales (veinti-), centenas irregulares (quinientos,
 * novecientos, cien vs ciento) y apócope (un/veintiún) antes de "mil",
 * "millones" y la unidad monetaria final.
 */
export function numberToWordsEs(value: number): string {
  const n = Math.round(Math.max(0, value));
  if (n === 0) return "cero";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(
      millions === 1 ? "un millón" : `${apocopate(convertUpTo999(millions))} millones`,
    );
    // "un millón DE pesos" pero "un millón quinientos mil pesos" (sin "de"
    // cuando "millón/millones" va seguido de más cifras, no directo del sustantivo).
    if (thousands === 0 && units === 0) parts.push("de");
  }

  if (thousands > 0) {
    parts.push(thousands === 1 ? "mil" : `${apocopate(convertUpTo999(thousands))} mil`);
  }

  if (units > 0) {
    parts.push(apocopate(convertUpTo999(units)));
  }

  return parts.join(" ").trim();
}

const CURRENCY_WORDS: Record<string, string> = {
  COP: "PESOS M/CTE",
  USD: "DÓLARES",
  EUR: "EUROS",
  MXN: "PESOS MEXICANOS",
  PEN: "SOLES",
};

/** "Son: CIENTO CINCUENTA MIL PESOS M/CTE" — total en letras + unidad monetaria, en mayúsculas. */
export function amountInWords(value: number | string, currency: string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  const words = numberToWordsEs(numeric).toUpperCase();
  const unit = CURRENCY_WORDS[currency] ?? "PESOS";
  return `Son: ${words} ${unit}`;
}
