# Component Methods(公開面)— metrics-observation

> 情報隠蔽: 公開は CLI verbs と seam ファイルのみ。collector の内部実装・スキーマ組み立ては非公開(モジュール内)。

## C1 CLI(scripts/metrics-snapshot.ts)

- `--write` → snapshot 生成・書き込み(exit 0/1)
- `--check` → dry-run(exit 0/1)
- 引数なし → usage+exit 1
- テスト用 in-process seam: `runSnapshot(opts): Result`(export — spawn 盲点対策 C8。collect 関数は依存注入可能にし、失敗注入テスト(FR-4 落ちる実証)を可能にする)

## C2 collector インターフェース(型は functional-design で確定)

- 各 collector: `name` + `collect(env) → { tool, tool_version, ...values } | CollectorError`(判別ユニオン Result — project.md のモデリング様式)
- 追加が他 collector に非影響(FR-5)= collector 配列への1要素追加で完結する構造

## C4 seam(tests/run-tests.ts)

- `tests-totals.json`: `{ files, failedFiles, assertions, failedAssertions }` を coverage-totals.json と同じディレクトリ・同じタイミングで書き出し(既存カウンタ :398-401 の値)

## C5 CI job

- `needs: coverage`(totals/lcov 成果物を artifact 経由で受領)
- `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
- `permissions: { contents: write }`(job 単位 — workflow 全体は read のまま)
