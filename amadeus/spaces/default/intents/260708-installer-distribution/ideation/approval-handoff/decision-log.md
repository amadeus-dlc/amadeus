# Decision Log — インストーラの実装(installer-distribution)/ Ideation

> ステージ: approval-handoff (Ideation) / 作成: 2026-07-08
> 各決定の一次記録は各ステージの `*-questions.md`(グリリング/構造化質問の回答)と監査ログ。ここは ideation 全体の決定台帳。

## 決定一覧

| # | 決定 | ステージ | 出典 |
|---|------|----------|------|
| D1 | 問題定義 = 手動コピー配布の3課題(導入摩擦・更新困難・導入ミス)。前 intent の合意を再確認して採用 | intent-capture | Q1 |
| D2 | 対象顧客 = 新規ユーザー+既存ユーザー。組織一括展開は初回除外 | intent-capture | Q2 |
| D3 | 成功指標3点(1コマンド1分導入 / README 手動手順の廃止 / カスタマイズ保持更新)| intent-capture | Q3 |
| D4 | トリガー = リリース頻度上昇+パッケージ化既定路線(確信度: 高) | intent-capture | Q4 |
| D5 | 提供形態 = npm 公開 CLI(`@amadeus-dlc/setup`)+ bunx/npx、実装先 `packages/setup`、全4ハーネス選択式、非破壊マージ既定+`--force` | intent-capture | Q5 |
| D6 | 競合分析 = cc-sdd / spec-kit / パッケージマネージャ型(参照)。弱点=手動コピー、差別化=非破壊マージ+差分レポート | market-research | Q1 |
| D7 | 戦略配分 = 導入体験は市場追随(テーブルステークス)、差別化は更新体験に集中 | market-research | Q2 |
| D8 | Build vs Buy = 完全自作(bun/TypeScript、ランタイム依存ゼロ) | market-research | Q3 |
| D9 | パッケージ名 `@amadeus-dlc/setup` 維持+スコープ確保を公開前タスク R1 化(2026-07-08 レジストリ実測: 名前空き) | feasibility | Q1 |
| D10 | 配布 = 2経路構成(npm CLI + GitHub タグ取得)。バージョン対応規約は R3 として requirements へ | feasibility | Q2 |
| D11 | 運用 = publish は既存タグ運用に統合(CI 自動化は初回外)、品質優先、license/repository 是正必須、規制該当なし | feasibility | Q3 |
| D12 | IN 境界6ケイパビリティ維持+**新規導入コマンドを `init` から `install` へ改名**(ユーザー是正) | scope-definition | Q1 |
| D13 | OUT 境界7項目の除外維持(Won't) | scope-definition | Q2 |
| D14 | 順序 = 依存優先 P1 共通基盤 → P2 install → P3 upgrade → P4 パッケージング → P5 ドキュメント。MoSCoW 維持 | scope-definition | Q3 |
| D15 | **CLI 文法は完全対称** — `install`/`upgrade` とも明示サブコマンド、なしはヘルプ(非対称文法は「MECE でない」として否認) | scope-definition | Q4/Q4-f |
| D16 | ステークホルダー最終合意(intent+スコープ、留保なし) | approval-handoff | Q1 |
| D17 | リスク受容+R4 緩和強化(promote-self 資産移植+skeleton 早期実測、フォールバック=リリース分割 v1=install / v1.1=upgrade)。I1=`(MIT OR Apache-2.0)`、I2=当該リポジトリ URL への是正内容確認 | approval-handoff | Q2 |
| D18 | **GO — inception へハンドオフ**(品質優先・通常リリースサイクル) | approval-handoff | Q3 |

## 却下・不採用の記録

- 状態自動判定の単一コマンド案(未導入→install / 導入済み→upgrade)— 暗黙挙動のリスクで不採用(D15)
- giget/degit 系・CLI フレームワーク依存 — 中核価値が独自要件のため不採用(D8)
- 配布物の npm 同梱(単一経路化)— リリース柔軟性の喪失で不採用(D10)

## 学習の永続化(§13)

- feasibility: 外部前提の直接検証 / 既知 Issue の再実測(project.md Corrections、cid:feasibility:c1・c2)
- scope-definition: CLI 文法の対称性原則(project.md Corrections、cid:scope-definition:c1)
