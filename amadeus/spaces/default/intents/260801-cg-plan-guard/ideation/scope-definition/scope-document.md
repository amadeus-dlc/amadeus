# Scope Document — 260801-cg-plan-guard

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md

- `intent-statement.md` の裁定済み骨子5点とスコープ境界を In/Out の導出元とし、`stakeholder-map.md` の利害調停(機動性 vs 厳格性 = 3部メッセージ+corpus sweep)を Must の検収条件へ反映した。

## In Scope(Must — 公開契約を完結させる最小集合)

1. **M1: directive 発行側ガード**(#1892 発動点 a)— invoke-swarm 可能な batch への per-unit 直列 directive 発行を検出・阻止(`tryEmitSwarm` / `firstUncoveredBatch` 近傍)。
2. **M2: approve 時実績突合ガード**(#1892 発動点 b)— stage approve 時に audit の SWARM イベント実績 vs bolt_dag を突合(engine 迂回の手動 fan-out も捕捉)。
3. **M3: 両方向判定** — 並列計画→直列実行(計画不履行)と直列計画→並列実行(依存違反)の両方を M1/M2 で発動。
4. **M4: bolt_dag null/stale の fail-closed** — 並行幅を持つ計画が存在するのに bolt_dag null なら loud エラー(`computeBoltDag` の無音 node omitted 経路の封鎖)。
5. **M5: 3部メッセージ契約** — 全ガードメッセージが「観測事実(数字)/重み(実測根拠)/公認の出口(ファイル名・コマンド名指し)」を持つことをテストで固定。
6. **M6: #1893 parser 是正** — `- id:` 形式の無音 null 化の解消(方向 = 受理拡張 / record 訂正+loud 拒否は requirements 段でクロスレビュー証拠により裁定)。
7. **M7: 落ちる実証+corpus sweep** — 両方向注入で赤・null 注入で loud・正当直列6件相当の corpus で緑。

## Out of Scope(Won't)

- 実行時申告 verb の新設(裁定2で禁止)。
- 過去 record への遡及検査・遡及変更(corpus は読み取り専用)。
- degrade スコープ(units-generation SKIP)へのガード適用(bolt_dag 不在が正常系)。
- conductor の並行度上限(≤4)の機械強制(ノルム側の運用規律のまま — ガードは形態一致のみ見る)。
- swarm driver 解決(AMADEUS_USE_SWARM)自体の変更。

## 検収の枠

- 相対 coverage ratchet / patch gate / complexity / dist drift は blocking 維持(team.md Testing Posture)。TDD 既定。
- 新設ガードは「落ちる実証」+corpus sweep の両側実測が完成条件(M7)。

## リスクと順序戦略

- 最大リスクは**誤発動**(正当直列への偽陽性)— corpus sweep(M7)を実装と同一 Bolt に置き、ガード有効化前に緑を確認する順序とする(walking-skeleton Bolt の中核)。
- #1893 は M4/M6 と同一患部(computeBoltDag/parse)— クロスレビュー成立が編入前提。REFRAME の場合は M6 を再裁定し M4 は独立に成立させる。
