# Performance Design — execution-evidence

## 上流と設計目標

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、120秒の suite budget、closed bundle、serial execution、atomic publish を実装可能な境界へ割り当てる。arm oracle、eligibility、report rendering は扱わない。

## Deadline と実行経路

`SuiteDeadline` は injected monotonic clock の開始値と120秒の絶対期限を保持する。frozen contract は上限 bundle の flush、hash、rename、parent sync を完了できる保守的な `publishReserveMs` を実測 fixture から固定し、0以下や未実測値を拒否する。`CellCoordinator` は各 cell の直前に `remainingMs` を読み、`remainingMs <= publishReserveMs` なら spawn せず `SUITE_TIMEOUT` と missing keys を確定する。正なら `ProcessPort.run` へ `timeoutMs <= remainingMs - publishReserveMs` を渡す。cell 完了後の evidence publish も同じ絶対期限を受け、期限内に durable receipt を得られなければ success bundle を主張せず、staging identity と `EVIDENCE_PUBLISH_TIMEOUT` を suite incomplete finding に残す。cell ごとの budget reset や並列実行を行わない。

`CellStreamCollector` は stdout/stderr を chunk ごとに一度だけ staging file へ書きながら SHA-256 と byte length を更新する。JSON 3種は各1 MiB、stdout/stderr は各16 MiB、index envelope は64 KiB、bundle 合計は35 MiB + 64 KiBで打ち切る。超過時は process を terminate し、読み取った範囲の hash/length と unknown discarded-byte marker を partial receipt に保存する。

## Store と memory bounds

`EvidencePublisher` は current cell の staging handles、5-role manifest、expected ledger heads だけを保持する。`MatrixEvidenceIndex` は cell key から bundle identity への bounded map とし、raw payload を aggregate JSON や heap へ複製しない。store lock 待ちも suite deadline を消費する。

revision 開始前に `CapacityGuard` が `(72 または 96) × bundle 上限 + 1 GiB reserve` を検査する。検査と同じ store lock 内で `CapacityReservationPort` が revision identity に bind した durable preallocation を作り、active reservation を二重計上して競合を拒否する。物理割当を保証できない platform は fail closed とする。各 publish 後に消費量を reservation receipt へ反映し、revision close または明示 abort の durable receipt 後だけ未使用分を release する。不足時は最初の subprocess を起動せず `INSUFFICIENT_STORE_CAPACITY` を返す。

## 計測と合否

`timing.json` は process monotonic duration、cell start から durable publish までの elapsed、suite elapsed を別 field で持つ。fixtures は72/96 cells、payload 上限-1/exact/+1、deadline/publish reserve 前後、容量 reservation 競合、abort/release、lock 競合を含む。合否は writer=1、spawn 数=started keys、started cell の durable receipt または明示 incomplete finding 欠損=0、payload roles=5、上限超過 success=0、raw 全量二重 copy=0、per-cell reset=0、orphan success=0で判定する。
