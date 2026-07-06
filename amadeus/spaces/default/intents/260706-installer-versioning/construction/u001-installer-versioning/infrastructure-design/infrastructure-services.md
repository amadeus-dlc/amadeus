# Infrastructure Services — u001-installer-versioning（260706-installer-versioning）

上流入力: [deployment-architecture.md](deployment-architecture.md)

## 適用判断

不適用。外部インフラサービス（DB、キュー、ストレージ、ネットワークサービス）を一切使わない（C-3 = オフライン。services.md の確定どおり）。ローカル git 呼び出しは SourceCommitResolver の設計（unknown フォールバック）で吸収済み。
