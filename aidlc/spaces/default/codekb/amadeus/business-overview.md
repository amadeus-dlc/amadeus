# 業務概要：amadeus

## 概要

Amadeus は、Amadeus DLC を実行、検証、配布するための実装プロジェクトである。

Amadeus DLC は、AI と人間が協調してソフトウェア開発を進める lifecycle 契約であり、Initialization、Ideation、Inception、Construction、Operation の 5 phase と成果物、gate、traceability、validator を扱う。

Operation phase は record の scaffold と Stage Progress の 7 行だけを持ち、いずれの stage も実行対象にしない（`docs/amadeus/aidlc-v2-operation-phase-boundary.md`）。

Amadeus は、この契約を `skills/amadeus*`、`.agents/skills/amadeus*`、validator、template、docs、`aidlc/` 成果物として運用する。

## 主要な業務フロー

1. **Space steering**: `amadeus-steering` が `aidlc/spaces/<space>/` の memory、knowledge、intents 索引を整える。
2. **Intake と Birth**: 単一入口 `amadeus` が継続、合流、新規 Intent の Birth 提案を判定し、人間承認後に Initialization 0.1〜0.3 を実行する。
3. **ステージルーティング**: `aidlc-state.md` の Lifecycle Phase、Stage Progress、Current Status から次ステージを解決し、対応する内部 skill へ委譲する。
4. **phase 境界**: phase の全ステージ完了後、phase PR の merge を確認し、`PHASE_VERIFIED` を audit に記録して次 phase へ進める。
5. **Construction の Bolt 実行**: Delivery Planning の Bolt 計画、または暗黙 Bolt を使い、Build and Test と PR gate を通じて実装を進める。
6. **検証**: `amadeus-validator` が Space、Intent、成果物、状態、audit、traceability の構造を検証する。

## 自己開発での位置づけ

このリポジトリでは、Amadeus 本体の開発も Amadeus DLC の Intent として `aidlc/spaces/default/` に記録する。

GitHub Issue を起点にし、Issue、Intent、PR、CI、レビューボット、merge 証拠を traceability と audit で追跡する。

現在の active Intent は `260704-v2-parity-completion`（親 Issue #396、状態は open）である。

先行 Intent `260703-amadeus-skill-english-rollout-plan`（親 Issue #399）は Status: Completed であり、Amadeus skill の `SKILL.md` 英語化は完了している。
