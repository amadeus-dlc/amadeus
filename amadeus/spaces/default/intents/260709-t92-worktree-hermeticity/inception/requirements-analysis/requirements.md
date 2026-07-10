# Requirements — t92-worktree-hermeticity

## Intent 分析

対象: GitHub Issue #709(bug/P2、クロスレビュー2名 CONFIRMED — codex-3: 未 install worktree での再現+install 後 pass、codex-2: bunx fallback 起因の exit-1/2 非対称の実測)。単独 intent の例外根拠(選挙 A8=A、5:0): 束ね相手不在(他バグ全件実装中)+ bug-zero ゴール + 空き容量。

根本原因(RE で file:line 固定済み): `tests/integration/t92.test.ts` test 44(:1160-1189)は `:1180` で **リポジトリ root の node_modules への symlink** を fixture に張り、pinned tsc(typescript ^6)の exit 2 を厳密にピンする。未 `bun install` の worktree ではリンク先が欠落し、センサーの `resolveTscLauncher`(amadeus-sensor-type-check.ts:182-201)が `bunx tsc`(:200)へフォールバック → 別バージョン TS が exit 1 を返し、ステータスゲート素通し(:368)により `Note=script-error: exit-1` となって期待 `exit-2` と不一致 → 偽赤。

## NFR / 制約

- 本番センサー(`amadeus-sensor-type-check.ts`)は変更しない — exit code 素通しと launcher 解決は #657/#679 で確定した設計であり、テスト環境都合で本番を触らない(construction ガードレール)。
- テスト専用分岐を本番コードに置かない。修正は t92 テストファイル内に閉じる。
- CI(bun install 実行後)での test 44 の実行力・検出力を弱めない — exit-2 の厳密ピンは #657 リグレッションの検出器であり、install 済み環境では従来どおり実行・検証されること。

## 前提

- 修正境界は test 44 単独(RE 実測: test 45/12/16 は exit code 非依存、t202 は自前 fixture で堅牢)。
- 「未 install worktree」は並列実装ワークフロー(worktree ファンアウト)で日常的に発生する正当な実行環境である(packaging-repair-batch の両ビルダーが独立に遭遇)。

## FR-709: t92 test 44 の worktree ヘルメチシティ(P2)

**修正方式(選挙 Q1=A、4票確定)**: skip-with-reason ガード — test 44 に in-file の実行前提検査(リポジトリ root の `node_modules/.bin/tsc` が解決可能か)を付け、解決不能な環境では理由付き skip、install 済み環境では従来の exit-2 厳密ピンを実行する。

**要件**:
- FR-709-1: 未 install(`node_modules/.bin/tsc` が解決不能)の worktree で `bun test tests/integration/t92.test.ts` を実行しても、test 44 起因の偽赤が発生しないこと。
- FR-709-2: install 済み環境では test 44 は従来どおり実行され、pinned tsc の exit-2 分類を厳密に検証すること(検出力の無退行)。スキップ方式を採る場合、スキップは理由文字列付きで可視化され、install 済み環境で誤ってスキップされないこと。
- FR-709-3: リグレッションテスト(落ちる実証): (a) 未 install 相当の条件で修正前の test 44 が赤くなることの実測記録、修正後に偽赤が消えることの実測。(b) install 済み環境で test 44 が実行され緑であることの実測(スキップされていないことを含む)。
- FR-709-4: 既存スイート(`bash tests/run-tests.sh --ci`)・typecheck・lint はグリーン維持。

**受け入れ基準**: 未 install の detached worktree(クロスレビューの再現手順)で t92 全体が exit 0(test 44 は方式に応じて skip-with-reason または緑)。install 済み環境で t92 全体が exit 0 かつ test 44 が実行済み。

## スコープ外(明示)

- 本番センサーの exit code 正規化・launcher 解決の変更(設計確定済み、#657/#679)。
- 他テストの hermeticity 改修(RE 実測で test 44 以外に同種前提なし)。
- sdk-drive calibration(#705)ほか他 Issue。
