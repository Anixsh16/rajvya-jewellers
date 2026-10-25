const stop = new Set(
  'a an the for as with in of on to me my i want show find under below above max maximum budget rupees rs inr and or is it this that please options suggest look ke ki ka liye dikhao chahiye batao karo sa'.split(
    ' ',
  ),
);
export function normalizeSearch(text: string) {
  return text
    .replace(/halka|halke|lightweight/gi, 'light daily')
    .replace(/roz|rozana/gi, 'everyday')
    .replace(/jhumka|bali|kaan/gi, 'earrings')
    .replace(/haar|gale/gi, 'chain');
}
export function keywordQuery(text: string) {
  const words =
    normalizeSearch(text)
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => !stop.has(w) && !/^\d+$/.test(w)))]
    .slice(0, 16)
    .join(' OR ');
}
