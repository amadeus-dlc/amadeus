# Components — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## Design Boundary

新規のapplication component、deployable unit、serviceは追加しない。本成果物の「境界」は実行時コンポーネントではなく、Issue #1129の証拠が誰に所有され、どこで止まるかを固定するartifact / actor boundaryである。`architecture.md` のone-core-many-harnesses構造と `component-inventory.md` の既存コンポーネント群は変更しない。

| Boundary | Kind | Purpose | Owns | Does not own |
|---|---|---|---|---|
| CodeKB hygiene target | 既存artifact | 孤立diff3 markerの非再流入を検証 | 対象2ファイルの現行本文と履歴H2 | git着地、Issue状態 |
| Intent lifecycle record | 既存artifact | stage成果物、audit、sensor、SHAを保持 | branch上の検証証拠とhandoff状態 | main merge、Issue close |
| Human landing boundary | 既存actor boundary | 明示承認後の外部操作を実行 | mainへの着地判断 | branch検証の書き換え |
| Post-landing verifier | 運用手順 | landed main refを再計測 | ref付きmarker / H2件数 | AIによるmerge / close |

## Responsibilities and Interfaces

- CodeKB hygiene targetは `reverse-engineering-timestamp.md` と `code-structure.md` に限定する。それ以外のCodeKBやapplication sourceを編集対象に広げない。
- Intent lifecycle recordは、測定ref / SHA、4 marker語彙の件数、最新H2と履歴H2の件数、fix祖先性、CI verdict、sensor / review / gate provenanceを別フィールドで引き渡す。CI verdictが不存在またはgreenでなければlanding handoffを停止する。
- Human landing boundaryは既存の `team-practices.md` Way of Workingに従い、AIからmain merge・PR操作・Issue closeを切り離す。
- Post-landing verifierはbranchの事前結果を使い回さず、landed mainの明示refを入力に同じ件数を再計測する。

公開API、shared mutable state、database table、queue、AWS resource、UI componentは存在しない。

## Ownership and Change Containment

失敗のblast radiusは証拠のhandoffに封じる。marker / H2件数の不一致、測定ref不明、post-landing未実施のいずれかがあれば、clean / close判定を停止する。CodeKB本文、runtime topology、AWS / UIにフォールバックの変更を伝播させない。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-17T20:05:11Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `components.md` Intent lifecycle record; `component-methods.md` `evaluatePreLandingEvidence`; `component-dependency.md` D5/D6; `services.md` Landing handoff / Communication Contracts | **RESOLVED** — CI verdictがversion-controlled recordの明示フィールド、pre-landing評価入力、D5収集項目、D6 handoff条件へ追加された。missing / non-greenはいずれの契約でもfail-closedで停止し、未記録の外部状態への暗黙依存は解消した。 | 追加対応なし。 |
| 2 | Minor | `component-methods.md` Verification Operation Contracts / Type and Result Semantics | **RESOLVED** — `PreLandingVerdict = gate-ready \| stop` と `PostLandingVerdict = close-eligible \| stop` が分離定義され、各success labelと文脈別`pass`の対応、stop時に必須のSHAが明記された。 | 追加対応なし。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| read-only DAG / matrix check | PASS: D1〜D8は8件・重複0・未解決参照0、行列差分0、topological order=`D1,D2,D3,D4,D5,D6,D7,D8`、cycle 0 | CI verdict追加後も依存行列はDepends on列と一致し、循環を導入していない。 |
| iteration 1 contract closure check | PASS: CI verdictの明示契約6箇所と`PreLandingVerdict` / `PostLandingVerdict`を確認 | Major 1件・Minor 1件はともにresolved。handoffはCI missing / non-greenを目視補完せず停止する。 |
| cross-reference existence check | PASS: 全6成果物で`requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`を各6/6参照 | consumes、DAG ID、CodeKB対象、fix commitに欠落・架空参照はない。 |
| topology boundary inspection | PASS: 新規runtime component / service / API / event / database / AWS resource / UI componentは0件 | operational flowはdeployable serviceではなく、CI service追加案も明示的に棄却されている。 |

### Summary

Iteration 1のMajor 1件・Minor 1件はいずれも局所修正で閉包し、新規findingはない。証拠DAG、所有権境界、fail-closed handoff、post-landing verificationは推測なしで追跡でき、既存topologyを変更しないためREADYとする。
