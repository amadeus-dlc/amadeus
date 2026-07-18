上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# セキュリティ設計 — U1 サイズ分類台帳

本設計は `performance-requirements.md` のローカル決定処理、`security-requirements.md` の FS 信頼境界、`scalability-requirements.md` の OS 可搬性、`reliability-requirements.md` の fail-closed 可視化、`tech-stack-decisions.md` の依存非追加、および `business-logic-model.md` の純関数境界を具体化する。

## SEC-D1: 入力境界と path containment

FS を触るのはスイープ駆動側だけとし、`buildLedgerRow`、`buildSizeLedger`、`classifyTestSize`、`parseSizeAnnotation` は文字列・値だけを受ける純関数に保つ。

駆動側は次の順序で path を扱う。

1. 明示的に渡された repository root から logical `tests` root と、その realpath である canonical `tests` root を解決する。純関数は環境変数を直接読まない。
2. directory は再帰走査にだけ使い、非 `*.test.ts` entry は母数へ入れず無視する。regular file または symlink として発見された `*.test.ts` entry だけを raw candidate として数える。
3. 発見時 entry を `/` 区切りの `logicalRepoPath`（repository 相対、`tests/...`）と `testsRelativePath`（logical tests root 相対、例 `unit/a.test.ts`）へ正規化する。絶対化、空の第1階層、`.` / `..` segment を拒否し、台帳の `file` は logicalRepoPath、tier は testsRelativePath の第1階層から導出する。
4. raw candidate の realpath を `canonicalTarget` として解決し、canonical tests root 配下の regular file であることを確認する。解決不能、root 外への symlink escape、非 regular target は logicalRepoPath を伴う `path-rejected` とする。canonicalTarget は containment と読取だけに使う。
5. normalized logicalRepoPath の重複に加え、異なる logicalRepoPath が同じ canonicalTarget を指す symlink alias も全候補について読取前に検査する。いずれも母集団を二重計上し得る `duplicate-candidate` fatal とし、全 collision pair を各 pair 内で code-unit 昇順へ正規化した上で、pair 同士の code-unit 辞書順が最小の1組だけを保持して dedupe しない。logical path 重複の pair は同じ値2件になり得る。
6. canonicalTarget からソースを読み、台帳と failure outcome へは logicalRepoPath だけを渡す。canonicalTarget、絶対 path、drive prefix、環境固有 prefix を保存しない。

現行 `relative(...).split(/[\\/]/)[0]` は tier 導出であり containment 検証ではないため、両責務を混同しない。`AMADEUS_METRICS_ROOT` は既存 metrics collector の設定面であり、U1 純関数の暗黙入力にはしない。

## SEC-D2: source を実行しない分類境界

source は既存 `classifyTestSize` と `parseSizeAnnotation` の文字列解析にだけ渡す。`eval`、dynamic import、test execution、child process、network call を分類経路へ追加しない。

出力を次に限定する。

- `file`: 発見時 entry 由来の `/` 区切り repository 相対 logical path
- `tier`: logical tests-root-relative path の第1階層から導出した文字列
- `measured` / `declared`: 既存 `TestSize` 値または null
- `signals`: 既存 classifier の signal 名
- failure diagnostic data: repository 相対 logical path と閉じた failure kind。表示文はこのデータから固定 template で生成する

source 本文、任意の source 断片、環境変数、credential、token、stack trace、runtime/OS 由来の例外 message、canonical/絶対 path を `SizeLedger` や診断 outcome へ複製しない。

## SEC-D3: 脅威と統制

| 脅威 | 適用 | 設計統制 |
| --- | --- | --- |
| Path traversal / symlink escape | 適用 | canonical `tests` root 配下を確認し、外部 path を拒否 |
| Source execution | 適用 | regex・header parse の純粋な文字列処理に限定 |
| Output tampering | 適用 | observed ref、決定的 sort、rows からの matrix 一括派生 |
| Information disclosure | 限定適用 | 相対 path と分類 label のみ保持し、source・secret を保存しない |
| Spoofing / privilege escalation | N/A | principal、認証境界、権限変更、特権操作がない |
| Network interception / CSRF / XSS | N/A | endpoint、browser、network transport がない |

## SEC-D4: 適用外と所有境界

認証、認可、TLS、暗号化 at rest、security header、CSRF/XSS、secrets manager、IAM、VPC、SAST/DAST の新設は、U1 がローカル repository 内の静的分類処理であり外部 principal・通信・DBを持たないため N/A とする。既存 repository/CI の必須セキュリティ検査を省略する根拠にはしない。

runner 全体が持つ環境変数継承、spawn、AWS/Claude 統合は U1 の静的台帳境界外である。本設計からその挙動を変更せず、生成スクリプト、CI job、権限配線も追加しない。
