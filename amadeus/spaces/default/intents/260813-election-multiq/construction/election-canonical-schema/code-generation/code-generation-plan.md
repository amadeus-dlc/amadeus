# Code Generation Plan — election-canonical-schema

## 実行方針

U1 の実装は commit `93cfb99916` で統合済みであるため、再実装は行わない。Standard depth として、指定された設計・要件を既存の codec と focused test へ追跡し、契約違反が実測された場合に限って当該 codec/test へ最小修正を加える。plan approval は Intent の full autonomy と本 unit の `gate: false` により承認済みとして扱う。

## 変更面と blast radius

| 面 | 対象 | 影響 |
|---|---|---|
| U1 正本 | `packages/framework/core/tools/amadeus-election-codec.ts` | pure decode/encode/canonical digest。修正が必要な場合のみ変更 |
| U1 unit test | `tests/unit/t547-election-codec.test.ts` | legacy/v2 の例示契約と fail-closed 境界 |
| U1 property test | `tests/unit/t548-election-codec.pbt.test.ts` | round-trip と invalid input reject property |
| test configuration | 既存の Bun test / TypeScript / Biome 設定 | 新規設定ファイルは不要。既存設定で focused test、typecheck、lint を実行 |
| 非対象 | tally policy、store、distribution view/transport、CLI、record、migration、TLA+、生成済み harness 面 | 順に U2、U3、U4、U5〜U8 の実装責務であり変更しない。U1 は FR-DEF-4 に必要な canonical question/choice schema と順序を所有する |

## 実装・検証手順

- [x] **Step 1: 設計契約を検査表へ落とす。** `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`security-design.md`、U1 定義、requirements を照合し、schema 判別、identity/reference、coverage、canonical ordering/digest の確認項目を確定した。
- [x] **Step 2: 既存 U1 実装を検査する。** commit `93cfb99916` の codec を Step 1 の項目と突合し、raw input の fail-closed decode、legacy normalization、v2-only encode、definition 順の canonicalization、domain-separated digest を確認した。
- [x] **Step 3: 既存 U1 tests を検査する。** unit/PBT が happy path、legacy equivalence、hybrid/unknown/duplicate/reference/coverage rejection、round-trip/determinism を検証していることを確認した。
- [x] **Step 4: 実装差分を必要最小限にする。** legacy scalar `question` は empty string だけを拒否し、whitespace-only は既存値を正規化せず受理するよう、decoder 1条件と regression assertion だけを修正した。
- [x] **Step 5: focused test を実行する。** `bun test tests/unit/t547-election-codec.test.ts tests/unit/t548-election-codec.pbt.test.ts` は 2 files、9 pass、0 fail、1237 assertions、exit code 0。
- [x] **Step 6: 静的検証を実行する。** `bun run typecheck` と `bun run lint` は exit code 0。U1対象3 files の Biome check も diagnostic なしで exit code 0。
- [x] **Step 7: 成果物を閉じる。** checkbox、`code-summary.md`、`pr-convergence-report.md` を実績と実行結果に合わせて更新した。
- [x] **Step 8: Reviewer Iteration 1 を是正する。** empty-only contract と FR-COMP-1 互換性を test で固定し、FR-DEF-4 の U1 canonical schema / U4 distribution view・transport 実装という ownership 分割を成果物へ反映した。

## 要件・設計トレーサビリティ

user-stories artifact は本 directive の入力に含まれていないため、unit 定義と requirement ID を直接の追跡正本とする。

| Plan step | Requirement / design | 検証証拠 |
|---|---|---|
| Step 1–2、8 | FR-DEF-1〜4、BR-S1〜S6、BR-D1〜D11 | U1 canonical definition schema/order の実読と unit test。FR-DEF-4 の distribution view/transport 実装は U4 |
| Step 1–3 | FR-BAL-1/2、BR-B1〜B10 | ballot reference/coverage/GoA test と round-trip PBT |
| Step 1–3 | FR-COMP-1/2、BR-T7/T8、BR-C1〜C4 | legacy normalization、v2 encode、stable runId/digest test |
| Step 2–4 | NFR-3、security failure posture | typed Result、unknown/hybrid/invalid input の fail-closed rejection |
| Step 2–6 | NFR-4、BR-C1〜C6 | definition 順の canonical bytes、ambient input 非依存 digest、focused test/typecheck/lint |
| Step 5–7 | U1 `Delivers` | round-trip property、invalid input reject property、legacy/new canonical equivalence の実測結果 |

## 完了条件

- 指定された3成果物が日本語で存在する。
- U1 source/test の全変更が上表の契約へ追跡できる。契約差分がなければ、不要な code churn がない。
- focused test、typecheck、lint の正確な command と exit code が記録される。
- 未解決 `BLOCKER` がある場合は完了扱いにせず明記する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T16:43:03Z
- **Iteration:** 1
- **Scope decision:** none

legacy question の whitespace-only 拒否が承認済み契約を無断で狭めて後方互換性を損なうため、現状は NOT-READY。

### Findings

- BLOCKER | `code-summary.md` は legacy scalar `question` の whitespace-only 値を `nonBlank` で拒否し、BR-D5/NFR-3 違反の修正としているが、承認済みの BR-D5、domain entity、decode algorithm は question text を `non-empty string` とだけ定義し、whitespace-only 禁止を明記しているのは questionId である。この変更は従来受理された legacy definition を新たに拒否して FR-COMP-1 の後方読み取り契約を狭めるため、設計・要件側で nonblank と互換性判断を明示的に承認して検証するか、実装と回帰 test を承認済みの empty-only 拒否へ戻す必要がある。
- FOLLOW-UP | `unit-of-work.md` の Unit coverage summary は U1 を FR-DEF-1〜4 に対応付ける一方、`code-summary.md` は FR-DEF-4 を「U2 以降」の責務として未実装扱いし、同じ unit 定義の詳細では distribution/transport を U4 が所有している。U1 が FR-DEF-4 の canonical model だけを担い U4 が view を実装するのかを成果物で明確化し、誤った unit 番号と要件追跡を修正すべきである。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T16:47:18Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKERは解消され、legacy questionは空文字のみ拒否してwhitespace-only値を完全保持し、回帰テストとU1/U4のFR-DEF-4責務分割も明確化されている。

### Findings

- None
