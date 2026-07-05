# Services — Engine Installer（260705-engine-installer）

上流入力: [components.md](components.md)

## 外部サービス・依存

外部サービスは使用しない。依存は次に限る（NFR-2）。

| 依存 | 用途 | 制約 |
|---|---|---|
| Bun ランタイム | スクリプト実行、fs API | 導入者の前提条件（README に明記） |
| node:fs / node:path | コピー、symlink、lstat、JSON I/O | 標準 API のみ。npm 依存の追加なし |
| 配布元 repo（clone） | コピー元（.agents/amadeus/、skills、AMADEUS.md、hooks 配線の抽出元） | 読み取り専用（CON-7） |
| インストール先の doctor 相当 | スモーク（FR-1.7） | 実行方法は O-2（functional-design で確定） |
