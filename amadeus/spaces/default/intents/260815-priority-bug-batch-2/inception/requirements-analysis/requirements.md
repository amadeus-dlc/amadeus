# Requirements — 260815-priority-bug-batch-2

> Scope: self-fix / Depth: Minimal / Autonomy: full。upstream 入力: 本 intent の RE が更新した codekb(`amadeus/spaces/default/codekb/amadeus/` の architecture.md・code-structure.md・code-quality-assessment.md — 本 intent 差分リフレッシュ済み断面、observed `9ba8170bb`)。business-overview.md は本 intent の RE で無変更につき本バッチの事実は引かず既存一般記述のみ前提とする。患部 file:line は Dev スキャン + Architect 独立実読(4 訂正反映済み)+ conductor 直読で実測。

## Intent 分析

未着手の open バグ 4 件(#3077 P2、#3074 P3/S3、#3075 P3/S4、#3079 P3/S4)を単一バッチで修正する。#3077 は選挙機構の構造的デッドエンド(architecture.md に契約不整合として記録済み)、#3074 はエンジンガードの過剰拒否、#3075/#3079 は前バッチで確立したテスト時間方針(ユーザー裁定 2026-08-15)の横展開。全 Issue クロスレビュー独立 2 名 CONFIRMED 成立済み(各 Issue コメント)。#3078/#3088 は open-bug-batch-6 の進行中修正と交差するため対象外(直列化)。

## 機能要件

### FR-1: 全問再 tally の preservedResultDigest 生産側整合(#3077)

`packages/framework/core/tools/amadeus-election.ts:451` の `tallyElection` を、再 tally の target が**全 question を覆う**場合にも `preservedResultDigest: null` を書くよう是正し、`isCommittedRun`(:419-420 付近)の期待述語も同一条件へ揃える。store 側 `verifyPreservation`(amadeus-election-store.ts:728-729)は不変。
受け入れ確認: 単一 question 選挙の hold → 再配布 → 再 tally で現行 `history-mismatch` を失敗テストとして固定(Red)→ 是正後 commit 成功・指令ループが terminal へ到達(Green)。複数 question の部分 hold の既存挙動(t553/t549 系)が green 維持。

### FR-2: recompose ガードの phase 軸追加(#3074)

`packages/framework/core/tools/amadeus-lib.ts:564-573` の `assertRecomposeAllowed` へ phase 入力を追加し、`autonomy === "autonomous"` **かつ** lifecycle phase が CONSTRUCTION の場合のみ denied とする。呼び出し側 `assertRecomposeStateAllowed`(amadeus-utility.ts:5793-5808)は既存イディオム `getField(content, "Lifecycle Phase")` で phase を渡す。拒否メッセージは実条件を正確に述べる文言へ更新。
受け入れ確認: Inception + autonomy full で allowed になる回帰テスト(Red: 現行 denied)と、autonomous Construction で denied のままの回帰テストの両方を Red→Green で実証。

### FR-3: 壁時計上限アサーション 24 箇所の横展開是正(#3075)

現存 24 箇所(A 6 / B 10 / C 8 — #3075 の起票者訂正コメント2件を正とする)を是正する: A/B 群(16 箇所)は NFR trace 不在を前提に、アサーション削除または `scaleTestTime` 経由の余裕あるハング検知水準への緩和(機能検証は既存 assert で担保、なければ機能 assert へ置換)。C 群(8 箇所)は「ハング検知であり性能主張ではない」契約コメントを付与。`tests/perf/` は対象外。AC3 のガード判定は「新設しない」(裁定 E-AD-B8C116DC、根拠は questions ファイル)。
受け入れ確認: Issue 記載の検索述語の再実行で A/B 群の厳密予算が 0 hit(C 群は契約コメント付きで存置)。変更した全テストファイルが green。

### FR-4: t224 symlink ケースのロックシーム注入(#3079)

`tests/integration/t224-upstream-v2-migration-cli.test.ts:1553` のケースの migrate env へ既存シーム `AMADEUS_AUDIT_LOCK_RETRIES`(小さい値、例 5)を注入し、意図的ロック失敗経路の実時間を ~0.5s へ短縮。あわせて `scaleTestTime` 経由の余裕あるハング検知 timeout を第3引数で宣言(既存慣行: t227:302 の `}, scaleTestTime(15_000));` 形)。
受け入れ確認: `bun test tests/integration/t224-...`(ラッパー非経由・既定 5000ms)で当該ケースが決定的に green。失敗経路の意味(`Failed to acquire audit lock` 期待)は不変。

### FR-5: リグレッションの横断確認

FR-1〜FR-4 適用後、既存スイート全体が green。台帳同期: 新規テストファイル追加時は coverage-registry regen、`amadeus-lib.ts` / `amadeus-utility.ts` / `amadeus-election*.ts` が allowlist 意味的セレクタ・model-map implPath に掛かる場合は同一変更で resync。coverage 母集団: 変更対象の大型ファイルは全て既存テストが in-process import 済みのため t226 クラスの母集団膨張は生じない見込み(実測で確認)。
受け入れ確認: リモート CI(`ci-success` 集約)green を正(push-first)。ローカルは typecheck / lint / targeted / coverage-patch-quick advisory。

## 非機能要件

- NFR-1: 性能目標を新設しない。時間検査はハング検知(余裕 timeout・`scaleTestTime` 経由)のみ(`c2-no-test-theatre-for-absent-nfr` 判定。覆す条件: 該当経路のレイテンシ目標が要件宣言されたとき)。

## 制約

- 単一 unit・単一 Bolt・単一 PR(oq-singleton。前バッチと同構成 — recompose 不能は本バッチの FR-2 が修正するが、本 intent 自身は従来制約下で進行)
- FR-1/FR-2 は本番コードの挙動変更を含むが、いずれも上流契約への回復であり仕様変更に非該当: FR-1 は store 契約(verifyPreservation)と生産側の整合、FR-2 は導入 intent 260720-upstream-sync-230 の要件文言「autonomous **Construction 中**の recompose を拒否」への回復(クロスレビュー R2 が要件文を実測)。ユーザー可視 CLI 契約への影響なし
- TDD 既定・worktree 分離・push-first・マージは常任承認条件(CI green + `converged: true` 実測)

## 前提

- 4 Issue とも現行 HEAD `9ba8170bb` で成立(RE + クロスレビュー 8 名で実測、既修正なし)。observed は origin/main 先端(0901182c7)の祖先・距離 3・患部交差ゼロ — 実装時に患部行を再取得する
- 方式裁定済み: FR-1 = `E-AD-01F8F090`、FR-2 = `E-AD-088EDDEC`、FR-3 ガード判定 = `E-AD-B8C116DC`、FR-4 = `E-AD-5ADD4AB4`(questions ファイル参照)

## Out of Scope

- #3078(plugin.json tools 未宣言)/ #3088(worktree add retry 棚卸し)— open-bug-batch-6 の進行中修正と交差するため直列化(同修正の着地後に別 intent)
- #3077 の integratePending 補償トランザクション新設(FR-1 の生産側整合で本経路の中間状態は発生しなくなる。他経路の commit 失敗に対する汎用ロールバックは別 intent)
- 選挙 CLI への汎用 repair verb 新設

## Open Questions

- なし(方式裁定完了。実装中の逸脱は P3 に従い停止 → 裁定)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T04:43:09Z
- **Iteration:** 1
- **Scope decision:** none

4 Issue が FR-1〜FR-4 に1対1でトレース可能、全 FR に実測可能な Red→Green 受け入れ基準があり、FR-1/FR-2 の仕様変更非該当判定も制約節に一箇所集約されている。上流3面の引用も architecture.md/code-structure.md の実測内容と file:line 一致、business-overview.md 無変更宣言も実読で裏付け確認済み。ブロッカーなし。

### Findings

- FOLLOW-UP | FR-1 は architecture.md が推奨する『述語を1か所へ括り出して両者(tallyElection / isCommittedRun)から呼ぶ形』への言及がなく『同一条件へ揃える』のみ記述。再発防止の構造化は code-generation 段の実装判断に委ねられているため、その段で明示的に検討させること。
- FOLLOW-UP | FR-5 の coverage 母集団非膨張の主張は『見込み(実測で確認)』と適切にラベル付けされているが、code-generation/build-and-test 段での実測結果を成果物へ残す運用を徹底すること(t226 クラス再発時の一次証跡として)。
- NIT | FR-3 の対象24箇所の内訳(A6/B10/C8)は code-quality-assessment.md 側の対応節を参照する設計だが、requirements.md 単体では検索述語そのものは示されていない(Issue 側にある前提)。実装時に Issue の検索述語を再取得する運用が明記されている点は許容範囲。
