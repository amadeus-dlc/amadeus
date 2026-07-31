# Business Logic Model — U3 ci-slim

上流入力(consumes 全数): unit-of-work.md(U3 定義)、unit-of-work-story-map.md(ジャーニー1/3)、requirements.md(FR-3)、components.md(C-4)、component-methods.md(C-4 削除面)、services.md(実行面表)

測定 ref = observed `da51af375`。

## ロジック0: 実行面の位置づけ

unit-of-work.md U3 の定義(deployable 根拠 = PR あたり 4 job のランナー消費削減、依存 = U2 の受け皿先着)を実現する。services.md 実行面表の「ci.yml distribution-benchmark 系(blocking 側の重複実行)」を終了させ、unit-of-work-story-map.md ジャーニー1「PR CI の待ち時間」とジャーニー3「検証の所在の機械照合(FR-3d)」を確定させる。

## ロジック1: 削除(components.md C-4 / component-methods.md C-4 の写像)

```
ci.yml から削除する job(requirements.md FR-3a/3b):
  distribution-benchmark        (:224-253, matrix 1-3)
  distribution-benchmark-aggregate (:255-277)
  distribution-release-gate     (:279-291, ADR-4 で job ごと削除)
不変(FR-3c):
  tests / coverage-head / coverage-base / distribution-contract / ci-success needs(8項)
```

## ロジック2: 照合(FR-3d / AC-3)

1. decisions.md の FR-3d 対照表 V-1〜V-8 に対し、削除 diff の全 step が V-1〜V-6 のいずれかへ写像されること(V-7/V-8 は U1/U2 で着地済み)を PR 本文に記載
2. AC-3 grep: `.github/workflows/ci.yml` 内に `distribution:benchmark` / `Intent Mirror benchmark` が 0 hit(対象面限定)
3. `ci-success` needs の8項が変更前後で集合一致(yml 実読 diff)

## 検証計画

- PR CI 自身が最終検証(削除後の ci.yml で全 blocking job green = ci-success 成立の実測)
- TDD 適用外分類(削除のみ・yml): 前後 green + 上記照合で代替(NFR-3 の分類基準どおり)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:01:34Z
- **Iteration:** 1
- **Scope decision:** none

削除3 job のスコープ・行範囲・ci-success needs 8項・正対照 grep(現状4 hit 全て削除区間内)を live repo 照合で確認。FR-3d V-1..V-6 への限定と V-7/V-8 の U1/U2 帰属も Unit 境界と整合。consumes 全6件が本文実参照。指摘なし READY。

### Findings

- None
