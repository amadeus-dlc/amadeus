# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Git ブランチ戦略 policy の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- Git ブランチ戦略を steering policy として採用する。
- `.amadeus/steering/policies.md` は概要と導線を持つ。
- `.amadeus/steering/policies/git-branching.md` は具体ルールを持つ。
- AGENTS.md は実行操作指示を持ち、steering policy は Amadeus DLC 成果物から参照する長期方針を持つ。

## 責務境界

- 所有するもの: policy 配置、branch lifecycle、AGENTS.md との責務分担。
- 所有しないもの: GitHub branch protection 設定、CI workflow、merge 自動化、既存 PR の branch 整理。
- 依存してよいもの: `AGENTS.md`、`.amadeus/steering/policies.md`、`.amadeus/development.md`、`EXT001 GitHub`。
- 後続で再確認が必要になる条件: docs-only 例外や緊急修正の扱いが既存運用と衝突する場合。

## 構成候補

- Policy Overview: `.amadeus/steering/policies.md` に置く概要と導線を扱う。
- Git Branching Policy: `.amadeus/steering/policies/git-branching.md` に置く具体ルールを扱う。
- Branch Lifecycle Rule: Issue 起点、branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理を扱う。
- Operational Instruction Boundary: AGENTS.md と steering policy の責務分担を扱う。

## データと契約候補

- 入力候補: GitHub Issue、target workspace、基点 commit、branch name、PR URL、CI 結果、merge 状態。
- 出力候補: branch strategy policy、個別 policy path、PR 作成前確認、merge 後処理の判断。
- 状態候補: 未作成、作業中、PR 作成済み、merge 済み、追従済み。
- 事前条件候補: 対応 Issue があり、`origin/main` を基点に作業 branch を作れる。
- 事後条件候補: PR と Intent が対応し、merge 後に次作業 branch が `origin/main` を基点にできる。
- 不変条件候補: merge 操作は人間に委譲し、Agent が自動 merge しない。

## 検証観点

- policy の配置が成果物から追跡できる。
- branch lifecycle の判断基準が対象外を含めて読める。
- AGENTS.md と steering policy の責務分担が重複しすぎていない。

## Bolt 分割方針

- B001 で steering policy の配置と導線を扱う。
- B002 で branch lifecycle の具体ルールを扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: `BC001 自己開発運用` 内の policy として扱う範囲を確認する。
- Logical Design で確定する事項: `.amadeus/steering/policies.md` と `.amadeus/steering/policies/git-branching.md` の重複を避ける構成を確定する。
- 実装時に確認する事項: AGENTS.md の操作指示を不用意に変更しないこと。
- 検証時に確定する事項: validator と標準検証で成果物構造が通ること。
