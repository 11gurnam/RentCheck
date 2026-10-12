export function CollectionHeading({ title, eyebrow, description, kind }: {
  title: string; eyebrow: string; description: string; kind: "saved" | "reviews" | "claims";
}) {
  return <div className="collection-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
    <svg className="collection-illustration" viewBox="0 0 260 180" fill="none" aria-hidden="true">
      <ellipse cx="130" cy="158" rx="100" ry="12" fill="#dce5d8" />
      <circle cx="130" cy="83" r="72" fill="#e8eee3" />
      <path d="M42 91 94 47l52 44v63H42Z" fill="#fffdf7" stroke="#41685b" strokeWidth="3" />
      <path d="M81 154v-39h26v39M57 93h21v20H57" stroke="#41685b" strokeWidth="3" />
      <rect x="137" y="48" width="77" height="98" rx="10" fill="#fffdf7" stroke="#41685b" strokeWidth="3" />
      <path d="M152 113h46M152 126h32" stroke="#b8c8b0" strokeWidth="4" strokeLinecap="round" />
      {kind === "saved" ? <path d="M175 94s-24-13-24-26c0-13 18-16 24-5 6-11 24-8 24 5 0 13-24 26-24 26Z" fill="#c88765" /> : kind === "claims" ? <><path d="m175 59 22 9v16c0 15-22 24-22 24s-22-9-22-24V68Z" fill="#dce5d8" /><path d="m164 82 8 8 15-17" stroke="#41685b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></> : <><path d="M151 63h48v33h-29l-12 9V96h-7Z" fill="#dce5d8" /><path d="M160 74h29M160 84h20" stroke="#41685b" strokeWidth="3" strokeLinecap="round" /></>}
      <path d="M224 151v-29m0 10c-19-1-21-17-21-17 18 0 21 17 21 17Zm0-8s1-21 18-24c1 17-18 24-18 24Z" stroke="#78916c" strokeWidth="3" />
    </svg>
  </div>;
}
