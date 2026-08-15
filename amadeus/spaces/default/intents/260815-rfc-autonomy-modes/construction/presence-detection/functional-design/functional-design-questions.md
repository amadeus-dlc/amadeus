# Functional Design — Questions(unit presence-detection)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: 「HUMAN_TURN 造幣パイプラインの再利用」とは mintHumanPresence を呼び直すことか、その出力を読むことか

- A. `mintHumanPresence`(`amadeus-presence-reservation.ts:607`)はハーネスの `UserPromptSubmit` 経路で既に呼ばれている書込専用の副作用関数であり、U2 がこれを再度呼ぶと HUMAN_TURN が二重に造幣される。「再利用」とは、この関数が書き込む **HUMAN_TURN イベントそのものを読取側の一次信号にする**ことであり、U2 は新しい読取専用関数(`resolveSessionInteractivity`)を新設し、mintHumanPresence を呼ばない
- X. Other

[Answer]: A — FR-2「一次信号は既存 HUMAN_TURN 造幣パイプラインの再利用とし、新検出面を最小化」。RFC Reference-level「対話/非対話検出の実装シーム」は「機械注入ターンの偽装検出 #755 を通過済み」の造幣器を再利用すると明記しており、二重発火は FR-2 の「新検出面の最小化」に反する。component-methods.md C3 のシグネチャも読取専用(`resolveSessionInteractivity(projectDir): {...}`)。

## Q2: 「セッション」の単位を実装でどう境界づけるか

- A. `auditShardName(projectDir)`(`amadeus-lib.ts:4121`)が返すこのクローン固有のシャードファイル(`<host>-<cloneId>.jsonl`)を「セッション」の単位とし、そのシャードに 1 件以上の `HUMAN_TURN` があれば対話とする。既存の `handleDelegateApproval` / `handleDelegateRejection`(`amadeus-state.ts:4593-4599`, `:4685-`)が発行元セッションの実在性をまさにこの手順(`auditShardDir` + `auditShardName` → `readFileSync` → `findAllEvents(..., "HUMAN_TURN")`)で確認しており、これを踏襲する
- B. 全シャードの合流ビュー(`scanPresenceLedger` 相当)を使う
- X. Other

[Answer]: A — RFC「対話/非対話のセッション単位検出(Q3=A′)」は「本セッションに実 HUMAN_TURN が1件以上ある」を判定単位とし、これは「このプロセスが書いている監査シャード」に閉じた概念である。B(全シャード合流)は他クローン・他セッションの HUMAN_TURN を誤って自セッションの対話性に混入させ、非対話セッションが他人の在席を借りて対話と誤判定される。C13(presence-closure)の `scanPresenceLedger` はゲート境界(ワークフロー全体の未消費ターン)を扱う別の概念であり、C3 はセッション単位に限定するため意図的に別実装とする。

## Q3: 判定不能(シャード読取失敗・監査ディレクトリ不在)時の既定値

- A. `{ interactive: false }`(非対話)を返す。例外を投げない
- X. Other

[Answer]: A — component-methods.md C3「判定不能は `{ interactive: false }`(fail-closed)」、RFC 裁定順序「非対話が信号不明・読取不能のときの fail-closed 側」。C3 の関数は Stop hook から同期経路で呼ばれるため、例外送出は呼び出し元(対話継続の可否を判定する経路)を無条件に落とし、非対話の安全側デフォルトより悪い結果(ハング/クラッシュ)を生む。

## Q4: 消費者が複数(Stop hook・裁定順序3分岐・`--status`)ある場合の一意性の担保方法

- A. 公開関数を `resolveSessionInteractivity(projectDir)` の 1 本に限定し、Stop hook(U4)・裁定順序の分岐(U3/U4)・`--status`/statusline(U7)はすべてこの関数を import して呼ぶ。各消費者が独自に `auditShardName`/`findAllEvents` を再実装することを禁止する
- X. Other

[Answer]: A — component-methods.md C3「消費者: Stop hook / FR-4 分岐 / --status。全員この関数のみ」、FR-8 UI 真実性の契約「内部判定(対話/非対話…)は…判定根拠を監査へ記録する」も単一ソースを前提にする。二重実装は UI 真実性(表示値と実効値の乖離)を再生産する D3/D9 と同じ欠陥クラスを生むため禁止する。
