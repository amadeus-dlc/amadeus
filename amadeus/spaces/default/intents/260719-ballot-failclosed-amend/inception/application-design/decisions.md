# Design Decisions — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: normalizeAt(election.ts:334)は残置する(E-BFARA1 e4 留保への回答)

- **Context**: FR-1 で受理形が mint 正規形限定になり、受理済み入力に対する normalizeAt は恒等変換になる。RA 留保(e4, GoA2)は「残置か除去かを design で明示」を要求。
- **Decision**: **残置**。恒等であることを示すコメント(「FR-1 検証済み入力に対し恒等 — 将来の受理形拡張時の防御層として維持」)を :334 に付す。transport 側 mint 用途(makeDeliveryRecord :101、talliedAt mint :354)は本来用途としてそのまま。
- **Consequences**: 挙動差ゼロ・diff 最小(surgical)。将来受理形を広げる改定があっても正規化の取りこぼしが構造的に起きない。t239 の normalizeAt 4 assertion は不変。
- **Alternatives Rejected**: (a) 除去 — diff は 1 行減るが、受理形拡張時に正規化漏れの再導入リスクを作り、除去自体が transport 用途との差分説明を要して surgical でない。(b) parse 内へ正規化を移設 — parse-don't-validate の「検証済みを型で運ぶ」に反し、parse が I/O 表現の書換えまで担う責務混合になる。

## ADR-2: unknown-ref 照合は store(appendBallot)に置く(E-BFARA3 の実装点)

- **Context**: ref 実在照合は ledger の読取を要する。Ballot.parse は純関数(election 定義のみ受取)で ledger を持たない。
- **Decision**: 照合は `appendBallot` の dup 判定直後に置き、`StoreError` へ `unknown-ref` を追加。parse は ref の**形式**(3フィールドの型)まで、store が**実在**を担う。
- **Consequences**: parse の純関数性維持(t234 は fixture のみでテスト可)。受理点(store)で fail-closed が完結し、CLI は既存 storeFail 経路で loud 表示。
- **Alternatives Rejected**: (a) Ballot.parse へ ledger を渡す — 純関数層に I/O 由来データが混入し、既存呼び出し元全数(CLI/テスト)のシグネチャ変更を強いる。(b) CLI(handleVote)で照合 — store を直接使う将来の呼び出し元(テスト・他ツール)が照合を素通りできる穴を残す(guard-activator の教訓: 起動者不在の安全網は空文)。

## ADR-3: per-voter 解決は「定義1箇所・全消費面へ適用」(FR-4 (b) の実現 — iteration 1 Critical で改訂)

- **Context**: tally・verify(recompute+GoA 度数+reservation 検査)・render(record 描画)が同一の解決済み母集団を使う必要(FR-4 (b))。iteration 1 レビューが実測で確定したとおり、tally 内部適用**だけ**では GoaFreq.fromVotes(election.ts:447 / record.ts:134)・checkGoaLine(:448)・verifyReservations(:450 / record.ts:148)・renderPersistDraft(election.ts:386)が未解決母集団のまま残り、amend 共存時に「裁定は正しいが GoA 行・留保数が二重計上」の乖離が verify を沈黙通過する。
- **Decision**: `resolveBallots` を model の export 純関数として**1定義**し、消費面の全数(component-methods.md の適用点表 #1〜#3・#5 — #4 materialize のみ blind lift 契約で非適用)へ適用する: tally 内部+handleVerify(GoaFreq/checkGoaLine/verifyReservations/verifySelf)/handleRender の CLI 境界で明示適用。materialize の fixed set は blind lift のまま(correction trail — 集計値でないため非解決、消費側解決の契約)。resolver は冪等で多重適用無害。
- **Consequences**: tally シグネチャ不変(呼び出し元 :353/:440 変更不要)。CLI 側の追加は handleVerify/handleRender の各1行。record.ts は引数経由で解決済みを受けるため無変更。乖離の构造的封鎖は「同一 resolver 定義」+「適用点の全数列挙表」で担保し、FR-4(a)(b) のテストが両面を固定する。
- **Alternatives Rejected**: (a) tally 内部適用のみ(iteration 1 の原案)— freq/reservation/render が未解決のまま乖離し verify が沈黙する実測欠陥(review Critical #1)。(b) tally の戻り値に resolved リストを追加 — 全呼び出し元と TallyResult 消費側(tally.json スキーマ・t234)へ波及し、#1261(e1 の TallyResult 型拡張予定)との交差を広げる。(c) store 書込時に original を物理置換 — ADR-5(correction trail)違反。

## ADR-4: 分類順は「識別子→内容」の既存順序を保存し invalid-timestamp を内容側先頭へ挿入

- **Context**: 既存5分類は parse-failure → unknown-election → unknown-voter → goa-out-of-range → reservation-missing(NFR-1 が順序の明文化を要求)。
- **Decision**: invalid-timestamp を unknown-voter の直後(goa-out-of-range の前)へ。エラー報告の決定性をテストで固定。
- **Consequences**: 複数不正を含む ballot のエラーが決定的。既存3分類の順序不変(後方互換)。
- **Alternatives Rejected**: 末尾追加 — timestamp は全 ballot 共通属性で investigation 時に最初に知りたい不正であり、内容系(goa/reservation)より先が診断効率で勝る。順序自体に外部契約はないが、決めない選択(実装任せ)は NFR-1 違反。

## 逸脱申告

なし — 要件(FR-1〜5/NFR)・裁定(E-BFARA1〜3)・ディスパッチ要件からの逸脱はない。#1262(receivedAt)は本 intent スコープ外として不実装(component-dependency.md 記載、W 系判定)。

## 並行 intent 境界の出典(iteration 1 Major の是正 — agmsg-git-evidence-split で分離記載)

- **git 検証可能事実**: Issue #1261(https://github.com/amadeus-dlc/amadeus/issues/1261、bug P1/S2 — tally の choice 無視)と #1262(https://github.com/amadeus-dlc/amadeus/issues/1262、bug P2/S3 — receivedAt 欠落)は leader 起票・クロスレビュー2名成立済み(e2 verdict コメント: /issues/1261#issuecomment-5017605397、/issues/1262#issuecomment-5017606695 — #1262 コメントに receivedAt 実装が handleVote funnel を触る textual 交差の注意を記載済み)。
- **agmsg 出典の事実**(一次記録は agmsg、タイムスタンプは着信記録): #1261 修正 intent の e1 起動と直列順提案 = e1→e2 2026-07-19T22:28:48Z 着信。e2 の合意+touch 目録返信 = e2→e1 22:31Z 頃(初送は FROM 欠落で不達、正形再送)。leader への自律決定即時報告 = e2→leader 22:29Z 頃送信・leader の CG 再接地言及 = leader→e2 22:32:32Z(E-BFARAS13 裁定通知内)。
- 合意内容: e1 の #1261 先行着地 → 本 intent は CG 段で origin/main へ base-advance-regrounding。交差核心 = tally(model.ts:321-337)/ verify recompute(election.ts:440)。
