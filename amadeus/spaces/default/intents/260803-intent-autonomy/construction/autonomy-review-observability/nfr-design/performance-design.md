# Performance Design — autonomy-review-observability

## 入力と性能オラクル

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、数値レイテンシSLOを追加しない。

性能オラクルはexplicit Intent partition、stable pagination、review-state index、incremental extension headであり、list / detail / statusのたびに全Intent・全audit・全artifactをscanしないことである。

## Queryとpagination

M07はIntent + lifecycle + review stateでdecision projectionをindexし、canonical occurrence sequence + decision IDでsort keyを固定する。query fingerprintはfilterとpage size、cursor digestはquery fingerprintとlast occurrence / decisionから導出する。

NFR実装ではpublic `DecisionCursor`を`targetAuditRevision`、nullable `reviewExtensionHead`、`projectionEventSetDigest`でrefineする。first pageはM07の単一read snapshotからこの3値とitemsを取得し、next cursorへ固定する。cursor digestはquery fingerprint、snapshot 3値、last occurrence / decisionを別domainでhashする。

subsequent pageは同じIntentのauthoritative audit revision、extension head、canonical decision / review event-set digestを再読し、cursorのsnapshotとexact matchした場合だけ続行する。event-setはvalid `AUTO_DECIDED / AUTO_DECISION_REVIEWED`をclosed payload digest付きentryへ変換し、closed event-type orderとevent ID byte順でsortし、exact duplicateだけをdedupeして`amadeus.decision-projection-event-set.v1`でhashする。1つでもdriftした場合は旧cursorを適用せず`ContractError(code=CONFLICT,locus=cursorSnapshot)`を返し、callerはfirst pageから再取得する。historical snapshotを推測して再構成しない。

`pageSize`は正の整数かつCore-owned `reviewQueryLimits.maxPageSize`以下を要求する。上限値をharnessごとに変えない。cursor mismatch、上限超過、unknown lifecycleは全量fallbackせず`MALFORMED`へ閉じる。

detailはdecision IDをtarget Intent partition内でexact lookupする。decision IDからIntentを逆引きせず、cross-Intent probeで存在有無を開示しない。

## Review projectionとencoding

review reducerは`AUTO_DECIDED`と`AUTO_DECISION_REVIEWED`をcontent identityで畳み込み、decisionごとにterminal review state / receiptを1件だけ投影する。same review ID再送は保存済みreceiptを返し、再encodingやextension再appendを行わない。

canonical-tuple-v1 / canonical-value-v1 encodingはpayload byte数へ線形、event-set生成は対象event件数に対するsortを含む`O(E log E)`、追加memoryは`O(E + pageSize)`にする。event ID衝突、unknown / missing fieldを汎用JSON objectとして保持せずparse時に拒否する。

## Statusとtelemetry

statusはvalidated `ReviewStatusInput`からdecision counts、grant summary、stop / resumeを1回投影する。human / machine formatterは同じ入力を使い、別々にauditを読むことを禁止する。

OTel属性はevent計画時に生成済みのsafe ID / enum / digestを再利用し、raw question / evidenceをspanごとに再redactしない。redaction失敗はwithheldとしてbounded metadataだけを出す。

## Verification

page境界、cursor tamper、large decision history、review済み再送、extension chain成長、redaction failureを検査する。成功した同一snapshot traversalでは各pageのquery / snapshot fingerprint不変、items重複 / 欠落0、same reviewの追加append 0、list read setがtarget Intent partitionへ限定されることを要求する。page間のnew decision、review-state変更、clone merge、completed extension appendは旧cursorをexact `CONFLICT(cursorSnapshot)`へし、first page再取得後の新snapshotで完全なqueueを返す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:44:01Z
- **Iteration:** 1
- **Scope decision:** none

cursorの公開型・identity tuple・drift処理は成果物間で統一されたが、clone変化検出の基礎となるprojectionEventSetDigest自体のcanonical生成規則がなく、5 harnessで同一cursorを実装できない。

### Findings

- BLOCKER | projectionEventSetDigestのcanonical contractが未定義である。各成果物はdecision／review event-setのdigestをcursorへ含めるが、対象event、invalid eventの扱い、identityかpayload digestのどちらを入力にするか、sort／dedupe順、domain tag、byte encodingを規定していない。このdigestはaudit revisionやextension headだけでは検出できないclone mergeを判定し、amadeus.decision-cursor.v1と5 harness golden bytesへ直接入るため、実装差により同じevent setから異なるcursor digestまたはdrift判定が生成され得る。canonical event-set tuple／encodingとgolden vectorを定義するか、既存の一意なcanonical snapshot digestを明示的に参照する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:45:56Z
- **Iteration:** 2
- **Scope decision:** none

projectionEventSetDigestは対象event、closed entry、payload digest、sort・dedupe、衝突／不正時の閉じ方、domain-separated encoding、golden vectorsまで一意に定義された。cursor、reload、clone drift、5 harness contractとの整合も取れており、未解決BLOCKERや具体的な循環依存はない。

### Findings

- None
