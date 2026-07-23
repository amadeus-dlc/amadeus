# Security Design — U2-mirror-skill

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SD-U2-1: 既存権限境界の維持(SR-U2-1)

SKILLはU1ツールだけを`bun`で起動し、`gh`、keyring、認証環境変数へ直接触れない。認証判定とGitHubアクセスはU1の既存境界に委譲し、新しい権限昇格面を作らない。

## SD-U2-2: 診断出力を命令として実行しない(SR-U2-2)

status出力のうちSKILLが解釈してよいのは、U1契約で検証済みの構造化`StatusOutcome`に含まれるfinding kindだけとする。自由文detailとstderrは表示専用であり、解析、eval、shell展開、コマンド抽出、自動再実行は禁止する。create/sync/closeはSKILLに固定されたコマンド例を提示し、人間が最終verbを選択した後だけ実行する。任意intent指定はactive space内に実在するdirectoryの正確なbasenameを検証し、shell文字列へ補間せず単一argvとして渡す。

## 検証

grepで`gh`直呼び、`eval`、動的shell生成が0件であることを確認する。実行可能なbash fenceはplaceholderなしの`{{HARNESS_DIR}}`経由固定4コマンドだけを許可し、intent値がcommand分割・展開されない契約を検査する。
