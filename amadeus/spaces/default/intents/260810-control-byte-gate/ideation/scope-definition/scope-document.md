# Scope Document — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): intent-statement.md(問題定義・確定済み裁定 (a)〜(f)・設計段送付事項を本書の境界導出に使用。feasibility-assessment / constraint-register は self-feature スコープで feasibility ステージ SKIP のため不在 — 設計上の期待どおり)

## In Scope(イン境界)

1. **決定的検出検査**: tracked ソース(対象ディレクトリ集合を成果物で明示宣言)への NUL を含む制御バイト混入を検出する検査。生バイトのみ検出(エスケープ表記リテラルは対象外)
2. **検査述語の canonical 再利用**: `amadeus-migrate.ts:477` の `isUtf8`(`buffer.includes(0)`)から導出 — 新規述語を発明しない
3. **CI blocking 配線**: 既存 CI(ci.yml "Lint and complexity" ジョブの走査系ゲート群と同格)への blocking 追加
4. **`docs/` 対象化時の起動条件整備**: `scripts/detect-ci-changes.sh` の分岐追加(docs-only PR での空文化封鎖 — 起動指示 (c))
5. **allowlist**: 正当バイナリ `assets/AI-DLC-Workflows-2.0-Specification.pdf` 1件(現時点で必須 — 起動指示 (e))
6. **落ちる実証**: 注入→赤実測→復元→残渣ゼロ確認の不可分1セット
7. **偽陽性ゼロ sweep**: 既存 tracked コーパス全数への適用実測
8. **診断メッセージ**: 該当ファイル・オフセットの名指し

## Out of Scope(アウト境界 — Issue 代替案却下と一致)

- ノルム追記のみの対応(レビューで構造的に見えないことが機序 — Issue 却下済み)
- .gitattributes / git binary 検査への委譲(不可視化を強める方向 — Issue 却下済み)
- 点在防御(migrate 検証・表示層 strip)の改修 — 既存のまま維持
- ローカルビルド出力・リリース成果物側の検査(tracked 面が正本 1 ファイルに閉じる — レビュー訂正 (b))
- 既存 `t55-test-suite-drift` の NUL skip 穴の改修(同根だが別 Issue 相当 — 本ゲートが上流で遮断)

## 要件・設計段への送付事項(境界内の未決)

- 実装形態(sensor / test / CI script)の選定
- 対象ディレクトリ集合の最終確定 — Issue 宣言 5 dirs(core/harness/scripts/tests/docs)を基線に、`tests/` fixture 自己衝突の解消方式、`amadeus/` の扱い(タイトル齟齬 — reviewer-1 訂正提案 6)、先例 `cid:feasibility:c2-2` からの意図的拡張の根拠明示(reviewer-2)
- バイト検査の実装は grep 系を使わない(ugrep ラッパの無音脱落 — 両レビュアー手法メモ)

## シーケンシング(operational 裁定の反映)

- 依存: 線形連鎖(述語 → スクリプト+allowlist+メッセージ → CI 配線 → docs 分岐 → 落ちる実証)【Q1: A】
- 方針: walking-skeleton 先行 — 最小 end-to-end スライスを Bolt 1 とし、self-feature の walking-skeleton gate を維持【Q2: A】
- 期限: なし(P2)【Q3: A】

## 規模の正当化

単一機能・単一 intent。推定変更面: 新規ゲートスクリプト 1 本(~150-250行)+ CI 配線(~10-20行)+ detect-ci-changes 分岐(~5-10行)+ テスト/落ちる実証。既存インフラ再利用: ci.yml の走査系ゲート群のジョブ・`tests/run-tests.sh` ランナー・`isUtf8` 述語。新規機構の導入は検出ゲート本体のみで、既存で代替不能(全域走査ゲートが 0 件であることは両レビュアー実測済み)。
