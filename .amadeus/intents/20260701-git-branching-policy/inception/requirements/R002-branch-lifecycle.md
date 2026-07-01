# R002: branch lifecycle

## 要求

- Issue 起点の branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の判断基準を定義する。
- default branch、agent 作業 branch prefix、1 Issue 1 branch、rebase、merge commit、fast-forward、docs-only 例外を検討対象として扱う。

## 受け入れ条件

- default branch を `main` として扱うかを読める。
- agent 作業 branch prefix と、1 Issue 1 branch の原則を読める。
- 作業 branch を `origin/main` に追従させるタイミングを読める。
- rebase、merge commit、fast-forward の扱いを読める。
- PR 作成前検証と merge 後処理を読める。
- 緊急修正や docs-only の例外を policy に含めるか、後続で扱うかを読める。

## 根拠

- [Issue #254](https://github.com/amadeus-dlc/amadeus/issues/254)
- [scope.md](../ideation/scope.md)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- docs-only 例外を同一 policy 内に含めるかは Construction で確定する。
