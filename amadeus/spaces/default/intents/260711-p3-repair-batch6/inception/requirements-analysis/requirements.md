# Requirements — 260711-p3-repair-batch6(P1-P2 バグ6件バッチ修正)

## トレーサビリティ

- **上流**: intent 記述(leader 割当 2026-07-11、対象 #841/#842/#836/#840/#847/#848)、RE 成果物 `inception/reverse-engineering/scan-notes.md`(6欠陥の現存・現行 file:line・元修正コミット対照を実測済み)、codekb `code-quality-assessment.md`(batch6 節)。
- **クロスレビュー前提の再確認**: 6 Issue すべてに起票者以外2名の独立エビデンス付き verdict コメントが存在することを gh で再実測(2026-07-11、conductor 確認)。バッチ編入前提(cid:issue-cross-review)を充足。
- **欠陥クラス**: 6件中5件(#841/#842/#840/#847/#848)は「restart/reset による過去修正の喪失」regression。元修正コミット: #486=`3eca83a56`、#481=`2c2c48a39`、#459=`765fe4f20`、#538=`c6597bf18`、#499=`c8ddabffc`(いずれも `git show` 可能なことを RE で実測済み)。#836 は更新機構自体が不在(復元でなく新規配線の可能性 — Q1 参照)。
- **差分再接地の受け入れ基準化(leader 留意事項)**: 各 FR は「元修正の単純 cherry-pick 復元」ではなく「元修正の契約を現行コードへ適合させた再実装」を要求し、受け入れ基準に (a) 元修正 diff との契約同等性の宣言 (b) 現行コードとの適合点の明記(code-summary に記録)を含める(E-L53 3点法の requirements 側)。

## FR-1 — #841: tryEmitSwarm のカバレッジベースのバッチ進行復元(P1/S2)

- **現状**: `amadeus-orchestrate.ts:1717-1720` が静的 `batches[0]` を無条件採用し、完了バッチを除外しない。autonomous バッチ進行が毎回バッチ1を再提示。
- **期待挙動**(元修正 `3eca83a56` の契約): batches を順に走査し、`unitCovered` 判定で未カバー unit を含む**最初の**バッチを提示対象とする。全バッチがカバー済みなら swarm 提示をしない(return false)。
- **受け入れ基準**:
  1. 完了バッチ(全 unit covered)を含む fixture で、次バッチが提示されることをテストで固定(修正前 RED / 修正後 GREEN の落ちる実証)。
  2. 全バッチ完了 fixture で swarm 非提示(false)をテストで固定。
  3. 元修正 diff との契約同等性+現行 `readBoltDagBatches`/`unitCovered` 実装への適合点を code-summary に記録。

## FR-2 — #842: jump の phase 境界イベント契約の復元(P2/S2)

- **現状**: `amadeus-jump.ts:432-447` が `direction` 非依存で PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を emit。backward でも偽 Verified、複数 phase 跨ぎ forward が単一イベント対、PHASE_SKIPPED 不在。
- **期待挙動**(元修正 `2c2c48a39` の契約): (a) emit は `direction === "forward"` のときのみ(backward は無 emit) (b) 閉じる phase を正準順で per-phase 列挙 (c) 実行済み stage を持つ phase は PHASE_VERIFIED、持たない phase は PHASE_SKIPPED (d) 同一トランザクションで Phase Progress を更新。
- **受け入れ基準**:
  1. backward jump で phase イベントが 0 件であることをテストで固定(落ちる実証: 修正前は emit されて RED)。
  2. 2 phase 以上跨ぐ forward jump で per-phase のイベント列(VERIFIED/SKIPPED の使い分け含む)をテストで固定。
  3. 元修正の `markPhaseVerified`/`PHASE_PROGRESS_FIELD` 相当の現行適合(FR-3 との共有設計は Q1 裁定に従う)を code-summary に記録。

## FR-3 — #836: Phase Progress ロールアップの更新配線(P2/S3)

- **現状**: `## Phase Progress` セクションを書くのは init(`amadeus-utility.ts:2449`)のみ。Phase Progress flip を要する経路は**4本**(advance `amadeus-state.ts:1135` / finalize `:1258` / complete-workflow `:1283` / jump)— うち Lifecycle Phase の setField 直書きは advance/finalize の2箇所で、complete-workflow(`Status: Completed` 設定 `:1340`、PHASE_COMPLETED/VERIFIED emit `:1361-1373`(COMPLETED :1366-1369 / VERIFIED :1371-1373))と jump は flip を要するが現行は未配線。Progress セクションは init 以降 stale(init テンプレート `:2398-2399` の flip 約束に対する write⇔update 非対称)。#836 クロスレビューの再現ケース(`Status: Completed` の intent)は complete-workflow 経路由来(E-B6a-r 訂正 2026-07-11、6/6)。
- **元修正(契約参照)**: 旧系譜 `8cf816138`(現 main の祖先ではないが `git show 8cf816138:.agents/amadeus/tools/amadeus-state.ts` で参照可)に `markPhaseVerified` の全経路実装が現存 — 「PHASE_VERIFIED emit と同一トランザクションで該当 bullet を Verified 化、最終 phase は complete-workflow で処理」の契約を再接地の参照元とする。
- **期待挙動**: phase 境界の advance で当該 phase が Active へ、phase 完了(当該 phase の最終 stage 承認)で Verified へ flip する。delegate 承認フロー・complete-workflow 経由の最終 phase 完了でも同様に更新される。SKIP された phase は Skipped へ。
- **受け入れ基準**:
  1. bugfix スコープの delegate 承認フローを模した fixture で、phase 境界通過後に `## Phase Progress` の該当行が Active/Verified へ更新されることをテストで固定(修正前 RED)。加えて **complete-workflow 経由の最終 phase 完了**を独立テストケースとして固定(#836 再現ケースの直接閉包。修正前 RED)。
  2. 実装位置は E-B6a 裁定(B、6/6)+ E-B6a-r 訂正(6/6): 共有ヘルパー(旧系譜 markPhaseVerified/PHASE_PROGRESS_FIELD の契約を復元・一般化)を amadeus-state.ts に置き、advance(:1135)・finalize(:1258)・complete-workflow(:1283)・jump(FR-2)の**4経路すべて**から呼ぶ。W1(FR-2)でヘルパー導入 → W3(FR-3)で advance/finalize/complete-workflow 配線。裁定 ID を code-summary に記録。
  3. init テンプレートの約束文言(`:2398-2399`)と実装挙動の一致を確認(乖離があれば文言側も同一 PR で現行化)。
  4. 旧系譜 `markPhaseVerified` 設計との契約同等性(トランザクション同座・最終 phase の complete-workflow 処理)を code-summary に宣言。

## FR-4 — #840: detectWorkspace の言語走査の一般化復元(P2/S3)

- **現状**: `amadeus-utility.ts:1949-1954` の再帰対象が `SCAN_SOURCE_DIRS`(`:1762`、src/app/lib/pages/components/tests)限定。`packages/` 等にコードを置く repo(本 repo 自身を含む)で Greenfield 誤判定 → RE が SKIP 降格。
- **期待挙動**(元修正 `765fe4f20` の契約): SCAN_EXCLUDE とドット始まりを除く全トップレベル dir を再帰対象へ一般化(深さ 6・symlink 除外は維持)。
- **受け入れ基準**:
  1. `packages/` 配下のみにコードを置く fixture で brownfield 判定になることをテストで固定(修正前 RED)。
  2. SCAN_EXCLUDE(node_modules 等)とドット dir が走査されないことをテストで固定(性能ガードの保全)。
  3. 元修正 diff との契約同等性を code-summary に記録。

## FR-5 — #847: linter sensor の lint:check 2段検出の復元(P2/S3)

- **現状**: `amadeus-sensor-linter.ts`(全357行)が `bunx eslint` ラップ専用。`lint:check` script の probe が無く、Biome 採用 repo(本 repo 自身)で常に 127 quiet PASS。
- **期待挙動**(元修正 `c6597bf18` の契約): 1段目 = workspace の package.json が `lint:check` を宣言していれば `bun run lint:check` をラップ(非0 exit = 1 violation、診断出力を message へ)。2段目 = 宣言が無ければ従来の eslint 検出(不在なら 127 quiet PASS)。
- **受け入れ基準**:
  1. `lint:check` 宣言ありで lint 違反のある fixture で FAILED(findings ≥1)になることをテストで固定(修正前 RED — 現行は quiet PASS)。
  2. `lint:check` 宣言あり・違反なし fixture で PASSED をテストで固定。
  3. 宣言なし fixture で従来 eslint 経路(または 127 quiet PASS)が保全されることをテストで固定。
  4. t92 の hermetic 化方針(#819/#862 で確立した stub 経路)と衝突しないこと — 統合テストは fork manifest / stub を使い実 eslint spawn を --ci 層へ持ち込まない。

## FR-6 — #848: docs-only intent の workspace_requires 免除経路の復元(P2/S3)

- **現状**: `declare-docs-only`/`GUARD_EXEMPTED`/`docsOnly` が全 tools で grep 0ヒット。`amadeus-state.ts:967-975` の無条件拒否のみ現存。免除手段がテスト用 env のみ(検証劇場 Forbidden に照らしても env バイパスは本来経路でない)。
- **期待挙動**(元修正 `c8ddabffc` B002 の契約): `amadeus-state.ts declare-docs-only` による宣言(evidence の形式検査+audit 実在照合)で workspace_requires ガードを免除でき、免除発動を `GUARD_EXEMPTED` として audit に記録。宣言なしの拒否経路は従来どおり保全。
- **受け入れ基準**:
  1. 宣言なし+workspace 無作業で approve が拒否されることをテストで固定(現行挙動の保全)。
  2. declare-docs-only 宣言後に同条件で approve が通り、GUARD_EXEMPTED 行が audit に記録されることをテストで固定(修正前 RED)。
  3. 不正な evidence(形式不備・audit 不在)で宣言が拒否されることをテストで固定。
  4. 現行 audit-format への適合点(イベント名・フィールド形)を code-summary に記録。

## 共通 NFR / 工程要件

- **並行度**: 同時アクティブ builder ≤2/intent(cid:parallel-bolts 2026-07-11 改訂)。Wave 編成: W1={FR-1,FR-2} → W2={FR-5,FR-4} → W3={FR-3,FR-6}(FR-3 は utility 波及可能性が FR-4 と、FR-6 は orchestrate 波及可能性が FR-1 と交差しうるため後行。着手前に先行 PR 実 diff で交差再判定 = c6)。
- **検証**: 各 Bolt で `bun run typecheck`/`lint`/`dist:check`/`promote:self:check` exit 0、`bun tests/complexity-gate.ts --check` OK(#837 ゲート)、push 前 local lcov で diff 追加行未カバー 0(cid:local-lcov-pre-push。spawn 経由でしか通らない行は in-process seam を先に設計 = seam-export-handler-amend)。spawn を使うテストは `env: process.env` 明示(cid:bun-spawn-env-snapshot)。
- **dist/self-install 同期**: 正本(`packages/framework/core/tools/`)編集後、`bun scripts/package.ts`+`bun run promote:self` を同一コミットに含める(7面同期)。
- **PR**: Bolt ごとに1 PR・日本語・deslop 実施・closing keyword は「クローズすべき Issue」にのみ使用(cid:closing-keyword-refs)。E-L20 再接地(merge-base 実測→rebase→全検証再実行)。マージ承認は台帳一括(cid:merge-approval-latency)。
- **同根棚卸し**: 各修正で同じ欠陥形状の他所在を grep で全数棚卸しし、同一 PR で修正するか Issue 化(cid:same-root-inventory)。特に「restart 喪失」クラスは元修正 diff に含まれていた他ファイル面(テスト・ドキュメント)の喪失も同時に確認する。既知の同根候補: #836 クロスレビュー(e1)指摘の「validator/doctor が『Status: Completed かつ Phase Progress: Pending』の矛盾を検出しない」— FR-3 実装時に doctor 検出の追加が surgical に収まるなら同一 PR、収まらなければ別 Issue 起票(FR-3 builder の判断事項として委任、判断結果を code-summary に記録)。
- **裁定前提の閉包実測**: 各修正適用後、Issue 起票時の症状の非再現まで実測し、前提不成立を検知したら実装を止めて報告(cid:ruling-premise-closure-verification)。
