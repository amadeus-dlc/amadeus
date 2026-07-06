# Design System Mapping — 260706-installer-versioning（Issue #543）

上流入力: [mockups.md](mockups.md)、[team-practices.md](../practices-discovery/team-practices.md)

CLI のため、design system = 既存インストーラの出力規約（DR-1 / DR-2）への対応付けとする。

| mockup 要素 | 既存規約 | 対応 |
|---|---|---|
| 起動 / summary / done 行 | `amadeus-install: ` prefix（DR-1） | 踏襲（previous install found / backed up / restored / bootstrap 告知はすべて prefix 行） |
| 本体進行 | `[n/5]` ステップ行（DR-1） | 段数・ラベルとも実装どおり（engine / skills / symlinks / settings / smoke）を維持。退避は各段の detail へ、廃止ファイル退避は summary 専用行へ（新ステップは追加しない） |
| エラー・不在ヒント | `fix: ...`（DR-2） | 踏襲（version-info の不在ヒント、usage エラー） |
| 一覧の字下げ | `amadeus-install:   backed up: ...`（2 空白） | summary 配下の列挙行 |
