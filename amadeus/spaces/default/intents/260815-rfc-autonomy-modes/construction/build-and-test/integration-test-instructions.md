# 統合テスト手順 — intent 260815-rfc-autonomy-modes

filesystem / process を使う medium test は unit allowlist を増やさず integration suite に置く方針に従う。

## 対象

本 intent が追加した integration 層テスト(新規 11 件)。

| ファイル | 主対象 | 由来 unit |
|---|---|---|
| `tests/integration/t560-session-interactivity.integration.test.ts` | セッション単位の対話/非対話検出ポート(FR-2) | presence-detection |
| `tests/integration/t561-interactive-carveout.integration.test.ts` | decide-question / compose の対話性 carve-out(ADR-5/FR-4) | interactive-carveout |
| `tests/integration/t1241-park-guard-removal.integration.test.ts` | park guard 廃棄(FR-3 前提) | waiting-interruption |
| `tests/integration/t1241-waiting-engine.integration.test.ts` | waiting terminal のエンジン配線(FR-3/ADR-4) | waiting-interruption |
| `tests/integration/t-approve-batch-presence-guard.integration.test.ts` | approve-batch の presence 封鎖(D7/D8、FR-12) | presence-closure |
| `tests/integration/t-merge-provenance-record.integration.test.ts` | 委任マージ provenance の記録(FR-9/Q6) | merge-provenance |
| `tests/integration/t-learnings-s13-zero-seam.integration.test.ts` | §13 候補 0 件判定の機械化(FR-11/ADR-6) | s13-zero |
| `tests/integration/t3120-grant-ceremony-preview-command.integration.test.ts` | preview-autonomy 後の貼り付け可能 set-autonomy コマンド(Q15) | grant-ceremony |
| `tests/integration/t3121-completion-report.integration.test.ts` | ワークフロー完了時の auto-decision summary(C9/ADR-3) | completion-report |
| `tests/integration/t3130-status-autonomy-facet.integration.test.ts` | status の autonomy facet 表出(C7/C8) | config-visibility |
| `tests/integration/t3116-docs-mode-matrix.integration.test.ts` | mode マトリクスの文書・ノルム同梱(FR-14/Q16) | docs-norms |

既存 integration テストのうち本 intent が変更したもの: `event-registry-drift` / `t121-stop-hook-enforce`(Stop hook 再定義 Q11)/ `t357-observability-seam` ほか。

## 実行

```bash
bash tests/run-tests.sh --ci
```

CI では `.github/workflows/ci.yml` の `ci-success` 集約ジョブが blocking required check の正本であり、個別ジョブは集約の `needs` 経由で blocking になる。

## 完了条件

- 統合層の失敗 0 件。
- 単一ジョブだけで落ちるテストは、ローカル再現や ablation を組む前に同一 run・同一 head の別ジョブでの同テスト結果と突合して帰属する(coverage 計測ジョブ / Tests ジョブの両方向)。
- OTel を触る fixture は one-workspace-per-process 不変量に従い `resetOtelPerProject()` を挟む。
