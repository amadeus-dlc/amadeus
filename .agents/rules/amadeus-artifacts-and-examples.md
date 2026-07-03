# Amadeus Artifact Rules

このルールは、Amadeus DLC の成果物を作るときに適用する。

## 対象

- Space: 対象 workspace の `aidlc/spaces/<space>/`（既定は `default`。`memory/`、`knowledge/`、`codekb/`、`intents/`）
- Intent record: `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`
- Skill sources: `skills/amadeus*/`
- Promoted skills: `.agents/skills/amadeus*/`

## Skill 昇格

`skills/amadeus*/` を `.agents/skills/amadeus*/` へ反映する場合は、必ず `dev-scripts/promote-skill.ts` を使う。
手動の `cp`、`rsync`、エディタ操作で昇格先を直接同期しない。

既存の昇格先を更新する場合は、次を使う。

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
```

昇格後は、少なくとも次を実行する。

```sh
npm run test:it:promote-skill
```

## 言語

- `aidlc/**/*.md`、`skills/amadeus*/templates/**/*.md`、`.agents/skills/amadeus*/templates/**/*.md` は日本語で書く。
- `skills/amadeus*/SKILL.md` と `.agents/skills/amadeus*/SKILL.md` は、[Skill Language Policy](../../docs/amadeus/skill-language-policy.md) に従う場合だけ英語化できる。
- `SKILL.md` を英語化しても、生成される Amadeus DLC 成果物、テンプレート由来の Markdown、ユーザー向け gate 文言は日本語のまま維持する。
- 英語で下書きしてから日本語へ翻訳しない。
- `.kiro/specs/**/*.md` と `openspec/**/*.md` を作る場合も日本語で書く。
- `aidlc-state.md`、`intents.json`、audit イベントのような機械可読・構造的成果物は、v2 の構造と英語ラベルをそのまま使う。

## Amadeus DLC の基準

- ライフサイクルの公開入口は `amadeus` の 1 個である。補助入口と契約の現在地は `README.md` と `AMADEUS.md` に書かれたものだけを前提にする。
- 新しい Intent は `amadeus` の Intake から人間の明示承認を経てだけ作る。既存 Intent のアウトカムに属する作業は、新しい Intent にせずスコープバックログへ合流させる。
- scope が SKIP にするステージは実行しない。ステージと成果物の契約は `docs/amadeus/lifecycle/` に従う。
- Construction は Bolt を実行単位にし、walking skeleton の Bolt PR は必ず人間が承認する。
- Spec、`.kiro/specs/**`、`openspec/**`、Operation 成果物は、対応が確定するまで固定しない。
- 新しい成果物を作る前に、対象 workspace の `aidlc/spaces/<space>/memory/`（org.md、team.md、project.md）と、対象 Intent の `aidlc-state.md` を読む。
- 不明な値は空欄にせず、`未確認` と書く。
- 推測で外部システム、境界づけられたコンテキスト、Intent、依存関係を作らない。

## 生成前チェック

- 同じ段階の既存成果物を読み、見出し、表、識別子、語彙を合わせる。
- 対象範囲と責任境界を明確にする。
- テンプレートは、`aidlc/spaces/<space>/memory/templates/` の上書きがあればそれを、なければ対象 skill の同梱テンプレートを使う。

## Examples

`examples/` は、実際の skill で生成できる Amadeus 成果物だけを置く。

example は skill の実行結果として成立する snapshot であり、読者向けの説明ではない。
手作業の理想形やレビュー用の抜粋を `examples/` として置かない。
example の正しさは validator と wrapper（`npm run test:examples`）で確認する。

snapshot は v2 互換ライフサイクルの段階別に置く。

- `examples/01-ideation-completed`
- `examples/02-inception-completed`
- `examples/03-construction-design-ready`
- `examples/04-construction-implementation-planned`

新しい example を追加または更新する場合は、対象の skill を real provider で実際に駆動して生成する。
段階別 example を再生成する場合は、repo root で `npm run examples:generate:real` を使う。
手順を手作業で再現しない。

上流 step を変えずに途中 step 以降だけを再生成する場合は、`dev-scripts/generate-amadeus-examples.ts` の `--from <step-id>` を使う。
利用できる step id は、`01-ideation-completed`、`02-inception-completed`、`03-construction-design-ready`、`04-construction-implementation-planned` である。
`--from` は直前の snapshot を入力として使い、指定 step 以降だけを更新対象にする。

example は、生成に使った source skill の `skills/**/SKILL.md` と md5 を `examples/skill-provenance.json` に記録する。
source skill の md5 を更新する場合は、該当 example を real provider で実際に再生成してから更新する。
md5 だけを現在値へ書き換えない。
`skills/amadeus*/SKILL.md` または `.agents/skills/amadeus*/SKILL.md` を変更した PR では、PR 作成前に `npm run test:examples` を実行し、provenance 不一致が出たら対象 step 以降を real provider で再生成する。
real provider で再生成できない場合は md5 を更新せず、該当 entry に `staleReason` を残す。
`staleReason` は一時的な例外であり、後続 PR で real provider による再生成を実施して削除する。

skill が生成できない構造が必要になった場合は、example だけを直さず、先に skill、template、validator、eval の契約を直す。

## 検証

repo 全体の標準検証は次で実行する。

```sh
npm run test:all
```

`aidlc/` 成果物を作成または更新した場合は、次で構造検証する。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

特定 Intent も検証する場合は次で検証する。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> <YYMMDD>-<label>
```

validator の `pass` は、実行時に参照できる最低限の構造条件を満たすという意味である。
内容妥当性の承認や gate 通過そのものではない。
