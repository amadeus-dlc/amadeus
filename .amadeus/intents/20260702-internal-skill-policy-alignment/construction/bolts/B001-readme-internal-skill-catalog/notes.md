# Construction ノート

## 実行方針

- B001 は README の分類を、ユーザー判断と source skill 構成に合わせる。
- `amadeus-validator` は公開・横断的補助入口として残し、内部 stage helper の metadata 対象には含めない。
- README の英語版と日本語版は、見出し言語を除いて同じ分類を示す。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | README の skill 分類を更新する。 | test-results.md |
| T002 | 完了 | `amadeus-validator` の分類判断を記録する。 | test-results.md |

## 実装判断

- `amadeus-grilling` と `amadeus-domain-modeling` はユーザー判断により Internal Skills に置く。
- `amadeus-validator` は workspace と Intent 成果物構造を検証する公開・横断的補助入口として残す。

## 検証入口

- README 対応確認: `rg -n "Cross-Cutting Support Skills|Internal Skills|横断的補助スキル|内部スキル" README.md README.ja.md`
- 差分確認: `git diff --check`

## 未確認事項

- `skill-forge` 監査と `SKILL.md` 英語化を同じ後続 Issue にするかは未確認である。
