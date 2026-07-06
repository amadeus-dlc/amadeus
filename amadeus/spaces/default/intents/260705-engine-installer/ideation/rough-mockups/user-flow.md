# User Flow — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[wireframes.md](wireframes.md)

## 導入フロー（Claude 利用者）

1. 本リポジトリを clone する（配布元）。
2. `bun run <installer> --target <workspace>` を実行する。
3. インストーラが配置（エンジン、skills、AMADEUS.md）→ symlink 再作成 → settings.json マージ → スモークを自動実行する。
4. 利用者は README の手順で doctor と amadeus-validator を実行して確認する。
5. 以降の更新は同じコマンドの再実行（上書き更新型。`aidlc/` の記録は不可侵）。

## 導入フロー（Codex 利用者）

1〜2 は同じ。3 の配線は `.agents/` 配置のみで成立する（symlink・settings.json は Claude 向け配線であり、Codex では追加配線なし = grilling 確定 2 の検証項目）。
