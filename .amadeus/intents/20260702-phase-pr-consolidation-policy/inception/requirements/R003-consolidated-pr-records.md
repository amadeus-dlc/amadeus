# R003 統合 PR の記録項目

## 要求

統合 PR の説明に必要な記録項目が定義され、gate の判定は phase ごとに `state.json` で行われる。

## 背景

統合 PR ではどの phase 成果物が含まれるかが読み取りにくくなるため、記録項目を固定しないとレビューと追跡が弱くなる。
gate の判定は既に phase ごとに `state.json` で行われており、PR の単位と独立している。

## 受け入れ条件

- 統合 PR の説明に、含まれる phase 成果物の一覧と各 phase の gate 状態を明記する記録項目が定義されている。
- gate の判定は phase ごとに `state.json` で行い、PR の統合が gate の統合を意味しないことが読める。
- 統合しても validator の phase 状態検証（state.json の gate、必須成果物）が成立する。

## 依存

- R001

## 対応する対象境界

- SC-IN-003

## 未確認事項

- なし。
