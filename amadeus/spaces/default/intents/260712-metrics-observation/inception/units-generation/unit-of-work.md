# Unit of Work — metrics-observation

> 規模正当化: 3ユニット(推定 U1=小: seam 1関数+テスト / U2=中: CLI+6 collector+writer+テスト群 / U3=小: ci.yml job+落ちる実証)。既存インフラ再利用は application-design components.md の棚卸しどおり — 新規ジョブは U3 の1つのみで、既存 CI ジョブ・ランナー・ツールで代替できない根拠は ADR D2/D3 に記録済み。

## U1: run-tests-totals-seam(C4)

- 内容: `tests/run-tests.ts` へ `tests-totals.json` 書き出しを追加(coverage-totals.json :610 の対称、カウンタ :398-401 の実在値)。in-process テストで固定。
- 対象: tests/run-tests.ts(+テスト)。FR: FR-1 tests 行(Q1=A)。

## U2: metrics-snapshot-cli(C1+C2+C3)

- 内容: `scripts/metrics-snapshot.ts` — verbs(--write/--check/usage)、6 collector(判別ユニオン Result 配列)、スキーマ組み立て、temp→rename アトミック書き込み、loud fail。runSnapshot export(in-process seam)+失敗注入テスト(FR-4 落ちる実証)。
- 対象: scripts/metrics-snapshot.ts(新規)+tests/unit の seam テスト。FR: FR-1/FR-2/FR-4/FR-5/FR-6。

## U3: ci-snapshot-job(C5)

- 内容: ci.yml へ `metrics-snapshot` job(needs: coverage、main push 限定、job 単位 contents: write、artifact 受領→ --write → commit/push)。ループ非誘発の文書化+実証。
- 対象: .github/workflows/ci.yml。FR: FR-3。
