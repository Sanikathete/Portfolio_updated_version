export const SectionHeader = ({ label, title, description }: { label: string; title: string; description?: string }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 9, color: 'var(--accent-gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
      ◆ {label}
    </div>
    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: description ? 8 : 0 }}>
      {title}
    </h1>
    {description ? <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6 }}>{description}</p> : null}
  </div>
);
