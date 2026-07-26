# Build and Test Summary — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 実行サマリ(2026-07-26 実測)

| 検証 | 結果 | 根拠 |
|---|---|---|
| typecheck / lint / complexity | PASS | exit 0(lint は baseline 警告のみ — 自変更由来の新規警告は checkAgainstDisk 抽出で解消済み) |
| t298(unit 27+integration 18) | PASS 45/45 | 落ちる実証: 壊れJSON・空dir・不在dir・dangling symlink・tampered check・over-ceiling・強調両側+注入2種(赤→復元緑) |
| 既存 metrics 系(t221/t230/t231) | PASS 68/68 | R-1 export 追加の無退行 |
| dist:check / promote:self:check | PASS | core 非接触の同期不変 |
| ローカルフルスイート(tests/run-tests.sh --ci) | **RESULT: PASS exit 0**(561ファイル) | 初回赤2種は (a) ci.yml ベースライン(自変更由来 → fixture 更新 c30d8cd22 で閉包) (b) wall-clock drift 2ファイル(既存・非交差・並行負荷起因 — 単独再実測 34.3s/24.2s、再実行で PASS) |
| PR #1500 CI(GitHub) | **CI Success pass / CLEAN** | Coverage Report(base/head)含む全ジョブ green |
| lcov patch | PASS | 新規行 DA:0 なし(in-process seam) |

## verdict: 条件付き READY(verdict-names-unverified-facets)

- **検証済み面**: 生成・fail-closed・決定性・強調・drift ガード・サイズ上限・既存無退行・CI 通過
- **未検証面(明示)**: AC-6 の「マージ後 main push run で metrics-snapshot job green+bot PR へ index.html 同乗」— Bolt 2 マージ後にのみ観測可能。Bolt 2 完了条件として引き継ぎ(先送りではなくスコープ内の残実測)
