# build-test results（260706-adr-vocab）

上流入力: [code-generation-plan.md](../adr-vocab/code-generation/code-generation-plan.md)、[code-summary.md](../adr-vocab/code-generation/code-summary.md)

## 実行記録（fresh、2026-07-06、origin/main e535ad89 基点の branch 上）

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査（build 相当） | `npm run typecheck`（test:all 内） | pass |
| 横断 1: docs/adr 参照 | `grep -rn "docs/adr" --include="*.md" --include="*.ts" .` | pass（record 外 6 件 = adr-template 1 + CONTEXT.md 退役説明 1 + 意図的 git 履歴参照 4。除外カテゴリ以外 0 件） |
| 横断 2: 旧名残存 | `grep -n -i "aidlc" CONTEXT.md glossary.md` | pass（0 件） |
| 横断 3: GD009 目視分類 | `grep -nE "モジュールファイル|モジュールディレクトリ|intents\.md" CONTEXT.md` | pass（9 件 = 一般概念定義 7 / Event Storming 1 / 廃止明示の歴史的言及 1。旧構造を現行として記述 0 件） |
| 横断 4 + 標準検証 | `npm run test:all`（typecheck〜diff:check、test:it:promote-skill 込み） | pass（exit 0） |
| skill 昇格同期 | source と昇格先の SKILL.md | byte 一致（reviewer 独立確認済み） |
| 構造検証 | AmadeusValidator（. + 260706-adr-vocab） | pass |

## 検出力・裏取りの証跡

- reviewer（architecture、2 反復）が grep 3 種と test:all を独立再実行し、件数・分類の一致を確認済み（it1 で件数内訳の自己申告誤りを検出 → 実測値へ補正済み）。
- it1 の High 相当指摘（extension-guide への ADR 0002 要旨の未申告重複 = 設計の分離配置からの逸脱）は検出・是正済みで、設計（reviewer 3 反復 READY + gate 承認）との権威関係は保たれている。

## 実施後の状態

- docs/adr/ は存在しない（git rm 済み）。移設先 2 件（extension-guide Design lineage、lifecycle/overview Artifact layout / 成果物配置）は両言語で追記済み、見出し不変。
- CONTEXT.md: 正準宣言 + GD009 補正 8 記述 + Amadeus State 改名 + 棚卸し 9 語彙。glossary.md: 抜粋宣言 + 旧名補正。
