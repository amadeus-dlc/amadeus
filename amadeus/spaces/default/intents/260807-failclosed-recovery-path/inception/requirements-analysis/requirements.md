# Requirements — fail-closed ガードの回復経路3件(#2313 / #2330 / #2358)

上流入力(consumes 全数): `business-overview`(`amadeus/spaces/default/codekb/amadeus/business-overview.md` — fail-closed ガード3件の業務境界と「検出は正しいが遷移先が未実装」という共通形の把握に使用)、`architecture`(同 `architecture.md` — no-silent-drop の events 台帳世代・adapter/t413 の2述語構造・advisory store の schema 2 層・degrade 経路の unit 解決構造の設計文脈に使用)、`code-structure`(同 `code-structure.md` — 患部3ファイルの配置(`scripts/` = repo-only、`packages/framework/core/tools/` = dist 投影)と配布境界の確定に使用)。`intent-statement` / `scope-document` / `team-practices` は scope `self-fix` により産出ステージが SKIP のため不在(設計どおりの不在)。

## 承認系譜(approval lineage)

`cid:requirements-analysis:approval-lineage-citation` に基づき、本要件の裁定系譜を明示する:

1. **一次調査と Q1〜Q5 の裁定**: Issue [#2385](https://github.com/amadeus-dlc/amadeus/issues/2385)(2026-08-07 全問ユーザー裁定済み)。本要件はこれを既決の正本として引き継ぎ、再質問していない。
2. **RE 実測に基づく追加裁定4件**: 本ステージの `requirements-analysis-questions.md` Q1〜Q4(ユーザー承認 2026-08-07T04:29:50Z、全問 A)。
3. **Q2-A の敵対検証による精密化**: 同 Q5(ユーザー承認 2026-08-07T04:32:26Z)。#2385 §11 RAID 種1 が予定した「通るものが見つかれば実装前に停止して再裁定」の執行であり、#2385 Q2「案 A 採用」の枠内の精密化。仕様変更ではない。
4. **横断制約(ユーザー明示指示、#2385 逐語)**: 「**後のbugfixの足かせ作りはNGです**」— 全設計判断は残る open bug の後続修正と矛盾せず、遷移や述語を固定して塞がないことを受け入れ観点に含める。

## Intent 分析

3件はいずれも「**検出は正しいが、遷移先が実装されていない**」fail-closed ガードである(#2385 §1)。目的は検出の緩和ではなく、**検出後の回復経路の実装**である。

| Issue | 検出している条件 | 欠けている遷移先 |
|---|---|---|
| #2313 | 証拠の freshness paths が変わった | rebind/再検証への到達経路 |
| #2330 | ディスク上の store が schema 1 である | 移行または再質問の起動経路 |
| #2358 | 全 unit が被覆済みである | ステージゲートの発行経路 |

**影響範囲の訂正(本ステージ Q1-A 裁定)**: #2313/#2385 の「全 PR の trusted base ゲートが内容と無関係に `BASELINE_INVALID` になり、あらゆる修正 PR が着地できない」という断定は observed `b8e3e664f` で不成立である — main の最新 CI run 31135183415 は全 job success(ratchet ステップを含む `Lint and complexity` も success)、ローカル `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` は exit 0 / `NO_SILENT_DROP_OK`。恒久赤は **main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ**(直近3 run failure、コード `REBIND_NON_IDENTITY_DRIFT`)。修正の必要性は不変(reconcile 赤のまま evidence binding が陳腐化し続け、gate 実装を触る PR の rebind 運用も不明瞭)。全数実測は `amadeus/spaces/default/codekb/amadeus/re-scans/260807-failclosed-recovery-path.md` を正本とする。

## 機能要件

### FR-0. Issue 本文の訂正コメント(本ステージ Q1-A 裁定)

- FR-0.1: #2313 と #2385 へ、影響範囲の断定が observed で不成立である旨の訂正コメントを投稿する(上記 Intent 分析の実測3点 — CI run 番号・ローカルゲート exit 0・恒久赤の限定 — を verbatim で含める)。
- AC: 両 Issue に訂正コメントが実在し、実測値がコマンド出力からの転記であること。

### FR-1. #2313 — freshness path 集合の canonical 化と第2段 tree 証明の精密化(Bolt 1、#2385 Q1 + #2385 Q2-A(本ステージ Q5 で精密化)を同一 PR)

**同一 PR 必須の理由**(#2385 §10 Bolt 1、RE 実測で裏付け): 主分岐(freshness)と副分岐(identity 証明)は binding の**祖先性**で交互に現れる(observed では `git merge-base --is-ancestor fe8c701ba b8e3e664f` = exit 0 で主分岐)。また `evidence-rebind.ts` は pin glob に自己マッチするため、この修正 PR 自体が branch 内 rebind を強いられ、着地後の reconcile は identity 証明へ進む — 縮小が同乗しないと **PR 自身の着地が `REBIND_PR_LANDING_TREE_MISMATCH` で wedge する**。

- FR-1.1(canonical 定義): freshness path 集合を `tests/no-silent-drop/evidence-rebind.ts` に export し、t413(`tests/integration/t413-no-silent-drop-ci-adoption.test.ts:187-193`)と adapter(`scripts/no-silent-drop-evidence-adapter.ts:226-240`)の両方が import する。集合の中身は t413 現行の正準どおり **`:(glob)tests/no-silent-drop/**/*.ts` + `tests/no-silent-drop-gate.ts` の2要素**(`packages/framework/core/tools` は除外 — #2153 既決裁定、t413 `:181-186` コメントが明文)。**本 canonical 化により reconcile の freshness はコーパス(`packages/framework/core/tools`)の drift を検知しなくなる — これは #2153 既決裁定どおりの意図的縮小であり、コーパス側の陳腐化(census の staleness)は証拠再生成経路 #2216(前提 A-1)が所有する。** なお本 export は将来 #2216 / #2162 が freshness 集合や `EVIDENCE_BUNDLE_PATHS` を拡張するときの単一拡張点となる(1定義から導出)。
- FR-1.2(第2段証明の精密化 — 本ステージ Q5-A 裁定): `scripts/no-silent-drop-evidence-adapter.ts:316-324` の「PR head と landing の root tree 完全一致」要求を、「**canonical freshness パス集合(FR-1.1 の export)+ `EVIDENCE_BUNDLE_PATHS` 3ファイル(配列定義 `tests/no-silent-drop/evidence-rebind.ts:27-31`、構成要素の定数3件は `:24-26` — 実ファイル直読で確定)の面で PR head と landing が一致すること**」へ置き換える。それ以外の差分は base 前進として許容する。敵対検証(本ステージ Q5)の列挙3件の処分: **(a) base 前進 = 意図どおり許容(縮小の目的)、(b) 並行 gate 実装 PR の landing 混入の不可視化 = 敵対検証で検出された残存ホールであり本精密化により閉じる、(c) corpus 変更の混入 = 新規露出なし(t413 既決裁定が corpus を freshness 対象外としているため)**。
- FR-1.3(テスト追随): `t427-no-silent-drop-evidence-reconcile.integration.test.ts:473` 付近の `landingDrift: true` → "root trees differ" 期待を新証明の期待へ書き換える。`t427-...-workflow.integration.test.ts:82-86` の CLI ソース文字列 pin(`currentBindingIsValidForEvent` / `proveIdentityOnlyRebind` / `remoteMainTip`)は関数名を変えない限り不変に保つ。
- FR-1.4(落ちる実証): 新しい drift 検査と精密化後の第2段証明の**両方**に、赤くなるケースを注入して実証する(`cid:code-generation:falling-proof-injection-one-set` — 注入コミット→赤実測→復元→残渣ゼロの1セット。承認待ち PR での注入は別ブランチ)。第2段の赤ケースには**残存ホール (b) の形**(gate 実装パスの PR head↔landing 差分)を必ず含める。
- FR-1.5(docs 化 — 本ステージ Q4-A 裁定): `docs/reference/11-contributing.md`(+対訳 `.ja.md` 同時更新)に「gate 実装を触る PR は t413 が赤くなる → branch 内 rebind(`bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head>`)」の手順節を追加する。
- AC-1a: 修正後、observed 相当の再現(binding=`fe8c701ba`、event=`b8e3e664f`)で freshness 述語が canonical 集合の diff 空(実測済み: exit 0)により `true` を返し `REBIND_NOOP` になる(機械再現は fixture で行う)。
- AC-1d(FR-1.3): t427 系2ファイルのテストが新証明の期待で green、CLI ソース文字列 pin は不変のまま green(テスト実行の exit 0 で機械確認)。
- AC-1e(FR-1.5): `docs/reference/11-contributing.md` と `.ja.md` の双方に rebind 手順節が実在し、記載コマンドが `bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head>` と逐語一致する(grep で機械確認)。
- AC-1b: **主分岐・副分岐の両方が同一 PR 内で実測で閉包される**(片側だけの green で完了と扱わない — RE 申し送り1)。
- AC-1c: `#2379` 型の手動 rebind コミットを要さず、着地だけで次回 push から自然回復する。**着地後の main `No Silent Drop Evidence Reconcile` run の success 実測は FR-1 完了の必須条件**であり、landing 検証(`cid:requirements-analysis:close-after-landing-verification`)で確認する。着地後も赤のままだった場合は、ジョブログ実文で機序を再帰属(`cid:code-generation:rerun-red-reattribution`)したうえで**同一 intent 内で追加修正**する(修正不能な新機序と確定した場合のみ Issue 起票のうえユーザーへ報告し、FR-1 は未完了のまま扱う)。「着地は identity 証明経路のライブテストであり失敗しても現状より悪化しない」はリスク注記であって、本基準を代替しない(`cid:requirements-analysis:exemption-clause-must-not-substitute`)。

### FR-2. #2330 — advisory choice store の回復 verb 追加(Bolt 2)

- FR-2.1: `packages/framework/core/tools/amadeus-advisory-choice.ts` に回復 verb を追加する。`parseStore`(`:659-675`)は**無変更**とし、salvage は別関数で既存 `parsePending`(`:640-651` — pending は schema 1 のまま)を再利用する。schema 1 の receipts は翻訳せず**破棄**する(#2318 設計コメント `:653-657` の「ask the human again」を保存)。
- FR-2.2(対象範囲 — 本ステージ Q2-A 裁定): verb は**単一 store のみ**を対象とする(`--project-dir` で明示指定した1 store。既定は cwd 解決の active intent)。clone 内探索・複数一括処理は実装しない。
- FR-2.3(誤破棄防御 — #2385 §7(b)、実装時精密化 2026-08-07T05:33:58Z ユーザー承認): 破棄前に store の pending の intent identity と実行時 active intent の一致を検証し、不一致なら loud に拒否する。**pending 0 件・receipts のみの store では receipts の intent identity と実行時 active intent の一致を検証し、不一致なら loud に拒否する**(builder の逸脱前停止報告を受けた拡張 — FR-2.3 の目的 = 誤破棄防止を全分岐へ徹底。自 intent の receipts-only store は従来どおり成功し AC-2a と非衝突)。#2352 の環境下でも本線 store を誤破棄しない(#2352 の修正に依存せず、直った後も無害)。
- FR-2.4(出力契約): verb 出力に **receipts dropped 件数 / re-presentation required / formal check attempt カウントのリセット**を明示する。
- FR-2.5(テスト): t458 の schema 1 拒否 pin(ADR-9 テスト)は無傷に保つ。CLI dispatch 腕の追加は in-process seam でカバーするか `tests/.coverage-patch-allowlist.json` の更新を伴う。
- FR-2.6(docs): `docs/reference/12-state-machine.md` と `packages/framework/core/knowledge/amadeus-shared/audit-format.md` に provenance union / schema 2 の移行経路を記す(#2318 時点からの既存 drift の解消を verb 追加に同乗)。
- AC-2a: schema 1 store(pending N 件・receipts M 件)に対する verb 実行後、store は schema 2 で pending N 件が salvage され、receipts は 0 件、出力に dropped=M と再提示必要の明示がある(fixture で機械検証)。**pending 0 件・receipts のみの store も明示分岐とする**: verb は schema 2 の空 pending store を書き、出力は dropped=M・re-presentation 不要(再提示すべき pending が存在しない)を明示する — この形は `applyPendingAdvisoryGuard` の pending 0 早期 return により hold 自体が発生しない intent の store であり、verb の役割は将来の advisory 発生に備えた schema 正常化である。
- AC-2d(FR-2.5): t458 の schema 1 拒否 pin が無改変で green。新規 dispatch 腕は in-process seam のテストでカバーされるか、allowlist 更新が同一 PR に含まれ patch gate が green。
- AC-2e(FR-2.6): `docs/reference/12-state-machine.md` と `audit-format.md` に schema 2 / provenance union の移行経路の記述が実在する(grep で機械確認)。
- AC-2b: intent identity 不一致の store への実行は変更ゼロで非0 exit(loud 拒否)— 落ちる実証を含む。
- AC-2c: 回復後の intent で `report` のブロックが解消する(hold 経路の再現 fixture で閉包確認)。pending ≥1 の store では salvage された advisory が再提示されること、pending 0 の store では再提示なしで通常フローへ復帰することを分岐別に確認する。

### FR-3. #2358 — 明示宣言によるゲート発行(Bolt 3)

- FR-3.1(変更面): `packages/framework/core/tools/amadeus-orchestrate.ts` の **multi-unit アームのみ**(`degradeUnitResolutionError` の `uncovered.length === 0` 分岐、`:3727-3731`)。単一 unit の covered 解決(`:3805-3809`、t367 test 14 が INTENTIONAL として pin)は不変に保つ。
- FR-3.2(宣言の永続化 — 本ステージ Q3-A 裁定): conductor の「unit 追加終了」宣言は `amadeus-state.md` の**新しい H2 セクション**として永続化する。既存 parse 面・checkbox ガード・mirror snapshot 述語(#2252 類)・既存 reader を一切触らない**追加のみ**の設計とする。設計時に `amadeus-state.md` の parse 面・checkbox ガード・mirror 述語の消費側を棚卸ししてから書く(#2385 §11 RAID 種2)。**棚卸し結果は Bolt 3 の `code-generation-plan.md` に成果物として記録する**(self-fix は functional-design を SKIP するため、plan が唯一の設計記録面)。
- FR-3.3(hook 保存 — #2359 干渉制約): #2359(未レビュー unit の検査・開示・拒否)の後続実装を塞がないことを、次の2つの機械検証可能な述語で担保する: (i) **`unitCovered`(`:3746-3760`)の関数実装と既存呼び出し行を編集しない** — 新分岐は既に算出済みの `uncovered`(`unitCovered` filter の結果、`:3804-3806`)を**消費する側**にのみ追加する。機械確認は `git diff <PR の merge-base 固定 SHA>..HEAD` を `unitCovered` 関数本体と既存呼び出し行の範囲に適用して差分ゼロ(変更分岐の追加行は不変対象に含まれない — 外延はこの2面に限定) (ii) **宣言受理から directive 発行までの間に、被覆済み unit の集合を引数として受け取れる単一の関数境界が存在する**(#2359 側が unit ごとの Review 記録検査を後から挿入できる位置。in-process アサーションは境界の**存在**に加えて、**呼び出し側がその引数に実際の被覆済み unit 集合(fixture の実データ)を渡していること**を assert する — 引数を受け取るだけのダミー実装では通らない形にする。`cid:functional-design:c6` 静的契約 AC への検証手段バインディング)。
- FR-3.4(テスト契約の明示改訂): `t367-degrade-unitname-resolution.test.ts:411-420`(test 13 — 全被覆 refuse の pin)を宣言経路の期待へ書き換える。`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い、本改訂は本要件(**#2385 Q4-B** 既決 + **本ステージ Q3-A** 裁定)を根拠とする明示改訂である。
- FR-3.5(memory 層の同一変更): `project.md` の `cid:code-generation:c1-degrade-batch-directive-capture` へ追補(**#2385 Q4-B** 裁定と選挙記録 `260730-e-obb2-cg1` / `260730-e-obb2-cgs13` への参照を明記)を同一変更に含める — コードだけ直すと既決ノルムとの drift になる。
- FR-3.6(隣接ギャップの分離): degrade 経路の gate 抑制不全・report 側 coverage ガードのスキップ(#2359 同根の可能性)は触らず、#2358 上で別件と明記するコメントを投稿する。
- AC-3a: 全 unit 被覆 + 宣言ありで `next` がステージゲート付き directive を発行する(fixture)。
- AC-3b: 全 unit 被覆 + 宣言なしは従来どおり fail-closed の error directive(退行なし — 落ちる実証を含む)。
- AC-3c: 単一 unit の挙動(test 14)はバイト不変。
- AC-3d: 宣言 H2 追加後の `amadeus-state.md` を既存 reader(state parse・checkbox・mirror snapshot 述語)が従来どおり読める(既存テストのグリーン維持で機械確認)。
- AC-3e(FR-3.3): `unitCovered` とその呼び出し集合の diff がゼロ(機械確認)、かつ宣言受理〜directive 発行間の関数境界(被覆済み unit 集合を引数に取る)の存在を assert する in-process テストが実在し green。
- AC-3f(FR-3.5): `project.md` の `cid:code-generation:c1-degrade-batch-directive-capture` に追補が実在し、#2385 と選挙記録 `260730-e-obb2-cg1` / `260730-e-obb2-cgs13` への参照を含む(grep で機械確認)。コード変更と同一 PR に同乗している。
- AC-3g(FR-3.6): #2358 に隣接ギャップを別件と明記するコメントが実在する。

## 非機能要件

- NFR-1(TDD): 実行可能な振る舞いの追加・変更は TDD を既定とする(team.md Testing Posture)。各 FR は合意済み公開 seam への失敗テスト1件の Red 実測から始める。
- NFR-2(検証コマンド標準集合 — #2385 §11 RAID 種3): `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / coverage 両ゲート / complexity / 隔離2回ビルド再現性 / `bun run source-only:check`。既存赤は変更前 base との失敗集合 diff で帰属してから扱う(`cid:build-and-test:c4-260805-subagent-type-guard`)。
- NFR-3(ローカルゲート呼び出し規約): no-silent-drop gate のローカル実行は `--base-revision <HEAD の厳密祖先の完全 SHA>` 必須(省略 = `BASELINE_INVALID` / exit 2、HEAD 自身 = strict ancestor 拒否。`tests/no-silent-drop/engine.ts:250-252` / `tests/no-silent-drop/ledger.ts:213-223`)。SHA は `rev-parse` 実出力のみを使う。
- NFR-4(配布境界): #2313 の患部は `scripts/`(repo-only、dist 投影なし)、#2330/#2358 は `packages/framework/core/tools/`(正本 → `bun run build` で再生成、追跡ファイル不変を確認)。Bolt ごとに該当する検証面を適用する。
- NFR-5(台帳波及): `amadeus-advisory-choice.ts` / `amadeus-orchestrate.ts` への行挿入では coverage-patch-allowlist の機械 remap + reason 直読照合 + span 膨張検査、census は最終 base で採る。no-silent-drop 台帳は events 追記のみ(削除・snapshot は maintenance CI 専用)。

## 制約

- C-1: Bolt 編成は **3 Unit(1 Issue = 1 Unit)、#2313 = Bolt 1 固定**、Bolt ごとに PR、複数 Unit を単一 PR に束ねない(#2385 Q5 既決)。※Bolt 1 固定の当初根拠(全 PR 偽赤)は失効したが、順序は維持する — **FR-2/FR-3 の患部 `packages/framework/core/tools` は現行 adapter の freshness 集合の要素であり、Bolt 1 より先に Bolt 2/3 を着地させると reconcile の drift をさらに積む**(canonical 化後はこの依存自体が消えるため、Bolt 1 先行が唯一 drift を増やさない順序である)。
- C-2: engine 起動は相対形(`bun .claude/tools/amadeus-orchestrate.ts …`)。`$CLAUDE_PROJECT_DIR` 前置の絶対形は #2352 により禁止(#2385 §8)。
- C-3: 横断制約「後の bugfix の足かせ作りは NG」— #2359(`unitCovered` 共有)は FR-3.3、#2352(store パス解決)は FR-2.3、#2216(証拠再生成経路)は FR-1.1 の縮小申告と前提 A-1、#2162(canonical 定義の拡張点)は FR-1.1 の単一拡張点の明文で、それぞれ固定した。
- C-4: 新規テスト番号は **t466 以降**(observed 使用済み最大 t465、`re-scans/260807-failclosed-recovery-path.md` 実測)。再接地時は固定 base SHA で再確認する。
- C-5: 各 Bolt 着手時に #2385 §9 の鮮度再実測を繰り返す(reconcile 失敗コードの再帰属・先行 PR 棚卸し・binding の祖先性・#2359 の修正有無)。

## 前提

- A-1: 証拠再生成経路の不在(23 receipt の再実行不能性)は本 intent のスコープ外で、#2216 が正規トラッカー(#2385 §4)。
- A-2: advisory store は per-clone の gitignored ランタイムであり、git からの census は不能。本 clone 実測(schema 1 × 5 / schema 2 × 1)は分布の実例であって全数ではない。
- A-3: #2385 の測定 ref `b8e3e664f` は本 intent の observed と完全一致し、file:line 引用は再解決不要(±2 行の範囲差は re-scan 記録に列挙済み)。

## スコープ外

- 証拠束の全 receipt 再生成 verb(#2216)。
- #2359(§12a Review 未記録 unit の事後 verdict 経路)、#2352(project-dir の worktree 解決)、#2162(bootstrap provenance)の修正。
- degrade 経路の隣接ギャップ(FR-3.6 で別件と明記するのみ)。
- formal-model-check の JDK pin 脆弱性(#2361 既存 OPEN が担当)。

## 未解決事項(Open questions)

- OQ-1: #2361 への追記候補 — docker イメージ実体がローカルに在っても RepoTag が `<none>` だと digest 付き参照(`docker image inspect <tag>@<digest>`)が解決できず `ENVIRONMENT_UNAVAILABLE` になる(本 intent の advisory 実行で実測、digest 指定 pull で即復旧)。担当: conductor。本 intent の build-and-test 完了時(FR-0 の Issue コメントと同じタイミングでよい)に #2361 へ追記コメントを投稿する。
- OQ-2: #2338 着地(events 台帳化)が「全 PR 偽赤」を解消した機序の確定は行っていない(Q1 裁定は影響範囲の実測訂正のみを要求)。訂正コメントでは仮説と実測を区別して書く。
- OQ-3(次回 RE への申し送り): codekb `architecture.md` は `EVIDENCE_BUNDLE_PATHS` の行引用を `:24-30` と記すが、実ファイル直読の確定値は定数 `:24-26` + 配列 `:27-31`。次回 RE の差分リフレッシュで codekb 側を是正し、旧値を再導入しないこと。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T04:46:02Z
- **Iteration:** 1
- **Scope decision:** none

上流接地・裁定系譜・RAID種1実施は水準を満たすが、AC-1c の免責節同居と FR-3.3 の検証手段不在の2 BLOCKER により差し戻し。Major 5件・Minor 4件。

### Findings

- BLOCKER | AC-1c が自己矛盾 — 「着地後 main reconcile run success の確認」と「失敗しても現状より悪化しない」免責節が同居し合否判定不能(exemption-clause-must-not-substitute 違反)。success 必須条件化+赤時の処置定義+免責はリスク注記である旨の明示が必要
- BLOCKER | FR-3.3「#2359 の hook を挟める形に保つ・塞がない」に検証手段が不在 — ユーザー逐語制約「後のbugfixの足かせ作りはNG」の唯一の実装面が測定不能。unitCovered バイト不変+宣言受理から directive 発行までの関数境界の存在を AC 化しテスト ID に束ねる是正が必要
- FOLLOW-UP | FR-1.1 の検出面縮小(corpus drift 検知の消失)が意図的縮小として申告されておらず、残余リスクの所有者(#2216)の1箇所明示が必要
- FOLLOW-UP | 裁定番号の出典が同一文書内で衝突(#2385 Q2-A/Q4-B と本ステージ Q2-A/Q4-A が修飾語なしで併存)— 全箇所で出典前置が必要
- FOLLOW-UP | AC を持たない FR が6件(FR-1.3/FR-1.5/FR-2.5/FR-2.6/FR-3.5/FR-3.6)— 各 Bolt の AC へ機械確認可能な形で追加が必要
- FOLLOW-UP | FR-1.2 の evidence-rebind.ts 行引用(:27-31)が architecture.md の :24-30 と不一致 — 実ファイル直読で確定し誤側を是正
- FOLLOW-UP | AC-2a/AC-2c が pending 0 件・receipts のみの store(最も詰みやすい形)を未規定 — 分岐と出力契約の明記が必要
- NIT | C-1 の Bolt 1 固定の新根拠が循環気味 — FR-2/FR-3 患部が現行 adapter freshness 集合の要素である機序へ接地させる
- NIT | Q5 敵対検証の列挙 (a)/(c) の処分が requirements 本文に未転記
- NIT | C-3 の「固定済み」主張のうち #2216/#2162 の対応条項が追跡不能
- NIT | OQ-1 の担当・期限が未定

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T04:58:08Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2件(AC-1c 免責節同居 / FR-3.3 検証手段不在)は検証可能な述語へ是正され閉塞。Major 5件・Minor 4件も全数実在確認。FOLLOW-UP 2件(FR-3.1↔AC-3e の潜在衝突の外延定義、存在アサーションの実データ搬送固定)と NIT 2件を残す。

### Findings

- FOLLOW-UP | FR-3.1 と AC-3e の潜在衝突 — 「unitCovered の呼び出し集合バイト不変」の外延(変更分岐を含むか)と diff 比較 base を一意定義するか、変更を「既存呼び出しを編集せず結果消費側に新分岐」へ限定する
- FOLLOW-UP | AC-3e (ii) の関数境界存在アサーションはダミー実装でも通り得る — 呼び出し側が実際に被覆済み unit 集合の実データを渡していることを1アサーションで固定する
- NIT | FR-1.2 の (b) 処分の語順が「残存したまま」と誤読しうる — 「本精密化により閉じる」へ
- NIT | codekb architecture.md:44 の EVIDENCE_BUNDLE_PATHS 行引用(:24-30)は次回 RE で旧値再導入の恐れ — 申し送りに1行残す
