# Domain Entities — docs-i18n

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 対象文書と参照構造の台帳（2026-07-06、9dd93f50 で実測）

| 対象文書（正本化） | 行数 | 新設 | 実測した参照元 | Bolt |
|---|---|---|---|---|
| docs/amadeus/steering.md | 75 | steering.ja.md | README.md / README.ja.md、AMADEUS.md、extension-guide.md / .ja.md、lifecycle/ 配下 | B001 |
| docs/amadeus/aidlc-v2-build-and-test-failure-handling.md | 76 | 同名 .ja.md | lifecycle/overview.md、lifecycle/construction.md | B002 |
| docs/amadeus/aidlc-v2-difference-response-plan.md | 70 | 同名 .ja.md | skill-language-policy.md、skill-englishization-rollout-plan.md、aidlc-v2 系 4 文書（reviewer-mapping / operation-phase-boundary / sensor-learn-mapping / build-and-test-failure-handling） | B002 |
| docs/amadeus/aidlc-v2-operation-phase-boundary.md | 71 | 同名 .ja.md | lifecycle/overview.md | B002 |
| docs/amadeus/aidlc-v2-reviewer-mapping.md | 81 | 同名 .ja.md | lifecycle/overview.md、aidlc-v2-sensor-learn-mapping.md、aidlc-v2-build-and-test-failure-handling.md | B002 |
| docs/amadeus/aidlc-v2-sensor-learn-mapping.md | 84 | 同名 .ja.md | lifecycle/overview.md、aidlc-v2-build-and-test-failure-handling.md | B002 |
| docs/amadeus/skill-language-policy.md | 109 | 同名 .ja.md | AMADEUS.md、AGENTS.md、.agents/rules/amadeus-artifacts-and-examples.md、README.md / README.ja.md、language-policy.md / .ja.md、aidlc-v2 系 3 文書（difference-response-plan / operation-phase-boundary / reviewer-mapping） | B003 |
| docs/amadeus/skill-englishization-rollout-plan.md | 99 | 同名 .ja.md | skill-language-policy.md、aidlc-v2-reviewer-mapping.md | B003 |

## 破壊リスクの実測

- 対象 8 文書への Markdown アンカー参照: 0 件（英語見出し新設は安全 = Q3）。
- 対象 8 文書への行番号参照: 0 件。
- 対象 8 文書内の旧 path（aidlc/、aidlc-state、/aidlc）言及: 0 件（PR #553 更新済み。FR-2.3 = 歴史的記述判断は該当なし）。

## 様式の正（PR #536 前例）

| 要素 | 英語版 `<name>.md` | 日本語版 `<name>.ja.md` |
|---|---|---|
| H1 | `# English Title` | `# English Title（日本語名）` |
| 本文見出し | 英語 | 日本語 |
| リンク | `.md` を参照 | 対応する `.ja.md` があれば `.ja.md`、なければ `.md` |
| 内容 | 意味論一致の書き直し | 既存日本語本文の移設 |
