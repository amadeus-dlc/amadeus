# Services — 260706-installer-versioning（Issue #543）

上流入力: [components.md](components.md)

## 適用判断

外部サービス・常駐プロセス・ネットワーク依存は存在しない（C-3 = オフライン動作）。不適用の判断を記す簡潔な文書として残す。

## 根拠

すべての処理はローカルファイルシステムと（sourceCommit 取得のための）ローカル git 呼び出しに閉じる。git 不在でも "unknown" へフォールバックし動作する（確定 5）。
