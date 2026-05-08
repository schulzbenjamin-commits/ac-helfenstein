// ms → "1:23,45"
export const formatZeit = (ms: number): string => {
  const minuten = Math.floor(ms / 60000);
  const sekunden = Math.floor((ms % 60000) / 1000);
  const hundertstel = Math.floor((ms % 1000) / 10);
  return `${minuten}:${String(sekunden).padStart(2, '0')},${String(hundertstel).padStart(2, '0')}`;
};

// "1:23,45" → ms (null bei ungültigem Format)
export const parseZeit = (input: string): number | null => {
  const match = input.match(/^(\d+):(\d{2}),(\d{2})$/);
  if (!match) return null;
  const ms =
    parseInt(match[1], 10) * 60000 +
    parseInt(match[2], 10) * 1000 +
    parseInt(match[3], 10) * 10;
  return ms > 0 ? ms : null;
};

// ms → Sekunden mit 2 Dezimalstellen (für Charts)
export const msZuSekunden = (ms: number): number => {
  return Math.round(ms / 10) / 100;
};

// Datum "YYYY-MM-DD" → "DD.MM.YYYY"
export const formatDatum = (isoDate: string): string => {
  if (!isoDate || isoDate.length < 10) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

// "DD.MM.YYYY" → "YYYY-MM-DD"
export const parseDatum = (deDate: string): string | null => {
  const match = deDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
};
