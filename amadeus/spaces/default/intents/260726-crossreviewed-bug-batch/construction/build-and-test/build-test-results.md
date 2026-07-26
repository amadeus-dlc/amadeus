# Build & Test Results

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

測定 ref: worktree-bugfix(origin/main の全6修正マージ済み = merge 68e3db211 以降)、実行 2026-07-26T10:55Z 頃、ログ = scratchpad/bt-full-gates.log(集計値は同ログ出力からの転記)。

## ゲート実測(fresh 実行、1連鎖の exit を最終行で機械確認)

| ゲート | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint` | PASS |
| `bun run dist:check` | PASS |
| `bun run promote:self:check` | PASS |
| `bash tests/run-tests.sh --ci` | **RESULT: PASS** — Test files **563** / Failed files **0** / Failed assertions **0** |
| 連鎖全体 | ALL-GATES-EXIT=**0** |

## CI(着地面)

全6 PR(#1507 / #1516 / #1517 / #1518 / #1523 / #1524)は着地時点で必須チェック全 green(フレーク赤は rerun で解消、帰属は assertion 実文で確定 — #1525 参照)。

## 検証済みの面と未検証の面(verdict の書き分け)

- **検証済み**: 6修正の regression 閉包(赤→緑固定)、配布同期(dist 6+self-install 4)、フルスイート、型・lint、検証劇場解消(#1457 は独立3ソース配線を reviewer が直読確認)。
- **既知の残リスク(本バッチ外)**: `t-plugin-stage-discovery-performance` の 20% 相対閾値はランナージッタで偽赤が出る(#1525 起票済み、実測 0.218〜0.363)。本バッチの修正自体の欠陥ではなくゲート側の問題。
- **依存監査**: 本バッチは依存変更ゼロ(別判定、実施せず — security-test-instructions.md 参照)。
