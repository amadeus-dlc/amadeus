# State Reference

## AI-DLC v2 Reference

- [AI-DLC v2 State Machine](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/12-state-machine.md)
- [AI-DLC v2 State Template](https://github.com/awslabs/aidlc-workflows/blob/v2/core/knowledge/amadeus-shared/state-template.md)
- [AI-DLC v2 Audit Format](https://github.com/awslabs/aidlc-workflows/blob/v2/core/knowledge/amadeus-shared/audit-format.md)

vendored copy は `skills/amadeus/references/aidlc-v2/` に置く。
準拠判定は vendored copy との構造一致で行う。

## 責務

Intent の実行状態は、record 直下の `aidlc-state.md` が唯一の持ち主である。
構造とラベルは v2 の state template をそのまま使う。

承認と遷移の履歴は、record の `audit/audit.md` が追記専用イベントとして持つ。
Intent の正準 ID と一覧は、Space の `intents/intents.json`（registry）が持つ。

単一入口は `aidlc-state.md` を読んで次に実行するステージを解決する。
`amadeus-validator` は `aidlc-state.md`、`audit/`、`intents.json` と成果物の整合を検証する。

状態の更新は、判断を skill が行い、記録の形式をこの契約が固定する。

## `aidlc-state.md` の構造

v2 state template のセクション構成をそのまま使う。

| セクション | 持つもの |
|---|---|
| `Project Information` | Project、Project Type（Greenfield / Brownfield）、Scope、Start Date、State Version（7）、Active Agent、Worktree Path、Bolt Refs、Practices Affirmed Timestamp |
| `Scope Configuration` | Stages to Execute、Stages to Skip、Depth（Minimal / Standard / Comprehensive） |
| `Workspace State` | Project Root、Languages、Frameworks、Build System（0.2 Workspace Detection の結果） |
| `Execution Plan Summary` | Total Stages、Completed、In Progress |
| `Runtime State` | Revision Count |
| `Phase Progress` | 5 phase の状態（Pending / Active / Verified / Skipped） |
| `Stage Progress` | 全 32 stage の checkbox。phase ごとの `### <PHASE> PHASE` 小見出しで区切る |
| `Current Status` | Lifecycle Phase、Current Stage、Next Stage、Status（Running / Completed）、Construction Autonomy Mode（unset / autonomous / gated）、Last Updated |
| `Session Resume Point` | Last Completed Stage、Next Action、Pending Artifacts |

読み書きは、セクション見出し、チェックリスト行（`- [x] <stage-slug>` 形式）、フィールド行（`**Key**: value` 形式）だけを対象にする。
書き込みは対象行の置換だけで行い、セクションの順序と未知の行を保存する。
parse 契約の実装は `skills/amadeus-validator/validator/aidlc-state-contract.ts` に置き、単一入口と validator が共有する。

## ステージ状態

ステージ状態は Stage Progress の checkbox で表す。語彙は v2 の 6 種である。

| checkbox | 状態名 | 意味 |
|---|---|---|
| `[ ]` | Pending | 未着手。 |
| `[-]` | Active | 実行中。 |
| `[?]` | AwaitingApproval | 作業完了、ゲート待ち。人間の応答が唯一のブロッカー。 |
| `[R]` | Revising | ゲートで差し戻され、修正中。 |
| `[x]` | Completed | 承認済みで完了。 |
| `[S]` | Skipped | scope または Condition により実行対象外。 |

checkbox 行の注記（` — ` 区切り）には、実行対象なら `EXECUTE`、対象外なら `SKIP: <理由>` を書く。
Operation の 7 stage は Amadeus の実行対象外であり、常に `[S]`（`SKIP: out of Amadeus scope`）にする。

状態遷移は次に限る。

- `[ ]` から `[-]`。ステージ開始。
- `[-]` から `[?]`。成果物を作りゲートを提示。
- `[?]` から `[x]`。人間が承認。
- `[?]` から `[R]`。人間が差し戻し。
- `[R]` から `[?]`。修正後に再提示。
- `[ ]`、`[-]`、`[R]` から `[S]`。Condition の判定または人間の指示。

`[?]` と `[R]` を分けることで、再開時の挙動を区別する。
`[R]` で再開した場合は、ステージを最初からやり直さず、前回の成果物と差し戻し理由を提示してから修正に入る。

Unit 単位ステージ（Construction 3.1〜3.5）は、CONSTRUCTION PHASE の小見出し配下を `Per unit: <unit>` ブロックで Unit ごとに繰り返す。

## 承認と履歴（audit）

承認記録は `aidlc-state.md` に持たず、`audit/audit.md` のイベントが持つ。
entry の形式とイベント名は v2 の audit format に従い、追記だけを行う。

| 記録 | イベント |
|---|---|
| ステージのゲート提示 | `STAGE_AWAITING_APPROVAL` |
| 人間の承認（会話内ゲート） | `GATE_APPROVED`（User Input をそのまま記録）と `STAGE_COMPLETED` |
| 人間の差し戻し | `GATE_REJECTED`（Feedback をそのまま記録）と `STAGE_REVISING` |
| Condition または scope による skip | `STAGE_SKIPPED` |
| phase 境界（phase PR の merge） | `PHASE_VERIFIED`（Details に PR の URL） |
| 全ステージ SKIP の phase の通過 | `PHASE_SKIPPED` |
| Bolt の開始と完了 | `BOLT_STARTED`、`BOLT_COMPLETED`（Details に Bolt PR の URL） |
| ladder 提案の回答 | `AUTONOMY_MODE_SET` |
| Intent の開始と完了 | `WORKFLOW_STARTED`、`WORKFLOW_COMPLETED` |

ステージゲートは会話内、phase ゲートと Bolt ゲートの確定は PR と人間 merge を基本にする。
Request Changes が 3 回続いた後の Accept as-is による完了は、`GATE_APPROVED` に Accept as-is である旨を含めて記録し、判断を phase の `decisions.md` に記録する。

## phase 遷移

phase は Initialization、Ideation、Inception、Construction の順に進む。
Operation は record の scaffold だけを持ち、実行対象にしない。

実行したステージが 1 つ以上ある phase は、実行対象ステージがすべて `[x]` または `[S]` になり、phase PR が merge された時点で、`PHASE_VERIFIED` を記録して Phase Progress を `Verified` にし、次の phase へ遷移する。

scope が phase 内の全ステージを SKIP にする場合、その phase は成果物と phase PR を作らずに通過し、`PHASE_SKIPPED` を記録して Phase Progress を `Skipped` にする。
例として bugfix は Ideation の全ステージが SKIP であり、Intake の Birth 承認を根拠に Ideation を `Skipped` にして、直接 Inception のステージへ進む。

Construction phase PR の merge 後は、Current Status の `Status` を `Completed` にし、`WORKFLOW_COMPLETED` を記録し、registry の `status` を `completed` にする。

中断する Intent は `WORKFLOW_PARKED` を記録し、再開時に `WORKFLOW_UNPARKED` を記録して Session Resume Point から再開する。

## カーソルとレジストリ

**カーソル**：`aidlc/active-space` が現在の Space を、`aidlc/spaces/<space>/intents/active-intent` が現在作業中の record の dirName を指す。
カーソルは作業者ローカルの状態であり、gitignore にする。
Intake の継続判定は、まずカーソルの指す Intent と入力を照合する。

**レジストリ**：`aidlc/spaces/<space>/intents/intents.json` は全 Intent の正準台帳である。
各行は `{uuid, slug, dirName, scope, repos, status}` を持つ。
`uuid` は UUIDv7 であり、衝突しない正準 ID である。
`dirName` は record ディレクトリ名（`<YYMMDD>-<label>` 形式）であり、同日同名の衝突は末尾の連番（`-2`、`-3`）で区別する。

**索引**：`intents/intents.md` は人間向けの一覧と依存の生成物であり、`IndexGenerate.ts` で再生成する。
registry と索引は矛盾させない。

補足: #369 の確定判断 3（state.json を状態の持ち主にする）と確定判断 4（UUIDv7 を採用しない）は、v2 完全準拠（Issue #387、GD001〜GD003）でこの契約に上書きされた。

## 検証

`amadeus-validator` は少なくとも次を検証する。

- `aidlc-state.md` が v2 state template の全セクションと State Version 7 を持つ。
- Stage Progress に全 32 stage の行があり、checkbox が既知の語彙である。
- scope の実行対象外のステージと Operation の全ステージが `[S]` である。
- `[x]` のステージに、契約が必須とする成果物と `STAGE_COMPLETED` イベントが存在する。
- 必須入力の供給ステージが `[S]` の場合、後続ステージが [scopes.md](scopes.md) の縮退時の入力代替に従っている。
- 先行 phase の Phase Progress が `Verified` または `Skipped` であり、対応する `PHASE_VERIFIED` / `PHASE_SKIPPED` イベントが存在する。
- `intents.json` の各行が UUIDv7 と `<YYMMDD>-<label>` 形式の dirName を持ち、record ディレクトリと 1:1 に対応する。
