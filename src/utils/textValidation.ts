/**
 * Anti-gibberish, string cleaning, and human readable text validator for sports tournaments
 * Detects keyboard smashing (e.g. "BDJFJFJJFJF", "asdasd"), repeated characters/substrings,
 * sequences, excessive length, and unnatural consonant clusters.
 */

export const MIN_TOURNAMENT_NAME_LENGTH = 5;
export const MAX_TOURNAMENT_NAME_LENGTH = 60;

const KEYBOARD_SEQUENCES = [
  'asdf', 'asda', 'sdas', 'dasd', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'jklñ',
  'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop', 'qweq', 'weqw', 'eqwe',
  'zxcv', 'xcvb', 'cvbn', 'vbnm', 'zxcz', 'xczx', 'czxc',
  'fdsa', 'gfds', 'hgfd', 'jhgf', 'kjhg', 'lkjh',
  'rewq', 'trew', 'ytre', 'uytr', 'iuyt', 'oiuy', 'poiu',
  'vcxz', 'bvcx', 'nbvc', 'mnbv',
  '1234', '2345', '3456', '4567', '5678', '6789', '4321',
  'abcd', 'bcde', 'dcba', 'qazw', 'wsxe', 'edcr',
];

/**
 * Cleans and normalizes a string by removing invisible control characters,
 * collapsing repeated whitespace and repeated symbols/punctuation, and trimming edges.
 */
export function cleanTournamentString(rawText: string, trimTrailing: boolean = true): string {
  if (!rawText) return '';
  let cleaned = rawText
    // Replace tabs/newlines/multiple spaces with a single space first
    .replace(/\s+/g, ' ')
    // Remove remaining control & zero-width characters
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    // Collapse repeated symbols like "---", "...", "///"
    .replace(/([\-_./\\,;:!@#$%^&*()+=])\1{1,}/g, '$1')
    // Always remove leading whitespace
    .replace(/^\s+/, '');

  if (trimTrailing) {
    cleaned = cleaned.trim();
  }
  return cleaned;
}

export function validateHumanReadableText(
  rawText: string,
  fieldName: string = 'Este campo',
  minLength: number = 3,
  maxLength: number = 80
): { isValid: boolean; error?: string; cleanedText: string } {
  const text = cleanTournamentString(rawText, true);

  if (!text) {
    return { isValid: false, error: `${fieldName} es obligatorio.`, cleanedText: '' };
  }

  if (text.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} debe tener al menos ${minLength} caracteres (actual: ${text.length}).`,
      cleanedText: text,
    };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} no puede superar los ${maxLength} caracteres (actual: ${text.length}).`,
      cleanedText: text,
    };
  }

  // Reject strings without any letters (only numbers or symbols)
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) {
    return { isValid: false, error: `${fieldName} debe contener letras válidas.`, cleanedText: text };
  }

  // Reject 3 or more of the exact same character in a row (e.g. "aaaa", "jjjjj", "xxxxx")
  if (/(.)\1{2,}/i.test(text)) {
    return {
      isValid: false,
      error: `${fieldName} contiene letras repetidas no válidas (ej: "aaaa").`,
      cleanedText: text,
    };
  }

  // Reject 2-to-8 character repeating loops (e.g. "ababab", "asdasd", "asdasdasdasdasdas", "qweqwe", "zxcvzxcv", "fgdfgd")
  if (
    /([a-záéíóúñ]{2,8})\1{2,}/i.test(text) ||
    /([a-záéíóúñ]{3,8})\1{1,}/i.test(text) ||
    /([bcdfghjklmnñpqrstvwxyz]{2})\1{1,}/i.test(text)
  ) {
    return {
      isValid: false,
      error: `${fieldName} contiene secuencias repetitivas no válidas (ej: "${text.slice(0, 12)}").`,
      cleanedText: text,
    };
  }

  // Check keyboard sequences across normalized alphanumeric string
  const lower = text.toLowerCase().replace(/[^a-z0-9ñ]/g, '');
  for (const seq of KEYBOARD_SEQUENCES) {
    if (lower.includes(seq)) {
      return {
        isValid: false,
        error: `${fieldName} contiene patrones de teclado al azar no permitidos (ej: "${seq}").`,
        cleanedText: text,
      };
    }
  }

  // Split into words and inspect each word
  const words = text.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const letters = word.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
    if (letters.length > 18) {
      return {
        isValid: false,
        error: `${fieldName} contiene una palabra excesivamente larga sin espacios ("${word.slice(0, 15)}...").`,
        cleanedText: text,
      };
    }

    // Reject words made exclusively of home-row keys (e.g., "asdfgh", "dasfgh", "asdas", "asdasd")
    if (
      letters.length >= 4 &&
      /^[asdfghjklñ]+$/i.test(letters) &&
      !/^(sala|alas|faja|laja|hada|saga|gala|falsa|falda|allas|llaga|daga)$/i.test(letters)
    ) {
      return {
        isValid: false,
        error: `${fieldName} contiene letras al azar del teclado ("${word}").`,
        cleanedText: text,
      };
    }

    if (letters.length >= 4) {
      // Count vowels (Spanish: a, e, i, o, u, á, é, í, ó, ú, y)
      const vowelCount = (letters.match(/[aeiouáéíóúy]/g) || []).length;
      const vowelRatio = vowelCount / letters.length;

      // Unnatural word without vowels (e.g. "BDJFJFJJFJF", "dfghjk")
      if (vowelCount === 0) {
        return {
          isValid: false,
          error: `${fieldName} no es un nombre real (palabra "${word}" no contiene vocales).`,
          cleanedText: text,
        };
      }

      // Very low or very high vowel ratio in a longer word
      if (letters.length >= 5 && (vowelRatio < 0.18 || vowelRatio > 0.85)) {
        return {
          isValid: false,
          error: `${fieldName} contiene secuencias aleatorias de letras (ej: "${word}").`,
          cleanedText: text,
        };
      }

      // Check for 4 or more consecutive consonants (except valid Spanish clusters like nstr, nscr, bstr, xtr)
      const consonantClusters = letters.match(/[bcdfghjklmnñpqrstvwxyz]{4,}/gi) || [];
      for (const cluster of consonantClusters) {
        if (!/^(nstr|nscr|bstr|nscl|nsgr|ntrl|xtr)/i.test(cluster)) {
          return {
            isValid: false,
            error: `${fieldName} contiene letras al azar sin sentido lingüístico.`,
            cleanedText: text,
          };
        }
      }

      // Low character diversity (entropy) checks
      const uniqueChars = new Set(letters.split('')).size;
      if (
        (letters.length >= 5 && uniqueChars <= 2) ||
        (letters.length >= 6 && uniqueChars <= 3) ||
        (letters.length >= 10 && uniqueChars <= 4) ||
        (letters.length >= 14 && uniqueChars <= 5)
      ) {
        return {
          isValid: false,
          error: `${fieldName} contiene caracteres repetitivos sin significado real ("${word}").`,
          cleanedText: text,
        };
      }
    }
  }

  // Reject repeated identical words in a row (e.g. "Copa Copa Copa" or "Torneo Torneo")
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1].toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '');
    const curr = words[i].toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '');
    if (prev.length >= 2 && prev === curr) {
      return {
        isValid: false,
        error: `${fieldName} contiene palabras repetidas consecutivamente ("${words[i]}").`,
        cleanedText: text,
      };
    }
  }

  return { isValid: true, cleanedText: text };
}

/**
 * Dedicated tournament name validator with string sanitization, min/max character limits,
 * and anti-repetition / anti-keyboard-smash verification.
 */
export function validateTournamentName(rawName: string): {
  isValid: boolean;
  cleanedName: string;
  charCount: number;
  minLength: number;
  maxLength: number;
  error?: string;
} {
  const cleanedName = cleanTournamentString(rawName, true);
  const charCount = cleanedName.length;

  const baseCheck = validateHumanReadableText(
    cleanedName,
    'El nombre del campeonato',
    MIN_TOURNAMENT_NAME_LENGTH,
    MAX_TOURNAMENT_NAME_LENGTH
  );

  return {
    isValid: baseCheck.isValid,
    cleanedName,
    charCount,
    minLength: MIN_TOURNAMENT_NAME_LENGTH,
    maxLength: MAX_TOURNAMENT_NAME_LENGTH,
    error: baseCheck.error,
  };
}


