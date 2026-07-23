# Performance Design — U2-mirror-skill

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## PD-U2-1: 単一診断入口(PR-U2-1)

SKILLのStep 1は`bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts status`の1コマンドだけを実行する。探索、再試行、独自の状態読取を追加せず、性能特性はU1ツールへ帰属させる。

## PD-U2-2: 単一正本の投影(PR-U2-2)

正本SKILL.mdをcoreDirs manifestから6ハーネスへ各1ファイル投影する。ハーネス別生成処理や追加変換段を作らず、既存package処理の固定コピーとして扱う。

## 検証

grepで実行入口が1つであることを確認し、`dist:check`と`promote:self:check`で6面のバイト一致を検証する。SKILL自体に時間閾値は設けない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:09:04Z
- **Iteration:** 1
- **Scope decision:** none

起動失敗と正常exit 1の識別、診断出力の解釈境界、英日docs同期検査が不足する。

### Findings

- MAJOR NFR-U2-I1-001: exit 1に加えて正常status出力構造を検証する。
- MINOR NFR-U2-I1-002: 解釈対象を検証済みfinding kindと列挙型detailに限定する。
- MINOR NFR-U2-I1-003: 英日docsのmirror節・verb・exit・human gate対応を検査する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:10:48Z
- **Iteration:** 2
- **Scope decision:** none

exit 1構造検証と英日docs検査は解消。security-requirementsの解釈主体文言が設計と不一致。

### Findings

- RESOLVED NFR-U2-I1-001: exit 1の構造検証を追加済み。
- MINOR NFR-U2-I2-001: SR-U2-2を検証済み列挙分類・自由文表示専用・人間の最終verb選択へ更新する。
- RESOLVED NFR-U2-I1-003: 英日docs同期検査を追加済み。
