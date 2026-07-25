# 性能テスト手順 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

## 本 intent における性能の位置づけ

本 intent は性能そのものが要件であるため、性能検証は付随的ではなく中心にある。ただし対象は**実起動のウォールクロック**であり、自動テストで固定できるのは構成要素のみである。

## 自動テストで固定するもの

`t295` の並列度検査は、peak concurrency が 4 を超えないことと 1 より大きいことを開始/終了マーカーの重なりから実測する。これは「並列化が効いている」ことの決定的な確認であり、実時間の絶対値には依存しない。

`project.md` の `cid:build-and-test:wtfbt-c3` に従い、長い本番タイムアウトを実時間待機で検証せず、同じ制御経路を通る短縮可能なタイミングシームとラウンド数で確認する。

## 実測で確認するもの（自動化しない）

| 測定 | 手順 |
|---|---|
| `git worktree add` の並列度別所要 | 隔離インスタンスで並列度を振って計測 |
| アタッチ到達時間 | 実 launch で run record が確定する時刻を記録 |
| sentinel 生成数 | 起動後に `ready.<team>__*` を数える |

実測は必ず隔離インスタンス（`--instance <name>`）で行い、終了後に worktree 数が基準へ戻ることを確認して撤去する。

## 実測結果

`build-test-results.md` に記録する。
