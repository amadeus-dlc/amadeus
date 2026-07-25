# Scalability Requirements: harness-contract-and-regression

## Inputs and Growth Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。scale dimensionはcompiled harness数、semantic scenario数、session数、generated artifact数である。

## Capacity Targets

| ID | Dimension | Required capacity | Behavior |
|---|---:|---:|---|
| U3-SCALE-01 | current harnesses | manifest全件（現在6） | 各harness exactly 1 projection/fixture |
| U3-SCALE-02 | concurrent sessions | 32 | reservation、target UUID、HUMAN_TURNをsession間で混同しない |
| U3-SCALE-03 | policy scenarios | phase boundary + walking skeleton全stance + per-unit | table-driven全行を全harnessへ適用 |
| U3-SCALE-04 | future harness追加 | manifestに1件追加 | generator/test enumerationへ自動反映し、手書きcount更新不要 |

## Scaling Strategy

compiled manifestをharness集合の単一正本とし、固定6分岐をcore logicへ埋め込まない。semantic fixturesは共通expected modelを持ち、harness adapterの入力/出力変換だけをparameterizeする。

32-session testはstable identityを提供する各host adapterでhost session IDとowner UUIDのdistinct fixtureを使用し、session markerのpath normalization、armed/minted/consumed状態、別session非干渉を検証する。identity欠落adapterは共有keyへ縮退せず全fixtureがfail-closedになることを別行で検証する。

## Limits

新しいdistributed coordinationやremote session storeは導入しない。harness数・session数がtargetを超えた場合もcorrectnessを緩めず、実測後に別intentで最適化する。

## Traceability and Ownership

| Target | Upstream | Harness rules | Blocking suite |
|---|---|---|---|
| U3-SCALE-01,04 | FR-24–25, NFR-08 | HR-01–04b | manifest/generator suite |
| U3-SCALE-02 | FR-18, NFR-02–04 | HR-08, HR-21 | multi-session hook integration |
| U3-SCALE-03 | FR-20–23, NFR-07 | HR-10–14, HR-20 | policy matrix suite |
