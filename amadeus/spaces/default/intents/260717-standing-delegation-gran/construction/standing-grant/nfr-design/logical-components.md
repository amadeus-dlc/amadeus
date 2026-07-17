# Logical Components — standing-grant(U1)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜S-4)、`../nfr-requirements/scalability-requirements.md`(N/A 反証条件付き)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数構成)

## 論理構成(実装ファイルへの写像)

| 論理コンポーネント | 実装先 | NFR 対応 |
|-------------------|--------|---------|
| GrantVerbs(発行・撤回) | amadeus-state.ts(handleGrantStandingDelegation / handleRevokeStandingDelegation) | S-2/S-3(接地+モード)・AC-1/2 |
| GrantVerifier(受理検証) | amadeus-lib.ts(findActiveStandingGrant / standingGrantSatisfiesGate / StandingGrant.parse+isExpired) | S-1/S-4・RL-1/RL-2・**RL-3(revoke 優先の実装主体 — GRANT_REVOKED 不在チェック)**・P-1 |
| AcceptanceSeam(挿入分岐) | amadeus-state.ts(assertHumanPresentForGateResolution approve 分岐 / handleDelegateApproval — targetRecord 前置) | **S-3(受理側モード判定 — 分岐先頭)**・S-4(fail-open 非合流)・P-2 |
| ProtectedTaxonomy | amadeus-audit.ts(PRESENCE_PROTECTED_EVENTS+EVENT_HEADINGS)+audit-format.md | S-1 |
| DoctorRow | amadeus-utility.ts(DoctorCheck) | 可視性(FR-6) |
| TtlConstant | amadeus-lib.ts(DEFAULT_STANDING_GRANT_TTL_MS — env override なし) | S-2・RL-3(**TTL 数値境界の寄与のみ** — revoke 優先ロジックは GrantVerifier 行) |

## 依存方向

GrantVerbs → ProtectedTaxonomy(emit)・GrantVerbs → TtlConstant(既定 TTL の直接参照 — component-methods C-1)/ AcceptanceSeam → GrantVerifier → TtlConstant — 一方向・循環なし。DoctorRow は GrantVerifier を読み取り再利用のみ。
