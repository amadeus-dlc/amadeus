# 性能テスト手順

各 Unit の `code-generation-plan.md`、performance requirements、`code-summary.md` を統合する。主な定量対象は loader/sensor の線形処理と、u5 の全モデル CI が30分 timeout 内に収まることである。

## 検証方法

- u1〜u4: 登録モデル・依存辺・総 bytes に対し線形であることを unit/integration fixture で確認する。キャッシュや並列化を追加しない。
- u5: 固定 Docker/JDK/TLC、workers 1 で `FormalElection × 6 → MirrorLifecycle × 6` を逐次実行し、acceptance verify を通す。
- MirrorLifecycle は generated 208,628、distinct 89,099、queue 0、depth 18、completion marker 有りの完全一致を要求する。
- 記録済み実測は `../u5-ci-all-models-measure/code-generation/e2e-evidence.json` を正本とし、t406 と artifact verifier で契約を再検査する。

```bash
bun test --timeout 120000 tests/integration/t406-ci-all-models-measure.integration.test.ts
```

## 合格基準

- 1 run 190秒未満、workflow 全体30分未満。timeout、run数、統計 pin を緩めない。
- 記録済み macOS Docker 実測は総 644,215.468ms、最大 run 120,247.522ms、verify PASS である。
- GitHub hosted Ubuntu は未実測のため、最終 CI acceptance 前に `workflow_dispatch` を1回実行し、job wall time と各 `elapsedMs` を記録する。これは既知の残リスクであり、ローカル値から保証を推論しない。
