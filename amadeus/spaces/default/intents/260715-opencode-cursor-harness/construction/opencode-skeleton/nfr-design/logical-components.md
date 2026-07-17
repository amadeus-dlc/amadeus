# Logical Components — U1 opencode-skeleton

intent: 260715-opencode-cursor-harness / Unit: U1
上流入力: nfr-requirements(tech-stack-decisions.md)、functional-design(domain-entities.md)、application-design(component-methods.md C1)。

## 論理コンポーネント構成

| コンポーネント | ファイル | 責務 | NFR 割当 |
| --- | --- | --- | --- |
| manifest | packages/framework/harness/opencode/manifest.ts | HarnessManifest 宣言(name/harnessDir/coreDirs/harnessFiles/rulesRename/authoredExempt/skipRunnerGen/emit) | SR(静的)、SC(拡張点) |
| emit | packages/framework/harness/opencode/emit.ts | emission table 構築+write⇔check | RL(fail-fast/冪等/落ちる実証)、PR(O(n)) |
| harness.json | emit が dist へ同梱 | rulesSubdir 応答 | RL(smoke 実測対象) |
| dot-gitignore | packages/framework/harness/opencode/dot-gitignore | runtime 除外 | SR-U1-2 |

依存方向: manifest → emit(1方向)、両者 → core は読み取りのみ。循環なし。目録断定は設計確定後の記載(nfr-design:c7 準拠 — 本表が最終目録)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
