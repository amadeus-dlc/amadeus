# amadeus-validator evals

## 昇格条件

`amadeus-validator` は、次を満たすことを確認する。

- 配布先ユーザー環境で動く実行時 validator として扱う。
- repo root の `scripts/**` や package scripts を実行時検証入口にしない。
- skill 同梱の `validator/AmadeusValidator.ts` を実行入口にする。
- Bun と TypeScript だけで検証する。
- 対象 Intent ディレクトリ名が未指定の場合、全体成果物だけを検証する。
- 対象 Intent ディレクトリ名が指定された場合、全体成果物に加えて対象 Intent を検証する。
- `intents.md`（GD009 で廃止された任意成果物）は、存在する場合だけ、Intent 識別子が `<YYMMDD>-<label>` 形式で、詳細リンクのディレクトリ名と一致することを検証する。
- `intents.json`（registry）の各エントリが UUIDv7 の `uuid`、`<YYMMDD>-<label>` 形式の `dirName`、空欄でない `slug`、既知の `scope` と `status` を持ち、record ディレクトリと双方向に対応することを検証する。
- Intent 直下に `state.json` や旧配置ディレクトリ（`mocks/`、`requirements/`、`units/` など）が残っている場合は、旧契約として fail にする。
- `aidlc-state.md` では、scope、depth、Project Type、Status、Lifecycle Phase、State Version、Stage Progress の checkbox と scope の実行対象の一致、Phase Progress、Current Stage、`audit/audit.md` のイベント、completed ステージの必須成果物を検証する。
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
