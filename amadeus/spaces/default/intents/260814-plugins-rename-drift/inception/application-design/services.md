# Services / Runtime Flows — 260814-plugins-rename-drift

上流入力: `components.md`。本 intent にネットワークサービスは無い(CLI/フック構成)。ここでは 3 つのランタイムフローを定義する。オーケストレーションは既存機構(compose engine / sensor-fire hook)への相乗りのみで、新しい常駐プロセスは作らない。

## F1: compose フロー(C1/C5 の配送)

```
amadeus/config.json plugin.activation.names(github-pr-convergence, git-drift 追加)
 → SessionStart hook: amadeus-plugin compose --if-stale
 → validateSelectedSources(plugins/<name> 実在)→ materialize → inspectPlugin(seam 対象ステージのホスト実在検証)
 → applySeamContributions(code-generation / build-and-test の sensors seam へ git-drift 注入)
 → sensors コピー(.claude/sensors/amadeus-git-drift.md へ着地 — 名前空間なし直下、既存 pr-convergence 前例)
 → finishCompose: graph compile(sensors_applicable 焼き込み)→ runtime compile → runner 生成
```

失敗様式: seam 対象 slug 不在は inspect で loud。センサー id と manifest id の不一致は graph compile で loud(spike 弱点 3 — compose 後失敗の見え方を conformance テストで固定する)。

## F2: センサー発火フロー(C4/C5)

```
PostToolUse(Write|Edit) → amadeus-dispatch.ts sensor-fire
 → active stage 解決 → stage-graph.json の sensors_applicable に git-drift が載る(code-generation / build-and-test 中のみ)
 → amadeus-sensor.ts fire git-drift --stage <slug> --output-path <path>
   → C4: composition record → git-drift の settings 宣言 + config 3 層を解決(fail-closed)
   → spawn bun .claude/plugins/git-drift/tools/amadeus-sensor-git-drift.ts --settings-json <resolved>
     → C5: スロットル判定 → (期限切れなら)git fetch → behind 数 + 交差判定 → DriftReport
 → advisory: audit 記録のみ(ステージ完了ガードは severity=blocking のみ参照 — amadeus-state.ts:2001-2013)
```

- 警告文言: merge queue 運用に整合(「取り込み(mirror/rebase)または先着地の判断を検討」— 即 rebase を指示しない)。`amadeus-worktree.ts:143-165` のガード文言と語彙を揃える(再利用棚卸し: 比較は SHA 差分でなく behind 数+ファイル交差なので比較ロジックの共有はしない。逃がしは throttle 設定と advisory 性質そのものが担い、`--allow-stale` 相当のフラグは不要 — ADR-5)。
- レイテンシ: fetch は throttle 内 skip。skip 経路はカウンタ/タイミングシームで検証(NFR-1、実時間負荷試験なし)。

## F3: 改名の配送検証フロー(C1/C6)

```
git mv + name 変更 + 消費者同期(1 PR)
 → bun run build(全ハーネス dist 再生成、追跡ファイル不変)
 → compose 再実行 → scope-grid 照合(pr-convergence ステージが従前 4 スコープ行に載る — FR-REN-3 の実測)
 → 残存参照検査 2 述語(FR-REN-6)→ plugin-conformance-e2e / フルスイート / coverage / complexity
```

サービス通信・スケーリング特性: 該当なし(全て単発 CLI、spawn 境界は既存の process boundary パターン)。
