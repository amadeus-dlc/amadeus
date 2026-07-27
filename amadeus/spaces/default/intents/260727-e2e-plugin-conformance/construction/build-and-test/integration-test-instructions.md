# Integration Test Instructions

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md — FR 別リグレッションの integration/e2e 面を code-summary の対応表から導出。

## integration 層(実 FS、temp 隔離)

- `t339-plugin-doctor-standalone-render` — FR-2(#1585): 空ホスト stdout 非空+統合 doctor と同一文言(Red 0/3→Green 3/3 実測済み)
- `t340-plugin-drop-fs-restore` — FR-3(#1586): compose→drop のディレクトリ構造込み照合+rollback 経路(Red→Green 実測済み)
- `t-plugin-projection-packaging` — FR-1: canonical 集合等価+再導入検知ガード
- `t307` — FR-7: INSTALL.md 投影の裁定B期待値+per-harness トークン検査
- `t315` / `t328` — 種まき先ハーネスルート化のリグレッション

## e2e 層(出荷面 conformance)

- `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` — FR-4(#1589): (a)folder-drop(INSTALL.md 文言一致)→(b)SessionStart hook verbatim spawn compose→(c)stage-graph 実在(baseline 0 hit の非空振り確認)→(d)intent birth+`next --stage`(--single なし)directive emit→(e)doctor 対称報告→(f)byte+構造 baseline 復元。オフライン・env ゲートなし・実行 0.76秒
- CI: `plugin-conformance-e2e` ジョブ(ci.yml:146、PR blocking、ci-success へ接続)— FR-5
