# CI/CD Pipeline — metrics-observation(U3 の実装仕様)

ci.yml への追加(全文は code-generation で確定、契約は以下):

```yaml
  metrics-snapshot:
    name: Metrics Snapshot
    needs: coverage
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 5            # P-1
    concurrency:
      group: metrics-snapshot-main
      queue: max
      cancel-in-progress: false
    permissions:
      contents: write             # S-1(job 単位のみ)
    steps: [checkout / bun setup / pip lizard(既存様式) / artifact download(name: amadeus-coverage-report) / --write / commit / bounded fetch+rebase+push]
```

- **ガードの起動者(infrastructure-design:guard-activator)**: if ガード・permissions・timeout の3ガードはすべて **U3 PR の作者が ci.yml に静的宣言**し、起動は GitHub Actions ランタイムが自動で行う — 恒久スキップされる「誰も設定しない環境変数」型の安全網はゼロ。検査は t222(a-d アサート)が常時強制。
- **書き戻し排他**: job-level の固定 group `metrics-snapshot-main` と `queue: max` で異なる main commit 間を直列化し、最大100件を pending として保持する。workflow-level の SHA 単位 concurrency は変更しない。
- **push 回復経路**: snapshot commit 後に `git fetch origin main` → `git rebase origin/main` → `git push origin HEAD:main` を最大3回。push の stderr が non-fast-forward を示す場合だけ次の試行へ進み、rebase 衝突・認証失敗・その他の push 失敗・3回目の non-fast-forward は job を赤にする。collector / `--write` は再実行しない。
- coverage job 側: upload-artifact の path に coverage-totals.json / tests-totals.json を追加(F1)。
- pip install lizard は既存2ジョブと同一の pin ステップを複製(3ジョブ目 — #837 レビューの「3ジョブ目が現れた時点で composite 化を P3 起票」条件が成立するため、**着地時に P3 enhancement を起票**する)。
