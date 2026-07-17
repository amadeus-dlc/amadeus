# User Flow — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`(意図・成功の姿)、`../scope-definition/scope-document.md`(In 1/3/5)、`../scope-definition/intent-backlog.md`(B-1〜B-4)、wireframes.md。

## フロー(opencode 利用者 — cursor も同型)

1. README「Pick your harness」表で OpenCode 行の install コマンドを見る(In 5 — 現状「manual install」の非対称が解消される導線)
2. `bunx amadeus-setup install --harness opencode` を実行(既存 install フローに乗る — 対話・確認 `--yes` の挙動不変)
3. モック2 の完走出力 → `.opencode/` + `amadeus/` + `AGENTS.md` が配置される
4. `$amadeus` で workflow 開始(前 intent AC-2b で実測済みの到達ライン — installer 経由で同地点に到達)

## エラーパス

- 未知ハーネス名 → モック3(exit 2、6値列挙のガイダンス)— 既存 UX の保存
- 既インストール → 既存 renderAlreadyInstalled の様式不変(本 intent 非接触)

## 変更なしの確認(挙動保存)

install/upgrade の対話フロー・--force/--yes 意味論・バージョン解決は一切不変 — 変わるのは受理される列挙値と usage/エラー文字列内の列挙のみ。
