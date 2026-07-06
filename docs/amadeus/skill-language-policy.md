# Skill Language Policy

この文書は、Amadeus skill の `SKILL.md` と TS スクリプトの言語方針、対象範囲、維持する契約、検証方法を定義する。

Issue #395 の判断を後続の #400、#401、#402 で参照できるようにするための基準である。

責務分担: 本文書は skill ソース（`SKILL.md`、TS スクリプト）の言語を扱う。`docs/amadeus/` 配下の文書自体の言語（正本と `*.ja.md` 併置）は [Language Policy](language-policy.md) が扱う。

段階的英語化ロールアウト（#400、#401、#402、B006〜B009）は完了した。
Intent `260704-v2-parity-completion` の D003 により、方針は「英語化できる」の条件付き許可から「英語必須」へ改定した。

## 方針

Amadeus skill の `SKILL.md` と TS スクリプトは英語必須とする。

D001（本家 `dist/claude/` からの適応コピー戦略）により、Amadeus skill は本家英語 skill を最小限の適応点（amadeus-* への改名、amadeus-grilling への結線）だけで保守する。
日本語で下書きしてから翻訳する運用は、適応コピーとの差分確認を妨げるため取らない。

ただし、Amadeus DLC が生成する成果物の言語（記述系成果物本文とユーザー向け gate 文言）は日本語のまま維持する。

英語化は翻訳作業だけとして扱わない。
英語化 PR では、翻訳変更、意味変更、昇格フロー、検証結果の境界を明示する。

## 英語必須の対象

| 対象 | 扱い |
|---|---|
| `skills/amadeus*/SKILL.md` | 英語必須である。 |
| `.agents/skills/amadeus*/SKILL.md` | source skill から昇格フローで反映する場合に英語で反映する。 |
| `skills/amadeus*/**/*.ts`、`.agents/skills/amadeus*/**/*.ts` | 英語必須である。ただし、成果物として出力する日本語文字列（gate 文言、検証結果の条件・根拠テキストなど）は対象外とする。 |
| `agents/openai.yaml` | `SKILL.md` の frontmatter description を変更した場合に、必要に応じて更新する。 |

## 日本語を維持する対象

| 対象 | 理由 |
|---|---|
| `aidlc/**/*.md` | Amadeus DLC 成果物は日本語 Markdown として扱うため。 |
| `skills/amadeus*/templates/**/*.md` | 生成される成果物の言語を日本語に保つため。 |
| `.agents/skills/amadeus*/templates/**/*.md` | 昇格先でも生成される成果物の言語を日本語に保つため。 |
| `.kiro/specs/**/*.md` | workspace ルールで日本語生成を要求しているため。 |
| `openspec/**/*.md` | workspace ルールで日本語生成を要求しているため。 |
| ユーザー向け gate 文言 | Amadeus の会話と承認判断を日本語で扱うため。 |

## 維持する契約

`CONTEXT.md` の canonical name と定義を優先する。

英語化後の `SKILL.md` でも、Amadeus DLC、Amadeus、Intent、Unit、Bolt、Gate、Traceability、Domain Map、Context Map の意味を変えない。

Amadeus DLC 固有の契約を、AI-DLC v2 との対応確認を理由に削らない。

維持する契約は次である。

- 単一公開入口 `amadeus`
- `aidlc/` 配下の成果物配置
- `amadeus-state.md` による状態管理
- `amadeus-validator` による構造検証
- `amadeus-grilling` による質問プロトコル
- phase PR と Bolt PR による人間 gate

## 昇格フロー

source skill を変更した場合は、`dev-scripts/promote-skill.ts` を使って昇格先へ反映する。

昇格先の `.agents/skills/amadeus*/SKILL.md` だけを手作業で変更しない。

既存の昇格先を更新する場合は次を使う。

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
```

昇格後は、少なくとも次を実行する。

```sh
npm run test:it:promote-skill
```

## 検証

Amadeus skill の英語化 PR では、少なくとも次を実行する。

```sh
npm run test:it:promote-skill
npm run test:all
```

`SKILL.md` の frontmatter description を変更した場合は、`agents/openai.yaml` の更新要否も確認する。

PR 説明には次を記録する。

- 対象 Issue
- 対象 Intent
- 英語化した skill
- 日本語維持対象を変更していないこと
- source skill と昇格先 skill の同期方法
- 実行した検証

## 完了証拠

Issue #395 の完了証拠は、対応 PR の merge または明示的な Issue close とする。

後続の #400、#401、#402 は、この方針を前提として英語化作業または差分対応順序の判断へ進む。

## 関連文書

- [Language Policy](language-policy.md)
- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [Skill Englishization Rollout Plan](skill-englishization-rollout-plan.md)
