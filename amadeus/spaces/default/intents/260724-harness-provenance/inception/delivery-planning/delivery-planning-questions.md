# Delivery Planning Questions — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, mockups.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 前提整理

requirements.md の FR-1〜FR-4 と stories.md の利用シナリオは、ハーネス種別の検出から `amadeus-state.md` への記録までを一つの利用者価値としている。mockups.md も同じ範囲を CLI 出力契約として定義し、components.md は Harness Detector と Harness Recorder の連携で実現する設計としている。

初回のunit-of-work.md はこれを U1(Harness Detector)と U2(Harness Recorder)へ分割し、初回unit-of-work-dependency.md は `U1 → U2` の直列 DAG、初回unit-of-work-story-map.md は両ユニットを合わせて一つの利用シナリオを充足するとしていた。team-practices.md は正本変更後の dist 再生成・セルフ昇格・検証を要求する。

一方、org.md は `feature` スコープの最初の Bolt を end-to-end walking skeleton とする。team.md は複数ユニットを単一 Bolt/PR に束ねない。このままでは、U1 単独は state 記録まで到達せず walking skeleton にならず、U1+U2 の単一 Bolt は複数ユニットを束ねることになる。

## Q1. Walking Skeleton とユニット境界の矛盾をどう解消するか?

[Answer]: A — Units Generation に戻り、U1 と U2 を一つの deployable Unit に統合する。その後、単一の walking-skeleton Bolt として Delivery Planning を再実行する（2026-07-24T17:07:06Z、Mode: Guide me）

- A. Units Generation に戻り、U1 と U2 を一つの deployable Unit に統合する。その後、単一の walking-skeleton Bolt として Delivery Planning を再実行する（推奨）
- B. 現在の U1 と U2 を一つの Bolt に束ねる。最短だが、複数ユニットを単一 Bolt/PR に束ねない team.md の規則と矛盾する
- C. U1 と U2 を別々の Bolt にする。ユニット境界は維持できるが、Bolt 1 が end-to-end の state 記録を実証できず org.md の walking-skeleton 契約と矛盾する
- D. 本件を既存コードへの incremental feature と解釈して walking-skeleton ceremony を省略する。実態には合うが、org.md が `feature` を明示的に対象としているため規則変更または例外承認が必要
- X. Other (please specify)

## 回答反映

Q1 の回答に従って Units Generation へ後方ジャンプし、unit-of-work.md・unit-of-work-dependency.md・unit-of-work-story-map.md を canonical unit `harness-provenance` 一つへ是正した。是正版は architecture reviewer iteration 2 で READY、単一ノードDAGのセンサーも PASS している。

ユーザー承認: 2026-07-24T17:07:06Z（Q1回答のConfirm）

その後のApplication Design再承認では、既存`harnessDir(): string`が実検出`.claude`とfallback `.claude`を区別できない問題を解消するprovenance付きresolver、canonical mapping、AC-3dの全6配布形態検証が確定した。再実行したUnits Generationはこれらを同じcanonical unitへ反映し、architecture reviewer iteration 2でREADYとなった。単一Unitのため、残る計画値は上流から一意に導出できる。

- **Sequencing heuristic**: org.md の `feature` 規則に従う walking-skeleton-first。Bolt は一つだけなので value-first / risk-first 間の順序比較は発生しない
- **WSJF**: 対象Boltが一つだけのため不使用。順位を変えないスコアリングは追加価値がない
- **Bolt granularity**: 1 Unit = 1 Bolt
- **Parallelism**: Boltが一つだけのため逐次
- **External dependencies**: 外部API・データ・外部チーム引継ぎなし
- **Ownership**: team-formation は solo developer と判定済み。実装ownerは `amadeus-developer-agent`

requirements.md の FR-1〜FR-4、stories.md の単一利用シナリオ、mockups.md のCLI出力契約、components.md のDetector/Recorder連携を同じBoltで満たす。team-practices.md の正本→dist/self-install再生成と検証をDefinition of Doneへ含める。
