# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の `amadeus-decision-review`、Skill Contract、stage 判定語彙、source skill と昇格先成果物の同期手段を入力証拠として扱える。 |
| 運用 | feasible | phase skill 起動時に前提を確認すれば、後続 Issue が存在しない内部 skill を前提に進む問題を早期に検出できる。 |
| セキュリティ | feasible | 追加する確認対象は成果物、skill 供給元、実行環境の状態であり、秘密情報や認証情報の保存を前提にしない。 |
| 依存 | feasible | Issue #277 の前提補修、Issue #257 の decision review、Issue #263 の Skill Contract、Issue #233 の stage 判定語彙を根拠にできる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | stage0 採用判断、配布対象 skill に入れる説明範囲、前提不成立時の扱いを承認する。 |
| Agent | 実行者 | phase skill 起動時に、対象 skill の供給元、実行環境、stage 前提を確認する。 |
| Reviewer | 参照者 | repo 内 Issue 文脈が配布対象 skill に混入していないか、分類先が妥当かを確認する。 |
| Validator | 構造検出者 | 追加した成果物、リンク、状態を検出する。 |
| Evaluator | 品質評価者 | stage 前提確認が skill 実行契約と矛盾しないかを text contract で確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | phase skill 起動時に、skill 供給元、実行環境、stage 前提、前提不成立時の分類先を確認する流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- stage 前提確認の管理元を `amadeus-decision-review` に置くか、Skill Contract に置くか、両方に置くかは Inception で判断する。
- host environment での利用可否をどの証拠で確認するかは Inception で判断する。
- 前提不成立時に `repair_only` と `upstream_feedback_required` をどう分けるかは Inception で判断する。
- 配布対象 skill に repo 内 Issue 番号が混ざらないことを eval で見るか、人間レビューだけで見るかは Inception で判断する。
- #277 と #272 の関係をどの成果物で代表例として説明するかは Inception で判断する。

## 学習候補

- 後続 Issue が内部 skill を前提にする場合は、phase skill 起動時にその skill の供給元と stage 前提を入力証拠として確認する必要がある。
- stage2 は次回 stage0 として自動採用せず、Maintainer の stage0 採用判断を証拠として扱う必要がある。
- 配布対象 skill には、このリポジトリ固有の Issue 番号や PR 文脈を前提にした説明を入れない。
- source skill と昇格先成果物の同期は、実装完了ではなく、実行環境で利用できる前提と分けて扱う必要がある。
