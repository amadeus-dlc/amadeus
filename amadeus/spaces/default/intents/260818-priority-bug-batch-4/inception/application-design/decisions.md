# Application Design — Decisions

Intent: 260818-priority-bug-batch-4(depth Minimal — 実際に行った裁定のみ記録)

両 ADR の方式は選挙 **E-260818-PBB4-FIX-METHODS**(fresh subagent 2名、blind 配布、tally run-1 2026-08-18T08:18:13Z、両問 established 2-0・GoA 2/2)で裁定した。留保は established の付帯情報ではなく**実装契約の一部**として本書に転記する(cid:code-generation:c1)。上流: `../requirements-analysis/requirements.md`(FR-2837-* / FR-3106-*)、codekb `architecture.md`・`component-inventory.md` の本 intent 節(患部の現在形)。

## ADR-1: invoke-swarm 実行コンテキストはハイブリッド契約(batch identity のみ directive 搬送)

**Context**: engine は 1-origin batch 番号を `firstUncoveredBatch`(orchestrate.ts:3929)で算出しながら emit 境界(:4294 → `emitConfiguredSwarm` :4074)で破棄し、conductor 面 8 面中 7 面が `--batch <n>` の手動指定を要求する(codekb component-inventory.md の census)。check_cmd/test_file は `amadeus-swarm.ts:231-234` が「利用者の trusted input」と明示し、engine 側に権威ある宣言先が存在しない(`git grep -n "check_cmd" -- packages/` → exit 1)。

**Decision**(選挙 q1 = C、2-0): dispatch に不可欠な **batch/pool identity のみ** を invoke-swarm directive へ載せる。check_cmd / test_file は conductor(ユーザー)知識のままとし、**供給責任者と正規取得元を directive 契約コメントと全 8 conductor 面の本文へ明記**する(engine は供給しない。8 面確定は実装契約6)。

**実装契約(両票留保の合成 — 全項必須)**:
1. check_cmd / test_file を `INVOKE_SWARM_FIELDS` に入れない。engine が populate しない値を directive に載せることは検証劇場クラス
2. 搬送する identity は conductor がそのまま `prepare --batch` へ渡せる値とする。現行 prepare は `/^[1-9][0-9]*$/` のみ受理し(amadeus-swarm.ts handlePrepare)、その値が durable な pool identity(`unit-pool:${flags.batch}:initial-enqueue`、:638)になる。pool generation を織り込んだ結果が非数値になるなら prepare と pool 側の受理形も**同一変更**で決め、engine が prepare に拒否される値を emit しない
3. batch identity は engine の単一の権威とし、DAG index を鍵にする既存 join を grep で全数再列挙して同一変更で整合させる(起票時実測の複製面: orchestrate.ts:3918-3922 readProjection(String(index+1)) / :2527 foldUnitPoolEventSets / :2549 settle 行 batch 突合 / :4700 settlePerUnitOutcomes batchOf / :4046 declaredBatchOf / :3889-3892 batchGateQuestion + approve-batch 台帳 / swarm.ts:554 prepare validator。一部だけ直す合意述語ドリフト禁止 — cid:code-generation:cg2-agreeing-predicate-drift。実装時に述語と件数を成果物へ記録)
4. `prepared_batch` / `retry_unit` arm(:4092-4106、validator)と同一概念に別名を作らない。新フィールドと retry arm の排他/含意関係を `INVOKE_SWARM_FIELDS`(directive.ts:555)+ FIELD_CHECKS へ明示し validator テストを足す。t135 / t113 / t181 を連動更新
5. `amadeus-directive.ts:306-311` の設計コメント「the conductor reads the rest of the batch context off the compiled runtime graph」は batch について偽になるため同一変更で訂正(FR-2837-5 の stale 参照 2 箇所と同時に)
6. FR-2837-2 の閉じ方: 「check_cmd / test_file は conductor 知識、engine は供給しない」を契約文書に明記し、**全 8 conductor 面(pi を含む)**へ正規取得元を書く — FR-2837-2 の受け入れ「0 件の面が残れば fail」を設計段階で確定し、実装時判断へ先送りしない(§12a iteration-1 FOLLOW-UP の解消)。pi 面は現状 swarm 手順の記載が薄い(census 0 hit)が、swarm dispatch を受け得る conductor 面である以上、正規取得元の1節を追加して受け入れ述語を満たす。受け入れ grep は**配送先ツリー**(dist/<harness>、self-install)で実測(cid:requirements-analysis:c2-acceptance-at-delivery-tree)。本 intent で config キー等の宣言先を新設しない(必要なら別 Issue)
7. FR-2837-4(b) 回帰テストは「failed terminal → 上流 replan → 同一 Unit 再提示」(uncovered 判定 :3923-3928 は cancelled/succeeded のみ除外)を通し、emit された directive 実物の identity が旧 terminal pool と衝突しないことを assert する。**修正前 Red を先に実測**。t135 の `--batch` ハードコードを batch 導出の直接検証へ置換
8. 後方互換レイヤー・移行シム禁止(旧形は置き換え)。orchestrate.ts を触るため model-map ハッシュピン / coverage-patch-allowlist / (新規テスト時) coverage-registry の台帳 resync 同梱

**Consequences**: directive 契約の変更は t135/t113/t181 と 7 conductor 面の同期を要する(FR-2837-3)。batch identity の権威が engine 側に一本化され、conductor の推測再導出が消える。check_cmd の宣言先問題は解かない(conductor 知識の文書化で閉じる)— 将来 engine 宣言を導入する場合は別 Issue。

**Alternatives Rejected**:
- **A(directive 全部載せ、起票者推奨)**: check_cmd/test_file は engine に権威値が不在で、載せても populate されない偽フィールドになる(検証劇場)。swarm.ts:231-234 の既決設計判断を覆す新契約であり self-fix の範囲を超える
- **B(read-only context verb)**: 新 CLI 面 + 7 面の呼出順 prose を増やしながら check_cmd の宣言先問題は解けず、retry arm = directive / 新規 arm = verb という新しい非対称を作る(prepared_batch / execute-failure-election の「directive で運ぶ」前例に反する)

**Reversibility**: 中 — directive フィールド追加は閉語彙 1 箇所 + validator で管理され、除去も同経路。pool identity の形は台帳(冪等鍵)に残るため出荷後の変更は migration を要する。

**セキュリティ・コンプライアンス影響**(inception guardrail 必須項): batch identity は engine が内部算出する非秘匿値であり、外部からの信頼できない入力面を新設しない。check_cmd は従来どおり利用者の trusted input のまま(engine 供給に変えないのが本裁定)で、権限昇格・入力検証の境界は不変。監査面はむしろ改善する — conductor の推測値でなく engine 権威値が pool 台帳の識別子になり、dispatch の追跡性が上がる。コンプライアンス影響なし(個人情報・規制対象データを扱わない)。

## ADR-2: per-unit 経路の terminal outcome は settle emitter の語彙拡張で記録(cancelled / failed)

**Context**: `settlePerUnitOutcomes`(orchestrate.ts:4686)は :4706 で cancelled unit を skip し、`SETTLED_UNIT_OUTCOME`(:2475)= "succeeded" 単一値、reader(:2499)は succeeded 以外 throw。母集団(:2513)は pool event set + settle 行のみを読み、検出側 `cancelledConstructionUnits`(:3934)が読む canonical projection を読まない(codekb architecture.md 本 intent 節の「2 読み口の可視性不一致」)。下流 fanout の KNOWN_OUTCOMES(:199)は cancelled/failed を既に受理。reviewer-1 が構造停止を end-to-end 再現済み、reviewer-2 SR1 により failed も同一裁定対象。

**Decision**(選挙 q2 = A、2-0): `settlePerUnitOutcomes` が cancelled / failed も `UNIT_OUTCOME_SETTLED` 行として記録し、`SETTLED_UNIT_OUTCOME` を**ちょうど3値の閉集合 {succeeded, cancelled, failed}** へ拡張する(reader :2499 の受理拡張を含む)。読み口(fanout)は変更しない。

**実装契約(両票留保の合成 — 全項必須)**:
1. 閉語彙はちょうど3値。`readSettledUnitOutcomes` は語彙外・鍵欠落を INVALID_SETTLED_ROW で throw し続け、「編集された台帳が consumer の実行可否を決められない」保証(:2471-2475)を弱めない。`SettledUnitOutcome.outcome` の型も union へ更新
2. cancelled / failed の行は unitCovered ゲート(:4707)に載せない — coverage 述語は succeeded arm 専用のまま(reviewer-1 は成果物ディレクトリ削除下でも発火を実測)。cancelled/failed の値は canonical construction outcome projection(cancelledConstructionUnits と同一源)から導出する **engine 観測事実に限り**、conductor 供給値を受け取らない
3. E-260815-3099-C-FORM の共通制約を逐語保存: 数値 batch join(:2527 / :2549)と pool 優先 de-dup(:2546-2551 — pool terminal を持つ unit には settle 由来 outcome を積まない)。同一 unit が 2 行にならないことをテストで固定
4. **supersession 規則を明示決定**: 冪等鍵 perUnitOutcomeKey(:2485 = stage+unit+batch)のままでは cancelled 行が付いた後の再実行・再成功を上書きできない。鍵と reader の採択規則(audit sequence 最大行を採る等、shard ファイル順非依存の決定的順序)を実装時に固定し、cancel → BOLT_STARTED 再入(projection :262-265 の currentTerminals delete)→ success の系列をテストで固定(write⇔read round-trip 観点 — cid:build-and-test:pbt-developer-testing-posture)
5. **failed arm は到達可能性の Red 実証を前提とする**: per-unit 経路で実際に failed terminal に到達する系列の Red を先に実測してから実装する。到達不能と実証された場合は failed arm を実装せず、FR-3106-1(b) の許す「採らない根拠」として設計成果物へ記録する(未到達 arm へのテストはテスト劇場)。到達可能なら cancelled / failed **両方**の Red を修正前に置く(FR-3106-2、t533 integration :786-801 の対の位置)
   - **実装時の裁定結果(2026-08-18 追記 — §12a FOLLOW-UP の traceability 閉包)**: failed arm は**不採用**。builder が到達不能を実測(solo BOLT_FAILED は failure ruling が settle の手前で介入し UNIT_OUTCOME_SETTLED 0 件 — 実測3系列と機序は `construction/issue-3106-per-unit-outcome/code-generation/code-summary.md` の「failed arm の採否」節が一次記録)。characterization テスト C1 で回帰ピン。3値閉語彙の reader 受理は維持
6. FR-3106-3 対称性: consumer を止めず当該 unit の paths のみ除外(pool 版と同一挙動、:395-403 の pool 優先テストの前提不変)。第3の挙動を発明しない
7. **E-260815-3099 系裁定との関係(再裁定の明示)**: `Outcome: succeeded` 限定は #3105 の実装判断であり、FIX-METHOD の subagent-1 留保「根拠が足りないと実装時に判断される場合はその場で緩めず再裁定へ戻す」を**本選挙が満たす**(無申告の上書きではない)。C-FORM が拘束したのは succeeded arm の発行点であり、cancelled/failed arm は固有の観測境界を持つ拡張であって矛盾ではない
8. 残余の明示: 「2 読み口の可視性不一致」(検出側 = canonical projection / 母集団側 = pool event set + settle 行)は A では**根では閉じない**。無言の既知限界にせず、残余であり別 intent の候補であることを明記する。SR2(loadRuntimeUnitBatches null 時の全面不発行)・SR3(batch 未収載 unit — well-formed DAG では到達不能)は本 unit のスコープ外だが同一関数を触るため棚卸しを実装成果物に記録
9. FR-3106-4(docs 英日、grep exit code 付き受け入れ)と台帳 resync(model-map / allowlist / registry)を同一変更に含める

**Consequences**: 修正は emitter 側(orchestrate.ts)に閉じ、fanout・pool coordinator・audit イベント語彙(イベント名は既存 UNIT_OUTCOME_SETTLED のまま)への変更なし。supersession 規則の新設で settle 台帳が再実行に追従する。

**Alternatives Rejected**:
- **B(母集団読み口の統一)**: E-260815-3099-FIX-METHOD で 0 票の「読み口統一」の再来。canonical projection は {intent, stage} スコープで consumer stage から producer stage を解決する新次元が要り、solo の非数値 batch id が C-FORM の「数値 batch join 逐語保存」制約に抵触、outcome 供給源が3系統になり producer-outcome-ambiguous 誘発リスク
- **C(発生点で pool event 発行)**: E-260815-3099-C-FORM の established(pool 単一 writer 不変・pool 捏造禁止)と subagent-2 留保(solo:<n>:<unit> 非数値 id の batch join 退化)を正面から覆すため、再裁定なしに採れない(同選挙で C1 は 0 票)

**Reversibility**: 高 — 語彙拡張は閉集合の定数 + reader の受理集合に閉じ、行の追記は append-only 台帳の新値なので、拡張の取り消しは emit 停止のみで済む(既存行は歴史として残る)。

**セキュリティ・コンプライアンス影響**(inception guardrail 必須項): settle 行は engine 観測事実(canonical projection)のみから導出し conductor 供給値を受け取らない(実装契約2)ため、台帳への改竄・注入面は増えない。reader の fail-closed(INVALID_SETTLED_ROW throw)維持により「編集された台帳が consumer の実行可否を決められない」保証も不変。cancel/fail の監査可視性が向上する(可観測性の改善)。コンプライアンス影響なし。
