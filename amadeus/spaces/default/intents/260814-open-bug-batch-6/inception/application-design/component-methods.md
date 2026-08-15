# Component Methods — 260814-open-bug-batch-6

既存メソッド/関数の変更点のみを列挙する(新規公開 API なし)。行番号は observed `a49f9e9f` 断面。実装時は現行断面で再解決する。

## C-1: github-pr-convergence(FR-1)

| 関数/箇所 | 現行 | 変更 |
| --- | --- | --- |
| `runConvergence`(cli `:1353`、ガード `:1364-1366`) | self×landed で全 verb を exit 1 拒否 | ガード削除。landed 評価は verb 分岐へ流し、self でも非 self と同じ landed 分岐(`:1392-1393` 相当)へ到達させる |
| `reportOutcome`(cli `:1253`、拒否 `:1260`) | self×landed 拒否 | landed 時は merge fact(mergeCommitOid / mergedAt / checkRollupState)束縛の report(kind: landed)を生成 |
| `writeSelfReport`(cli `:815`、拒否 `:823`) | self×landed 拒否 | kind: landed の self report 書込を許可(converged:false を維持) |
| センサー `evaluate`(sensor `:368-372`) | landed を無条件 finding | pr-convergence ステージの landed report は merge commit 検証(SHA 実在・PR 対応)付きで合格。他ステージ/検証欠落時は従前 fail |
| stage 文書 `pr-convergence.md`(landed 契約節・`:305-330` 付近) | 「landed is not convergence evidence」「guard をスキップする env はない」 | 「landed は既に起きたマージの記録事実(収束証拠と区別)」へ改訂し、auto-merge と report の順序契約を明記。FR-1 (4) の検査述語: 改訂後の stage 文書に対する `grep -c` で順序契約の節見出し(実装時に確定する固定文字列)が en 正本+全ハーネス投影で 1 hit 以上、旧文言「landed is not convergence evidence」が 0 hit(exit 1)であることを実測 |

- 検証シーム: 落ちる実証 1 セット(merged fixture → sensor pass / 未 merge fixture → fail)。留保の反映: checkRollupState は記録項目とし合格の必須条件にしない

## C-2: formal-model-check manifest(FR-2)

| 箇所 | 変更 |
| --- | --- |
| `plugin.json` | `"sensors": ["sensors/amadeus-model-completeness.md"]` を追加 |
| 発火配線 | センサー資産の manifest を実読し、宣言済み発火面(想定: formal-model-check / tla-authoring 系ステージの `sensors:` リスト)へ追加。配線先は実装時に資産の適用宣言から導出し、推測で広げない |

## C-3: 06-sensors docs(FR-3)

| 箇所 | 変更 |
| --- | --- |
| en/ja 表 | `amadeus-nfr-budget` / `amadeus-question-budget` / `amadeus-scope-sizing` / `amadeus-git-drift` の4行追加、`amadeus-model-completeness` 行は FR-2 宣言追加に伴い保持(投影済み注記へ更新)→ 計 14 行 |
| 既存 docs 検証テスト | 表の行集合 = 実在集合(core + 宣言済み plugin)の突合検査を追加(件数フリー契約。落ちる実証: 1件欠落注入で赤) |

## C-4: t-worktree-gc(FR-4)

| 箇所 | 変更 |
| --- | --- |
| git ヘルパ retry(`:14-27`) | 一次証跡判定の結果「覆わない」場合のみ、観測失敗様式(job 94681485455 の stderr 実文)を発火条件へ追加(落ちる実証 1 セット)。「覆う」場合は変更 0 |
| 対称面棚卸し | `git worktree add` を fixture 準備に使うテストの全数 grep(述語を record へ記録)→ 同一リスクは起票のみ |

## C-5: 監査 emit(FR-5、調査)

| 箇所 | 変更(機序確定時のみ) |
| --- | --- |
| `emitErrorAuditRow` / `emitAuditEvent` / `ensureOtelBootstrap` | 宛先(実際に書かれる workspace)が呼出時 `projectDir` と一致しない経路が実測されたら、不一致時 loud fail または no-op へ是正+回帰テスト(TDD: 失敗テスト先行) |
