# Infrastructure Services — u001-engine-installer（260705-engine-installer）

上流入力: [services.md](../../../inception/application-design/services.md)

## 適用判断

外部インフラサービス（DB、キュー、ストレージ、監視 SaaS）は使用しない（services.md の確定どおり。NFR-2 = 外部依存なし、SEC-4 = ネットワークなし）。

## 前提サービス

| 前提 | 用途 |
|---|---|
| Bun ランタイム | インストーラと配布後エンジンの実行（README に導入者の前提条件として明記 = FR-3.1） |
| Git / GitHub | 配布元（clone）の取得手段。インストーラ自身は git を呼ばない |
