# Security Design — u5-agents-import

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一の`business-logic-model`をfallback入力とする。

## 完全性境界

suffix入力は生成済みcodex AGENTSの固定pathだけを許可し、import先はrepository相対の `.agents/rules/amadeus-codex-suffix.md` に固定する。symlink escape、absolute path、`..`を拒否する。生成内容にcredentialやper-user configを取り込まない。

## 指示改竄の検出

AGENTS import行集合をexact matchし、欠落・重複・未知importをfail closedにする。CLAUDEはcore project-instructions + `.claude/CLAUDE.md` の期待連結とrootをbyte比較し、差異をwarningへ降格しない。
