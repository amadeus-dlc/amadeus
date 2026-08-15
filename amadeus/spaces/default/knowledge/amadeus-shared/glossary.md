# autonomy リファクタ作業語彙集

> **本ファイルは autonomy リファクタ作業用の作業語彙集であり、プロジェクトの正準用語集ではない。** 正準は `docs/guide/glossary.md`(+ `.ja.md`)で、`scripts/glossary-projection.ts` が knowledge / protocol / reference の 3 面へ機械投影し、drift を `check` サブコマンドとテスト(t414)が守っている(「用語定義は一箇所」というユーザー裁定 2026-08-15 を満たす正準機構は既にこれ)。
>
> 運用ルール:
> - 正準 glossary に既出の語(Autonomy mode / Walking skeleton / Park / HUMAN_TURN / Election / Escalation canonical list 等)は**本ファイルで再定義せず正準を参照**する
> - 本ファイルに置くのは、正準に無い実装内部語の作業定義だけ。恒久化する語は正準 glossary への PR で追加し、投影を再生成する
> - 各エントリには実装・プロトコル上の出典を併記し、出典側が変わったら同じ変更で更新する

## 正準 glossary に既出の語(参照のみ)

`docs/guide/glossary.md` を正とする(投影器の term identity は英語名 — `scripts/glossary-projection.ts:33-42`。日本語訳は `.ja.md` の対応行): **Autonomy mode**(:17)/ **Election**(:43)/ **Escalation canonical list**(:45)/ **HUMAN_TURN**(:54)/ **Park**(:80)/ **Walking skeleton**(:110)/ **Unit・Bolt**(stage-protocol.md Glossary が正準 — project.md が指定)。

## 実装内部語(正準未収載 — 作業定義)

| 用語 | 定義 | 出典 |
|---|---|---|
| **Intent Autonomy Mode** | intent 単位の自律度宣言。`none` / `semi` / `full` の 3 値。`none` は全裁定が人間へ行く | 型: `amadeus-intent-autonomy.ts:11`。意味論: 同 :733(`MODE_REQUIRES_HUMAN`)、stage-protocol.md:117,131 |
| **Construction Autonomy Mode** | swarm スケジューリングの軸(`autonomous` / `gated`)。Intent Autonomy Mode からの派生投影で、独立に設定しない | `amadeus-orchestrate.ts:2036-2071` |
| **grant** | full を発効させたときに発行される、その intent に束縛された授権。full の自動承認の根拠。semi は grant を持たない。workflow 実行中は「full ⇔ active grant」が相互必須(**terminal 状態では mode に依らず grant は null が必須**) | stage-protocol.md:121-127、`amadeus-intent-autonomy.ts:201-204` |
| **projection(投影)** | 監査イベント列から再構成される autonomy の正式な状態。`amadeus-state.md` の表示フィールドはこの投影の写しにすぎず、両者がズレること(乖離)がある | 型: `amadeus-intent-autonomy.ts:165`。再構成: `amadeus-intent-autonomy-runtime.ts:204`。md への写し: `amadeus-intent-autonomy-production.ts:704-723` |
| **梯子(decide-question 梯子)** | semi/full 中に、質問を人間へ聞かずに答えを決める仕組み(CLI `amadeus-bolt decide-question`)。①事前確認済みの裁定方針(policies)→ ②ノルムからの一意導出 → ③過去の人間裁定 → ④ソロ選挙 / ⑤エージェント推奨、の順に試す。①〜③で一意に決まればそこで採用。**④と⑤は排他**(選挙結果が供給されていれば④、無ければ⑤へ縮退し `degradedCapability` を記録)。**梯子は枯渇しない**(⑤が必ず答える)— 質問が人間へ行くのは梯子の手前の認可(authorizeInteraction)が human-required を返す場合であり、梯子自身が止まるのは②の矛盾時(`NORM_CONFLICT` → park)のみ。ゲートは質問ではないため梯子の対象外 | stage-protocol.md:131,135,137、`amadeus-intent-autonomy.ts:930-974` |
| **SCOPE_OUT** | 認可の**範囲外**を理由に人間へ落ちること。3 経路: (1) occurrence の intent 不一致、または workflow が running でない(mode 非依存)(2) semi で種別が `SEMI_ROUTINE_INTERACTIONS` 外、または phase-boundary 上 (3) full で grant が無効か grant scope 外 | `amadeus-intent-autonomy.ts:730-752` |
| **AUTO_DECIDED** | autonomy 機構が人間を介さず裁定を確定したことを示す監査記録 | 型: `amadeus-intent-autonomy-runtime.ts:73`。full 経路: 同 :479。semi 経路: 同 :576 |
| **unreviewed キュー** | 梯子の④⑤(ソロ選挙・エージェント推奨)由来の自動裁定を、事後に人間が検収するための待ち行列 | `amadeus-autonomy-review.ts:507-514` |
| **human-presence ガード** | 操作の実行前に、未消費の HUMAN_TURN(または委任 provenance)の実在を要求する検査。造幣の正準 seam は `amadeus-presence-reservation.ts` の `mintHumanPresence`(append するのは `hooks/amadeus-mint-presence.ts` と harness 別 adapter)。消費側は用途で異なる: park 用 `outstandingHumanTurns` は ledger 不在で fail-closed、ゲート用 `humanActedSinceGate` は active scope で fail-open・名指し record で fail-closed | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:84`、`amadeus-lib.ts:3865-3925` |
| **hold(選挙の)** | 選挙が確定に至らなかった状態。事由は 5 種: `tie`(最多得票が複数)/ `block` / `split` / `quorum-short` / `discussion-needed`。人間の裁定へエスカレーションされる | `amadeus-election-model.ts:27-32` |
| **ソロ選挙** | 2 体の独立したサブエージェントに投票させて判断を作る仕組み。2-0 なら採用。それ以外は hold(事由 5 種、上の項参照)で人間へ | team.md § ソロ選挙、amadeus-election CLI |
| **interaction 種別** | 認可判定の対象となる確認の種類。`stage-gate` / `phase-gate` / `walking-skeleton` / `question` の 4 値のみ(Intent 完了は独立種を持たず、最終ステージのゲートが phase-gate 扱いになる) | `amadeus-intent-autonomy.ts:14`、`amadeus-intent-autonomy-production.ts:189-191` |
| **効果分類(prohibited effects)** | 自動裁定が選ぼうとする選択肢の「効果」の分類。`workflow-reversible` のみ自動裁定可。`new-permission` / `irreversible` / `scope-out` / `norm-waiver` / `quality-waiver` の 5 種は prohibited で、どの mode でも自動裁定不可 | `amadeus-intent-autonomy.ts:510-516`、`amadeus-intent-autonomy-production.ts:99-106` |
| **MODE_REQUIRES_HUMAN** | 「その mode では自動裁定の権限そのものが無い」ことを理由に人間へ落ちること(none 全般、および provenance 不備の semi) | `amadeus-intent-autonomy.ts:733-739` |
| **NORM_CONFLICT** | 梯子②の段で、適用可能なノルム由来の事実 2 件が矛盾したときの park 事由 | `amadeus-intent-autonomy.ts:943` |
| **梯子の結果 4 腕** | decide-question の呼び出しが返しうる非成功系: `human-required` / `conflict` / `aborted` / `parked`。いずれも fail-closed(人間行きまたは停止) | stage-protocol.md:135,137、`amadeus-intent-autonomy-runtime.ts:251` |
| **fail-closed / fail-open** | 判定不能・異常時に「止める」側へ倒すのが fail-closed、「通す」側へ倒すのが fail-open | (一般用語 — 個別の用法は各実装コメントに従う) |

## ToBe 用語(autonomy リファクタで導入予定 — 正準未整備)

初出定義は RFC-0001(`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md`、ユーザー直接裁定 2026-08-15)。実装時に正準 glossary へ追加して投影を再生成する。

| 用語 | 定義 | 出典 |
|---|---|---|
| **対話モード / 非対話モード** | 人間がその場で応答できるセッションか、無人実行(headless)か。推奨が一意に決まらないとき、対話なら人間裁定、非対話なら park する(検出信号は未決 — RFC-0001 Q3) | RFC-0001 |
| **推奨選択** | 裁定点ごとに機構が導出する推奨オプション。full はこれを常に採用する(「推奨が複数」を表す型は現行実装に存在しない — RFC-0001 Q1) | 同上 |
