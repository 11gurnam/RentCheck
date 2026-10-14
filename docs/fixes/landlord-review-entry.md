# Landlord review entry — 2026-10-07

User could not find a landlord review action. Landlord ratings were already supported through canonical property tenancy reviews, but the landlord profile had no direct action and the form called the field Management rating.

Landlord profile now has Review this landlord, a clear explanation and Review your tenancy at NAME links on associated accommodation. The form label is Landlord / management rating. A missing association explains that a property/history must be recorded before attribution. The existing property and landlord scores remain separate; tenancy start dates still identify the recorded responsible manager. No standalone arbitrary manager rating or bypass of ownership/canonical-tenancy checks was introduced.

Property-specific review destinations survive email/Google sign-in through the existing allowlist. Only the exact review path with a UUID property parameter is accepted; additional parameters/fragments are refused. A focused unit case covers that boundary. Browser journeys enter from a historic landlord profile before login, submit a dated review and confirm the text/rating on that landlord profile before author deletion/fixture cleanup.

Local validation: lint/types,68 units and production build PASS. All15 targeted browser cases (profiles/accessibility/author review/auth redirects) across desktop/tablet/phone PASS. Desktop/phone screenshots inspected;25 browser assets scanned without configured private values. Staged secret scan is recorded with delivery. No database migration, data reset, main merge or deployment.

Manual steps: Explore → Demo Neem Courtyard → current or historic manager profile → Review this landlord → Review your tenancy at Demo Neem Courtyard → sign in → tenancy dates and Landlord / management rating → Publish review. To update an existing tenancy, use Your reviews → Edit review and photos rather than creating a second review. Use fictional information.
