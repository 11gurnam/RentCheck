# Phase 24 — profile photo and compact controls

Profile photos now use an accessible custom picker with a local preview. The original (JPEG, PNG or WebP, up to 5 MiB and 20 million pixels) is cropped/resized to 256 × 256 in the browser before being uploaded; the server decodes and normalizes it again. This resolves the previous 5 MiB promise versus 3 MiB processor/4 MB request mismatch. Invalid images remain rejected. A failed avatar URL no longer suppresses a subsequently changed URL. The account header refreshes when saving completes.

Native “Choose file” controls are replaced in profile, review, landlord-photo, claim and tenancy-evidence forms. Review multi-photo selection already used a custom picker. Shared forms use compact 14px controls, contained submit buttons, consistent spacing and 44px touch targets. Airbnb's search/filter/card hierarchy informed the compact layout; RentCheck keeps its own visual identity.

Check: Account → Upload/Change photo → Select photo → Save photo. Repeat with a different photo without reloading. The preview, account photo and header should update. An invalid image should show an error. Private documents still upload through their existing authorized workflows.

The browser account journey checks malformed-image rejection, a successful upload, a replacement PNG above 3 MiB, a changed avatar URL, actual decoded image dimensions and subsequent password changes. Screenshots and final regression results are recorded in the combined Phase 24–26 release guide.
