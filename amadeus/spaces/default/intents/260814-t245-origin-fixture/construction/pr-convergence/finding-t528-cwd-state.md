## 背景・対象範囲

`tests/integration/t528-report-ack-kind.integration.test.ts` の 1 ケース(`a failed result remains a typed error directive`)が、`handleReport` を project dir 未指定(cwd 解決)で呼ぶため、実 workspace の live workflow 状態(active-intent cursor + 進行中 Bolt)を読み、ライブ workflow 中のローカルフルスイートで偽赤になる。

## 根拠・実測証拠

測定 ref: branch `fix-2971-t245-origin` head `e1157716b`(intent 260814-t245-origin-fixture の Bolt worktree)。

- ライブ workflow 中(active-intent cursor あり、Current Stage=code-generation、BOLT_STARTED)の本ツリー: `bun test tests/integration/t528-report-ack-kind.integration.test.ts` → **5 pass / 1 fail**。期待 `Unknown --result "failed"` に対し実際は `report --result failed requires --failure <detail>`(t528:128 の expect)
- 同一内容のツリー(`git clone` 後 remote remove、gitignored cursor なし): 同コマンド → **6 pass / 0 fail**
- 失敗ケースは `handleReport(["--stage","code-generation","--result","failed"], undefined)` で fresh project を seed せず(t528:123-124)、cwd の実 record へ到達する

## 期待結果・完了条件

当該ケースが実 workspace の状態に依存せず、live workflow 中のローカル実行でも決定的に緑になる(fresh project の seed、または cwd 非依存の project dir 注入)。`cid:code-generation:c2-env-isolation-seam-inventory` の env 隔離シーム点検と同族。

## 影響・価値

ライブ workflow 中のローカルフルスイートが恒常的に偽赤になり、帰属切り分けコストが毎回発生する(本 intent で実測)。

## 関連

- 発見 intent: 260814-t245-origin-fixture(Issue #2971 の修正中)/ PR #3001 の code-summary.md に帰属実測記録
- 初期分類: bug / P3 / S4-MINOR(CI には影響しない — cursor は gitignored でクリーン checkout に存在しない)
