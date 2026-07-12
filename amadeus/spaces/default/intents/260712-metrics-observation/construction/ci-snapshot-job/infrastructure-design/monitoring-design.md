# Monitoring Design — metrics-observation

- **ヘルスメトリクス(最低1)**: metrics-snapshot job の成功/失敗(GitHub Actions の run 履歴が時系列を保持 — 追加基盤なし)。
- **エラーレート相当**: job 失敗 = workflow run 赤として既存の CI 可視化(バッジ・通知経路)に載る。ci-success 集約外の非対称は job コメントで明示(U3 FD #3)。
- **観測対象自身の監視**: snapshot の欠測(マージがあったのに metrics/ が増えない)は、次の snapshot の commit フィールドと git log の突き合わせで人間が検出可能 — 自動アラートは Out of Scope(scope-document)どおり設けない。
