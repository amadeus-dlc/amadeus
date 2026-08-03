# Performance Design — u1-asset-build

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は nfr-requirements SKIP により不在。engine directive がこれらを `expected: true` の設計上不在として渡したため、数値やサービス前提は捏造せず、唯一存在する `business-logic-model` の決定的 asset build フローをfallback入力として設計する。

## 性能境界

対象は常駐サービスではなく、release 時だけ走る Bun CLI と GitHub Actions job である。キャッシュ、connection pool、水平スケールは導入しない。性能の正準境界は、既存の `bun scripts/package.ts` で生成済みの `dist/` を1回走査し、tar・checksum・manifestを一方向に生成する処理とする。

- 同一 job 内で全ハーネスを再 build しない。検証済みの生成済み `dist/` を `scripts/release-dist.ts` が読み取る
- harness 一覧は `discoverHarnessNames` の結果を1回取得し、tar と manifest で共有する
- checksum は生成後の tar/manifestを各1回ストリーム走査して算出し、全内容をメモリへ保持しない
- archive entry は名前順に逐次処理し、入力ファイル数に対して O(n log n)、追加メモリ O(n) のパス一覧までを上限とする

## 予算と退行検査

絶対秒数は CI runner 負荷に依存するため新設しない。既存 release workflow の timeout 内で完了することを外側の停止条件とし、次を機械検査する。

| 指標 | 受け入れ |
|---|---|
| build 回数 | release job の正本 build 1回 + 隔離再現性 build 1回。test spyで `buildTree` 呼出しが2を超えないことをassert |
| asset 生成 | 検証済み `dist/` から1回、再 build 0回 |
| ファイル走査 | harness discovery 1回、archive/checksum/manifest の責務ごとに有限回 |
| メモリ | 全 tar 内容の一括読込を禁止し、streaming I/O を用いる |
| timeout | `build-dist` job は20分。timeoutは停止guardでありservice SLOへ昇格しない |
| disk headroom | 生成前に入力tree実測値の3倍以上、かつ512 MiB以上の空きを要求 |

実装テストは fixture の fileCount を2倍にしたとき、read/write entry count が2倍±固定wrapper entry数となるcounter assertionを使う。名前sortの O(n log n) は比較回数を `n*ceil(log2(n))+n` 以下でassertし、実時間の長い負荷試験は行わない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T22:35:59Z
- **Iteration:** 1
- **Scope decision:** none

構造と文字列上の上流網羅は満たすが、archive集合、digest DAG、再現性、Release公開再試行、性能閾値が実装可能な契約へ収束していない。

### Findings

- Critical: pluginsを含むarchive root集合とmanifest.harnesses集合の関係が未定義でself-checkが成立しない。
- High: tar・manifest・SHA256SUMSの生成順序と各digest対象が相互矛盾している。
- High: byte-identical tar.gzに必要なmode、directory、symlink、PAX、gzip header、圧縮器契約が不足。
- High: 3 assetの部分upload後のcleanup、同名asset、再実行契約が未定義。
- Medium: timeout、相対退行率、disk headroom、asset警戒閾値が測定不能。
- Critical: expected absentの上流はdirectiveのfallback契約であることを成果物上で明確化すべき。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T22:40:35Z
- **Iteration:** 2
- **Scope decision:** none

再現性、公開原子性、性能閾値は閉包したが、上流フローとのarchive集合・digest順序競合とmanifest受渡しが残る。レビュー予算2回を消費。

### Findings

- Critical: stage定義とengine expected-absent fallbackの整合性は限定スコープ内で閉包不能。
- Major: business-logic-modelのharnesses集合とNFRのpayloadRoots契約が競合。
- Major: business-logic-modelのtar→SHA256SUMS→manifestとNFRの非循環digest DAGが競合。
- Major: manifest builder/archive writerへpayloadRoots/pluginRootが通っていない。
- Closed: byte-identical archive仕様。
- Closed: draft release公開と再試行契約。
