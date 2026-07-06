# Wireframes — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 適用判断

本 Intent の成果物は CLI ツール（インストーラ）であり、ユーザー向け UI は存在しない。ステージ条件（非 UI の initiative は system interaction 表現で代替）に従い、wireframe の代わりに CLI の入出力設計を示す。

## CLI 入出力の概形

```text
$ bun run <installer> --target /path/to/workspace

[1/5] エンジン一式を配置        .agents/amadeus/（7 dir、全置換）
[2/5] skills を配置             .claude/skills/amadeus*、.agents/skills/amadeus*（全置換）
[3/5] symlink を再作成          .claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}
[4/5] settings.json をマージ    hooks 配線のみ（既存設定は保持）
[5/5] スモーク検証              doctor 相当の起動チェック

インストール完了: /path/to/workspace
次の手順: README の「導入後の検証」（doctor / amadeus-validator）を参照
```

失敗時は、失敗した工程と原因、やり直し方法（再実行で冪等に回復）を stderr に出す。
