# Logical Components — U2-mirror-skill

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SKILL内の論理構成

| 論理部品 | 責務 | 障害境界 |
|---|---|---|
| Frontmatter | session skillの識別と利用条件 | 配布ハーネス共通の静的メタデータ |
| Status入口 | U1ツールを単一コマンドで起動 | exit/stdout/stderrを透過 |
| StatusOutcome検証 | exit 1の出力をU1の構造化契約として検証 | Bun起動失敗と正常findingを分離 |
| Exit分類 | 0/1/2、構造検証不能なexit 1、未知exitの案内を選択 | 成功への誤丸め込みを防止 |
| Finding案内表 | 検証済みkindだけを固定候補へ写像し、staleではsync/closeを併記 | 自由文を表示専用に隔離 |
| Intent引数境界 | 実在directoryの正確なbasenameを検証して単一argvで渡す | placeholder、shell command構築、分割・展開を拒否 |
| Human gate | 変更verbの実行前に人間選択を待つ | 診断と変更を分離 |
| Projection manifest | 正本を6ハーネスへ配布 | ハーネス追加をSKILL本文から隔離 |
| Docs対訳 | 英語・日本語の運用説明 | SKILLと公開手順のドリフトを検出 |

## 依存方向

SKILLはU1ツールへ一方向に依存し、`gh`や設定ファイルへ直接依存しない。manifestとdocsはSKILLを配布・説明するだけで、実行時依存を逆流させない。

## Blast radius

statusは読取専用であり、変更verbは人間選択後だけ実行される。SKILLの障害影響は当該対話の案内失敗に限定され、ツールの実装状態や他ハーネスの正本を変更しない。
