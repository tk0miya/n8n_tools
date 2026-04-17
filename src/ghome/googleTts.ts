const MAX_LENGTH = 200;
const SPLIT_REGEX = /[\s\uFEFF\xA0!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

function splitLongText(text: string, splitPunct = ""): string[] {
  const regex = splitPunct ? new RegExp(`[${SPLIT_REGEX.source.slice(1, -1)}${splitPunct}]`) : SPLIT_REGEX;
  const isBreakable = (s: string, i: number) => regex.test(s.charAt(i));

  const lastBreakBefore = (s: string, left: number, right: number): number => {
    for (let i = right; i >= left; i--) {
      if (isBreakable(s, i)) return i;
    }
    return -1;
  };

  const result: string[] = [];
  let start = 0;

  for (;;) {
    if (text.length - start <= MAX_LENGTH) {
      result.push(text.slice(start));
      break;
    }

    let end = start + MAX_LENGTH - 1;
    if (isBreakable(text, end) || isBreakable(text, end + 1)) {
      result.push(text.slice(start, end + 1));
      start = end + 1;
      continue;
    }

    end = lastBreakBefore(text, start, end);
    if (end === -1) {
      throw new Error(
        `Text cannot be split at word boundary: "${text.slice(start, start + MAX_LENGTH)}...". Try using splitPunct option.`,
      );
    }

    result.push(text.slice(start, end + 1));
    start = end + 1;
  }

  return result;
}

export interface AudioUrlResult {
  shortText: string;
  url: string;
}

export interface GetAllAudioUrlsOptions {
  lang?: string;
  slow?: boolean;
  host?: string;
  splitPunct?: string;
}

export function getAllAudioUrls(text: string, options: GetAllAudioUrlsOptions = {}): AudioUrlResult[] {
  const { lang = "en", slow = false, host = "https://translate.google.com", splitPunct = "" } = options;

  return splitLongText(text, splitPunct).map((shortText) => {
    const params = new URLSearchParams({
      ie: "UTF-8",
      q: shortText,
      tl: lang,
      total: "1",
      idx: "0",
      textlen: String(shortText.length),
      client: "tw-ob",
      prev: "input",
      ttsspeed: slow ? "0.24" : "1",
    });
    return { shortText, url: `${host}/translate_tts?${params}` };
  });
}
