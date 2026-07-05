# Skill Matrix（260705-engine-installer）

上流入力: [team-assessment.md](team-assessment.md)

| 必要スキル | 用途 | 充足根拠 |
|---|---|---|
| Bun + TypeScript | インストーラ本体と eval の実装（dev-scripts ルール） | 既存 dev-scripts / validator / hooks 群の実装実績 |
| node:fs（再帰コピー、symlink、lstat） | フルセット配置と symlink 再作成 | 標準 API。現行 `.claude/` の symlink 構成を実測済み |
| JSON 操作 | settings.json の hooks 冪等マージ | 既存 hooks / tools の JSON 処理実績 |
| 隔離 eval の構築（一時ディレクトリ、cold cache、オフライン相当） | 専用 eval | 前例: engine sandbox e2e（`dev-scripts/evals/engine-e2e/check.ts`）、pdm-scope eval |
| doctor / validator の起動 | インストール後検証（3 層分担） | 既存資産の呼び出しのみ |

不足スキルはない。
