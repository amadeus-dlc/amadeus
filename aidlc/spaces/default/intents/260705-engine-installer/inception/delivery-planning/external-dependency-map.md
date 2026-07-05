# External Dependency Map — Engine Installer（260705-engine-installer）

上流入力: [services.md](../application-design/services.md)、[bolt-plan.md](bolt-plan.md)

## 外部依存

| 依存 | 種別 | 影響 Bolt | 状態 |
|---|---|---|---|
| Bun ランタイム | 実行前提 | 両方 | 導入者の前提条件（README に明記） |
| 並行 Intent #428（上流同期） | エンジンレイアウトの変更元 | 両方（FR-2.5 が検知） | 進行中。merge 時に追従（申し送り済み） |
| 並行 Intent（bug 束ね #498/#499/#501） | エンジン tools + validator の変更元 | 両方 | 進行中。同上 |
| #441（OTel 計装） | 後続依存（本 Intent の成果に依存） | なし（下流） | 本 Intent の完了待ち |

外部サービス・ネットワーク依存はない（NFR-2、オフライン前提）。
