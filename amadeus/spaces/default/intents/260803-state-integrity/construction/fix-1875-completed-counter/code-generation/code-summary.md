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

approve 検証ケースは、完了済み SKIP 行を含み `Completed` が raw `[x]` 数とは一致する state を注入する。これにより旧 raw 検証なら受理される一方、共有 writer 基準では `completed count` となる差を固定した。

レビュー BLOCKER 対応では、共通の legacy fixture（`[x] workspace-scaffold — SKIP` を持ちながら `Completed` は raw `[x]` 数）を用いて経路横断契約を強化した。

| 経路 | 契約の配置 |
| --- | --- |
| checkbox / advance / finalize / workflow completion / approve / jump | `tests/integration/t-completed-effective-counter.integration.test.ts` |
| scope-change | `tests/integration/t-scope-change-checkbox-preserve.test.ts` |
| recompose | `tests/unit/t194-recompose.test.ts`（既存の実 CLI・実 FS 契約を強化） |
| resync / init seed | `tests/integration/t394-compose-state-resync.integration.test.ts` |

approve 検証の反証 fixture は、旧 raw 検証なら `null`、共有 writer 基準なら `completed count` となることを同一 state 上で比較する。新たな本番 test-only export は追加していない。

## GitHub CI 回帰と是正

GitHub CI run `30917084332` では、t265 の final-report prepare 16 件と t361 の terminal-completion crash recovery 7 件が回帰した。

根本原因は、plan を変更しない state transition が `rebuildDerivedPlanFieldsFromState(...).content` を採用し、`Completed` に加えて `Stages to Execute`、`Stages to Skip`、`Total Stages` まで再描画したことにある。legacy state の数値だけの `Stages to Skip` が注釈付き表現へ変わり、`workflowCompletionContextDigest` が identity とする execution projection bytes を変更した。その結果、approve 後の completion prepare と terminal replay が既存の goal reconciliation receipt を `receipt completion context has changed` として拒否した。

是正として state adapter を `rebuildCompletedFieldFromState` へ改名し、full `rebuildDerivedPlanFields` で正準 `completedCount` を算出した後、返却する `content` は元 state の `Completed` だけを `setField` する Completed-only adapter にした。state transition、jump、approve 検証、workflow completion はこの adapter を使う。plan 自体を変更する init、scope-change、recompose、resync は引き続き full `rebuildDerivedPlanFields` を使う。

この是正後のローカルテスト／build は指示により未実行であり、修正後の GitHub CI で検証する。

## 検証結果

- レビュー修正前の `bun run typecheck`: exit 0
- レビュー修正前の `bun run lint`: exit 0（既存の complexity 等 407 warnings / 11 infos、error なし）
- レビュー修正前の targeted canonical / re-sync: 17 pass / 0 fail
- レビュー修正前の state / jump / scope-change / recompose の既存 targeted 群: exit 0
- レビュー修正前の `bun run build`: exit 0（全 8 harness の dist 再生成と project-local self install 更新に成功）
- レビュー BLOCKER 対応後のローカルテスト／build は、レビュー指示により未実行

**残る全ブロッキングゲートは GitHub CI [#2192](https://github.com/amadeus-dlc/amadeus/pull/2192) で検証中であり、現時点では未通過である。**

## 配布面

`bun scripts/package.ts` で全 harness の生成面を更新して targeted test を実行した。`dist/` と self-install 面は disposable な生成物としてコミット対象に含めず、正本だけを変更対象とする。
