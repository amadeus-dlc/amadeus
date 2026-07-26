# Team Practices — 260725-kimi-harness(部分ドラフト)

> 再実行の部分ドラフト(practices-discovery:c2): 変更のあった `## Walking Skeleton` のみ含む。他4セクション(Way of Working / Testing Posture / Deployment / Code Style)は affirm 済みの live 内容を温存し、本ドラフトに含めない。

## 概要

本ドラフトは再実行の部分ドラフトであり、promote 対象は後述の Walking Skeleton セクションのみである。他4セクションは `amadeus/spaces/default/memory/team.md` の live managed block を byte-identical で温存する(practices-discovery:c2)。

## Walking Skeleton

私たちは新しい配布経路を含む greenfield 要素のある intent では、最初の Construction Bolt を小さな end-to-end スライスとして単独・ゲート付きで実行する。本 intent(新ハーネス kimi)では「M1 ハーネス定義(manifest + orchestrator SKILL.md 骨格)+ `bun scripts/package.ts kimi` で `dist/kimi/` が生成され `--check` が通る」までを最初のスライスとし、adapter 等の拡張前に人間が確認する。
