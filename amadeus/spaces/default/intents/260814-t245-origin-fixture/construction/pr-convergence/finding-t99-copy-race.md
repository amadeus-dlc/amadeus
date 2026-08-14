## 背景・対象範囲

`tests/harness/fixtures.ts` の `copyTreeWithRetry`(:640-645 付近)が `dist/claude/.claude` のコピー中に src 側ファイル数が変動すると count mismatch で失敗し、`tests/integration/t99-learnings-gate-flow.test.ts` がフルスイート実行時に transient に赤くなる。

## 根拠・実測証拠

測定 ref: origin なしクリーンクローン(内容 = branch `fix-2971-t245-origin` head `e1157716b` 相当)。

- フルスイート(`bash tests/run-tests.sh --ci`)run 2 で: `copyTreeWithRetry: cpSync returned but the file count does not match — src: .../dist/claude/.claude (562 file(s)) / dest: ... (563 file(s))`(t99 Case 5、リトライ 3 回とも count mismatch)
- 同ファイル単独再実行: **17 pass / 0 fail**(flake)
- 同一スイートの run 1(別ツリー)では t99 は緑 — 失敗集合が run 間で交差しない
- dest > src はコピー後に src 側からファイルが消えたことを示す — スイート中の並行プロセスが dist を再生成している疑い(promote-self / packager 系)

## 期待結果・完了条件

フルスイート中の t99 が transient count mismatch で赤くならない(コピー元の不変スナップショット化、dist 再生成テストとの直列化、または count 照合の安定化 — 方式はトリアージ事項)。

## 影響・価値

ローカルフルスイートの信頼性を確率的に損なう(本 intent の FR-8 検証で実測)。

## 関連

- 発見 intent: 260814-t245-origin-fixture / PR #3001 の code-summary.md に記録
- 初期分類: bug / P3 / S4-MINOR(flake、単独再実行で回復)
