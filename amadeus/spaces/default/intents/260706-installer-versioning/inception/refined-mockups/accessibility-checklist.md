# Accessibility Checklist — 260706-installer-versioning（Issue #543）

上流入力: [mockups.md](mockups.md)

CLI 出力のアクセシビリティ観点で確認する（GUI なし）。

- [x] 色・装飾に依存しない（plain text のみ。既存実装に ANSI 色なし = 踏襲）。
- [x] 正常系は stdout、エラーは stderr（既存規約。screen reader / パイプ処理の分離性）。
- [x] 退避・復元の告知は件数 + 明示列挙（要約だけにしない = 視認負荷の低減と grep 可能性）。
- [x] メッセージは英語（既存インストーラ出力と一貫。fix: ヒントで次の一手を明示）。
- [x] exit code で成否が機械判定できる（CI 利用 = P-1 の関心。導入・更新 = 成功 0 / 失敗 1、version-info = 導入済み 0 / 未導入 1 で、rpm -q / dpkg -s と同じ慣行）。
