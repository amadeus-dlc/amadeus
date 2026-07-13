# Shared Infrastructure — metrics-observation

既存 CI と共有する面(変更なし・依存のみ):

- ランナー(ubuntu-latest)・bun setup 手順・pip lizard pin(1.23.0)
- artifact 保存期間(既定)— totals は同一 run 内消費のため保持期間に非依存
- concurrency 設定: workflow-level の既存 SHA 単位 group は維持し、`metrics-snapshot` job に固定 group `metrics-snapshot-main` (`queue: max`, `cancel-in-progress: false`) を追加。これが異なる main commit の snapshot 書き戻しを直列化し、最大100件の pending を保持する。
- 共有面の変更リスク: coverage job の artifact path 変更(F1)は他 job の消費なし(現状 DL する job ゼロを RE で実測)— 影響半径は本 job のみ
