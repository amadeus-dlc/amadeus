# Design Decisions — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: normalizeAt(election.ts:334)は残置する(E-BFARA1 e4 留保への回答)

- **Context**: FR-1 で受理形が mint 正規形限定になり、受理済み入力に対する normalizeAt は恒等変換になる。RA 留保(e4, GoA2)は「残置か除去かを design で明示」を要求。
- **Decision**: **残置**。恒等であることを示すコメント(「FR-1 検証済み入力に対し恒等 — 将来の受理形拡張時の防御層として維持」)を :334 に付す。transport 側 mint 用途(makeDeliveryRecord :101、talliedAt mint :354)は本来用途としてそのまま。
- **Consequences**: 挙動差ゼロ・diff 最小(surgical)。将来受理形を広げる改定があっても正規化の取りこぼしが構造的に起きない。t239 の normalizeAt 4 assertion は不変。
- **Alternatives Rejected**: (a) 除去 — diff は 1 行減るが、受理形拡張時に正規化漏れの再導入リスクを作り、除去自体が transport 用途との差分説明を要して surgical でない。(b) parse 内へ正規化を移設 — parse-don't-validate の「検証済みを型で運ぶ」に反し、parse が I/O 表現の書換えまで担う責務混合になる。

## ADR-2: unknown-ref 照合は store(appendBallot)に置く(E-BFARA3 の実装点)

- **Context**: ref 実在照合は ledger の読取を要する。Ballot.parse は純関数(election 定義のみ受取)で ledger を持たない。
- **Decision**: 照合は `appendBallot` の dup 判定直後に置き、`StoreError` へ `unknown-ref` を追加。parse は ref の**形式**(3フィールドの型)까지、store が**実在**を担う。
- **Consequences**: parse の純関数性維持(t234 は fixture のみでテスト可)。受理点(store)で fail-closed が完結し、CLI は既存 storeFail 経路で loud 表示。
- **Alternatives Rejected**: (a) Ballot.parse へ ledger を渡す — 純関数層に I/O 由来データが混入し、既存呼び出し元全数(CLI/テスト)のシグネチャ変更を強いる。(b) CLI(handleVote)で照合 — store を直接使う将来の呼び出し元(テスト・他ツール)が照合を素通りできる穴を残す(guard-activator の教訓: 起動者不在の安全網は空文)。

## ADR-3: per-voter 解決は tally 内部適用の単一 choke point(FR-4 (b) の実現)

- **Context**: tally と verify recompute が同一の解決済み母集団を使う必要(FR-4 (b))。verify は tally を再呼び出しする構造(election.ts:440)。
- **Decision**: `resolveBallots` を model の export 純関数として1定義し、`tally` 先頭で適用。GoA 度数(GoaFreq.fromVotes / checkGoaLine)の母集団も同じ resolver を通す。
- **Consequences**: tally シグネチャ不変で呼び出し元の変更ゼロ。母集団解決の定義が1箇所(canonical 1定義から導出 — construction ガードレール)。resolver 単体は t234 で純関数テスト可能。
- **Alternatives Rejected**: (a) 呼び出し元ごとに解決 — 集合分裂(tally は解決済み・verify は未解決)の再発温床で、まさに現欠陥(verify が二重計上を検出できない)の反復。(b) store 書込時に original を物理置換 — ADR-5(correction trail)違反で要件外の破壊的変更。

## ADR-4: 分類順は「識別子→内容」の既存順序を保存し invalid-timestamp を内容側先頭へ挿入

- **Context**: 既存5分類は parse-failure → unknown-election → unknown-voter → goa-out-of-range → reservation-missing(NFR-1 が順序の明文化を要求)。
- **Decision**: invalid-timestamp を unknown-voter の直後(goa-out-of-range の前)へ。エラー報告の決定性をテストで固定。
- **Consequences**: 複数不正を含む ballot のエラーが決定的。既存3分類の順序不変(後方互換)。
- **Alternatives Rejected**: 末尾追加 — timestamp は全 ballot 共通属性で investigation 時に最初に知りたい不正であり、内容系(goa/reservation)より先が診断効率で勝る。順序自体に外部契約はないが、決めない選択(実装任せ)は NFR-1 違反。

## 逸脱申告

なし — 要件(FR-1〜5/NFR)・裁定(E-BFARA1〜3)・ディスパッチ要件からの逸脱はない。#1262(receivedAt)は本 intent スコープ外として不実装(component-dependency.md 記載、W 系判定)。
