# D001: Inception 境界判断

## 背景

- [Issue #254](https://github.com/amadeus-dlc/amadeus/issues/254) は、Git branch、PR、merge、worktree の扱いを steering policy として定義することを目的にしている。
- Ideation では、Git ブランチ戦略を steering policy として扱う方針、AGENTS.md との責務分担、policy 参照と検出境界を Inception へ渡している。
- 対象外として、GitHub branch protection 設定、CI workflow、merge 操作の自動化、既存 PR の branch 整理が示されている。

## 判断

- Inception の対象境界を Git ブランチ戦略 policy 定義に固定する。
- 要求、User Story、Use Case、Unit、Bolt は、steering policy としての採用、branch lifecycle、参照と検出境界に限定する。

## 理由

- Issue #254 の目的は policy 化であり、GitHub 設定や CI workflow の変更ではない。
- AGENTS.md には操作指示があり、Inception ではそれを変更せず、steering policy との責務分担を扱えば十分である。

## 影響

- Construction では `.amadeus/steering/policies.md` と `.amadeus/steering/policies/git-branching.md` を主な対象にする。
- GitHub branch protection、CI workflow、merge 自動化は対象外のまま扱う。
- 詳細な Domain Model は Construction の Functional Design で扱う。
