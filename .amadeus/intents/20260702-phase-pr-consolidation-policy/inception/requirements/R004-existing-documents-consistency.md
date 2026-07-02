# R004 既存文書との整合

## 要求

development.md の手順と steering policies の粒度制約が、統合条件と矛盾なく読める。

## 背景

development.md の PR 準備条件は「対象 phase の成果物が validator で pass している」と単数形で書かれており、統合 PR の複数 phase と食い違う可能性がある。
粒度制約（skill 変更 PR は skill 変更だけで構成）は、統合対象が仕様成果物（`.amadeus/**` の文書）だけであれば矛盾しないが、その関係が明示されていない。

## 受け入れ条件

- development.md の PR 準備条件が、統合 PR では含まれる各 phase の成果物に適用されることが読める。
- 統合の対象は仕様成果物であり、skill 変更を含む PR は粒度制約に従う（統合の対象外である）ことが読める。
- Git Branching Policy の branch 命名との整合が確認されている。

## 依存

- R001
- R002
- R003

## 対応する対象境界

- SC-IN-004

## 未確認事項

- なし。
