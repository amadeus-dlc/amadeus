# Code Summary — Bolt B / `fix-1875-completed-counter`

対象 Issue: [#1875](https://github.com/amadeus-dlc/amadeus/issues/1875)

## 実装内容

- `Completed` の正準値を、完了済み `[x]` かつ実効 action が `EXECUTE` のステージ数へ統一した。
- state 内容から実効 plan を解決する `rebuildDerivedPlanFieldsFromState` を追加し、`checkbox`、`advance`、`finalize`、workflow completion、approve、stage jump の各経路を共有 writer `rebuildDerivedPlanFields` へ集約した。
- scope change と初期化 seed も共有 writer を直接利用するよう変更した。既存の recompose と state re-sync は引き続き同 writer を利用する。
- approve commit 検証器を、生 checkbox 数ではなく共有 writer が再構築した正準値との比較へ変更した。
- 生の `[x]` 数を固定していた E2E テスト 3 本を、EXECUTE 実効完了数の契約へ改訂した。
- stage protocol の `Completed` 定義と更新経路の説明を更新した。

## TDD 実測

新設した `tests/integration/t-completed-effective-counter.integration.test.ts` は、実 FS と実 CLI process を使うため integration 層に配置した。

Red（実装前）:

```text
Expected: "5"
Received: "6"
0 pass / 1 fail
```

SKIP 実効へ変更した `feasibility` を `[x]` にすると、旧実装は生カウント 6 を書き、EXECUTE 実効完了数 5 と乖離した。

Green（実装後）:

```text
tests/integration/t-completed-effective-counter.integration.test.ts
2 pass / 0 fail
```

2 件目は `Completed: 999` を注入し、approve 検証器が `completed count` を返すことを固定した。

## 検証結果

- `bun run typecheck`: exit 0
- `bun run lint`: exit 0（既存の complexity 等 407 warnings / 11 infos、error なし）
- targeted canonical / re-sync: 17 pass / 0 fail
- state / jump / scope-change / recompose の既存 targeted 群: exit 0
- `bun run build`: exit 0（全 8 harness の dist 再生成と project-local self install 更新に成功）

## 配布面

`bun scripts/package.ts` で全 harness の生成面を更新して targeted test を実行した。`dist/` と self-install 面は disposable な生成物としてコミット対象に含めず、正本だけを変更対象とする。
