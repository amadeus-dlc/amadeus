# Bolt Plan — autonomy-reachability(#2378)

上流入力(consumes 全数): unit-of-work.md(6 Unit の境界・規模)、unit-of-work-dependency.md(DAG・交差目録)、unit-of-work-story-map.md(物語被覆)、requirements.md(FR-5e)、components.md(Bolt 1 の skeleton 内容は C2/C3 の責務変更を束ねたもの — C 番号の語彙源)、scope-document.md(In/Out)。

D1 裁定(`skeleton-u1-then-3batches`)による編成。1 Unit = 1 Bolt = 1 PR(D2 執行)。

## Bolt 列

| Bolt | Unit | バッチ | ゲート | ブランチ(worktree) | 概算規模 |
|---|---|---|---|---|---|
| 1 | u1-autonomy-core | 単独(walking skeleton) | **人間**(semi は skeleton を自動裁定しない) | bolt-u1-autonomy-core | 250〜400行 |
| 2 | u2-birth-declaration | batch 2 | batch 末尾 gate(gated 投影) | bolt-u2-birth-declaration | 200〜350行 |
| 3 | u3-question-route-observability | batch 2(u2 と並行 — ファイル非交差実測済み) | 同上 | bolt-u3-question-route | 100〜200行 |
| 4 | u4-conduit-parity | batch 3 | batch 末尾 gate | bolt-u4-conduit-parity | 400〜650行 |
| 5 | u6-plugin-docs-drift | batch 3(u4 と並行 — 非交差) | 同上 | bolt-u6-plugin-docs | 20〜40行 |
| 6 | u5-measurement-report | batch 4(最終) | batch 末尾 gate | bolt-u5-measurement | 150〜250行 |

## Bolt 1(walking skeleton)の内容

u1 は本 intent の最大リスク(engine の認可・state・audit の中枢再配置)を end-to-end で通す最小スライス: canonical 書込(FR-2c)→ refusal イベント(FR-2a)→ preview 列挙(FR-2b)→ 6読み手テスト(FR-2d)。出荷確認後にラダープロンプト(残り Bolt の実行様式)を発火する(org.md Walking Skeleton)。

## Bolt 内実装順序(リスク制御 — cid:delivery-planning:intra-bolt-order-as-risk-control)

- Bolt 1: TDD で FR-2c(canonical 化)を先頭に置く — state 非対称の是正が他 FR の受け入れ基準の前提であり、順序逆転は偽グリーンの窓を作る
- Bolt 2: t450×2 の契約改訂(Red)→ 実装(Green)の順(FR-1c の対角実測を含む)
- Bolt 4: stage-protocol semi 手順 → 8面 → help/README/docs → パリティテスト落ちる実証、の順(先にテストを書くと全面赤で診断性が落ちるため、面の追記と同時に Red→Green を1面ずつ回す)

## マージ・配布

- 各 Bolt はスカッシュマージで main へ(org.md)。PR 発行時に j5ik2o-gh-pr-converge-loop を実行(team.md pr-converge-loop-required)
- core/harness 正本に触れる Bolt(1〜5)は `bun run build` 再生成+隔離2回ビルド再現性・source-only・グラフ不変量検査を PR 前に通す(NFR-5)
