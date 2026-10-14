export function Brand({ href = "/#top" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="RentCheck home">
      <span className="brand-mark" aria-hidden="true">
        r<span>✓</span>
      </span>
      RentCheck<span className="brand-city">INDIA</span>
    </a>
  );
}
