# 制約台帳 — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

| ID | 制約 | 出典 |
|---|---|---|
| CON-1 | `aidlc/` は不可侵。インストーラは作成も変更もしない（birth はエンジンの仕事） | grilling 確定 5 |
| CON-2 | settings.json は hooks 配線のみ冪等マージし、利用者の他設定（env、permissions、statusLine 等）に触れない | grilling 確定 5 |
| CON-3 | エンジンの正は `.agents/amadeus/` の 1 箇所。`.claude/` 側は相対 symlink の再作成で配線する（実体化しない） | grilling 確定 3 |
| CON-4 | `.agents/rules/` は配布対象から除外する（本体開発向け） | grilling 確定 1 |
| CON-5 | 実装は dev-scripts ルールに従う: Bun + TypeScript、TDD（先に失敗する検証 → 最小実装）、新規スクリプトは .ts | .agents/rules/dev-scripts.md、ディスパッチ作業指示 4 |
| CON-6 | 専用 eval は `test:all` へ組み込み、node_modules なし・bun cache 冷・オフライン相当で全 tools + 全 hooks の module load を駆動する | grilling 確定 6、ディスパッチ作業指示 4 |
| CON-7 | インストーラはエンジンレイアウトを読むだけで書き換えない（並行 Intent #428・bug 束ねとの並行条件） | ディスパッチ作業指示 5 |
| CON-8 | `package.json` scripts 追記と eval 追加は追記型接触として union 解消可能に保つ | ディスパッチ作業指示 5 |
| CON-9 | Windows の symlink 制約は対象外（必要になったら後続 Issue） | grilling 確定 3 |
| CON-10 | PR merge は人間が行う | 承認要旨、Git Branching Policy |
