# Code Summary：v2 完全準拠の中核ロジック

## 変更したファイル

計画（S1〜S7）の全段階を実装した。904 files changed, +17530 / -10714 である。

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus/references/aidlc-v2/{state-template,audit-format}.md` | v2 一次情報の vendored copy を追加（PRE001） |
| `skills/amadeus-validator/validator/aidlc-state-contract.ts`（新規） | v2 state template の parse と行置換更新の契約。eval `test:it:aidlc-state` で TDD |
| `skills/amadeus-validator/validator/{lifecycle-v2,AmadeusValidator,space-paths}.ts` | `aidlc/spaces/<space>/` 構造、`aidlc-state.md`、`intents.json`（UUIDv7）、audit イベント、R005 新成果物名の検証へ全面移行。state.json 検証は退役 |
| `skills/amadeus-validator/scripts/IndexGenerate.ts` | `intents/intents.md` を Space 配下で生成。Space は `active-space` で解決 |
| `skills/amadeus/SKILL.md`、`references/{stage-catalog,audit-events}.md`、`templates/` | Birth を Initialization 0.1〜0.3 へ置き換え。ルーティングと Bolt 実行を `aidlc-state.md` + audit の読み書きへ変更。`state.json` テンプレートを廃止し、モジュールファイルを概要、依存、目標プロファイルへスリム化 |
| `skills/amadeus-steering/`（SKILL.md、templates/space/） | Space（memory / knowledge / codekb / intents）の初期化契約へ改訂 |
| 22 ステージ skill + 補助 7 skill の SKILL.md と templates | checkbox 語彙と audit イベントへの状態記述置換、R005 改名（unit-of-work 系、code-generation-plan / code-summary、build-and-test-summary / build-test-results、`<stage>-questions.md`、user-stories-assessment、practices-discovery-timestamp、application-design の decisions）、`intent-statement.md`（1.1）と stage `memory.md` の追加 |
| `dev-scripts/migrate-workspace-to-aidlc.ts`（新規） | `.amadeus/` → `aidlc/spaces/default/` の一括移行。TDD（`test:it:migrate-workspace`）。移行後 workspace の validator pass を検証条件に含む |
| 自己開発 workspace | 移行を実行。record は `260703-aidlc-v2-full-compliance` へ改名、`state.json` は `aidlc-state.md` へ変換、承認履歴は audit へ遡及記録（Recovered 明記）、旧 `.amadeus/` は削除 |
| `dev-scripts/examples-contract.ts`、generator、wrapper、evals | snapshot 不変条件を `aidlc-state.md` ベースへ全面更新。amadeus-templates / amadeus-validator / index-generate / llm-templates（mock e2e）/ validator-domain の期待値を新契約へ追従 |
| `examples/**`、`examples/skill-provenance.json` | 全 4 snapshot を real provider（claude）で再生成。生成中の Birth が Initialization として動作し、全 snapshot が invariants と validator を pass |
| `docs/amadeus/lifecycle/**`、`docs/amadeus/steering.md`、`AMADEUS.md`、`README(.ja).md`、`CONTEXT.md`、`CONTRIBUTING(.ja).md`、`.agents/rules/**`、`docs/adr/0002,0003` | 新構造への全面改訂。CONTEXT.md に Space、Intent Registry、Aidlc State、Audit Trail、Initialization、Stage Memory を追加。ADR 0003 は v2 契約による上書きを記録 |
| `amadeus-contracts/catalog/**`、`.gitignore` | 契約 catalog のパス更新、v2 カーソル（active-space、active-intent）の gitignore 追加 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R001 | `aidlc/spaces/default/` に memory / knowledge / codekb / intents を作成。旧 steering layer の内容は memory（org / team / project / development）と knowledge へ移設。旧 `.amadeus/` は削除 |
| R002 | 入口 skill の Birth を Initialization 0.1〜0.3 に置き換え。stage catalog（文書、stage-catalog.md、validator 契約定数）に 0.1〜0.3 を全 scope 実行対象として追加。0.2 の判定が 0.3 のルーティングへ反映される契約を明文化 |
| R003 | 状態の唯一の持ち主を `aidlc-state.md` にし、入口とステージ skill と validator の読み書きを checkbox + audit イベントへ変更。repo 内の契約上の `state.json` は退役（ES セッションの state.json は別契約として維持） |
| R004 | `intents.json`（uuid v7、slug、dirName、scope、repos、status）を新設。record は `<YYMMDD>-<label>` 形式。この Intent 自身を `260703-aidlc-v2-full-compliance` へ移設。`intents.md` 索引は生成物として併存 |
| R005 | 改名対応表を stageCatalog（validator 契約定数）を単一定義として、契約文書、ステージ skill、テンプレート、eval へ一貫適用。1.1 は `intent-statement.md` を作り、モジュールファイルは索引、依存、目標プロファイルだけを持つ。各 stage が `memory.md` を残す契約を追加 |
| R006 | `npm run test:all` exit 0。examples 全 4 snapshot を real provider で再生成し、workspace / Intent 指定の validator と invariants を pass。22 ステージの ALWAYS / CONDITIONAL と scope 対応は変更前と同一（Initialization 3 ステージの追加のみ） |
| R007 | #369 の確定判断 3・4 の上書きを `docs/amadeus/lifecycle/state.md` の補足と ADR 0003 のステータスに記録 |

## 補足

- audit の主 shard は `audit/audit.md` とした（v2 の「audit/ shard dir」と audit format の記述からの解釈。Bolt worktree の fork / merge は将来の複数 Bolt 運用で使う）。
- `codekb/amadeus/` の知識は移行前コードの解析結果であり、timestamp どおりの鮮度である。次の brownfield Intent の 2.1 で更新する。
- テスト実行結果の記録は Stage 3.6 Build and Test で行う。
