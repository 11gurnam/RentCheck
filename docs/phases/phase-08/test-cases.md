# Final acceptance cases

| Case | Method | Required result / status |
| --- | --- | --- |
| R8-01 Build and validation | Lint/types/unit/production | PASS lint/types, 67 units and production build; final test-config lint/types rerun PASS |
| R8-02 Permissions/canonical identity/privacy | Rolled-back SQL | PASS all133; includes tenancy/claims/private docs/audit/merge constraints |
| R8-03 Real backend roles/concurrency/storage | Local HTTP API | PASS all10 in final sequential run, unchanged transaction assertions |
| R8-04 Review/audit pagination | SQL | PASS21=20+1 unique public IDs,51=50+1 filtered audit; all aggregates unchanged |
| R8-05 Complete role/browser regression | Three viewport sizes | PASS all66 in one final run, two workers, no retries |
| R8-06 Recovery/WCAG/keyboard | Serial live DB disruption + browser | PASS all3 on final build, grants restored; separate report/evidence preserved |
| R8-07 Public script-like text/private identity | Browser | PASS all3 viewports; text escapes markup, no script/image or account/email exposed |
| R8-08 Responsive/axe/screenshots | Browser plus visual inspection | PASS detected axe rules/overflow; desktop/phone pagination, audit and recovery images inspected |
| R8-09 Browser/staged credentials | Config-value buffer scans | PASS25 browser assets; staged scan recorded in delivery entry |
| R8-10 Dependency audit | npm audit | PASS0 vulnerabilities observed |
| R8-11 Google provider | Real local OAuth handoff/simulated denial | PASS final handoff/denial smoke; real Google account retained with zero admin grants. User previously confirmed actual login/alias/logout/admin denial |
| R8-12 Hosted/physical-device acceptance | User/manual hosting | NOT RUN; hosting guide prepared, no deployment |
| R8-13 User end-to-end walkthrough | Manual user | NOT RUN; complete click-by-click checklist supplied |

Tests use only loopback54321 and uniquely named fictional accounts. SQL rolls back; API/browser cleanup removes only their fixture IDs and preserves real account/Docker services. Private immutable audit intentionally remains. A passing browser suite is not a claim of full accessibility certification or physical-device testing.
