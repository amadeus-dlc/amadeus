# Intent Capture 質問(260723-archived-status-guard)

> 既決照合(質問しない事項): (1) enum 語彙4値・ガード対象3経路(cursor/next/unpark)・260713 移行・落ちる実証 — Issue #1396 提案がユーザー着手承認済み(2026-07-23)。 (2) 現況データ影響 — registry 実測(complete 65 / in-flight 3 / closed 1)で ad hoc 値は移行対象1件のみ。 (3) #1309 との整合方針 — 語彙は共通契約と同一ドメインで、実装時に e2 intent 設計成果物を参照(Issue 本文既決)。
>
> 運用モード: チームモード(AMADEUS_OPERATING_MODE=team 実測)。[Answer] 記入は裁定受領後のみ(E-OC1 3段順序)。
>
> E-OC1 証跡: 全2問はエージェント選挙 E-ASGIC1/2(blind 配布、投票者 e4/e5/e6)で裁定。leader 承認: 2026-07-23T03:43:35Z。[Answer] 記入は裁定受領後に実施。

## Q1. archived の解除(override)はどの形態にしますか?

Issue は「明示 override — 例: ユーザー承認を記録する専用 verb — がある場合のみ解除」とし、形態は例示に留めています。P4(不可逆・外部境界に人間)と運用柔軟性のバランスの判断です。

- A. 専用 `unarchive` verb を新設し、human-presence(実 HUMAN_TURN)を必須とする — archive 側も専用 verb で対にし(symmetric-pair)、両方向とも監査イベントを記録
- B. `unarchive` verb+human-presence 必須(A と同じ)だが、archive 側は updateIntentStatus の enum 検証強化のみ(新 verb は解除側だけ — 最小面)
- C. 解除は手編集(intents.json)+doctor が archived 整合を検査する運用形(verb 新設なし — 最小実装だが監査イベントが残らない)
- X. Other (please specify)

[Answer]: A(E-ASGIC1 裁定 3-0 — archive/unarchive 対の専用 verb+human-presence 必須+両方向監査イベント、symmetric-pair)

## Q2. enum への `parked` 編入と registry の park 追跡はどうしますか?

実測: 現状 `parked` は registry に出現せず(park 状態は record の amadeus-state.md 側)、Issue の enum 案には parked が含まれます。語彙定義と書込追跡は分離可能です。

- A. enum に parked を含める(語彙契約として)が、registry への parked 書込は本 intent では行わない — park/unpark の既存挙動不変(語彙の将来枠のみ確保、#1309 契約と整合)
- B. park/unpark 時に registry status も parked ↔ in-flight へ更新する完全追跡(書込面が増える — park 系の全経路改修+テスト)
- C. enum は in-flight / complete / archived の3値に絞る(parked を語彙から外す — Issue 案からの縮小、#1309 側と要整合)
- X. Other (please specify)

[Answer]: A(E-ASGIC2 裁定 3-0 — enum に parked を語彙契約として含めるが registry への parked 書込は本 intent 非対象・既存 park/unpark 挙動不変)
