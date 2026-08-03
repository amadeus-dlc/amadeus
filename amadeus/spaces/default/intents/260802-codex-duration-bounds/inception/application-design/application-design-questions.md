# Application Design Questions — Codex Duration Bounds

<!-- E-OC1 判定証跡:
判定: 全3問はユーザー判断を要する設計選択。
leader 承認: 2026-08-02T03:55:37Z
[Answer] 記入はユーザー回答受領後にのみ行う。 -->

**Mode:** Guide me

## Upstream Context

`requirements`、`architecture`、`component-inventory`、`team-practices` を入力とする。package対象は Claude、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCode、Kimi の7面であり、共有core契約と各native adapterのcapabilityを分離する。

## Q1. 実行・budget状態のdurable正本

atomic reserve、attempt、termination、active slotを、再開・compact・process restartを越えてどの形で正本化しますか？

A. 既存のper-intent audit lock内でreserve eventをaudit-firstに確定し、state/runtime graph/OTelは同じeventを読む再構築可能projectionとする。高速化用checkpointを置く場合も正本にはしない（推奨）
B. `amadeus-state.md` のmarkdown fieldだけを正本とし、auditは事後通知にする
C. 新しいmutable JSON ledgerだけを正本とし、auditとは独立に更新する
D. session内memoryだけで数え、resume時にcounterを初期化する
X. Other (please specify)

[Answer]: A. 既存のper-intent audit lock内でreserve eventをaudit-firstに確定し、state/runtime graph/OTelは同じeventを読む再構築可能projectionとする。高速化用checkpointを置く場合も正本にはしない。回答受領: 2026-08-02T03:52:24Z

## Q2. 共有moduleの抽出順

1 Issue = 1 Bolt = 1 PRを守りながら、単一用途の先行抽象と後段の重複実装をどう避けますか？

A. #1602で実利用する`Execution Contract`だけを狭いcore APIとして着地し、#1998で最初の実利用と同時に`Convergence Policy`を抽出する。#1999は同じbudget APIを拡張し、#1919は同じreserve契約上へ`Bounded Unit Pool`を追加する（推奨）
B. #1602で4 Issue分の全moduleと将来APIを先に実装する
C. 各Issueが独自helperを持ち、4件完了後にまとめて共通化する
D. 既存の巨大な`amadeus-lib.ts`へ全ロジックを追加し、新moduleは作らない
X. Other (please specify)

[Answer]: A. #1602で実利用する`Execution Contract`だけを狭いcore APIとして着地し、#1998で最初の実利用と同時に`Convergence Policy`を抽出する。#1999は同じbudget APIを拡張し、#1919は同じreserve契約上へ`Bounded Unit Pool`を追加する。回答受領: 2026-08-02T03:53:24Z

## Q3. upgrade前recordの継続規則

operation/attempt/counter fieldを持たない既存Intentを、更新後のharnessでresumeしたときどう扱いますか？

A. 過去値を推測せず`legacy`／`unavailable`として明示し、最初の更新後execution boundaryで新しいroot operationをmintする。以後は新契約で継続し、既存workflow stateは保持する（推奨）
B. 過去auditの時刻・行数からoperation、attempt、counterを推定して埋め戻す
C. 新fieldのないrecordはresumeを拒否し、IntentのRedoを要求する
D. 既存recordには新契約を適用せず、Intent完了まで旧挙動を続ける
X. Other (please specify)

[Answer]: A. 過去値を推測せず`legacy`／`unavailable`として明示し、最初の更新後execution boundaryで新しいroot operationをmintする。以後は新契約で継続し、既存workflow stateは保持する。回答受領: 2026-08-02T03:55:06Z

## Consolidated Confirmation

Q1〜Q3の統合結果に矛盾がなく、この判断を用いて設計成果物を生成してよいですか？

A. Confirm — この判断で設計成果物を生成する（推奨）
B. Revise — 回答を修正する
X. Other (please specify)

[Answer]: A. Confirm — この判断で設計成果物を生成する。回答受領: 2026-08-02T03:55:37Z
