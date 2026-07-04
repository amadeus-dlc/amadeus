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
- `skills/amadeus*/SKILL.md`、`.agents/skills/amadeus*/SKILL.md`、および `skills/amadeus*/**/*.ts`、`.agents/skills/amadeus*/**/*.ts` は英語必須である（詳細は [Skill Language Policy](../../docs/amadeus/skill-language-policy.md) を参照）。
- 英語必須の対象でも、生成される Amadeus DLC 成果物、テンプレート由来の Markdown、ユーザー向け gate 文言は日本語のまま維持する。
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

## 実行検証

「実際に動く実行結果の検証」は、example snapshot ではなくエンジン sandbox e2e（`dev-scripts/evals/engine-e2e/check.ts`）で行う。
sandbox e2e は決定論的であり、LLM を呼ばない。
一時ディレクトリへ `.agents/amadeus/{tools,amadeus-common,sensors,scopes,agents,knowledge}` をコピーした隔離 workspace を作り、本番 `aidlc/` を変更しない。

sandbox e2e は、`intent-birth` による record 生成、`amadeus-orchestrate.ts next` の run-stage directive 発行、produces 不在時の完了拒否、human presence 未充足時の承認拒否、audit shard の自動生成を確認する。
sandbox e2e は、成功時も失敗時も一時ディレクトリを片付ける。

sandbox e2e は `npm run test:it:engine-e2e` で単独実行できる。
`npm run test:all` にも含まれる。

skill が生成できない構造が必要になった場合は、先に skill、template、validator、eval の契約を直す。

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
