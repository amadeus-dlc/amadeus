上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 性能設計 — U1 サイズ分類台帳

本設計は `performance-requirements.md` の単一スイープ、`security-requirements.md` のローカル入力境界、`scalability-requirements.md` の全数再生成、`reliability-requirements.md` の決定性、`tech-stack-decisions.md` の TypeScript/ESM・Bun 維持、および `business-logic-model.md` の一方向パイプラインを具体化する。生成スクリプト、CI 配線、benchmark、実移設は本 intent の範囲外である。

## PERF-D1: 同期・単一パスの処理構成

スイープ駆動側は `tests/` 配下の `*.test.ts` を全域列挙し、各ファイルについて次の処理を1回ずつ行う。

1. directory は走査にだけ使い、非 `*.test.ts` entry は母数外とする。regular file または symlink として発見された `*.test.ts` entry を raw candidate とする。
2. 発見時 entry から `/` 区切りの repository 相対 `logicalRepoPath` と tests-root 相対 `testsRelativePath` を作る。台帳の `file` は前者、開いた `Tier` は後者の第1階層から導出し、realpath 後の target path からは導出しない。
3. containment と読取にだけ使う `canonicalTarget` を解決する。logical path の重複、または異なる logical path が同じ canonical target を指す alias 重複を全候補で検査した後、canonical target からソースを1回読み取る。衝突時は全 collision pair から code-unit 辞書順最小の pair を決定的に選び、canonical target 自体は成果物へ保存しない。
4. 純関数 `buildLedgerRow({ file: logicalRepoPath, tier, source })` が内部で既存 `classifyTestSize(source)` を1回呼び、その成功後に `parseSizeAnnotation(source)` を1回呼ぶ。成功行には両者の戻り値だけを転記する。
5. 全行を純関数 `buildSizeLedger` へ渡し、file の code-unit 昇順と `${tier}_${size}` matrix を一度だけ構成する。

`business-logic-model.md` の「repo 相対パス第1階層」は、同じ箇所が引用する `relative(join(env.repoRoot, "tests"), file).split(...)[0]` と SCAL-2 に従い「logical tests-root-relative path の第1階層」と解釈する。これは既存 tier 意味論の明確化であり、repository 相対 `file` の先頭 `tests` を tier にする変更ではない。

分類・annotation 解析・行生成・集計は同一 Bun process 内の同期呼び出しとする。cache、connection pool、async queue、worker fan-out、CDN、lazy loading、pagination は対象となる request path や外部依存がないため採用しない。

## PERF-D2: 計算量と資源境界

N を列挙ファイル数、B を読み取るソース総 byte 数、K を実在する非ゼロ tier×size key 数とする。

- 列挙、読取、固定個数の regex 分類、annotation 解析、matrix 集計は O(B + N)。
- 決定的な file 順の比較 sort は O(N log N)。したがって全体は O(B + N log N)。
- 行、失敗診断、sort 用配列、matrix を含む追加メモリは O(N + K)。入力ソースを台帳へ複製せず、1ファイル処理後に保持するのは分類結果だけとする。
- measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の再測定は442件・非ゼロ11 key だが、件数を実装定数や容量上限にしない。

現行 `scripts/metrics-snapshot.ts` と `tests/run-tests.ts` はそれぞれ独自に静的 matrix を生成しており、`SizeLedger` は未実装である。本設計は将来実装がこの重複を増やさない境界を示すだけで、既存消費側を本 intent で変更しない。

## PERF-D3: 数値予算と最適化の採否

U1 は利用者向けサービスではなく、既存コードにも台帳スイープ固有の latency・throughput・timeout constant がない。p95/p99、requests per second、同時利用者、秒数閾値は N/A とし、未測定の値を発明しない。

最適化の導入条件は、将来実装後に同一入力・同一 observed ref で O(B + N log N) を逸脱する実測が得られた場合に限る。先行 cache、並列化、incremental index は stale ledger、列挙順依存、無効化契約を増やすため採用しない。

## PERF-D4: 検証可能な受け入れ条件

- canonicalization 成功 candidate の canonical target read は最大1回、read 成功 candidate の `buildLedgerRow` は1回である。builder 内の classifier は1回、annotation parser は classifier 成功時だけ1回とし、materialized row では両者が各1回である。
- matrix の合計は materialized rows 数と一致する。
- matrix entry は `${tier}_${size}` key の code-unit 昇順で materialize する。
- 入力列挙順を変えても rows と matrix は byte-equivalent である。
- 入力 source 本文、cache、外部 I/O、LLM 判定を出力へ持ち込まない。
- 実装時の benchmark や CI budget は、本設計ではなく測定値を伴う後続判断として扱う。

## Review

**Verdict:** NOT-READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T17:49:43Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `performance-design.md` PERF-D1、`security-design.md` SEC-D1、`scalability-design.md` SCAL-D2/D3、`logical-components.md` LOG-D1 | 台帳へ保存する repository-relative `file` と tier 導出用の tests-root-relative path が混同されている。PERF-D1 の「repository 相対 path の第1階層」をそのまま実装すると全候補の tier は `tests` になる一方、SCAL-D2 は tests root 直下を tier とする。また symlink candidate について、台帳上の file/tier を発見時の論理 path と canonical target のどちらから導出するか、canonical target が同じ alias を何の重複として扱うかが未定義である。 | 保存・tier・安全検査の path を分離して契約化する。少なくとも repository-relative logical file、tests-root-relative tier input、containment/read 用 canonical target を明記し、symlink alias の file identity・tier・duplicate policy を一意に決める。 |
| 2 | Major | `performance-design.md` PERF-D1、`logical-components.md` LOG-D1/LOG-D2 | `buildLedgerRow` の入力・依存方向が一致しない。PERF-D1 は Sweep Driver が `classifyTestSize` / `parseSizeAnnotation` を呼んだ後に builder へ渡すが、LOG-D1 の I/O は `file/tier/source → row` であり、builder が source から分類する設計にも読める。これでは classifier/parser の所有者、各1回呼出しの検証点、pure builder の公開 signature を実装者が推測する必要がある。 | builder が分類済み `SizeClassification` / `SizeAnnotation` を受けるか、source を受けて内部で既存関数を呼ぶかを一方に固定し、コンポーネント台帳、依存方向、PERF-D4 の受け入れ条件を同じ signature に揃える。 |
| 3 | Major | `security-design.md` SEC-D2、`scalability-design.md` SCAL-D3、`reliability-design.md` REL-D1/REL-D2 | `LedgerBuildOutcome` は自由な `message` を含む一方、同一 logical input/ref の outcome を byte-equivalent と要求している。FS 例外の message は OS・runtime ごとに異なり、絶対 path を含むこともあるが、安定した message への写像や byte-equivalence の対象外とする規則がない。そのままでは決定性と情報非開示を同時に満たせない。 | outcome は閉じた kind と正規化済み相対 path を決定的データとし、message を固定テンプレートから生成するか非決定的 detail を outcome 外へ隔離する。あわせて byte-equivalence の対象フィールドを明記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `f791b197` / `3b995f60` / `7484a441` / `7fff5bd5` / `7ea36e62`） | 5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `ae93fa71` / `0bd8af5e` / `2a6aae9b` / `eb30895e` / `fa9cdde8`） | 5成果物はいずれも stage が宣言する6つの上流 artifact を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `63067b63`） | Q&A は未決事項なしを明記し、`[Answer]` を必要としないため sensor の no-answer-tag 条件に適合する。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| 5成果物の契約トレース | FAIL: Major 3件 | path identity/tier、row builder signature、diagnostic determinism が成果物間で一意に閉じていない。 |

### Summary

stage の成果物構成、上流参照、適用外 NFR、スコープ境界は揃っている。一方、台帳の path identity、中心 builder の signature、failure outcome の決定性という3つの実装契約が矛盾または未定義であり、開発者が追加判断なしに実装できないため NOT-READY と判定する。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T18:03:24Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | 新規 finding なし。iteration 1 の Major 3件はすべて解消された。 | — |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| iteration 1 findings | PASS: 3/3 resolved | repository-relative logical path / tests-relative path / canonical target の分離、`buildLedgerRow({ file, tier, source })` の所有境界、閉じた failure union と固定診断 template が全成果物で一致する。 |
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `abdbb0f0` / `34e6d3b4` / `b50674f3` / `02857264` / `2fcb4efc`） | 修正後の5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `8b4f6729` / `4fe97605` / `75a5ee29` / `c9271222` / `803e80e2`） | 修正後の5成果物はいずれも stage が宣言する6つの上流 artifact を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `eee821ac`） | Q&A は未決事項なしを明記し、no-answer-tag 条件に適合する。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| 5成果物の契約トレース | PASS | path identity/tier、builder signature、failure determinism、collision 選択、rows/matrix/failure の固定順序が一意に閉じている。 |
| スコープ境界照合 | PASS | 設計はローカル台帳境界に限定され、実装、consumer 配線、CI、U2/U3、#683、#1157 を変更しない。 |

### Summary

iteration 1 の Major 3件は矛盾なく解消され、stage 必須要件、Q&A の導出、5成果物間の責務・依存・failure semantics、スコープ境界が整合する。開発者が追加の設計判断なしに後続実装へ進めるため READY と判定する。
