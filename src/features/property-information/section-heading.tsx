import type { ReactNode } from "react";

const icons = {
  rental: <path d="M3 11l9-7 9 7m-2-1v10H5V10m5 10v-6h4v6"/>,
  verification: <path d="M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3zm-4 9 3 3 5-6"/>,
  women: <path d="M6 15V9a6 6 0 0 1 12 0v6M8 8c2 0 3-1 4-3 1 2 3 3 4 3v2a4 4 0 0 1-8 0V8Zm1 7c-3 1-4 3-4 6m10-6c3 1 4 3 4 6m-10-6 3 3 3-3"/>,
  contact: <path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 4-7 2-12-3S2 4 5 3Z"/>,
};

export function PropertySectionHeading({ icon, children, help }: {
  icon: keyof typeof icons; children: ReactNode; help?: ReactNode;
}) {
  return (
    <div className="property-sidebar-heading">
      <span className="property-sidebar-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </span>
      <h2>{children}</h2>
      {help}
    </div>
  );
}
