Append these to the "Integrity rules" section of AGENTS.md:

- **R12 Role views are server-side projections** of the Evidence Object (technician = full detail; supervisor = whitelist schema of plain language). Authorization is deny-by-default and enforced by the backend; frontend guards are convenience only.
- **R13 Plain language is a translation, never a reduction.** It must preserve environment label, provenance, non-answers, uncertainty, and severity; derive every number from the Evidence Object; never overstate certainty, never reassure falsely, never call an action "safe".
