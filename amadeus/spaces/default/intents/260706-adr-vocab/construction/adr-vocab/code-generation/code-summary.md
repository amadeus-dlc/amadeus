# Code Summary — adr-vocab（Issue #525 + #527 + #560）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `docs/amadeus/extension-guide.md` / `.ja.md` | 「## Design lineage」/「## 設計判断の由来」を追加（ADR 0001 の要旨 + git 履歴参照。ADR 0002 は契約を所有する lifecycle/overview への参照ポインタのみ。reviewer iteration 1 の指摘で、当初入っていた ADR 0002 要旨の重複を除去し設計どおりの分離へ戻した）。knowledge 拡張ポイント行と人間編集の規律の段落にある「see #527, pending」参照 2 箇所ずつを確定後の記述へ更新 | FR-1.1 |
| `docs/amadeus/lifecycle/overview.md` / `overview.ja.md` | 「Artifact layout」/「成果物配置」節末尾へ、ADR 0002（Intent Phase Directory Layout）の要旨 + 経緯参照を英語・日本語それぞれ 1 段落で追記。見出し文言は不変 | FR-1.1 |
| `.agents/rules/context.md` | 「## 同期規約」節を新設し、docs/adr/README の一般規範 4 項目を統合 | FR-1.2 / FR-2.4 |
| `README.md` / `README.ja.md`（155 行） | ADR リンク行を判断記録の現行の置き場（Intent record の decision・steering・CONTEXT.md）への説明へ置換 | FR-1.3 |
| `skills/amadeus-domain-modeling/SKILL.md`（8 / 21 / 209 行）+ 昇格先 | docs/adr 言及を除去し、CONTEXT.md = 正準・glossary = 抜粋の位置づけへ更新 | FR-1.3 / FR-2.3 |
| `skills/amadeus-domain-modeling/evals/README.md` | docs/adr 言及を現行化 | FR-1.3 |
| `docs/adr/`（4 ファイル） | `git rm -r` で削除。`adr-template.md` は対象外で不変 | FR-1.4 |
| `CONTEXT.md` | ADR 定義の現行化、Glossary 定義への抜粋・一方向同期の追記、GD009 矛盾 8 箇所の補正、Aidlc State → Amadeus State 5 箇所改名、棚卸し語彙 9 件の追加 | FR-2.1 / FR-3 |
| `amadeus/spaces/default/knowledge/glossary.md` | 冒頭に抜粋宣言 + CONTEXT.md 参照を追記、`aidlc/` → `amadeus/`、`target-aidlc/` → `target-amadeus/` を補正 | FR-2.1 / FR-3.3 |
| `amadeus/spaces/default/intents/260706-adr-vocab/amadeus-state.md` | `Per unit: [TBD]` を `Per unit: adr-vocab` へ record 整合（既知の運用補正。手動更新が必要な既知パターン） | 記録整合 |

## 棚卸し 9 語彙の追加位置（CONTEXT.md）

| 語彙 | 追加位置 | 根拠 |
|---|---|---|
| model overlay | 「target artifacts」の直後 | dev-config・build workspace 関連の語彙群に隣接 |
| reference-stub と直接解決 | 「model overlay」の直後 | Space の codekb 参照パターンを扱う語彙として隣接配置 |
| 多体連携 | 「Space」定義の直後 | 複数 Intent の並行運用を扱う Space の直後に、並行運用系語彙をまとめて配置 |
| ピア協議 | 「多体連携」の直後 | 同一節（team.md 多体連携の運用）由来のため隣接 |
| 承認中継 | 「ピア協議」の直後 | 同上 |
| HUMAN_TURN | 「承認中継」の直後 | 承認中継の運用規律と密接なため隣接 |
| 先勝ち + 追従 | 「HUMAN_TURN」の直後 | 並行 Intent の解消規約として同じ運用語彙群にまとめて配置 |
| docs-only 宣言 | 「Intent Registry」の直後（「登録層」の直前） | `intents.json` の `docsOnly` フィールドであるため Intent Registry に隣接 |
| Ready 化 | 「Bolt」定義の直後（「Functional Design」の直前） | draft PR の merge readiness は Bolt の PR merge 契約と密接なため隣接 |

## 横断検証（FR-3.4）

| 検証 | コマンド | 結果 |
|---|---|---|
| (1) docs/adr 参照の完全性 | `grep -rn "docs/adr" --include="*.md" --include="*.ts" .` | BR-6 の除外 3 カテゴリ（record 内の歴史的言及 51 件、`adr-template.md` 91 行の一般例示 1 件、意図的な git 履歴参照 4 件 = extension-guide 両言語 + overview 両言語、CONTEXT.md の退役説明 1 件。計 57 件）以外は 0 件（reviewer iteration 1 の独立再実行と一致する実測値へ更新。extension-guide の重複除去後に再実行済み） |
| (2) aidlc 残存 | `grep -n -i "aidlc" CONTEXT.md amadeus/spaces/default/knowledge/glossary.md` | 0 件（exit 1） |
| (3) GD009 矛盾の目視分類 | `grep -nE "モジュールファイル\|モジュールディレクトリ\|intents\.md" CONTEXT.md` | 9 件ヒット。内訳は (i) 一般概念定義 7 行（見出し語 3 + 定義本文 4）、(ii) Event Storming 用法 1 行、(iii) 「GD009 で廃止した」と明示する歴史的言及 1 行（reviewer iteration 1 の実測に合わせ内訳を補正）。「Intent の目標プロファイル・概要・状態・一覧の置き場として旧構造を現行として記述する箇所」は 0 件 |
| (4) 標準検証 | `npm run test:all` | 全 pass（rename-leftovers、linter-sensor、model-overlay、engine-e2e、`git diff --check` を含む） |
| (4) skill 昇格検証 | `npm run test:it:promote-skill` | pass |

## skill 昇格

`bun run dev-scripts/promote-skill.ts amadeus-domain-modeling --replace` を実行し、`SKILL.md` と `agents/` を `.agents/skills/amadeus-domain-modeling/` へコピー昇格した（`evals/` は既定どおり昇格対象外）。

## validator

`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-adr-vocab` を実行した。
初回実行では `amadeus-state.md` の `Per unit: [TBD]` が未解決のため、`construction/[TBD]/functional-design/*.md` の produces 不足が 4 件検出された（`frontend-components.md` を含む）。
`Per unit: [TBD]` を実 unit 名 `adr-vocab` へ record 整合させたところ、`business-logic-model.md` / `business-rules.md` / `domain-entities.md` の 3 件は解消した。
`frontend-components.md` は functional-design ステージ時点で不適用宣言文書（適用判断 + 根拠）として作成済みであり、`Per unit` の record 整合後は他の 3 ファイルと同様に produces 検査を通過した（「作成不要と判断した」のではなく、既存の不適用宣言文書が produces 契約を満たしていた。reviewer iteration 1 の指摘で表現を実態へ補正）。
再実行後は「不足または矛盾: なし」で pass した。

## 設計からの逸脱

是正 1（extension-guide の ADR 0002 重複除去）の適用後は、設計文書（business-logic-model.md、business-rules.md、domain-entities.md）と実装内容に食い違いはない（当初実装には未申告の重複 1 件があり、reviewer iteration 1 で検出・是正した。経緯は下の追記節を参照）。
`amadeus-state.md` の `Per unit: [TBD]` 記録整合は、設計からの逸脱ではなく、project.md の既知の Corrections（units-generation を SKIP する scope での record 整合の手動更新、前例: e10f8294）に従った運用上の補正である。

## reviewer iteration 1 対応の追記

- 【是正 1】extension-guide{.md,.ja.md} の「Design lineage」に重複していた ADR 0002 要旨を除去し、承認済み設計（移設先の分離: 0001 = extension-guide、0002 = overview）へ戻した。当初の重複は設計からの未申告逸脱であり、「設計文書と実装内容に食い違いはなかった」という本書の当初申告は不正確だった。
- 【是正 4】「Ready 化」の追加基準整合: GitHub 一般の "Ready for review" 機能の名称ではなく、本リポジトリの draft PR 運用（2026-07-06 Maintainer 恒常ルール）が定める「人間はいつ merge してもよい」という意思表示の概念として定義した。一般機能名との境界線上にあることは認識しており、次回棚卸しでの再検討候補として明記する（reviewer 指摘の受容）。
- 【是正 5】スコープ外の残存物: `skills/amadeus/templates/intents/intent-module.md`（+ 昇格先）は退役済み `<dirName>.md` 構造（概要・依存・目標プロファイルの配置）のテンプレートのままであり、本 Intent が CONTEXT.md 側で是正した GD009 契約と矛盾したまま残っている。FR-3 の対象（CONTEXT.md）外のため本 Intent では変更せず、Issue 候補として gate 報告で leader へ申し送る。
