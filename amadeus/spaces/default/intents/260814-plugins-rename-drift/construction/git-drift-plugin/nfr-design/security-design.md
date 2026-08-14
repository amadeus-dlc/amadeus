# Security Design — git-drift-plugin

上流入力: `functional-design/business-rules.md`(R1/R8/R11)、`functional-design/business-logic-model.md`。nfr-requirements は SKIP(expected 不在)— 正本は requirements.md NFR-2/NFR-4。

## 境界と最小権限

| 面 | 設計 |
|---|---|
| git 操作 | 読取 + fetch(remote-tracking ref 更新)のみ。作業ツリー・index・ブランチ・stash 非破壊(R1)。credential は git の既存機構へ委譲し、本プラグインは一切保持・出力しない |
| 設定 | 解決済み非機密値のみ argv 受領(機密は U2 の字句拒否で settings に置けない)。env 読取なし(R12 系 — env 宣言は先送り) |
| core 境界 | import 禁止(ADR-6)。engine/state の変更操作なし(R11、NFR-4)— audit 記録は core の dispatcher 所有 |
| 出力 | DriftReport にリポジトリ内相対パスのみ(絶対パス・URL・credential を含めない)。ログは既存 redaction 境界を通る |

## 脅威検討

- 悪意ある origin 名/ブランチ名によるコマンド注入: git 実行は配列 argv(shell 非経由)で組み立て、ref 名は `rev-parse --verify` 済みのもののみ使用。
- スロットル記録の改竄: 機械ローカル(gitignored)で信頼境界内。破損は fail-open(即 fetch)で悪化しない。
