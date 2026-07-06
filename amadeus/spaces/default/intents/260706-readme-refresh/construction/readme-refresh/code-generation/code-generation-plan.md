# Code Generation Plan — readme-refresh

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 実施順

business-logic-model.md の編集計画表を上から実施した。README.md（正）を先に確定し、同一構成で README.ja.md へ追従した。

| # | 節（現行行） | 実施内容 | 対応要求 | 実施結果 |
|---|---|---|---|---|
| 1 | 冒頭説明（L3〜L4） | ライフサイクルの表現を 5 phase（Initialization / Ideation / Inception / Construction / Operation）へ更新 | FR-5.1 | 実施済み |
| 2 | Highlights（L10） | 「stage routing driven by `aidlc-state.md`」をエンジン駆動（`amadeus-orchestrate.ts` の next / report forwarding loop）へ更新 | FR-7.5 | 実施済み |
| 3 | Highlights（L11） | scope 列挙に `pdm` を追加（10 scope）、「22 stages」→「32 stages」 | FR-3.1、FR-5.1 | 実施済み |
| 4 | Highlights（L12） | examples/ の行を削除 | FR-2.1 | 実施済み |
| 5 | Quickstart（L32） | 「full mock-based verification suite」の「mock-based」を落とす | 追加修正（diary Interpretation 記録） | 実施済み |
| 6 | Install into a Workspace（L38〜L79） | 変更なし | FR-6.1 | 変更なし（計画どおり） |
| 7 | Usage — Lifecycle Entrypoint（L86〜L94） | `amadeus-steering` の番号リストを削除し、単一入口 `amadeus`（Intake + エンジン駆動の stage routing）の説明へ書き直す | FR-7.1、FR-7.5 | 実施済み |
| 8 | Usage — Auxiliary Entrypoints（L96〜L104） | 実在 3 skill（`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator`）へ更新。`amadeus-event-storming`、`amadeus-domain-grilling` を削除 | FR-1.1 | 実施済み |
| 9 | Usage — Internal Skills（L106〜L120） | 表を役割分類（ステージ実行 29、scope shortcut 4 + `amadeus-init`、読み取り専用ユーティリティ 3）へ再構成。旧命名 22 個と decision/history/learning-review 3 個を削除。skill-forge の 2 文を削除し、promotion flow の文は保持 | FR-4.1〜4.3、FR-7.4 | 実施済み |
| 10 | Usage — Typical Flow（L124〜L135） | 表から `amadeus-steering` 行を削除し、`amadeus` の Intake / stage routing の 2 段へ書き直す。補助入口の説明文を実在 3 skill の説明へ置換 | FR-1.2、FR-7.1 | 実施済み |
| 11 | Usage — Validation（L137〜L155） | `npm run validate:all` とその説明文を削除し、`npm run validate:workspace` の 2 用法だけを残す | FR-7.2、FR-2.1 | 実施済み |
| 12 | Documentation（L157〜L172） | examples/ 行削除。「3 phases, 22 stages」→「5 phases, 32 stages」。`docs/amadeus/language-policy.md` のリンクを追加 | FR-2.1、FR-5.1、FR-7.6 | 実施済み |
| 13 | Boundaries（L176〜L183） | `intents/intents.md` を正準台帳 `intents/intents.json`（UUIDv7）へ更新 | FR-7.3 | 実施済み |
| 14 | Getting Help / Contributing / License（L185〜L205） | 変更なし | — | 変更なし（計画どおり） |

## README.ja.md への追従

README.ja.md は、上記 1〜13 の各行を同一構成の対訳として追従させた。README.ja.md 固有の既存差異（Validation 節が `bun run .agents/skills/amadeus-validator/...` の直接実行コマンドを使っていた点）は、英語版と同一コマンド（`npm run validate:workspace`）へ揃えて記載を一致させた。

計画表 12 の「Extension guide リンク」は README.md にのみ既存（先行 Intent `260706-docs-lang-guide` が追加済み、README.ja.md 側は編集対象外と明記済み）であり、本 Intent の計画表にも記載がないため、README.ja.md 側には追加していない（Surgical Changes、C-1 の範囲外）。

## 実施しなかった判断

- Install into a Workspace 節、Getting Help / Contributing / License 節は、計画表どおり「変更なし」として一切編集していない。
