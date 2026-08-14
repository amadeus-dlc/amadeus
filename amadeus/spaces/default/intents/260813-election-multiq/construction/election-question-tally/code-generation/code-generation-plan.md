# Code Generation Plan — election-question-tally

## 実行方針

U2 実装は commit `63a8b317ee` で統合済みであるため、同じ機能を再実装しない。Standard depth として、指定された functional design、security design、unit 定義、requirements を既存の pure policy と focused tests へ追跡する。契約違反を失敗テストで再現できた場合だけ、U2 正本と当該テストへ最小修正を加える。

plan approval は Intent の full autonomy と本 unit の `gate: false` により認可済みとして扱う。`amadeus-state.md` は変更しない。

## 変更面と非対象

| 面 | 対象 | 判断 |
|---|---|---|
| U2 正本 | `packages/framework/core/tools/amadeus-election-question-tally.ts` | response resolution、early/late classification、per-question tally、partition/preservation、lifecycle を検査し、実証された契約差分だけ修正する |
| U2 unit test | `tests/unit/t549-election-question-tally.test.ts` | happy path、policy edge、fail-closed、定義順の回帰を検証する |
| U2 property test | `tests/unit/t550-election-question-tally.pbt.test.ts` | voter × question replacement と cross-question isolation を検証する |
| 既存 U2 call site | `packages/framework/core/tools/amadeus-election-v2-cli.ts` | resolution へ canonical definition を渡す1箇所だけを追随させる。CLI orchestration 自体は変更しない |
| test configuration | 既存 Bun test / TypeScript / Biome 設定 | 新規設定は不要。既存設定を再利用する |
| 非対象 | API、repository、database、UI、deployment、store、record、CLI、migration、TLA+、生成済み harness 面 | U2 は embedded pure library。U3 以降または U7/U8 の責務を変更しない |

## 実装・検証手順

- [x] **Step 1: 設計契約を検査表へ落とす。** resolution ordering、question isolation、GoA policy、partition/digest、early/late、copy-on-write、typed error を requirement ID と対応付けた。
- [x] **Step 2: commit `63a8b317ee` の U2 source と tests を検査する。** 設計契約に対する既存実装・未検証境界・不要な責務流入を確認した。
- [x] **Step 3: focused baseline を実行する。** U2 unit/PBT は変更前に 2 files、10 pass、0 fail、428 expect calls で green と確認した。
- [x] **Step 4: 実証された契約差分を test-first で閉じる。** 定義 voter 順 × question 順へ正規化する resolution 契約を既存公開 seam の失敗テストで 8 pass / 1 fail の Red にし、definition order map と stable sort、既存 call site の引数追随だけで Green にした。
- [x] **Step 5: focused tests と対象 Biome check を実行する。** build 後の最終実行で U2 unit/PBT と mixed-lifecycle integration は 3 files、14 pass、0 fail、463 expect calls。U2 source/test 3 files の Biome check は diagnostic なしだった。
- [x] **Step 6: repository 静的検証と build を実行する。** `bun run typecheck`、`bun run lint`、`bun run build`、`bun run source-only:check`、`git diff --check` は exit code 0。build 後の全8 harness 投影は正本と同期した。
- [x] **Step 7: 成果物を閉じる。** checkbox、`code-summary.md`、`pr-convergence-report.md` を実測結果に合わせ、未実施面と blocker を明記した。

## 要件・設計トレーサビリティ

user-stories artifact は本 directive の入力に含まれていないため、U2 unit 定義と requirements を直接の追跡正本とする。

| Plan step | Requirement / rule | 検証方法 |
|---|---|---|
| Step 1–4 | FR-BAL-3/4、BR-R1〜R6、BR-L1〜L4 | `(voter, questionId)` resolution、receivedAt/append tie-break、definition order、response 単位 late classification の unit test |
| Step 1–5 | FR-TAL-1〜5、BR-T1〜T9、BR-E1〜E3 | mixed result、cross-question isolation、2-voter/3+ GoA policy、GoA4 除外、early map の unit/PBT |
| Step 1–5 | FR-RER-1〜3、BR-P1〜P7、BR-S1〜S5 | hold-only target、overlap/coverage/digest fail-closed、preserved object 不変、derived lifecycle の unit test |
| Step 2–6 | NFR-1 | Map/Set を使う response 数・choice 数に対する線形/線形対数処理の source inspection と focused PBT |
| Step 2–6 | NFR-3/4、security controls | typed Result、namespaced map、deterministic order/digest、no-partial-output、typecheck/lint/build |
| Step 5–7 | U2 `Delivers` | mixed established/hold、held-only validation、preservation invariant、cross-question independence の実測結果 |

## 完了条件

- 指定された3成果物が日本語で存在し、plan checkbox が実績と一致する。
- U2 source/test の変更は再現済み契約差分へ追跡でき、不要な code churn がない。
- focused tests、typecheck、lint、build の command、exit code、警告または blocker が記録される。
- `amadeus-state.md` と U2 非対象実装を変更しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T16:55:39Z
- **Iteration:** 1
- **Scope decision:** none

BR-R6のdefinition voter順×target question順への正規化がテスト先行で実装され、呼び出し元へのdefinition受け渡し、関連要件のトレーサビリティ、および focused test・型検査・lint・build・source-only検証の成功が確認できるためREADYです。

### Findings

- None
