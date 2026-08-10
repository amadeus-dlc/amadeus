# ビルド・テストサマリ — 260810-plugin-harness-dir-token

Test strategy: **Comprehensive** / Depth: **Minimal**

## 状態

| 項目 | 状態 | 根拠 |
|---|---|---|
| ビルド | ✅ 成功 | `typecheck` / `lint` / `build` すべて exit 0 |
| ユニットテスト | ✅ 緑 | `t146-core-hygiene` 4 テスト（FR-6 / FR-7 / FR-8） |
| 統合テスト | ✅ 緑 | `t2790` 4 テスト（FR-3）、`t416` 追加 1 件（FR-2）、`t-plugin-projection-packaging` 追加 1 件（FR-4） |
| 性能テスト | ⊘ 非該当 | 適用可能な性能 NFR が要件に存在しない（省略ではなく判定） |
| セキュリティテスト | ⊘ 非該当 | 適用可能なセキュリティ NFR が要件に存在しない（同上） |
| フルスイート | ✅ 933 ファイル PASS / 0 FAIL / exit 0 | `bun run test:ci` |
| CI（PR #2811） | ✅ 13 pass / 3 skip / 0 fail | GitHub Actions |
| 収束 | ✅ `converged: true` / `CLEAN` | plugin CLI `status`、センサー SENSOR_PASSED |

## テスト種別の棚卸し

生成した指示書は 5 件（`build` / `unit` / `integration` / `performance` / `security`）。
うち性能・セキュリティは **適用可能な NFR が無いことを明示的に判定して非作成**とした文書であり、
テスト自体は存在しない。数値目標の無いベンチマークを書くことは検証劇場にあたるため採らない。

## カバレッジ期待

本 intent の変更面は狭い（prose 1 行 + seeding 2 箇所 + ガード述語 + export 1 件）。
基準は数ではなく、**FR の受け入れ述語と 1:1 で対応するテストが存在すること**。
FR-1〜FR-8 のすべてがユニットまたは統合のいずれかで判定される（FR-9 は Issue 起票で外形的に充足）。

## レディネス

- **build-ready**: ✅
- **test-ready**: ✅
- **deployment-ready**: ✅ — PR #2811 は収束済み・CI 全緑。マージ判断は人間に属する
  （Guardrail「収束はマージではない」）

## 未解決・持ち越し

1. `transform()` と `seedBytesForHarness()` の乖離ガード不在 → [#2812](https://github.com/amadeus-dlc/amadeus/issues/2812)（P3）
2. 兄弟 11 行の root-relative 参照が consumer で解決しない疑い（DEDUCED）→ [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810)（P2）
3. formal-model-check の verdict 未記録 — 本 intent では `defer-with-risk` で延期（並行性・状態遷移・
   分散契約を含まない変更のため TLA+ が取り扱う失敗モードが無いという判断）
