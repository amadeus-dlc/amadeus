# ビルド・テスト総括(build-and-test-summary)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 全16 unit 分の code-generation 成果物(plan+summary)から検査対象・戦略適用範囲を導出した(詳細参照は各 instructions ファイル)。

## ビルド状況

**build-ready**。Bun-only、依存追加ゼロ(vendored OTel API のみ)。生成物同期(dist 7ハーネス+self-install)は正本からの再生成で常時一致(build-test-results.md 実測 exit 0)。

## テスト種別インベントリ(Comprehensive 戦略)

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | ✅ unit-test-instructions.md | 全 unit の変更面 |
| integration | ✅ integration-test-instructions.md | 削除ゲート・Relay・subprocess span 境界 |
| performance | ✅ performance-test-instructions.md | NFR(lifecycle 予算)へ trace(bt-proportional-selection — 負荷試験の機械追加はしない) |
| security | ✅ security-test-instructions.md | NFR(redaction 二層・provenance・fail-closed)へ trace |
| E2E | run-tests.sh --ci に包含(t341 等既存 E2E 層) | 新規 E2E 追加は要件根拠なしのため見送り(根拠付き明記) |

## unit 別カバレッジ期待

blocking gate 集合(project 相対 ratchet / patch 未カバー0 / complexity / drift)が全 unit へ一律適用。writer-deletion Bolt の patch は 181/181 covered を実測済み。

## Readiness 評価

- **build-ready**: ✅(4検証 exit 0)
- **test-ready**: ✅(714ファイル / 9,772 assertions / 0 fail、削除ゲート GREEN)
- **deployment-ready**: ✅(本プロジェクトの「デプロイ」= npm 配布は release.yml 手動 dispatch の人間承認境界。PR/CI 面はすべて green)

## 既知の限界・残課題(Issue 化済み)

- #1830 経路B(XEON 機種の median 予算)— 契約値変更は別 intent
- #1841(v1 書込3経路の canonical 化)/ #1845(VALID_EVENT_TYPES の dead-data 化)/ #1819(v1 reader 退役)
- formal-model-check: 本 intent は並行プロトコル spec(TLA+)を変更していないため発火条件外(two-layer-verification-posture)。engine advisory は非ブロッキングとして記録
