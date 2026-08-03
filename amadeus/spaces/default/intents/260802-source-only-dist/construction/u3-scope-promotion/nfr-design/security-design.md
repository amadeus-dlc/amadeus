# Security Design — u3-scope-promotion

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の repository-local compile 境界をfallback入力とする。

## 信頼境界

scope 定義と stage frontmatter は追跡済み正本だけを入力にする。生成時にネットワーク、credential、ユーザー入力を解釈しない。frontmatter は既存 parser で parse し、未知 scope、重複名、未知 sensor を fail closed で拒否する。

## 完全性

- root由来5 scope の採用時に byte diff を確認し、内容改変を混ぜない
- canonical grid と各投影面を deep-equal し、キー欠落・余剰・セル差を失敗にする。加えて移行前root 15-key gridを固定fixtureとして保持し、昇格5 scopeの全stageセルを独立oracleとしてcompile結果と比較する
- composed scope extras は `mergeScopeGrid` の既存境界で保持し、stock scope と同名の上書きを許さない
- 生成物を正本として読み戻さず、core source から毎回導出する

ログは scope 名と差分セルだけを出し、ローカルの絶対pathやper-user設定内容を公開しない。
