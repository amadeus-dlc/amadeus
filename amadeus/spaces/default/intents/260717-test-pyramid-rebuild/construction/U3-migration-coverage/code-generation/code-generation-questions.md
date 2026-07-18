# Code Generation 計画承認 — U3 移設選定台帳・層別カバレッジ整合計画

## 既決事項

- measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の U1 正式台帳から、unit 非 small 163件を決定的に抽出する。現在の HEAD へ暗黙更新しない。
- 古い2 remediation・単一priority・単一`ledgerKey`・具体`coveragePath`は、承認済みNFRで4 final state、独立2 queue、`ledgerKeys[]`、coverage 2軸へ精密化済みであり、再質問しない。
- application code、test、runner、classifier、CI、`dist/`、repository docs、実移設、per-tier lcov、Issue起票、#1157は変更しない。閉鎖済み [Issue #683](https://github.com/amadeus-dlc/amadeus/issues/683) は再オープンしない。
- `EvidencePayload` は engine 宣言済みの `code-summary.md` 内に canonical JSON block として一意に置き、別JSONや永続生成スクリプトを追加しない。
- 具体payloadを生成した後は、そのcanonical digestを明示した別の直接HUMAN_TURNで承認を得る。過去の「推奨」「1」、NFR設計承認、本計画承認はpayload承認へ流用しない。

## Q1: U3 Code Generation 計画を承認しますか

A. **Approve Plan（推奨）** — `code-generation-plan.md` のStep 1〜9を順に実行する。exact U1 refから163候補と具体EvidencePayloadを生成し、canonical digestを提示した時点でいったん停止する。digestを含む別HUMAN_TURNで承認された後だけ、final state、2 queue、coverage planを確定する。
B. **Request Changes** — 計画を修正して再提示する。変更したいStep、payload配置、検証境界を指定する。
X. **Other** — 別の進め方を指定する。

[Answer]: A — Approve Plan（ユーザー回答: `1`、2026-07-17T23:45:04Z）

## Q2: 具体 EvidencePayload を digest 単位で承認しますか

承認対象は `amadeus/spaces/default/intents/260717-test-pyramid-rebuild/construction/U3-migration-coverage/code-generation/code-summary.md` の `Canonical EvidencePayload` 1件である。

| 項目 | 値 |
| --- | --- |
| schemaVersion | 1 |
| observedRef | `3917a283a953165866170d235d3dc25ad2fd3643` |
| candidates / SignalEvidence | 163 / 254 |
| canonical compact bytes | 90,887 bytes |
| evidenceDigest | `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` |
| validator | `PASS` / errors 0 / run 1・2 byte-equivalent |

A. **`Approved sha256:64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8`（推奨）** — この具体payloadを承認し、auditからverified `ApprovalProof` を構成した後にfinal state、2 queue、coverage planを投影する。
B. **Request Changes** — payloadを修正し、新しいcanonical digestを生成して再提示する。修正対象のfile、locator、fact、dispositionを指定する。
X. **Other** — 別の進め方を指定する。

数字だけの回答、過去の`1`や「推奨」はこのpayloadの承認として扱わない。承認する場合は上記Aの文字列をdigestまで省略せず入力する。

[Answer]: A — `Approved sha256:64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8`（ユーザー回答: `Approved sha256:64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8`、2026-07-18T00:17:34Z）

## Q3: audit の2-event形式を ApprovalProof としてどう解決しますか

実測では、直接入力に対応する `HUMAN_TURN`（2026-07-18T00:17:34Z）は人間起源を示す一方で本文・digest fieldを持たない。exact digestは、`humanActedSinceLastAnswer` guard通過後に記録された直後の `QUESTION_ANSWERED`（2026-07-18T00:17:59Z、shard内0始まり絶対event ordinal 2739）の `Details` にある。全audit shardでこの組は一意であり、payload再計算digestと一致する。

A. **Guarded 2-event resolver（推奨）** — `auditRef` はdigestを保持する一意な `QUESTION_ANSWERED` を指し、同一shard直前の未消費 `HUMAN_TURN` とpresence guard通過をhuman provenanceとして検証する。既存schemaを変えず、2-event相関と残余制約をsummaryへ明記する。
B. **Strict single-event contract** — 現状を `approval-missing` のまま止め、`HUMAN_TURN` 自体がdigestを保持するようNFR契約またはhookを変更してから再承認する。これは本計画のrecord-only境界を越える仕様・実装変更になる。
X. **Other** — 別のresolver規則を指定する。

[Answer]: A — Guarded 2-event resolver（ユーザー回答: `1`、直接 HUMAN_TURN: 2026-07-18T00:30:23Z、`QUESTION_ANSWERED`: 2026-07-18T00:30:36Z）

## 人間承認の監査時刻

- 計画承認 HUMAN_TURN: 2026-07-17T23:43:42Z
- Payload承認 HUMAN_TURN: 2026-07-18T00:17:34Z — `Approved sha256:64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8`
- ApprovalProof resolver承認 HUMAN_TURN: 2026-07-18T00:30:23Z — 推奨案A（Guarded 2-event resolver）
