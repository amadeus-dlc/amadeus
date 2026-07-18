上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# スケーラビリティ設計 — U3 移設選定台帳と層別カバレッジ整合計画

本設計は `performance-requirements.md` の動的母集団、`security-requirements.md` の閉じた入力、`scalability-requirements.md` のsignal/tier増加、`reliability-requirements.md` の安定順序、`tech-stack-decisions.md` の4 NamedTier、および `business-logic-model.md` の計画データを具体化する。

## SCAL-D1: 固定件数を持たない再生成

将来の全件数N、候補数C、signal数Sは毎回U1 ledgerと `EvidencePayload` から導出する。442、163、排他的bucket 62/1/9/90/1、signal出現数153/99/1/1はmeasurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の回帰oracleであり、配列長、分岐、容量上限へ埋め込まない。

新しいmeasurement refではledgerと `EvidencePayload` を一組で再生成し、そのcanonical digestを明示する別HUMAN_TURNから新しい `ApprovalProof` を得る。旧refのproofを流用しない。canonical evidence byte数Eを含め、比較sort・digest込みで O(N+B+E+S+C log C)、`EvidencePayload` を除く追加作業メモリ O(C+S) とし、N増加を理由にDB、cache、shard、worker poolを先行追加しない。

## SCAL-D2: signal集合と組合せの変化

既知signal集合は `network|spawn|filesystem|timer` に閉じる。既知signalの新しい組合せは、各signalのdispositionをTECH-2の決定表へそのまま適用する。組合せ専用ifを増やさず、一意に閉じなければ `classification-review` とする。

未知signalは既存signalへ類推せずatomic `invalid-input` とする。signal追加はclassifier、KnownSignal型、evidence schema、決定表、テストを同時変更する仕様変更であり、人間確認を要する。signal出現数とcandidate数を別軸に保ち、1候補をfinal stateへちょうど1回だけ投影する。

## SCAL-D3: 2 queue の安定順序

- `reviewQueue`: normalized repository相対fileのcase-sensitive code-unit昇順。
- `migrationQueue`: rank昇順、次にfileのcase-sensitive code-unit昇順。rankはseam=0、両retier=1だけ。
- file重複はtie-break対象でなくinvalid-inputである。
- `classification-review` とmigration rankの間に架空の数値順序を作らない。

valid candidate集合は2 queueの排他的和に一致する。open-review中のmigrationQueueは計算可能でもactionableではなく、review解消後の再承認・全体再評価でreadyになった場合だけ消費可能とする。

## SCAL-D4: tierとledgerKeysの増減

coverage bindingは常に `unit|integration|e2e|smoke` の4件とし、この順でmaterializeする。各 `ledgerKeys[]` はledger matrixのcountが正のkeyだけを `small|medium|large` の `SIZE_VALUES` 順で投影する。tierに非ゼロkeyがなければ空配列を許し、架空のkeyやcountを作らない。

開いたTierに補助tierが増えてもbindingへ自動昇格せず、補助tier観測としてpath/CIともnot-applicableにする。NamedTier追加はrunner、coverage、要件、binding cardinalityを変える仕様変更なので、人間確認なしに5件目を追加しない。

## SCAL-D5: coverage状態の将来変化

PathStateとCiParticipationは直交して更新する。follow-upがper-tier artifactを実装した場合だけ該当pathをpendingからexistingへ変え、CI workflowで実行された実測が得られた場合だけnot-executedからexecutedへ変える。一方の変化から他方を推論しない。

現行combined観測はbinding外に残す。tier別artifact数、保存容量、並列度、retentionは実装案と実測がないためPENDINGとし、水平scale、load balancer、autoscaling、DB sharding、distributed queueはN/Aとする。

## SCAL-D6: 検証条件

- 442以外のledgerでも候補抽出、evidence全単射、2 queueの排他的和が成立する。
- 新しい既知signal組合せは決定表で処理し、未知signalはinvalid-inputになる。
- 同じ入力を異なる列挙順で与えてもqueueとledgerKeysの出力順が一致する。
- 4 NamedTier bindingは常に4件で、各ledgerKeysは非ゼロkeyを過不足なく保持する。
