# Requirements — 260710-mint-presence-vectors(fix #755)

> Scope: bugfix / Depth: Minimal。上流: intent 記述(audit 参照)、codekb(business-overview / architecture / code-structure、および re-scans/260710-mint-presence-vectors.md)。
> 修正方式はエージェント間選挙で確定済み(2026-07-10、Q1/Q2/Q3 すべて A・4票)。詳細は requirements-analysis-questions.md。

## Intent 分析

- **達成したいこと**: 機械注入ターンによる偽 HUMAN_TURN 鋳造(phantom presence)の根絶。human-presence ゲートと #671 委任承認 provenance の完全性回復(GitHub Issue #755、bug/P1、クロスレビュー 2 名成立)。
- **RE 確定事実(3 者食い違いの決着済み)**:
  - 現行分類器(`packages/framework/core/hooks/amadeus-mint-presence.ts:47` の単一プレフィックス定数、`:62` の `startsWith` 一点判定)は形式 A(裸 `<task-notification>`)のみ抑止する。本番 amadeus では task-notification は 439/439 が A 形式で配信され正しく抑止済み。
  - **確定ベクタは形式 D**(teammate-message、`Another Claude session sent a message:` 開頭)— 本番 18 件の実注入がすべて素通りし phantom HUMAN_TURN を鋳造(チーム運用の最頻メッセージ形式)。
  - 形式 B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き)は合成 payload では鋳造するが本番 amadeus transcript に 0/439 で不在(外来ハーネス表示形)。防御的にカタログへ包含する(Q1=A)。
  - `stop.ts` tier-3 `transcriptIsConversational`(`:581-737`)は除外が `"Stop hook feedback:"` のみで A も D も素通り — mint hook より露出が大きい同根欠陥(Q2=A で本 intent スコープ)。
  - 消費系への波及: `humanActedSinceGate`(`amadeus-lib.ts:1544`)が phantom で true 転化、委任 grounding(`amadeus-state.ts:1645` / `:1715`)が phantom を受理。t203 に形式 D の抑止テストは不在(grep 0 件)。

## 機能要件(FR)

- **FR-1(注入マーカーカタログの単一定義、選挙 Q2=A)**: 機械注入ターンの識別マーカーカタログを共有定数(canonical 1 定義)として `core` に置き、`amadeus-mint-presence.ts` と `stop.ts` tier-3 の両消費者が同一定義から導出する。カタログ(選挙 Q1=A の 4 marker、各出典は実測):
  1. `<task-notification>`(既存 — RE: 本番 439/439 の配信形)
  2. `<teammate-message`(タグ開始形 — 出典: conductor セッション transcript の実測で、D 形式 user ターン 3/3 が本タグを **offset 39** に含む。前置き行が欠けた teammate-message 変種への防御を兼ねる)
  3. `Another Claude session sent a message:`(teammate-message の前置き行 — RE: 本番 18 件実注入の確定ベクタ、offset 0)
  4. `[SYSTEM NOTIFICATION - NOT USER INPUT]`(防御的包含 — transcript 層には不在(RE 0/439 + conductor セッション 0/22 で追認)。会話レンダリング層・合成 payload・外来ハーネス表示形として実在するため包含)
- **FR-2(判定の一般化、選挙 Q1=A)**: `startsWith` 一点判定を「プロンプト先頭 N バイト以内の marker 検出」へ一般化する(前置き許容)。N は設計で確定する。実測根拠(本 requirements 時点): 観測された marker 出現 offset は 0(A タグ / D 前置き行)と 39(`<teammate-message` タグ)で最大 39 — N は最大観測値に余裕を乗せて設計で確定し(目安 256)、根拠を design 成果物に記録する。
- **FR-3(mint-presence の抑止)**: FR-1/FR-2 適用後、形式 A/B/D いずれの UserPromptSubmit でも HUMAN_TURN が鋳造されないこと(受け入れ基準: RE と同型の合成 stdin 測定で A=0、B=0、D=0、人間対照 C=1)。
- **FR-4(tier-3 の抑止)**: `stop.ts` の `transcriptIsConversational` がカタログ該当ターンを会話性判定から除外すること(受け入れ基準: カタログ各形式のみの transcript が conversational と判定されない実測)。
- **FR-5(fail-open 維持)**: 人間の通常プロンプト(カタログ marker を冒頭 N バイト内に含まない)は従来どおり HUMAN_TURN を鋳造する。既存の人間対照テストは無改修 green。
- **FR-6(過去 shard の不改変、選挙 Q3=A)**: 過去 shard の phantom HUMAN_TURN 行は改変しない(append-only 維持)。汚染期間(分類器導入〜本修正マージ)の存在を #755 の close コメントに記録する。

## 非機能要件(NFR)

- **NFR-1(落ちる実証、Mandated)**: (a) 修正前コードに形式 D の合成 payload → HUMAN_TURN 鋳造(赤)を実証してから修正する。(b) 新テストが修正前コードで fail することをプロセス境界または in-process で実証する。
- **NFR-2(テスト固定、leader 指示)**: t203 系(mint-presence テスト)にカタログ全 4 形式の抑止+人間対照の鋳造を固定する。tier-3 側も同カタログ由来のケースを固定する。テストはカタログ定数を import して導出する(ハードコピー複製の禁止 — construction guardrail)。
- **NFR-3(dist/self-install 同期、Mandated)**: core 編集 → `bun scripts/package.ts` → `bun run promote:self` を同一コミットに含める。
- **NFR-4(surgical)**: 変更は分類器・tier-3・共有カタログ・テストに限定。humanActedSinceGate / 委任 grounding のロジックは触らない(phantom の供給を断てば消費側は正しく機能する)。
- **NFR-5(deslop)**: PR 前に deslop、全検証コマンド再実行(typecheck / lint / dist:check / promote:self:check / run-tests --ci すべて exit 0)。

## 制約

- 監査 shard は append-only(FR-6)。
- バージョン・リリース面に触れない(Mandated)。
- Bolt PR + claude メンバーレビュー(自己レビュー禁止)+人間承認マージ。PR は日本語(コミットメッセージは英語)。

## 前提(Assumptions)

- 本番 amadeus の Monitor 配信は marker を prompt 先頭バイトで届ける(RE 439/439 実測)。前置き形式 B の包含は防御であり、本番動作の変更ではない。
- in-process seam: 分類ロジックは export 関数として切り出し、`bun --coverage` の spawn 盲点(cid: bun-coverage-spawn-blindspot)を回避してテスト可能にする。

## スコープ外(Out of Scope)

- 注入元(agmsg / Monitor / SendMessage)のマーカー規約変更(選挙 Q1 で C を不採用)。
- 過去 shard の遡及修正・注記(Q3=A)。
- humanActedSinceGate(`amadeus-lib.ts:1544`)/ 委任 grounding(`amadeus-state.ts:1645`・`:1715`)のロジック自体の変更(NFR-4 — phantom の供給を断てば消費側は無改修で正しく機能する)。
- 外来ハーネス(amadeus 外)の注入形式の網羅保証(カタログは実測+防御の 4 形式に限定。将来形式は再発時にカタログへ追記)。

## 未解決事項(Open Questions)

- なし(Q1-Q3 選挙確定。N バイト閾値の具体値は FR-2 のとおり design で実測導出する)。
