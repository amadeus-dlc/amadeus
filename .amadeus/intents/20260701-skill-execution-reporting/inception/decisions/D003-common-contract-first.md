# D003: 共通契約先行判断

## 背景

- Issue #248 は、内部 skill、各 skill の共通契約、validator または evaluator 後段のどれで扱うかを判断候補にしている。
- 既存の公開 `amadeus-*` skill は、親 skill と内部 skill の成果物境界を持つ。
- 実行時問題報告は、まず公開入口で利用者に見える契約として必要になる。

## 判断

- 初期 Construction slice では、新しい内部 skill を作らず、公開 `amadeus-*` skill が共有する共通契約として始める。
- validator または evaluator 後段は、報告項目の一部として「検出すべき候補」を扱う。
- 内部 skill 化は、共通契約の重複や分岐が Construction で大きいと分かった場合の後続 Issue 候補にする。

## 理由

- 新しい内部 skill は呼び出し条件と成果物境界を追加するため、初期反映としては変更範囲が大きい。
- 共通契約なら、公開 skill の実行中に agent が同じ判断基準を使える。
- validator は構造検証を担うため、実行中の内容判断や Issue 化承認の管理元にしない方が境界が明確である。

## 影響

- B001 は source skill へ共通契約を追加する。
- B002 は昇格先 skill と eval の整合確認を行う。
- 内部 skill 案は捨てず、必要性が実装中に明確になった場合だけ後続 Issue 候補として報告する。
