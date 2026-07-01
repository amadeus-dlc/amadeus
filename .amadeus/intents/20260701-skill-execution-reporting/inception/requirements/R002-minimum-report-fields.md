# R002: 最低報告項目

## 要求

- 実行上の問題報告には、Maintainer と Reviewer が判断できる最低項目を含める。

## 受け入れ条件

- 問題または懸念の要約を含む。
- 発見した skill 名を含む。
- 対象 Intent、phase、stage、Unit、Bolt が分かる範囲で含まれる。
- 影響範囲を含む。
- 推奨分類として、現在の Intent、後続 Issue 候補、報告不要のいずれかを含む。
- 根拠となる成果物 path、PR URL、Issue URL、検証結果のいずれかを含む。
- validator または evaluator で検出すべきか、人間判断だけで扱うべきかを含む。
- 秘密情報や不要な個人情報を含めない制約を持つ。

## 根拠

- [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) は、skill 名、対象 Intent、影響範囲、推奨、証拠、検出可能性を報告項目候補として扱っている。
- `ideation/ideation.md` は、セキュリティ観点として報告内容に秘密情報を含めない制約を Acceptance にできるとしている。

## 未確認事項

- なし。
