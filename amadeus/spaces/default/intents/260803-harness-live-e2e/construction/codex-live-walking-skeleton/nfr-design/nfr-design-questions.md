# NFR Design Questions — codex-live-walking-skeleton

## 既決照合

エンジンdirectiveで現在の入力は`business-logic-model`だけ、出力はlibrary Unitに適用される`security-design`と`logical-components`だけにpruneされている。Functional DesignでGHA hard deny、strict opt-in、credential/config隔離、owner-bound lifecycle、structured result、atomic ledger、Codex walking skeletonの境界が既決であり、Issue #1717および入力成果物に矛盾・実装阻害となる抜けはない。追加質問は0件とする。

## Plan

`security-design.md`と`logical-components.md`を生成する。directiveにないperformance/scalability/reliability成果物は生成しない。

## Human Adjudication

- **Date:** 2026-08-03T15:48:00Z
- **Review limit:** Iteration 2で残った3 BLOCKERを人間裁定する。
- **Answer:** 選択肢1。supervisor crash containment、C4/C5 spawn ownership、LC-LIVE-13/14 handoffを修正し、解消扱いとして続行する。
