# Delivery Planning 質問票 — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。`stories.md` / `mockups.md` は本 scope で SKIP 済み。

## Q1: Walking Skeletonとplugin 4独立Boltをどう調整するか

`team-practices.md` はpluginのgreenfield要素を「最初のConstruction Boltでend-to-end」に閉じる。一方、E-USSUG1 e3 GoA2留保は `stage-contract` / `plugin-projection` / `plugin-composition` / `reference-plugin-and-guides` を4つの独立検証可能Boltにする。DAG上も後三者は直列依存であり、単一の最初Boltへ束ねると留保を破る。

1. **5-Bolt progressive skeleton sequenceとして扱う（推奨）** — U01 `stage-contract` → U02 `runtime-recovery`（U10の必須前提）→ U09 `plugin-projection` → U10 `plugin-composition` → U11 `reference-plugin-and-guides` を初期gated sequenceとし、5番目でend-to-endを閉じる。plugin 4 Unitは各々独立Boltのままe3留保とDAGを守り、team-practicesの「最初のBolt」は限定的に「最初のBolt列」へ解釈する逸脱を明記する。
2. **最初にthin vertical Boltを追加する** — U01/U09/U10/U11の最小核をBolt 1へ束ね、その後4 Unitを各独立Boltで完全化する。最初のBoltでend-to-endを満たすが、Unitを複数Boltへ分割・重複させ、E-USSUG1の12 Unit=独立Construction境界を弱める。
3. **plugin 4 Unitを最初の1 Boltへ束ねる** — team-practicesは逐語的に満たすが、e3留保の独立4 Boltを破るため非推奨。

[Answer]: 1. 5-Bolt progressive skeleton sequence。E-USSDP1Rで2-1採用、GoA favor 3 / against 0、recorded/verified（裁定 2026-07-20T08:13:02Z）。e2 GoA2留保を必須条件化: この5-Bolt列をWalking Skeletonの限定例外と明記し、U01/U09/U10/U11の独立review/rollback/verification境界とU11 e2e closureを維持する。e3少数案X/GoA2も記録温存: 第1 BoltにU01+U02+U09+U10+U11の最小e2e sliceを置き、その後各Unitを完全化する案。記録: `amadeus/spaces/default/elections/E-USSDP1R/record.md`。

## Q2: Bolt経済順序・granularity・並行性

1. **Risk-first、12 one-Unit Bolts、最大4並行（推奨）** — 5-Bolt progressive skeleton sequenceを先行し、それ以外の独立root/capabilityはDAGが許す範囲で最大4並行。各UnitのPR/検証境界を保持し、WSJFは価値数値不在のため使わない。
2. **Risk-first、plugin 4独立+非pluginをbundle** — plugin留保は守り、残り8 Unitを変更面別に4前後のBoltへまとめる。PR数は減るが、E-USSUG1で選んだfine-grained Unitのreview/rollback境界がBolt内で結合する。
3. **12 one-Unit Boltsをstrict sequential** — 境界は保持するが、root 6の並行可能性と最大4 builder枠を使わず、feedbackが遅い。

[Answer]: 1. Risk-first、12 one-Unit Bolts、最大4並行、WSJFなし。E-USSDP2Rで2-1採用、GoA favor 3 / against 0、recorded/verified（裁定 2026-07-20T08:13:02Z）。e3少数案X/GoA2はrecordに温存する。記録: `amadeus/spaces/default/elections/E-USSDP2R/record.md`。

## 既決事項

- External dependencies: なし。外部API、data window、external-team approval、release/publishはいずれもscope外。
- Team allocation: team-formationはSKIP。全Boltの実行ownerは `amadeus-developer-agent`、architecture/quality reviewerを各gateで付与する。
- Branching: Bolt単位short-lived branch→PR→squash merge。mergeは人間承認後leaderのみ。
- Gate: progressive skeleton完了時と各Boltの通常Construction gate。plugin 4 Unitは各々独立verification evidenceを持つ。

## 無効選挙

旧 `E-USSDP1` / `E-USSDP2` は誤前提に基づくため無効であり、開票禁止のまま温存する。採用根拠として引用しない。
