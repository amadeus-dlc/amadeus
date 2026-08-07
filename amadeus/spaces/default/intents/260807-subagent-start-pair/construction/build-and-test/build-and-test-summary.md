# Build and Test Summary — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（両 unit の実装ステップ正本）、code-summary（両 unit の実測転記元）

## Verdict: READY（無条件）

両 unit（fix-2297-wiring / fix-2303-dispatch-tool）とも、TDD Red→Green・落ちる実証・§12a READY（iteration 1, findings 0）・PR CI 全 green・スカッシュマージ着地・main CI green まで完結した。未検証面（live セッションでの自然発生観測）は FR/AC の外にあり、build-test-results.md の申し送り節に記載（cid:build-and-test:c2-unconditional-ready-boundary — AC 外認定は requirements 実文照合済み: FR-C1 はフック spawn 経路の決定的実証を要求し、これは充足済み）。

## 実行サマリ

| 面 | 結果 |
|---|---|
| ビルド（8ハーネス再生成 + source-only 境界） | 全 exit 0 |
| unit 層（t-subagent-purpose） | 14 pass / 0 fail |
| integration 層（t483 / hook-dispatcher / t-log-subagent-start / t454） | 44 pass / 0 fail |
| conductor 二重確認（5ファイル再実行） | 58 pass / 0 fail |
| PR CI（#2427 / #2428） | ブロッキング集合全 pass |
| main CI（マージ後 5548708ff） | success |
| Issue 閉包 | #2297 / #2303 とも着地面実測付きでクローズ |

## 戦略適合（Comprehensive の比例選定）

中核は unit + integration。performance / security は対応 NFR 不在のため専用試験を新設せず、適用外根拠と既存担保面を各 instructions に明記（cid:build-and-test:c4 / bt-proportional-selection）。フルスイートの正規判定は PR CI（cid:build-and-test:bt-20260730-1 — bolt worktree でのフル再実行は CI 証跡と重複するため行わない）。

## 特記事項

- t224 フレーク1回（#2397 既知の回転フレーク）— rerun green で閉包、証跡は build-test-results.md
- CodeRabbit Minor 1件（unanchored waiver）を収束ループ内で是正（c1f838b8b、落ちる実証付き）
- plugin-compose の SessionStart 欠落（同クラス drift）は #2426 として分離済み（t483 waiver で明示管理）
- 12-state-machine.ja.md の SUBAGENT_STARTED 行不在（既存対訳欠落）は別スコープ — Issue 起票候補
