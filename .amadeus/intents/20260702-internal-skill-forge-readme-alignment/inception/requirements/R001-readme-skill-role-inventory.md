# R001: README skill 分類の棚卸し

## 要求

README に載せる公開入口 skill、横断的補助 skill、内部 skill の分類を、実際の `amadeus-*` skill 一覧と照合できる。

## 背景

README は公開入口 skill を絞って案内している。
一方で、repo には多数の内部 `amadeus-*` skill が存在する。

この差が意図した分類なのか、README の不足なのかを判断できる必要がある。

## 受け入れ状態

- README の Phase Skills、Cross-Cutting Support Skills、Internal Skills の現行分類を確認できる。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` の実在一覧を確認できる。
- README に全内部 skill を載せるか、公開入口中心の案内に留めるかを判断できる。

## 対象境界

- SC-IN-001
- SC-IN-004

## 未確認事項

- README に内部 skill を全列挙するか、分類方針だけを明確にするかは Construction で判断する。
