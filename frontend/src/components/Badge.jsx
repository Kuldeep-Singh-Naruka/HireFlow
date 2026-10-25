const STYLES = {
  strong_match: { label: 'Strong Match', cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' },
  review_required: { label: 'Review Required', cls: 'bg-amber-950/60 text-amber-300 border-amber-800' },
  significant_gaps: { label: 'Significant Gaps', cls: 'bg-rose-950/60 text-rose-300 border-rose-800' },
};

export default function Badge({ badge }) {
  const style = STYLES[badge];
  if (!style) return null;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.cls}`}>
      {style.label}
    </span>
  );
}
