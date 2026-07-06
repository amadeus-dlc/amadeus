# Business Logic Model — readme-refresh

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象と編集計画

変更対象は README.md（英語、正）と README.ja.md（日本語、同期）の 2 ファイルである（C-1）。
節ごとの編集計画を README.md の現行行番号で示す。README.ja.md は同一構成の対訳として追従する（FR-8）。

| 節（現行行） | 変更内容 | 対応要求 |
|---|---|---|
| 冒頭説明（L3〜L4） | ライフサイクルの表現を 5 phase（Initialization / Ideation / Inception / Construction / Operation）の実体へ更新 | FR-5.1 |
| Highlights（L10） | 「stage routing driven by `aidlc-state.md`」をエンジン駆動（`amadeus-orchestrate.ts` の next / report forwarding loop）へ更新 | FR-7.5 |
| Highlights（L11） | scope 列挙に `pdm` を追加（10 scope）、「22 stages」→「32 stages」 | FR-3.1、FR-5.1 |
| Highlights（L12） | examples/ の行を削除 | FR-2.1 |
| Quickstart（L32） | 「full mock-based verification suite」の「mock-based」を落とす（test:all は決定論的 e2e・eval 群であり mock 表現は不正確） | FR 番号なしの追加修正。Issue #535 項目 6 の「上記以外にも乖離がある可能性が高い」の範囲内で、受け入れ条件 (1)「全記載が実体と一致」に基づく（判断は diary の Interpretation に記録済み） |
| Install into a Workspace（L38〜L79） | 変更なし（実測で `scripts/amadeus-install.ts` の MANIFEST と一致: engineDirs 7 個、amadeus:install script、claudeSymlinks、doctor） | FR-6.1 |
| Usage — Lifecycle Entrypoint（L86〜L94） | `amadeus-steering` の番号リストを削除し、単一入口 `amadeus`（Intake + エンジン駆動の stage routing）の説明へ書き直す | FR-7.1、FR-7.5 |
| Usage — Auxiliary Entrypoints（L96〜L104） | 実在 3 skill（`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator`）へ更新。`amadeus-event-storming`、`amadeus-domain-grilling` を削除 | FR-1.1 |
| Usage — Internal Skills（L106〜L120） | 表を役割分類（ステージ実行 29 = stage-catalog.md へ委譲、scope shortcut 4 + `amadeus-init`、読み取り専用ユーティリティ 3）へ再構成。旧命名 22 個と実在しない decision/history/learning-review 3 個を削除。skill-forge の 2 文（L118〜L119）を削除し、promotion flow の文（L120）は保持 | FR-4.1〜4.3、FR-7.4 |
| Usage — Typical Flow（L124〜L135） | 表から `amadeus-steering` 行を削除し、`amadeus` の Intake / stage routing の 2 段へ書き直す。補助入口の説明文を実在 3 skill の説明へ置換 | FR-1.2、FR-7.1 |
| Usage — Validation（L137〜L155） | `npm run validate:all` とその説明文（L139「Validate the bundled example snapshots.」= examples 退役で対象を失う）を削除し、実在する `npm run validate:workspace` の 2 用法（workspace / workspace + Intent）だけを残す | FR-7.2、FR-2.1 |
| Documentation（L157〜L172） | examples/ 行を削除。「3 phases, 22 stages」→「5 phases, 32 stages」。`docs/amadeus/language-policy.md` のリンクを追加 | FR-2.1、FR-5.1、FR-7.6 |
| Boundaries（L176〜L183） | L178 の `intents/intents.md` を正準台帳 `intents/intents.json`（UUIDv7）へ更新 | FR-7.3 |
| Getting Help / Contributing / License（L185〜L205） | 変更なし | — |

## PR #539 / #542 merge 後の再照合による追加行（gate 承認の付帯条件 + reviewer iteration 1 指摘）

functional-design gate 承認の付帯条件（照合台帳を PR #542 merge 後の main と最終照合してから PR を作る）に基づき、origin/main = 33c40271 へ rebase して再照合した結果、次の 2 行を編集計画へ追加した。

| 節 | 変更内容 | 対応根拠 |
|---|---|---|
| Usage — Internal Skills 表 | shortcut 行へ `amadeus-compose`（composer shortcut、PR #539 の上流 2.2.0 取り込みで新設）を追加し、行ラベルを「Scope and composer shortcuts」へ更新 | 受け入れ条件 (1) 全記載一致。実体: `.claude/skills/amadeus-compose` / `.agents/skills/amadeus-compose/` の実在、stage-catalog.md の「the composer shortcut」記述 |
| Documentation（README.ja.md のみ） | 「拡張ガイド」行の対訳を追加（英語版に存在し ja 版に欠落していた同期漏れ）。あわせて ja 版の language-policy リンクを `.ja.md` 優先へ修正（language-policy.md の Cross-linking rules） | FR-8.1、BR-2（reviewer iteration 1 指摘 1） |

## 検証の流れ

1. 編集後、scratchpad の一時スクリプトで両 README の全リンク（相対パス・アンカー）を機械検査し、broken 0 件を確認する（NFR-1。修正前ベースライン: examples/ 4 件検出済み）。
2. skill 名・scope 名・ステージ数・script 名の各記載を、実体（`.claude/skills/` / `.agents/skills/`、`.agents/amadeus/scopes/`、stage-graph、package.json）と突き合わせて確認する。
3. validator と `npm run test:all` を実行して記録する（C-2）。
