export default function V3PreviewBadge({ label = "V3 예시 데이터" }: { label?: string }) {
  return (
    <span className="v3-preview-badge" role="note">
      {label}
    </span>
  );
}
