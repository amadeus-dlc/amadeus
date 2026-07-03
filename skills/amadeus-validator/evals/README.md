# amadeus-validator evals

## 昇格条件

`amadeus-validator` は、次を満たすことを確認する。

- 配布先ユーザー環境で動く実行時 validator として扱う。
- repo root の `scripts/**` や package scripts を実行時検証入口にしない。
- skill 同梱の `validator/AmadeusValidator.ts` を実行入口にする。
- Bun と TypeScript だけで検証する。
- 対象 Intent ディレクトリ名が未指定の場合、全体成果物だけを検証する。
- 対象 Intent ディレクトリ名が指定された場合、全体成果物に加えて対象 Intent を検証する。
- `.amadeus/intents.md` の Intent 識別子が `YYYYMMDD-<slug>` 形式で、詳細リンクのディレクトリ名と一致することを検証する。
- `.amadeus/intents.md` が IndexGenerate の導出内容と完全一致することを検証する。
- `state.json.schemaVersion` が `2` の Intent では、scope、depth、status、phase、`stages` のキー集合と scope の実行対象の一致、ステージ状態、approval evidence、`phaseGates`、`bolts`、completed ステージの必須成果物を検証する。
- Event Storming の成果物、level、`nextRecommendedSkill`（`amadeus` または `amadeus-domain-modeling`）を検証する。
- Domain Map と Context Map の `adopted`、`retired`、根拠リンクを検証する。
- Event Storming、Intent の phase ディレクトリの Grilling Decision Trail を検証する。
- `evals.json` が JSON として解釈できる。
- `git diff --check` が成功する。

## 検証入口

コードレベルの検証は次で実行する。

```sh
bun run dev-scripts/evals/amadeus-validator/check.ts
```

v2 互換ライフサイクル（schemaVersion 2）の happy シナリオと失敗シナリオは、この検証入口が一時 workspace を合成して確認する。

## 再実行コマンド

```sh
bun -e 'JSON.parse(await Bun.file("skills/amadeus-validator/evals/evals.json").text()); console.log("evals.json: ok")'
cmp -s skills/amadeus-validator/SKILL.md .agents/skills/amadeus-validator/SKILL.md && echo "SKILL.md: identical"
cmp -s skills/amadeus-validator/validator/AmadeusValidator.ts .agents/skills/amadeus-validator/validator/AmadeusValidator.ts && echo "AmadeusValidator.ts: identical"
bun run dev-scripts/evals/amadeus-validator/check.ts
git diff --check
```
