export const RatingBadge = ({ rating }: { rating: number }) => {
  const color = rating >= 7 ? 'var(--green)' : rating >= 5 ? 'var(--yellow)' : 'var(--red)';
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color,
      background: `${color}22`, padding: '2px 8px',
      borderRadius: 6, border: `1px solid ${color}44`,
    }}>
      {rating.toFixed(1)}
    </span>
  );
};
