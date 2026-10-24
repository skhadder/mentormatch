// MentorMatch logo: two points joined by a bridge-like arc, beside the wordmark.
// The mark keeps its own colors; the wordmark follows the surrounding text color.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="MentorMatch"
      viewBox="0 0 168 32"
      height="28"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#0F6B6B" />
      <path d="M8 21 C8 9 24 9 24 21" fill="none" stroke="#FBFAF8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="21" r="3.25" fill="#FBFAF8" />
      <circle cx="24" cy="21" r="3.25" fill="#FBFAF8" />
      <text
        x="42"
        y="22"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="18"
        fontWeight="600"
      >
        MentorMatch
      </text>
    </svg>
  );
}
