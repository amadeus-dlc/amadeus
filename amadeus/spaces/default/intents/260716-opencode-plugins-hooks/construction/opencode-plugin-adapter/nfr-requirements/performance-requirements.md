# Performance Requirements — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー2・決定木)、`../functional-design/business-rules.md`(R-1)、`../../../inception/requirements-analysis/requirements.md`(AC-2c)、codekb `technology-stack.md`(Bun 実行環境)。2026-07-17。

## 性能契約(構造充足 — 数値 SLO なし)

**数値 SLO は設けない(根拠付き N/A)**: plugin は advisory な単発イベントハンドラで、利用者向け service/SLI が存在しない(services.md「新規サービスなし」)。実行時間の上限装置(timeout)も service SLO ではない(observability-setup:c3)。実在する対照実装(cursor defaultSpawn — amadeus-cursor-lib.ts:214-222)にも timeout・数値目標の named constant は存在せず、要件段で数値帯を発明することは constants-from-code 違反となるため行わない。

## 成立する性能上の契約(すべて構造的)

| 契約 | 内容 | 検証面 |
|---|---|---|
| P-1 | plugin は opencode の動作をブロックしない(R-1)— イベント処理の失敗・遅延が opencode の機能を止めない(advisory) | C4 テスト+レビュー |
| P-2 | spawn は 1 CoreCall = 1 subprocess の単発実行(business-logic-model ワークフロー2)— 常駐・ポーリング・キューイングを持たず、イベント無発生時のリソース消費ゼロ | 設計構造(コードレビュー) |
| P-3 | reconstruct は純関数(I/O なし)— 性能特性はペイロードサイズ線形の写像のみで、ホットパスに FS/network を置かない | C4 純関数テスト |

## ベンチマーク

不要(N/A)— 数値目標が存在しないため。将来 opencode 側のフック実行に時間予算が文書化された場合は、その実測値を根拠に本成果物を更新する(measurement-ref 付き)。
