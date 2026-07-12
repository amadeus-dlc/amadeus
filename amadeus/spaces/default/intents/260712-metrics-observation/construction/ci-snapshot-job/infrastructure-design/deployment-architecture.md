# Deployment Architecture — metrics-observation

クラウドインフラの新設なし。「デプロイ」に相当するのは **snapshot の main への書き戻し**のみ:

```
main push → GitHub Actions(ubuntu-latest、既存 CI と同一ランナー種)
  └ metrics-snapshot job(needs: coverage、if: push && main)
      ├ actions/checkout(既存様式)
      ├ artifact download(coverage-totals.json / tests-totals.json)
      ├ bun scripts/metrics-snapshot.ts --write
      └ git commit+push(GITHUB_TOKEN、bot author)→ metrics/*.json が main に着地
```

ロールバック手順: snapshot コミットは追記のみで既存ファイル不変 — 誤った snapshot は `git revert <sha>` 1つで無害に戻せる(データ破壊面なし)。
