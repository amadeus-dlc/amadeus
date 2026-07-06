# Business Logic Model：v2 完全準拠の中核ロジック

## 目的

AI-DLC v2 完全準拠（R001〜R007）を実現する中核ロジックを、実装可能な粒度で設計する。
対象は、Initialization による Birth の置き換え、`aidlc-state.md` の読み書き契約、workspace 移行、成果物改名の適用である。

Application Design は refactor scope のため実行していない。
縮退時の入力代替として、`inception/requirements-analysis/requirements.md` と `.amadeus/knowledge/codebase/amadeus/` の成果物を設計の材料にした。

## 対象 Unit

- implicit（Units Generation 未実行のため、Intent 全体を暗黙 Unit として扱う）

## 業務ロジック

### L1：Initialization（Birth の置き換え）

`amadeus` 入口の Birth 承認後、Initialization 0.1〜0.3 を順に実行する。

1. **0.1 Workspace Scaffold**: record ディレクトリ `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` を作り、配下に phase ディレクトリ群（`initialization/`〜`operation/`。各 phase 配下に stage サブディレクトリ）、`verification/`、`audit/` を作る。Space が存在しない場合は `default` Space（`memory/`、`knowledge/`、`codekb/`、`intents/`）も作る。
2. **0.2 Workspace Detection**: greenfield / brownfield と、言語、フレームワーク、ビルドシステムを判定する。
3. **0.3 State Initialization**: `aidlc-state.md` を v2 の state template 構造で生成する。scope のステージ対応、depth、テスト戦略、0.2 の判定結果を反映し、最初の実行対象ステージを `[-]` にする。あわせて `intents.json` へ登録し（uuid v7 を採番）、`intents/active-intent` を更新し、独自索引 `intents.md` を再生成する。

### L2：状態遷移（aidlc-state.md）

- ステージ状態は Stage Progress のチェックリストで表す。語彙は v2 の 6 種である: `[ ]` Pending、`[-]` Active、`[?]` AwaitingApproval、`[R]` Revising、`[x]` Completed、`[S]` Skipped。
- phase 状態は Phase Progress で表す。値は `Pending`、`Active`、`Verified`、`Skipped` である。
- 旧 `state.json` からの対応写像は次である。
  - `stages[].state` → Stage Progress のチェックボックス。
  - `stages[].approval` → `audit/` の `STAGE_AWAITING_APPROVAL` と `STAGE_COMPLETED` イベント（承認記録はイベントが持つ）。
  - `phaseGates.<phase>` → Phase Progress の `Verified`（skip は `Skipped`）と `PHASE_VERIFIED` イベント（phase PR の URL は Details に置く）。
  - `bolts` → Construction の Bolt 単位の Stage Progress（Unit ごとの繰り返し）と Construction Bolts 系イベント。
  - `currentStage` / `status` → Current Status セクション（active phase、current / next stage、autonomy mode）。

### L3：読み書き契約（parse）

- `aidlc-state.md` は決定論的に parse できる形を保つ。セクション見出し（Header、Configuration、Workspace、Execution Overview、Runtime Metrics、Phase Progress、Stage Progress、Current Status、Session Resume）は v2 template の英語見出しを固定で使う。
- 読み取りは、見出しでセクションを分割し、チェックリスト行（`- [x] <stage-slug>` 形式）とフィールド行（`**Key**: value` 形式）だけを解釈する。
- 書き込みは対象行の置換だけで行い、セクションの順序と未知の行を保存する。
- validator（lifecycle 検証）と `amadeus` 入口は同じ parse 契約を共有する（実装は validator 側に置き、入口はそれを読む）。

### L4：workspace 移行（一回限り）

`.amadeus/` から `aidlc/spaces/default/` への移行は、開発用の一括移行スクリプト（dev-scripts、TDD）で行う。

| 移行元 | 移行先 |
|---|---|
| `.amadeus/steering.md`、`.amadeus/steering/**` | `aidlc/spaces/default/memory/`（org.md、team.md、project.md、phases/、templates/ へ割り付け。割り付け詳細は未確認事項） |
| `.amadeus/glossary.md`、`domain-map.md`、`context-map.md` | `aidlc/spaces/default/knowledge/` |
| `.amadeus/knowledge/codebase/<repo>/` | `aidlc/spaces/default/codekb/<repo>/` |
| `.amadeus/intents/<YYYYMMDD>-<slug>{,.md}` | `aidlc/spaces/default/intents/<YYMMDD>-<label>/`（record scaffold を補完し、`state.json` を L2 の写像で `aidlc-state.md` へ変換） |
| `.amadeus/active-intent` | `aidlc/spaces/default/intents/active-intent` |
| （新規） | `aidlc/active-space`、`aidlc/spaces/default/intents/intents.json` |

移行後に旧 `.amadeus/` を削除する（GD003）。examples の snapshot は移行スクリプトの対象にせず、新契約で real provider 再生成する（R006）。

### L5：成果物改名の適用

R005 の改名対応表を機械可読の単一定義（validator の契約定数と共有する）として持ち、契約文書、stage catalog、ステージ skill、テンプレート、examples-contract、eval 期待値へ同じ定義から波及させる。旧名は契約から消す（grep で残存ゼロを確認する）。

## 入力

- `inception/requirements-analysis/requirements.md`（R001〜R007）と `inception/grillings/G001-v2-compliance-boundary.md`（GD001〜GD003）
- `.amadeus/knowledge/codebase/amadeus/`（移行対象の構造、依存の向き、リスク）
- v2 一次情報: `core/knowledge/aidlc-shared/state-template.md`、`audit-format.md`、`docs/reference/04-stages/initialization.md`、`docs/reference/12-state-machine.md`、`docs/guide/03-spaces-and-intents.md`

## 出力

実装対象は次である。

- `amadeus` 入口 skill: Birth を Initialization 0.1〜0.3 へ置き換え、ルーティングと phase / Bolt 境界を `aidlc-state.md` + `audit/` の読み書きへ変更。
- `amadeus-steering` skill: `memory/` 構造への対応。
- validator: `aidlc/spaces/` 構造、`aidlc-state.md` parse、`intents.json`、scaffold、audit 必須イベントの検証へ改修。
- IndexGenerate: 新パスでの `intents.md` 生成と `intents.json` との整合。
- 22 ステージ skill と templates: 改名適用、`intent-statement.md`、stage `memory.md` の追加。
- dev-scripts: 移行スクリプト（一回限り）、examples-contract / generator / wrapper の新契約対応、e2e fixture の更新。
- 文書: lifecycle 6 文書、steering.md、CONTEXT.md、rules、README。

## 未確認事項

- v2 state template の原文（行単位の正確な形）。実装時に v2 の `state-template.md` を取得して vendored template として固定し、差分ゼロを検証する。
- `audit/` の shard ファイル名規約と fork / merge の単位。実装時に v2 の `aidlc-audit.ts` と `audit-format.md` の原文で確定する。
- steering 各ファイルの `memory/` への詳細割り付け（org.md、team.md、project.md のどれに何を置くか）。
- 進行中 record（この Intent）の `aidlc-state.md` 変換で、会話承認済み evidence を audit イベントへどう遡及記録するか。
