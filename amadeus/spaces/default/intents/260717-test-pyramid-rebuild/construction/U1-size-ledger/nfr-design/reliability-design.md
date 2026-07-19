上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 信頼性設計 — U1 サイズ分類台帳

本設計は `performance-requirements.md` の決定的処理、`security-requirements.md` の FS 境界、`scalability-requirements.md` の再生成、`reliability-requirements.md` の部分失敗局所化、`tech-stack-decisions.md` の純関数再利用、および `business-logic-model.md` の欠落可視化を具体化する。現行コードの failure handling を達成済みと扱わず、後続実装が満たす設計契約として記す。

## REL-D1: complete / incomplete / fatal の閉じた結果

`SizeLedger { observedRef, rows, matrix }` の公開スキーマは変更しない。FS 駆動境界は、台帳と失敗を混ぜずに次の論理結果を返す。

```text
LedgerBuildOutcome =
  | complete   { ledger, candidateCount }
  | incomplete { ledger, candidateCount, readFailures[] }
  | fatal      { failure: FatalFailure }

LogicalPath = normalized-logical-repository-relative-path

ReadFailure = { file: LogicalPath, kind: read-failed | path-rejected }

FatalFailure =
  | { kind: root-missing }
  | { kind: enumeration-failed }
  | { kind: observed-ref-missing }
  | { kind: duplicate-candidate, files: readonly [LogicalPath, LogicalPath] }
  | { kind: classifier-failed, file: LogicalPath }
  | { kind: annotation-parser-failed, file: LogicalPath }
  | { kind: invariant-violated }
```

- `candidateCount`: directory と非 `*.test.ts` を除外した後、canonicalization 前に得た raw `*.test.ts` candidate 数。通常の traversal entry を failure 母数へ入れない。
- `complete`: 全 raw candidate が検証・読取され row になった。
- `incomplete`: 個別 file の read/path failure を明示し、成功 row の ledger は返すが完全な台帳とは扱わない。
- `fatal`: tests root の不存在、列挙不能、observed ref 不在、normalized logical path 重複、canonical target を共有する alias 重複、classifier/annotation parser defect、不変条件違反など、母集団または結果を一意に確定できず ledger を構成してはならない。kind ごとの必須 field は判別 union で閉じ、許可されない field を付けない。

自由形式 `message` は outcome に持たない。診断表示は閉じた `kind` を固定 template へ写像し、判別 union が `file` / `files` を持つ場合だけ正規化済み logical path を差し込む。runtime/OS の例外 message、stack、canonical/絶対 path は決定的 outcome の外に置き、永続化しない。

永続化 schema、CLI exit code、CI gate は本 intent の範囲外である。後続実装はこの意味論を失わない表現を選ぶ。

## REL-D2: 完全性と決定性の不変条件

- complete/incomplete では `candidateCount = ledger.rows.length + readFailures.length`。directory と非 `*.test.ts` entry は式のどの項にも入れない。
- normalized logicalRepoPath が重複した場合、または異なる logicalRepoPath が同じ canonicalTarget を指す場合は `duplicate-candidate` fatal とし、dedupe や二重計上を行わない。全 collision pair は pair 内を code-unit 昇順にし、その中の辞書順最小 pair を `files` に選ぶため、3件以上・複数 group の衝突でも列挙順へ依存しない。
- `ledger.matrix` は成功 rows だけから一括派生し、各 cell 合計は `ledger.rows.length` と一致する。materialize 時は matrix key の code-unit 昇順とする。
- rows と readFailures は normalized logicalRepoPath の code-unit 昇順とし、同一 file 内では failure kind 順にして列挙順へ依存しない。
- byte-equivalence の対象は `LedgerBuildOutcome` 全体である。outcome は ledger、candidateCount、閉じた failure kind、正規化済み logical path だけで構成し、同じ logical path/source/failure kind と observed ref なら全 field を固定順序で materialize する。
- fatal は pipeline 段階順の `root-missing → enumeration-failed → observed-ref-missing → duplicate-candidate → builder failure → invariant-violated` で評価する。builder 段階では candidate を logicalRepoPath 順に渡し、各 `buildLedgerRow` 内を classifier、annotation parser の順に short-circuit する。したがって複数 builder failure は `[logicalRepoPath, builder step]` の最小値を選び、kind の全体優先順位とは競合しない。
- `incomplete` を `complete`、空集合、zero-candidate の成功へ縮退させない。
- diagnostic data は source 本文・絶対/canonical path・runtime message・secret を含めず、failure kind と logical relative path だけを保持する。

現行 `metrics-snapshot` の collector 全体 failure、`run-tests` 静的 matrix の無言除外、root 不在時の空集合成功は、この契約の達成根拠ではない。将来実装は個別失敗と母集団確定失敗を上記 union へ正規化する。

## REL-D3: 回復方針と blast radius

個別 raw `*.test.ts` candidate の path/read failure の blast radius は該当 file 1件に限定する。残りの rows/matrix は診断用途に返せるが、outcome は `incomplete` のままとする。根本原因を直した後に full-rescan すれば回復できる。

local FS の決定的 failure に自動 retry、exponential backoff、circuit breaker、fallback value を追加しない。これらは一時的な remote dependency を持たないため適用外であり、retry で path/permission defect を隠さない。

classifier defect は `classifier-failed`、annotation parser defect は `annotation-parser-failed` の fatal とする。いずれも全 row へ波及し得るため、matrix 構築後の不変条件違反と同様に partial result を返さない。

## REL-D4: 適用外と将来の materialization

service availability SLO、health endpoint、load-balancer health check、multi-AZ、failover、replication、backup、RTO/RPO は、U1 が常駐 service や永続 source-of-record を持たないため N/A とする。

将来 ledger を file へ materialize する場合は、既存 metrics snapshot の temp-file + atomic rename を候補として実測・選択できる。ただし保存先、format、collision policy、atomic write は生成実装と同時に決める事項であり、本設計から先行実装しない。
