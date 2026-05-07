# BD Select Source Review Notes

## Source Files Reviewed

Copied source artifacts live outside the application under `../bd-select-source`:

- Word document copy: `bd-select-source.docx`
- Spreadsheet copy: `bd-select-source.xlsx`
- HTML copy: `bd-select-source.html`
- Extracted document text: `extracted/document_text.txt`
- Extracted workbook text: `extracted/workbook_text.txt`
- Extracted workbook JSON: `extracted/workbook_dump.json`
- Extracted HTML text: `extracted/html_text.txt`

The original source material used a previous working name. The product name for this codebase is `BD Select`.

## What Was Extracted

- Product concept, pitch, brand posture, personas, user journeys, PRD, architecture, data model, API list, security notes, funding plan, roadmap, risk table, and KPIs from the Word source.
- Sheet names and modelling values from the workbook: `Cover`, `Assumptions`, `GMV_Build`, `P&L`, `Unit_Economics`, `Headcount`, `Funding_Runway`, `Scenarios`, and `Cap_Table`.
- One-page investor summary from the HTML source.

## High-Confidence Product Facts

- BD Select is a curated, authenticated resale marketplace for premium fashion and accessories.
- Nigeria is Phase 1, with Lagos and Abuja at launch density.
- Ghana, Kenya, and South Africa are expansion markets.
- MVP is responsive web.
- Native iOS and Android are V2.
- Every public listing must pass authentication review.
- Fast fashion is rejected.
- Escrow is central to buyer and seller protection.
- Barter is a first-class V1 feature, not an afterthought.
- Pro seller tiers and promoted listings are planned monetization lines.
- Paystack, Flutterwave, GIG, Sendbox, Topship, Kwik, DHL, Mono, Dojah, Termii, SendGrid, Cloudflare R2, and Cloudflare Images are named integration candidates.

## Financial And Modelling Mismatches To Resolve

| Topic | Source difference | Recommendation |
| --- | --- | --- |
| Year 5 GMV | Narrative target shows NGN 240B while workbook output shows about NGN 488B | Pick one investor-facing case and label the other as upside/downside |
| Contribution per order | Narrative target shows NGN 9,650 while workbook unit economics shows a higher contribution value | Use NGN 9,650 as conservative operating target until finance model is reconciled |
| Runway | Funding ask says 18 months while workbook burn math implies a much longer runway under one assumption set | Rebuild monthly cash model before investor materials |
| Personnel cost | Headcount tab and assumptions tab do not use the same personnel basis | Decide whether assumptions include only payroll or broader people-related operating cost |
| Market share | Narrative SOM and workbook GMV are not aligned | Tie SOM to one GMV model before publishing |

## Decisions Already Applied In This Repo

- Package and database naming use `bd-select` and `bd_select`.
- Database schema models the marketplace domain rather than a generic collaboration model.
- Audit logging uses actor/entity/prior-state/new-state fields instead of collaboration audit fields.
- First seed data creates BD Select categories and initial premium/streetwear/designer brands.
- Source extraction artifacts are kept outside the app so product docs can be updated without mixing raw source text into the runtime.
