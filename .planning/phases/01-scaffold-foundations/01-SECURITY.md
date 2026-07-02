---
phase: 01
slug: scaffold-foundations
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| npm registry → local build | Third-party native packages (`react-native-mmkv`, `react-native-nitro-modules`, `eslint-plugin-i18next`) execute install-time scripts and compile native code | Package source + postinstall scripts |
| app.json/eas.json → native binary | Build config governs what binary is produced and how it is distributed | Build profile config (no credentials) |
| test runtime → native module | Jest (Node) cannot load Nitro-backed MMKV; a manual mock substitutes at the module boundary | Mocked storage calls only |
| device locale → app | Read-only device signal (`languageCode`) selects initial locale | Non-sensitive device metadata |
| app runtime → local MMKV store | User content (sessions, dump items, intentions, settings) is written to and read from on-device storage | Local user content, unencrypted (Phase 1) |
| UI interaction → local MMKV store | The home "Start a session?" offer triggers a real persisted write — the only user-driven data flow in Phase 1 | Session record (start timestamp) |
| dev-client distribution | Development builds are internal-distribution only per `eas.json` | Build artifact, no secrets |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Tampering | react-native-mmkv / react-native-nitro-modules install | mitigate | Postinstall audit: `npm view react-native-mmkv scripts.postinstall` and `npm view react-native-nitro-modules scripts.postinstall` both re-verified empty at audit time (no unexpected postinstall beyond standard Expo autolinking); 01-01-SUMMARY.md records the same result at implementation time | closed |
| T-01-02 | Tampering | Wrong MMKV package (ammarahm-ed react-native-mmkv-storage) | mitigate | `npm ls react-native-mmkv` re-verified at audit time: resolves to `react-native-mmkv@4.3.2` (mrousavy package), not `react-native-mmkv-storage` | closed |
| T-01-SC | Tampering | npm installs (supply chain, incl. eslint-plugin-i18next) | mitigate | `eslint-plugin-i18next@6.1.5` confirmed present under `devDependencies` in `package.json` (dev-only, not shipped in app binary); all packages pre-audited [OK] per 01-RESEARCH.md Package Legitimacy Audit | closed |
| T-01-03 | Information Disclosure | eas.json distribution profiles | accept | `eas.json` re-read at audit time: `cli`, `build.{development,preview,production}` — no credentials, tokens, or secrets present; JSON-valid without EAS login. Entry recorded in Accepted Risks Log below | closed |
| T-01-04 | Tampering | Test mock masking real behavior | accept | Mock (`__mocks__/react-native-mmkv.ts`) covers logic only; on-device persistence verified separately: 01-06-SUMMARY.md records Android device-boot VERIFIED on real hardware, iOS DEFERRED with an explicit documented hard gate before Phase 9 (not silently skipped). Entry recorded in Accepted Risks Log below | closed |
| T-01-05 | Tampering | Style drift (hex literals bypassing tokens) | mitigate | `scripts/check-hex-literals.mjs` re-run at audit time: exits 0, "no hex color literals found outside theme/". Hardened post-review (WR-06, commit `1565614`): globs resolved against script's own directory (not `process.cwd()`), and an empty file-match set now fails closed (`process.exit(1)`) instead of silently passing — verified in current source at `scripts/check-hex-literals.mjs:26,63-73` | closed |
| T-01-06 | Tampering | Hardcoded copy bypassing i18n (regulatory/shame-free risk) | mitigate | `npx eslint --print-config src/app/index.tsx` re-verified at audit time: `i18next/no-literal-string` rule active. Hardened post-review (WR-05, commit `e0b857b`): rule scope extended from `src/app/**`, `src/features/**` to also include `src/components/**` — verified in current source at `eslint.config.js:28`, closing the gap where shared UI (Screen, MascotSlot) was previously unenforced | closed |
| T-01-07 | Information Disclosure | Locale signal | accept | `getLocales()[0]?.languageCode` is non-sensitive device metadata, read-only, never transmitted off-device in Phase 1. Entry recorded in Accepted Risks Log below | closed |
| T-01-08 | Information Disclosure | Unencrypted MMKV content on a compromised/physical-access device | accept (deferred) | `data/mmkv.ts:11-16` re-read at audit time: explicit code comment documents the deferral (no `encryptionKey`, `expo-secure-store` pairing planned for Phase 7 alongside the Supabase session adapter) — deferral is documented, not silently skipped. Entry recorded in Accepted Risks Log below | closed |
| T-01-09 | Information Disclosure / regulatory | Accidental diagnosis/streak field entering the local schema (GDPR Art. 9, shame-free) | mitigate | `data/repositories/__tests__/schema.denylist.test.ts` re-run at audit time: 2/2 tests pass. Hardened post-review (WR-04, commit `ea29942`): matching changed from exact field-name equality to case-insensitive substring matching against denylist stems (catches `currentStreak`, `dailyStreakCount`, `diagnosisType`), plus a second check added that source-scans `data/types.ts` interface property names so *optional* fields (never populated by the runtime probe) are also caught — verified in current source at `schema.denylist.test.ts:28-59,87-94` | closed |
| T-01-10 | Tampering | Malformed JSON in a record key corrupting list() | mitigate | Re-verified in current source: `sessions.ts`, `dumpItems.ts`, and `intentions.ts` each wrap `JSON.parse` in try/catch for both the index key and per-record keys, returning `[]`/`undefined` on parse failure rather than throwing (grep confirms `catch` present in all three repository files at 2 sites each). Full CRUD test suite (`repositories.test.ts`) passes (44/44 across the full jest run) | closed |
| T-01-11 | Repudiation | Session write with no audit trail | accept | Single-user local app; sessions are the user's own quiet log (PILOT-07 framing), no audit requirement — confirmed no multi-user/shared-account surface exists in Phase 1 scope. Entry recorded in Accepted Risks Log below | closed |
| T-01-12 | Tampering | Malicious/oversized locale copy injection via locale files | mitigate | `i18n/locales/{en,pl}.json` re-scanned at audit time: no forbidden regulatory terms (cure/treat/diagnos/clinically proven) present. Copy is developer-authored (no runtime/user-supplied ingestion path exists in Phase 1) and the review process demonstrably functions — WR-09 (commit `2997d9e`) caught and fixed a masculine-gendered Polish string during code review, evidencing the "reviewable" claim is exercised in practice, not just asserted | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-01 | T-01-03 | `eas.json` build profiles are non-secret build configuration; no credentials are stored in-repo. Actual EAS cloud builds require the developer to run `eas login` locally (D-06) — this is outside the repo's trust boundary. | gsd-security-auditor (phase-1 audit) | 2026-07-02 |
| AR-02 | T-01-04 | The Jest MMKV mock (`__mocks__/react-native-mmkv.ts`) verifies repository *logic* only; it cannot prove real Nitro Modules persistence. Real on-device persistence is tracked as a separate, explicit human checkpoint (01-06 Task 3) — Android confirmed on physical hardware, iOS explicitly deferred to Phase 2-3 with a documented hard gate before Phase 9 beta hardening closes. Not silently claimed as verified. | gsd-security-auditor (phase-1 audit) | 2026-07-02 |
| AR-03 | T-01-07 | Device `languageCode` is non-sensitive, read-only device metadata used only to select initial UI locale. It is never transmitted off-device, stored as content, or logged with identifiers in Phase 1. | gsd-security-auditor (phase-1 audit) | 2026-07-02 |
| AR-04 | T-01-08 | No sensitive data (auth tokens, credentials) exists in the local schema until Phase 7's Supabase session adapter lands. MMKV `encryptionKey` + `expo-secure-store` pairing is explicitly planned for Phase 7, documented in `data/mmkv.ts`'s code comment — deferred deliberately, not overlooked. Re-open this risk if any credential/token field is added to a local schema before Phase 7 ships encryption. | gsd-security-auditor (phase-1 audit) | 2026-07-02 |
| AR-05 | T-01-11 | Trinket is a single-user, local-first app with no shared accounts or multi-party access to session data in Phase 1 scope. Sessions are a private, unscored personal log (PILOT-07 framing) — an audit trail would serve no user-facing purpose and would itself be pressure-adjacent instrumentation the product's shame-free constraint discourages. | gsd-security-auditor (phase-1 audit) | 2026-07-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|----------------|--------|------|--------|
| 2026-07-02 | 12 | 12 | 0 | gsd-security-auditor |

**Notes on this audit run:**
- All six plan files (01-01 through 01-06) and all six SUMMARY files were read in full; none of the six SUMMARY.md files contain a `## Threat Flags` section, so there is no executor-flagged new attack surface to reconcile against the register (see Unregistered Flags below).
- Post-review hardening commits (`cbef0bd`..`73d60c9`, addressing WR-01 through WR-09 from `01-REVIEW.md`) were cross-checked against the threat register. Three fixes directly strengthen declared mitigations and are cited by threat ID above: WR-04 → T-01-09, WR-05 → T-01-06, WR-06 → T-01-05. The current source (not the plan-time claim) was used as evidence in every case — mitigation pattern grepped and, where applicable, tests re-run.
- Full test suite re-run at audit time: 8 suites, 44 tests, all passing. `npx eslint --print-config`, `node scripts/check-hex-literals.mjs`, `npm ls react-native-mmkv`, and `npm view <pkg> scripts.postinstall` were all re-executed directly (not just read from SUMMARY prose) as evidence for the closed table above.
- Other WR/IN findings from `01-REVIEW.md` (WR-01/02/03/07/08/09, IN-01 through IN-10) are code-quality and correctness issues already fixed or tracked in that review artifact; they do not map to a declared STRIDE threat in any plan's `<threat_model>` block and are out of scope for this threat-verification audit (this audit does not re-scan for new vulnerabilities per its charter — see Unregistered Flags).

---

## Unregistered Flags

None. No SUMMARY.md in this phase contains a `## Threat Flags` section, so there is no executor-declared new attack surface requiring reconciliation against the threat register.

(Informational, not a flag: `01-REVIEW.md`'s WR-01/02/03/07/08/09 and IN-01–IN-10 findings are code-review quality/correctness observations, not security threats declared or discovered against this phase's trust boundaries. They were triaged during this audit and confirmed to carry no unmitigated STRIDE-category threat mapping. WR-01 and WR-02 — locale-persistence sentinel fragility and the locale write-through gap — border on availability/consistency concerns (a locale could silently revert) but do not cross a trust boundary or expose data; both were already fixed by the executor in commits `babd150` and `9fea520` prior to this audit.)

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-02
