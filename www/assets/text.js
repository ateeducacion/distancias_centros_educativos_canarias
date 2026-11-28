// Text helpers shared by the landing and the explanatory pages.

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/**
 * Title-case place names published in capitals ("PUERTO DE LA CRUZ" becomes
 * "Puerto de la Cruz"). Names already in mixed case are returned unchanged.
 */
export function prettyPlace(value) {
  const text = String(value ?? "").trim();
  if (text === "" || text !== text.toLocaleUpperCase("es")) return text;
  return text
    .toLocaleLowerCase("es")
    .split(/(\s+|-|\/)/)
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("es")),
    )
    .join("");
}
