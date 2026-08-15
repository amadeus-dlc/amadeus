---
feature: intent-autonomy-modes
start-date: 2026-08-15
rfc-pr: https://github.com/amadeus-dlc/amadeus/pull/3083
tracking-issue: (承認後に記入)
status: draft
version: 1
approved-by: (未承認)
approved-at: (未承認)
approval-ref: 裁定素材 = 2026-08-15 セッションの実 HUMAN_TURN 4 件(逐語は付録 A)。RFC 自体の承認はこれから
bound-surfaces: |
  packages/framework/core/amadeus-common/protocols/stage-protocol.md(:131,:135,:137,:139-152,:286,:1064-1075,:1224-1236)
  packages/framework/core/tools/amadeus-intent-autonomy.ts / -production.ts / -runtime.ts
  packages/framework/core/tools/amadeus-orchestrate.ts(投影・swarm・失敗裁定)
  packages/framework/core/tools/amadeus-state.ts(park guard・ゲート承認)
  packages/framework/core/hooks/amadeus-stop.ts(D10 — 質問/compose carveout)
  packages/framework/core/tools/amadeus-advisory-choice.ts(行 17 延期自動化)
  packages/framework/core/tools/amadeus-bolt.ts(D7 — approve-batch presence)
  packages/framework/core/tools/amadeus-lib.ts(D8 — presence 検査 fail-open)
  packages/framework/core/tools/amadeus-finding.ts / amadeus-mirror-policy.ts(D11/Q17 — mode 外軸)
  amadeus/spaces/default/memory/{org,team,project}.md(該当ノルム)
  (digest ピンは #2396 実装時に付与 — 本 RFC 時点ではパス列挙のみ)
related: "#2253(現行 semi 定義 — 本 RFC が上書き), #2067(autonomy 初版 — 同), #1241(非対話中断の実装先), #2396(RFC ストア構想 — 本ファイルは配置の先取り), #1437(ライフサイクル様式の借用元), #1647, #2899, #2974, #3016"
provenance-note: 本 RFC は as-is 調査文書(独立検証 3 系統・約 200 主張を敵対的照合済み)を統合して自己完結化した。実測値は付録 B・C に母数・分類鍵・集計コマンドを併記して転記済み。D10・D11 とプラグイン対応表の機構分解は 2026-08-15 の追加監査(本セッション)で file:line 実測のうえ追記
---

# RFC-0001: Intent Autonomy Modes(none / semi / full)の再定義

## Summary(要約)

Intent Autonomy Mode を「none → semi → full で AI の自律性が単調に高まり、不測の事態は必ず止まる」というコンセプトへ再定義する。full はすべての裁定点を推奨選択で決め、推奨が一意でないときだけ人間裁定(対話モード)またはワークフロー中断(非対話モード)へ倒す。semi は full に人間ゲート 2 つ(フェーズ境界・walking-skeleton)を加えたものとし、Bolt の自律実行は維持する。これにより #2253 の引き算集合 {Intent 完了, phase 境界, WS, grant} を置き換える。

## Motivation(動機)

semi/full 運用の実測(母数: intent record 179、選挙 441。付録 B に集計述語)で、人間停止の大半が「判断の難しさ」ではなく機構側の理由で発火していた:

- **semi の権限範囲に milestone 種が構成上不在**なことによる人間行き 172 件(phase-gate 106 / walking-skeleton 66)。同一ゲートへ最大 5 回の重複発火、人間が答えないまま別経路で承認が通る「空振り」を含む
- **full 宣言と projection の乖離**による全ゲート人間化(ゲート承認 271 件中、人間入力が記録された 37 件の主因は grant 発効前の期間)
- **§13 の 0 件確認選挙 79 件**(hold は 1 件のみ — 判断としての情報量がほぼゼロ)

ユーザーは過去にも「autonomy=full ですよね?」(#2899)「full なのになぜ質問するのか」(#2974)と同種の是正を指摘している。さらにコンセプト適合性監査(付録 C)で 11 件の逸脱を確認した。代表: full だけが自発的に止まる自由を失う park 制限の逆転(D1)、外部人間ゲート待ちで「止まりたいのに止まれない」膠着(D5、#1241)、決められない質問でもエージェント推奨で進む梯子の縮退進行(D4)、autonomy mode と無関係な設定軸が裁定の自律度を左右する混在(D2)、現行実装が full を「無人」と同一視しているため対話モードの full が人間裁定へ到達する経路を持たない構造(D10)。

真に人間の判断が要る面(仕様変更・選挙 hold・マージ)は全体の 1 割未満で、そこは現行どおり正しく機能している — 本 RFC はその境界を保ったまま機構起因の停止を除去する。

## Guide-level explanation(ガイドレベルの説明)

### モード定義

| mode | 利用者から見た挙動 |
|---|---|
| **none** | すべての確認ポイントであなたが裁定する(現行どおり) |
| **full** | **すべての裁定点が推奨選択で進む。** 推奨が一意に決まらないときだけ、あなたが画面の前にいれば(対話モード)聞かれる。いなければ(非対話モード)ワークフローは理由を記録して中断し、あなたが戻ったときにその場で裁定を受ける |
| **semi** | **full と同じだが、フェーズ境界ゲートと walking-skeleton ゲートの 2 箇所だけは必ずあなたが承認する。** Bolt の並行実行はバッチ間で止まらない |

### 裁定の順序

どの裁定点でも、次の順で決まる:

1. **あなた専権の事項か?**(仕様変更・goal 改訂・選挙 hold・委任条件外の PR マージ)— 該当すれば推奨が一意でも自動裁定しない。対話なら聞かれ、非対話なら中断する
2. 推奨が一意 → 採用して続行
3. 推奨が一意でない(複数・計算不能)→ 対話なら聞かれ、非対話なら中断
4. 機構故障・ノルム矛盾 → 停止(これは裁定ではなく欠陥)

### 確認ポイントごとの挙動(ToBe)

番号は付録 B の as-is 表と対応する。

| # | 確認ポイント | none | semi | full |
|---|---|---|---|---|
| 1 | ステージゲート(phase 内) | 人間 | 自動 | 自動 |
| 2 | フェーズ境界ゲート | 人間 | **人間**(確認要求は 1 ゲート 1 回) | 自動 |
| 3 | walking-skeleton ゲート | 人間 | **人間** | 自動 |
| 4 | Intent 完了(最終フェーズ境界) | 人間 | **人間** | 自動 |
| 5 | ステージ内の明確化質問 | 人間 | 自動(裁定順序に従う) | 同左 |
| 6 | remote write(push / PR 作成等) | 人間 | 自動(裁定順序に従う) | 同左 |
| 7 | PR マージ | 人間 | 委任条件成立時のみ自動(Q6) | 同左 |
| 8 | 仕様変更・goal 改訂 | 人間 | 人間(対話)/ 中断(非対話) | 同左 |
| 9 | 選挙 hold | 人間 | 人間(対話)/ 中断(非対話) | 同左 |
| 10 | §13 学習選定 | 人間 | 自動。候補 0 件なら儀式を開かない(Q10) | 同左 |
| 11 | code-gen 失敗 | 停止して裁定 | 停止 → 復旧方針を裁定順序で決定 | 同左 |
| 12 | 品質修復ループ | 現行維持 | 自動修復(修復不能は停止。Q14) | 同左 |
| 13 | Grill me | 提供 | 未決(Q12) | 同左 |
| 14 | GitHub ミラー・finding 起票 | 設定に従う | 未決(Q17 — mode への従属可否) | 同左 |
| 15 | park | いつでも可 | いつでも可 | **非対話でも理由付きで可**(Q7・Q8) |
| 16 | swarm バッチ終端 | 人間 | **自動**(Bolt 自律維持) | 自動 |
| 17 | advisory(実行/延期) | 人間 | 延期も自動裁定可 | 同左 |
| 18 | goal 改訂 | (8 に統合) | — | — |
| 19 | intent birth / compose 承認 | 人間 | 人間(現行維持。変更は Q13) | 同左 |
| 20 | Stop hook(ターン返却) | 現行 | 未決(Q11 — D10 の carveout 再定義を含む) | 同左 |

## Reference-level explanation(リファレンスレベルの説明)

### 是正するコンセプト逸脱(付録 C の D1〜D11)

- **D1/D5**: park guard の「無人 run は走り続けろ」前提を廃棄し、#1241 の一級待ち状態(理由付き park または wait directive)を非対話中断の一般機構として採用する
- **D2**: 自律性の軸を mode 一本にする(`solo-election.trigger.mode`・`intent-mirror.github.issue.mode` の従属可否は Q17)
- **D3/D9**: full 宣言と projection の乖離を loud fail 化(現行は full 限定・stderr のみの silent 検出、semi/none は検出ゼロ)
- **D4**: 梯子⑤(エージェント推奨)の「決められなくても進む」縮退を、裁定順序 3(不一意 → 人間 / 中断)へ置き換える
- **D6**: semi milestone の空振り承認は実装前に原因調査。欠陥なら別 Issue
- **D7/D8**: `approve-batch` の presence 無検証、ゲート presence 検査の active-scope fail-open を塞ぐ
- **D10**: full = 無人という同一視を解体する — Q3 の対話/非対話検出を導入し、対話モードでは質問・compose 保留でターンを返す(Stop hook の carveout 再定義は Q11)。非対話モードは D1/D5 と同じ非対話中断機構へ倒す
- **D11**: finding の Issue 起票軸を D2 と同じ扱いとし、Q17(mode への従属可否)の裁定対象へ含める

### 主要な実装面と順序制約

- **「推奨が複数」を表現する型が現行に存在しない**(推奨導出は常に 1 件を返す型。ゲートは定数 approve — `amadeus-intent-autonomy-production.ts:833-838`)。新規型設計が実装の起点(Q1・Q2)
- semi の権限範囲変更は、許可列挙 `SEMI_ROUTINE_INTERACTIONS`(`amadeus-intent-autonomy.ts:581`)の差し替えに加え、フェーズ境界を種類と独立に拒む第 2 ガード(`allowsOccurrence` 同 :636-640)の改修を要する
- **semi の Bolt 自律化(投影 autonomous 化)は park guard 廃棄が先行依存** — park 制限の実述語は Construction 投影(`amadeus-state.ts:1599`)なので、順序を誤ると semi が park 能力を失う。読取側の semi→gated ハードコード(`amadeus-orchestrate.ts:2040`)・書込投影(`production.ts:713`)・乖離判定(現在 full 限定)の 3 面同時改修
- advisory 延期の自動化は効果分類(quality-waiver)まわり 4 箇所(`amadeus-advisory-choice.ts:300-303`、`amadeus-intent-autonomy.ts:510-516`、`production.ts:99-106`、効果認可 2 箇所)。semi の grant-less 設計を維持する場合、semi 側の効果認可上限(`workflow-reversible` のみ)の拡張も必要(Q4)
- **効果の天井は維持する**: prohibited effects(new-permission / irreversible / scope-out / norm-waiver / quality-waiver)の自動裁定不可、NORM_CONFLICT の park、code-gen 失敗の無条件停止はコンセプト適合面であり本 RFC でも保持(マージの irreversible 一律拒否だけを条件付き委任で緩める)
- 改定が波及する正本: team.md First Principles P1・P4(**原理の改定 — 本 RFC の承認がユーザー裁定の根拠記録になる**)、正準リスト (1)(2)(3)(4)、no-ai-merge、learnings-election、org.md walking-skeleton 条項、stage-protocol.md 6 箇所(bound-surfaces 参照)、効果分類のマージ規定、#2067・#2253 の該当節、docs/reference/24-intent-autonomy.md:91-92 の stale 記述

## Drawbacks(欠点)

- full の事後検収点が消える: 現行設計は milestone で unreviewed キューを人間が検収する前提だった。full は milestone も無人になるため、自動裁定の検収機会を別途設計しないと未検収が蓄積する(Q5)
- マージの条件付き自動化は P4(不可逆・外部境界には人間)の緩和であり、誤マージの取り消しコストは高い。委任条件の厳密化と失効設計が前提(Q6)
- §13 の 0 件確認廃止は、「候補が空」の自己申告で儀式が消える検証劇場リスクを生む(Q10 で機械化を裁定)
- 非対話中断の導入は対話/非対話の検出という新しい判定面を持ち込み、harness 差(検出信号の有無)が移植性の負担になる(Q3)

## Rationale and alternatives(理由と代替案)

- **旧 #2253 の引き算集合 {完了, phase 境界, WS, grant} の維持(現状維持)**: degrade スコープでは節目が頻発するため semi が none に近い体感になる(実測 172 停止)。棄却 — 本 RFC の動機そのもの
- **semi = 全ゲート人間(起草過程の誤解釈案)**: ゲート数が最も多い phase 内ゲートを人間化すると停止が激増する。ユーザーが明示棄却(付録 A 指示 3)
- **milestone 自動化を semi の設定オプションにする(中間段の追加)**: 段が増えるほど「どの mode で何が止まるか」の説明可能性が落ちる。2 段(人間ゲート 2 つの有無)が最も説明しやすい。棄却
- **何もしない**: #2899・#2974 の指摘が再発し続け、full の看板(無人完走)が実態と乖離したままになる

## Prior art(先行事例)

- **#2067 / #2253**: 現行 autonomy の正本 2 本。#2253 は「semi = full − 節目」という引き算定義の先例であり、本 RFC はその引き算集合を縮約する後継
- **#1241**: 「autonomous = engine 内部の自動進行」と「外部人間ゲート = 待つのが正」の直交を一級状態で表現する構想 — 本 RFC の非対話中断の実装先(クロスレビュー 2 名成立済み・設計裁定未着手)
- **Rust RFC プロセス**(rust-lang/rfcs): 本 RFC の様式の借用元。テンプレートは `0000-template.md`
- **#1437 クラスタ**: behavioral-port 向け RFC ライフサイクル — ライフサイクル様式(draft → 承認 → Amendment 再承認)のみ借用
- **#2396**: space レベル RFC ストア構想 — 本ファイルは配置(`specs/rfc/`)とメタデータ様式の先取り

## Unresolved questions(未解決の問題)

**承認までに裁定すべき(設計の土台)**:

- Q1: 「推奨が複数」を表現する型と導出経路の設計(現行に存在しない — 最大の実装欠落)
- Q3: 対話 / 非対話の検出信号(TTY・transcript・HUMAN_TURN 鮮度・harness 種別)と移植性。既存隣接機構(機械注入ターン分類・Stop hook の transcript 走査・route binding)の再利用可否
- Q17: mode 外の自律性軸(`solo-election.trigger.mode`・`intent-mirror.github.issue.mode`・`finding.github.issue.creation.mode`)を autonomy mode に従属させるか、独立の軸として残すか(付録 C D2・D11)

**実装までに裁定すべき**:

- Q2: ゲートの推奨導出器(質問と同じ概念で扱うか、ゲートは決定的承認のままか)
- Q4: semi の grant-less 設計の維持と、効果認可上限の拡張範囲
- Q5: full の自動裁定の事後検収点(現行はフェーズ境界で検収 — full では消滅)
- Q6: マージ委任条件の定義者・正本の置き場所・失効条件・provenance 記録形式
- Q7: 非対話 park の resume 契約(記録内容・再開者・park 許可の会計 — 非対話には HUMAN_TURN が存在しない)
- Q8: park 制限廃棄後、自己 park による作業回避・偽の人間実在の脅威(#365 / #3016 の脅威モデル)を何で防ぐか
- Q9: degrade スコープ(self-fix 等)で WS ゲートを発火させるか(現行の WS 判定は Skeleton Stance / scope を参照しない — 付録 B 注)
- Q10: §13「候補 0 件」判定の機械化(AI の自己申告で儀式が消える構造を防ぐ)
- Q11: Stop hook の継続上限・ターン返却抑止の semi/full 再定義への追随(D10 の質問・compose carveout 再定義 — 対話モードではターンを返す — を含む)
- Q14: 修復不能停止(REPAIR_STALLED)と非対話 park を同じ park 表現に載せるか分けるか
- Q15: grant ceremony の簡素化と、相互必須不変量・発効前プレビュー(nonAutoDecidedKinds 提示)の扱い
- Q16: 実装 intent の分割方針(ノルム改定 3 レイヤーと機構改修の載せ方。1 intent = 1 unit 原則との整合)

**スコープ外としてよいか要確認**: Q12(Grill me の semi/full 非提示維持)/ Q13(intent birth / compose 承認の人間専権維持)

## Future possibilities(将来の可能性)

- #2396 実装による digest ピン・前方交差検査の後付け(本 RFC が最初の実 RFC となる)
- 承認済み RFC からの適合テスト生成(#1439 の一般化)
- マージ委任条件の機械化を他の不可逆操作(リリース・デプロイ)の条件付き委任へ拡張
- 対話/非対話検出シームの他用途(通知のルーティング等 — Stop hook への適用自体は D10/Q11 として本 RFC のスコープ内)

---

## 付録 A: 裁定の逐語(2026-08-15 セッション実 HUMAN_TURN)

1. (発端)「autonomyについて不満があります。semi,fullのときにこんなところで人間確認が起きるのはおかしいだろってのが散見されます。」
2. (是正 1)「あのー、noneとsemiの違いがほとんどない。僕はfullからステージゲートとWSだけを抜いたものがsemiだよって言ったはずですよ。fullからちょっとだけ引き算したものがsemiと言ったはずなのに。全然理解していない」「それから、fullも半分が人間裁定が入っているのがおかしい。それfullじゃないだろ」
3. (是正 2・定義の確定)「まずfullとsemiの定義を理解しろ / fullはすべて推奨選択です。推奨が複数の場合は人間裁定でよい。ただし対話モードのときだけ人間裁定。非対話モードのときはワークフローを中断しろ / semiはfullからフェーズゲート、WSゲートを入れたもの、Boltの自律モードも残す。」
4. (コンセプトの言語化)「none -> semi -> full / AIの自律性が高まる / ただし、不測の事態は止まる / というコンセプトの想定です。」

起草過程で AI が「semi = 全ゲート人間」と誤解釈した版があり、指示 3 で棄却された。AskUserQuestion による確認はユーザーが明示拒否(「askするな」)。**裁定として確定しているのはこの逐語 4 点のみ**であり、本文はその正規化・敷衍である。逐語にない拡張は Unresolved questions で裁定を得る。

## 付録 B: 現行仕様(as-is)— 確認ポイント × mode の実挙動

独立検証 3 系統(機構・実測・整合)を通過済み。セルは外から見た振る舞い。根拠列: **[P]** = stage-protocol 正本 / **[E]** = 実装のみ / **[N]** = ノルム層のみ、`:NNN` は stage-protocol.md 行番号。

| # | interaction | none | semi | full | 根拠 |
|---|---|---|---|---|---|
| 1 | ステージゲート(phase 内) | 人間が承認 | 自動 | 自動 | [P] :131 |
| 2 | フェーズ境界ゲート | 人間が承認 | 人間が承認 | 自動(※a) | [P] :131,137 |
| 3 | walking-skeleton ゲート | 人間が承認 | 人間が承認 | 自動(※a) | [P] :103-105,447,856。WS 判定は「scope の最初の construction ステージ」という構造だけで決まり Skeleton Stance / degrade scope を参照しない(`amadeus-state.ts:3711`) |
| 4 | Intent 完了 | 人間が承認 | 人間が承認 | 自動(※a) | [P] :137。独立種でなく最終ステージが phase-gate 扱い(`amadeus-state.ts:3712`) |
| 5 | ステージ内の明確化質問 | 人間が回答 | 自動回答(認可外・効果の天井超過・ノルム矛盾のときだけ人間へ / park) | 同左 | [P] :135,137 |
| 6 | remote write(push / PR 作成等) | 人間が承認 | 自動(同上)(※b) | 同左 | [P] :1064-1075(**core §11c の規定 — pr-convergence プラグイン固有ではない**。同プラグイン stage は再掲のみ) |
| 7 | PR マージ | 人間が承認 | 同左 | 同左 | [P][N] :1071-1075(自動裁定から明示除外)、no-ai-merge |
| 8 | 仕様変更 | ユーザーが裁定 | 同左 | 同左 | [N] 正準リスト(4) |
| 9 | 選挙 hold(不成立 5 事由: tie/block/split/quorum-short/discussion-needed) | ユーザーが裁定 | 同左 | 同左 | [N] 正準リスト(1) |
| 10 | §13 学習選定 | 人間が裁定 | 自動(裁定が割れた場合のみ人間へ)(※c) | 同左 | [P][N] :1224-1236、learnings-election、c1-semi-ladder-routing |
| 11 | code-gen 失敗 | 停止して復旧方針を裁定(※d) | 同左 | 同左 | [P][E] :139-152、`amadeus-orchestrate.ts:4055-4079` |
| 12 | 品質修復ループ | (protocol 未規定) | 自動修復(修復できない場合のみ人間へ) | 同左 | [P] :133 |
| 13 | Grill me | 選べる | 選べない | 同左 | [P] :286 |
| 14 | GitHub ミラー・finding 起票 | 各設定に従う(autonomy と無関係)。ミラーの手動起動は設定に依らず実行。finding は `auto` なら無人で Issue 作成、`off`/`prompt` は `--approved`(人間承認)必須 | 同左 | 同左 | [E] `amadeus-mirror-policy.ts:152-183`、`amadeus-finding.ts:87-90` |
| 15 | park | いつでもできる | いつでもできる | 人間の指示ターンがあるときだけ(判定キーは Construction 投影。skip 環境変数も無効)(※e) | [E] `amadeus-state.ts:1574-1605`、#3016、#1241 |
| 16 | swarm バッチ終端 | バッチごとに人間が承認(※f) | 同左 | 承認なしで続行 | [E] `amadeus-orchestrate.ts:3851-3868,3922-3958` |
| 17 | advisory(実行/延期) | 人間が選択 | 実行は自動、延期は人間のみ | 同左(full は延期拒否時点で park) | [E] `amadeus-advisory-choice.ts:300-303,1329-1370`(機構は core。**発生源**は plugin.json の `advisories` 宣言 — 下の対応表。sensor は別機構) |
| 18 | goal 改訂 | 人間のみ(autonomy 分岐なし) | 同左 | 同左 | [E] `amadeus-goal.ts:192-206` |
| 19 | intent birth / compose 承認 | 人間のみ | 同左 | 同左 | [E] harness SKILL.md(claude :145,165,175) |
| 20 | Stop hook(ターン返却) | 継続上限 2 | 継続上限 8。質問待ちでも返さない(human-command 由来の semi のみ) | 継続上限 8。質問・compose・会話でも返さない(compose 承認は行 19 のとおり人間専権のまま — D10) | [E] `hooks/amadeus-stop.ts:150-158,192-204,449-452,485,744`(`isPendingQuestionStop` / `isPendingComposeStop` の autonomy guard) |

注: (a) full の自動承認は quality READY が前提。フェーズ境界では phase-check 成果物の作成義務は残る(:35,:105)。(b) 二層構造 — 実運用はノルム(c1-semi-ladder-routing)適用下の挙動で、プロトコル字義と異なる面がある。(c) §13 の発火はプロトコル字義では `solo-election.trigger.mode`(2 値、既定 manual)のみで決まり、manual なら人間停止。ノルムが semi/full で上書きし無人化。full にしても設定は切り替わらない。(d) 復旧方針の裁定者は autonomy mode に一切依存せず `solo-election.trigger.mode` だけで決まる。(e) 制限の向きは「無人 full 実行を park させない」— #3016 修正後も外部人間ゲート待ちでの膠着(#1241)が未解決。(f) swarm 発動自体は mode でなく計画(並行バッチの有無)から自動判定。skeleton 出荷前の mode 未宣言は黙認、出荷後かつ 2 unit 以上でのみ宣言要求。

### プラグインとの対応(MECE)

プラグインは新しい確認の**種類**を追加しない。プラグインが確認ポイントへ寄与する経路は 4 つで、本 workspace のアクティブ 4 プラグイン(`amadeus/config.json` の `plugin.activation.names`)の帰属は次のとおり(各セルは plugin.json・stage frontmatter・sensor manifest からの転記):

| プラグイン | stage ゲート(行 1〜2) | remote write・マージ(行 6・7) | advisory 実行/延期(行 17) | sensor(機械検証 — 下注) |
|---|---|---|---|---|
| github-pr-convergence | pr-convergence | **適用先**(規定は core §11c — 行 6 は本プラグイン固有ではない) | — | `pr-convergence-report-format`(**blocking**) |
| formal-model-check | tla-authoring / formal-model-check | — | `spec-change`・`authoring-hold`(checkpoint: requirements-analysis / functional-design / build-and-test) | `model-completeness`(advisory) |
| git-drift | — | — | — | `git-drift`(advisory。seam: code-generation / build-and-test) |
| coverage-patch-quick | — | — | — | —(stages / seams / sensors すべて空。CLI のみ、常に exit 0) |

「advisory」の名を持つ 2 機構は別物であり、混同すると帰属を誤る:

- **行 17 の advisory** = plugin.json の `advisories` 宣言。checkpoint ステージで evaluator が発火し、`amadeus-advisory-choice.ts` が実行/延期を裁定にかける。アクティブ 4 プラグイン中、宣言を持つのは formal-model-check のみ
- **sensor** = 決定的検証マニフェスト(`default_severity` が blocking / advisory)。人間の確認ポイントは作らない。blocking sensor の未解決 verdict は stage 完了を機械的に拒み(`amadeus-state.ts:2104-2131` の guardDenied)修復ループ(行 12)へ入る。advisory severity は verdict 記録のみ
- **remote write(行 6)**は core §11c の規定(push・PR 作成・レビュースレッド応答・Issue 起票)であり、プラグイン不在でも発生する(record checkpoint の push、intent-mirror / finding の Issue 系 remote write — これらの自律度は行 14 の設定軸)

新しいプラグインが確認ポイントへ寄与できる経路はこの 4 つ — stage 追加(行 1〜4 のゲート)、`advisories` 宣言(行 17)、blocking sensor(行 12 の機械ゲート)、remote write の実行主体になること(規定は常に core §11c) — に限られる。これが上表の網羅性の根拠である。

主要実測(母数・集計述語つき):

- ゲート承認 271 件(semi/full 37 record、鍵 = `Grant Id`/`User Input`): grant 自動 176 / 人間入力 37 / どちらも記録なし 58
- `INTENT_AUTONOMY_HUMAN_REQUIRED` 322 件(全 179 record、鍵 = イベント属性 `Mode`): semi SCOPE_OUT 172(phase-gate 106、walking-skeleton 66)、none MODE_REQUIRES_HUMAN 150。同一 stage への重複発火最大 5 回、発火後に人間入力なしで承認が通る空振りを実測(D6)
- 選挙 441(tally 済み 434)中 hold 27(6.2%)。0 件確認(s13-zero-confirm)79 件中 hold 1。採否系 239 件中 hold 19(7.9%)
- マージ包括委任の逐語 1 件: 「以後のすべてのマージ承認はあなたに委託します。CI green条件クリアしていればマージしてよいです。」(260812-tla-proof-receipt record)+ 参照のみ 1 件

## 付録 C: コンセプト逸脱の監査(as-is)

| # | 軸 | 逸脱 | 根拠 |
|---|---|---|---|
| D1 | 単調性 | none/semi はいつでも park できるのに full だけが「止める自由」を失う(逆転) | 付録 B 行 15 |
| D2 | 単調性 | §13・失敗裁定・ミラーの自律度が autonomy mode でなく別設定で決まる。none + auto 設定は無人で外部 mutate し、full + manual は人間停止する | 付録 B 行 10,11,14 |
| D3 | 単調性 | full 宣言の無音降格(projection 乖離)。乖離検出は full 限定・silent、semi/none は検出ゼロ | 付録 B 実測、`amadeus-orchestrate.ts:2036-2047` |
| D4 | 不測時停止 | 梯子は枯渇しない設計 — 選挙不能でもエージェント推奨が必ず答え、不確実なまま進む。full は検収点(milestone)も無人 | `amadeus-intent-autonomy.ts:930-974` |
| D5 | 不測時停止 | #1241 膠着: 外部人間ゲート待ちのみ残った full は park 拒否 × Stop hook 強制継続で「止まりたいのに止まれない」 | #1241(OPEN) |
| D6 | 不測時停止 | semi milestone で SCOPE_OUT 発火後、人間入力なしで承認が通った実測(要原因調査 — 欠陥候補) | 付録 B 実測(260814-park-provenance) |
| D7 | 不測時停止 | `approve-batch` に presence 検証がなく AI が自己承認できる余地 | #1647(OPEN)、`amadeus-bolt.ts:1226-1275` |
| D8 | 不測時停止 | ゲート presence 検査(`humanActedSinceGate`)は active scope で fail-open | `amadeus-lib.ts:3872` |
| D9 | 不測時停止 | 宣言と実効の食い違いという不測の状態自体がワークフローを止めない(D3 の裏面) | 同 D3 |
| D10 | 不測時停止 | 現行実装は full を「無人」と同一視 — 質問・compose が保留でもターンを返さない(Stop hook の autonomy guard)。compose 承認は全 mode で人間専権(行 19)なのに、full では人間へ届く経路が存在しない。対話モードの full(推奨不一意 → 人間裁定)はこの 3 面(質問 carveout・compose carveout・park の human-turn 要求 = D1)がある限り機構的に到達不能 | `amadeus-stop.ts:449-452`(`isPendingQuestionStop`)、同 `isPendingComposeStop`(full で無効 — コメント逐語 "an unattended run has no human to answer the gate")、付録 B 行 15,19,20 |
| D11 | 単調性 | mode 外の自律性軸の第 4 事例(D2 の追加実例): finding の Issue 起票は `finding.github.issue.creation.mode` のみで決まり、`auto` は none でも無人で remote write(Issue 作成)を実行する。`off`/`prompt` は `--approved` 必須 | `amadeus-finding.ts:87-90`、付録 B 行 14 |

コンセプト適合面(保持): 効果の天井(prohibited effects)、NORM_CONFLICT の park、code-gen 失敗の無条件停止、ノルム矛盾の admission 拒否。
