export function customerConstraints(messages: string[]) {
  let maxPaise: number | undefined, purity: string | undefined;
  for (const text of messages) {
    const p = text.match(/\b(18\s*k|22\s*k|925|sterling silver)\b/i);
    if (p) purity = /18/i.test(p[1]) ? '18K' : /22/i.test(p[1]) ? '22K' : '925';
    const matches = [
      ...text.matchAll(
        /(?:under|below|less than|up to|upto|maximum|max|budget(?:\s+(?:is|of|around|to))?|around|within|tak)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|lacs|k|thousand)?/gi,
      ),
    ];
    if (matches.length) {
      const m = matches[matches.length - 1];
      let rupees = Number(m[1].replaceAll(',', ''));
      if (/lakh|lac/i.test(m[2] ?? '')) rupees *= 100000;
      else if (/k|thousand/i.test(m[2] ?? '')) rupees *= 1000;
      if (Number.isFinite(rupees) && rupees > 0 && rupees < 100000000)
        maxPaise = Math.round(rupees * 100);
    }
  }
  return { maxPaise, purity };
}
