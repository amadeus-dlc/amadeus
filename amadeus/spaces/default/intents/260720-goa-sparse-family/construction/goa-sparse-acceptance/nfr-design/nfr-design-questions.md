# NFR Design Questions — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## E-OC1 判定申告

- 判定時刻: 2026-07-20T07:50:18Z
- conductor 判定: Q1 は E-GSFNR1 の GoA2 留保が具体 seam の設計判断を明示的に NFR-design へ委譲したため選挙必須。Q2/Q3 は既決境界の機械導出で選挙不要。
- Q2 根拠種別: brownfield 実コードと承認済み NFR の機械導出。`loadRules()` の `RuleFile[]` 全件 materialization は現行境界であり、本 intent は graph loader を変更しない。streaming 新設や全層連結は scope 外。
- Q3 根拠種別: NFR Requirements の N/A 判定と `tech-stack-decisions.md` の既決集約。service/network/store を追加しないため AWS、cache、queue、retry、circuit breaker、auth/crypto/telemetry の新設は非該当。
- leader 承認: 2026-07-20T07:51:00Z。Q2/Q3の選挙不要判定を承認。Q2はbrownfield実コード+承認済NFRからの機械導出、Q3はservice/network/store非追加+tech-stack既決によるN/Aで新規判断なし。Q1はE-GSFND1で選挙する。

## Q1. bounded-pass の決定論的観測 seam

E-GSFNR1 は、`N=1/2/4` の shape/count scaling に加え、NFR-design で cursor 単調前進または scan invocation 上限を決定論的に検査し、走査回数上限を assert するよう留保した。production と無関係な test-only counter を作らず、実走査と証拠を同じ基本ブロックへ置く必要がある。

- A. production-coincident scan result: exported pure `scanGoaHeads(text)` が head start offsets と実 `RegExp.exec` 呼出し回数を同時に返し、`extractGoaRecords(text)` はその結果だけから record 境界を切る。test は offsets の厳密単調増加、`execCalls=H+1`、`N=1/2/4` scaling を assertする。counter は実 exec と同じloopでのみ増やす。
- B. injectable observer: `extractGoaRecords(text, observer?)` に cursor/exec callback を注入し、test spy で単調性と上限を assertする。公開 parser API に観測用引数が混ざる。
- C. source-shape check: production API は `extractGoaRecords(text)` のまま、test が実装sourceを読み単一loop・再走査語彙不在をassertする。runtimeの実挙動でなくsource表現へ結合する。
- X. Other (please specify)

[Answer]: A — exported pure `scanGoaHeads(text)` が production と同一の forward loop から `offsets` と実 `execCalls` を返し、`extractGoaRecords(text)` はその結果だけから境界を切る(E-GSFND1、3-0、GoA favor 3、2026-07-20T07:55:08Z 裁定)。e3 GoA2条件: productionと同一のpure forward loopで証拠を返し、`N=1/2/4` についてoffset厳密単調・H比例・`execCalls=H+1`をassertする。observer案へ変更する場合は公開APIから分離した内部seamかつ実exec同一loop通知に限定し、source-shape testは不受容。

## Q2. memory 層の容量境界

memory 層は `loadRules()` が org/team/project/phases を `RuleFile[]` へ全件 materialize する。別の record/audit corpus 用 `corpusFileBodies()` generator を流用した streaming 主張はしない。

[Answer]: E-OC1 承認 2026-07-20T07:51:00Z — 既存 `loadRules()` materialization を保存し、graph loader は非変更とする。新 parser/extractor は呼出し元から渡された文字列だけを処理し、全 memory body の追加連結コピーを作らない。

## Q3. 非該当 NFR pattern の扱い

本 Unit はローカル同期 parser/extractor と既存 CLI validation の変更で、service、network、database、credential、共有runtime stateを追加しない。

[Answer]: E-OC1 承認 2026-07-20T07:51:00Z — cache/CDN/pool/async queue/auto-scaling/circuit breaker/retry/failover/backup/auth/encryption/telemetry/AWS resource は N/A と明記する。入力検証、failure atomicity、決定論、既存dist同期だけを設計する。
