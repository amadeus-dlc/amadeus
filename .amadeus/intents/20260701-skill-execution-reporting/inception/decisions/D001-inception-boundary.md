# D001: Inception 境界判断

## 背景

- [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) は、amadeus-* skill 実行中に見つかった問題や懸念の報告標準化を求めている。
- Ideation は、現在の Intent に無関係な改善を自動で混ぜること、人間判断なしに GitHub Issue を大量作成すること、validator の `pass` を内容承認として扱うことを対象外にしている。
- 既存の公開 skill には、成果物作成後に validator を使う説明はあるが、実行中に見つけた横断的な問題の報告契約はない。

## 判断

- Inception の対象境界を、skill 実行時問題報告の分類基準、最低項目、人間承認付き Issue 候補化、代表 skill と eval の整合確認に固定する。
- GitHub Issue の自動大量作成、全 amadeus-* skill への一括反映、validator の構造契約変更、実装や CI の変更は対象外にする。
- User Story は、Maintainer が現在の Intent と後続 Issue 候補を分けて判断する価値として扱う。

## 理由

- Issue #248 の中心は、問題や懸念を現在の Intent 成果物へ混ぜず、判断可能な形で報告することである。
- 報告先分類、最低項目、人間承認付き Issue 候補化は、互いに依存するため同じ Inception で定義する必要がある。
- 代表 skill と eval の整合確認は、Construction で実行可能な Bolt として分けて追跡できる。

## 影響

- Construction では、報告契約の source skill 反映と、昇格先 skill および eval の整合確認を別 Bolt として扱う。
- validator の成果物構造契約は、この Intent では変更しない。
- PR 準備時には、対象 Intent の validator、typecheck、diff check、関連 eval を確認する。
