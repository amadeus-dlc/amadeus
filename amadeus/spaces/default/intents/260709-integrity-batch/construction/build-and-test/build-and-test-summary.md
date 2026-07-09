# Build & Test Summary — integrity-batch

## 結論

4/4 Bolt(#708 P1 / #707 P2 / #705 P2 / #706 P3)がレビュー READY・CI 全 green で main へスカッシュマージされ、統合後ツリーのフルスイートも **PASS**(build-test-results.md に実測値)。リグレッションなし。

## 各修正のテスト固定

- **#708**: `t203-mint-presence-classify.test.ts`(7ケース)— 機械注入は mint しない/それ以外は fail-open で mint/prompt 非漏洩。赤先行実証済み(修正前 dist で Expected 0 / Received 1)
- **#707**: `t203-codekb-rescan.test.ts`(11ケース)— per-intent re-scan パスの相互非破壊(FR-2.4)、CLI in-process+spawn 両経路
- **#705**: calibration がランナー管理下に入り substrate ゲートで正しく SKIP(発見自体が修正の証跡: 修正前は探索対象外)
- **#706**: 参照解決は grep 全数確認+ dist/promote ドリフトガードで固定(ドキュメント修正のため専用テストなし)

## 特記事項

- codecov/patch ゲート(#687/#710 で導入)が #715 の新規 CLI 行のテスト不足を正しく検出 → bun --coverage が spawn サブプロセスを計測しない制約を実測で特定し、in-process test seam で解決
- 上流 consumes(code-generation-plan.md / code-summary.md)との整合: 計画どおり4 Bolt 並列+マージランブック直列化で完遂
