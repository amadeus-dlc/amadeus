# Code Summary — readme-refresh

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 編集した既存ファイル

| ファイル | 節 | 変更内容 | 対応要求 |
|---|---|---|---|
| `README.md` | 冒頭説明 | ライフサイクルを 5 phase（Initialization / Ideation / Inception / Construction / Operation）の実体へ更新 | FR-5.1 |
| `README.md` | Highlights | `amadeus-orchestrate.ts` の `next` / `report` forwarding loop によるエンジン駆動の表現へ更新。scope 列挙に `pdm` を追加（10 個）。「22 stages」→「32 stages」。examples/ の行を削除 | FR-3.1、FR-5.1、FR-2.1、FR-7.5 |
| `README.md` | Quickstart | 「full mock-based verification suite」から「mock-based」を削除 | 追加修正 |
| `README.md` | Usage — Lifecycle Entrypoint | `amadeus-steering` の番号リストを削除し、単一入口 `amadeus`（Intake + エンジン駆動）の説明へ書き直し | FR-7.1、FR-7.5 |
| `README.md` | Usage — Auxiliary Entrypoints | `amadeus-grilling` / `amadeus-domain-modeling` / `amadeus-validator` の 3 個のみへ更新。`amadeus-event-storming`、`amadeus-domain-grilling` を削除 | FR-1.1 |
| `README.md` | Usage — Internal Skills | 表を役割分類（ステージ実行 skill 29 個 = stage-catalog.md へ参照委譲、scope shortcut 4 + `amadeus-init`、読み取り専用ユーティリティ 3）へ再構成。旧 `amadeus-<phase>-<stage>` 命名 22 個と `amadeus-decision-review` 等 3 個を削除。skill-forge の 2 文を削除し、promotion flow の文は保持 | FR-4.1、FR-4.2、FR-4.3、FR-7.4 |
| `README.md` | Usage — Typical Flow | 表から `amadeus-steering` 行を削除し、`amadeus` の Intake / stage routing の 2 段へ書き直し。補助入口の説明文を実在 3 skill の説明へ置換 | FR-1.2、FR-7.1 |
| `README.md` | Usage — Validation | `npm run validate:all` とその説明文を削除。`npm run validate:workspace` の 2 用法のみ残す | FR-7.2、FR-2.1 |
| `README.md` | Documentation | examples/ 行を削除。「3 phases, 22 stages」→「5 phases, 32 stages」。`docs/amadeus/language-policy.md` のリンクを追加 | FR-2.1、FR-5.1、FR-7.6 |
| `README.md` | Boundaries | `intents/intents.md` を正準台帳 `intents/intents.json`（UUIDv7）へ更新 | FR-7.3 |
| `README.ja.md` | 上記全節 | README.md と同一構成の対訳として同期。Validation 節のコマンドは英語版に合わせ `npm run validate:workspace` へ統一 | FR-8.1 |

変更しなかった節: Install into a Workspace、Getting Help、Contributing、License（業務ロジックモデルの計画どおり「変更なし」）。

## 照合に使った実体（BR-1）

- skill 実在: `.claude/skills/`、`.agents/skills/`（29 ステージ実行 skill、`amadeus-grilling` / `amadeus-domain-modeling` / `amadeus-validator`、scope shortcut 4 + `amadeus-init`、ユーティリティ 3）
- scope 実在: `.agents/amadeus/scopes/`（10 ファイル: bugfix、enterprise、feature、infra、mvp、pdm、poc、refactor、security-patch、workshop） — `ls .agents/amadeus/scopes/` で実測
- ステージ数・phase: `.agents/amadeus/tools/data/stage-graph.json`（32 ステージ、5 phase） — `bun -e` でロードして `Object.keys(d).length === 32` を実測
- script 名: `package.json` の `scripts`（`test:all`、`validate:workspace`、`amadeus:install` は実在、`validate:all` は不在） — `grep -n` で実測
- stage-to-skill 対応: `skills/amadeus/references/stage-catalog.md`（29 ステージ実行 skill の一覧と、scope shortcut / ユーティリティの列挙）
- `examples/` ディレクトリ: `ls examples` で不在を実測確認
- `docs/amadeus/language-policy.md`: 実在を `ls` で確認（PR #536 で新設）
- skill-forge: `aidlc/spaces/default/memory/team.md` と `AMADEUS.md` を `grep` して定義元が不在であることを確認

## 検証方法

1. **旧命名・退役語の残存チェック（完了条件のグレップ）**: `grep -n "examples/\|validate:all\|amadeus-steering\|amadeus-event-storming\|amadeus-domain-grilling\|amadeus-ideation-\|amadeus-inception-\|amadeus-construction-\|intents/intents\.md\|skill-forge\|22 stages\|22 ステージ\|amadeus-decision-review\|amadeus-history-review\|amadeus-learning-review\|mock-based\|mock provider" README.md README.ja.md` を実行し、該当 0 件（exit code 1 = マッチなし）を確認した。
2. **リンク解決可能性の機械検査（NFR-1）**: セッション scratchpad の一時 Python スクリプトで両ファイルの Markdown リンク（`](...)`）を抽出し、`http` 始まりを除く相対パスがリポジトリ上に実在するかを検査した。結果は `README.md broken: []` / `README.ja.md broken: []` であり、broken 0 件だった。検査スクリプトはリポジトリにコミットしていない（C-1、BR-5）。
   - 修正前ベースラインでは `examples/` への相対リンクが両 README に計 4 件存在した（今回の編集でその 4 件を含む examples/ 参照をすべて削除済み）。
3. **validator と `npm run test:all`（C-2）**: 本ステージ（code-generation）の後続である build-and-test 相当の検証で実行し、結果を記録する。本ステージ内では未実行。

## PR 準備前の残タスク

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-readme-refresh` によるレコード構造検証
- `npm run test:all` の実行と結果記録
- 上記の実行結果を PR 説明（NFR-1 のリンク検査結果を含む）に転記する

## PR #539 / #542 merge 後の再照合（gate 付帯条件 + reviewer iteration 1 対応）

functional-design gate 承認の付帯条件に基づき、branch を origin/main = 33c40271 へ rebase して再照合し、次の 3 点を追加編集した。

1. Internal Skills 表の shortcut 行へ `amadeus-compose`（PR #539 の上流 2.2.0 取り込みで新設された composer shortcut）を追加し、行ラベルを「Scope and composer shortcuts」（ja: 「scope / composer shortcut」）へ更新した。実体: `.claude/skills/amadeus-compose` / `.agents/skills/amadeus-compose/` の実在、stage-catalog.md の「the composer shortcut」記述。amadeus* prefix の skill 数は 41 → 42。
2. README.ja.md の Documentation 節へ「拡張ガイド」行の対訳を追加した（英語版に存在し ja 版に欠落していた同期漏れ。reviewer iteration 1 指摘 1）。
3. README.ja.md の language-policy と拡張ガイドのリンク先を `.ja.md` 優先へ修正した（language-policy.md の Cross-linking rules: ja からは対応する `.ja.md` を優先参照。日本語版が存在するのはこの 2 文書のみで、他のリンクは `.md` のまま正しい）。

再検証: 退役語 grep 0 件、リンク機械検査 checked=46 broken=0（scratchpad の一時スクリプト。コミットしない）。
