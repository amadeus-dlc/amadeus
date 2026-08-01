# Build & Test Results — formal-verif-value-chain

上流入力(consumes 全数): requirements, code-generation(各 unit の code-summary), unit-of-work

測定 ref: conductor ブランチ `worktree-formal-verif-value-chain`(再接地3回目 = origin/main d9f68e13c 取込後の統合断面)。全 exit code はパイプなし個別捕捉。

## ゲート実測(統合断面)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | plugins/*/tools 含む |
| `bun run lint` | 0 | 同上 |
| `bun run dist:check` | 0 | 7 ハーネス+中立バンドル+model-map 複製同期 |
| `bun run promote:self:check` | 0 | self-install 面 |
| `bun tests/gen-coverage-registry.ts --check` | 0 | registry 鮮度 |
| `bash tests/run-tests.sh --ci` | 0 | **Test files 707 / Failed files 0 / assertions 9,612 / Failed 0 / RESULT: PASS** |
| `bun run coverage:ci` | 0 | RESULT: PASS(初回は並行負荷の wall-clock drift 4 件で赤 → 負荷収束後の単独再実行で green — fanout-load-settle-before-integration、rerun-red-reattribution 準拠でログ実文確認済み: 全て duration 分類の drift であり assertion 失敗 0) |
| `bun tests/coverage-patch-gate.ts --check` | 0 | **PASS — measured added lines 5,040 / covered 4,894 / allowlisted 146 / uncovered 0** |

## チェックポイント推移(全 green の3断面)

1. バッチ1(u1+u2, u5)マージ+再接地1(OTel journal v2)→ フルスイート PASS(t356 の base 版差も v2 parser 取込で解消)
2. バッチ2(u3, u4, u6)マージ+再接地2(#1873/#1876/#1877)→ フルスイート PASS
3. バッチ3/4(u7, u8)マージ+再接地3(#1910 metrics 配線)→ 上表(最終)

## 検証済み面 / 未検証面(verdict-names-unverified-facets)

- **検証済み**: 機構全面(FR-A/B/C/D 系の全テスト)、価値チェーン e2e(FR-E1/E2 — u8 実測、S4-1 修正後は実運用レイアウトで再証明)、TLC 完全探索(AsIntended 完走・AsImplemented 反例・vacuity)、drift 監視の実発火(注入→赤→revert)。
- **未検証(明示引き継ぎ)**: (1) S1-f の audit ステージイベント — 本ステージ直後の formal-model-check ステージ実行で閉包予定 (2) MirrorLifecycle の CI 恒常 TLC 実行 — #1920(ユーザー裁定による切り出し) (3) GitHub Actions 上の CI green — PR 発行時に converge-loop で確認。
