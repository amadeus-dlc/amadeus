# Scalability Design — execution-evidence

## 上流と closed capacity

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。1 revision の universe は D-COUNT=7 なら96 cells、根拠ある縮約5なら72 cells、2 arms、1 warmup+5 measured、5 payload roles に閉じる。

## Namespace と index

`RevisionNamespace` は `revisionId + inputSetIdentity + scheduleId` で一意にし、旧 revision を削除せず append-only に分離する。`ExpectedCellIndex` は正準 key 列を開始時に生成し、各 key に bundle 1、runner entry 1、store entry 1だけを許す。duplicate、unknown key、97th key、6th role を reject する。

`MatrixEvidenceIndex` は identity と ledger coordinate だけを保持し、raw payload を複製しない。execution と publish は suite 内 serial、同一 store root の writer は1とする。horizontal store、database、distributed lock、sampling、自動削除は導入しない。

## CapacityGuard

開始前に `CapacityGuard` が closed expected cell count と bundle 上限から worst-case bytes を算出し、1 GiB safety reserve を含む free-space と active reservations に照合する。同じ store lock 内で `CapacityReservationPort` が revision identity、reserved bytes、expected keys、createdAt を持つ durable physical preallocation を exclusive に作る。同一 revision の retry は全 field 一致時だけ同じ reservation receipt へ収束し、別 revision は残余容量から予約する。物理割当を保証できない場合や競合時は cell を1件も spawn しない。reservation は各 publish の消費を記録し、revision close/abort receipt 後だけ未使用分を release する。別 revision の存在は容量計算に含めるが、現 revision の97th cell と混同しない。

## 境界検証

72/96 key の exact cardinality、97th key、6th role、duplicate key、2 revision 同時 reservation、reservation 後の外部容量消費、abort/restart、free-space threshold -1/exact/+1を検査する。合否は未予約 spawn=0、予約超過 publish=0、active revision index が started cells 以下、raw bundle 全量 copy=0、writer=1、旧 revision 消失=0、silent truncation=0である。
