# Design Decisions(ADR)— metrics-observation

## D1: CLI 配置 = `scripts/metrics-snapshot.ts`

- Context: FR-6(dist 非コピー面)。RE 実測で scripts/・tests/ が対象外。
- Decision: scripts/ 配下。repo 自身の観測ツールであり、package.ts / release-version-sync.ts と同じ「repo 運用スクリプト」の性格。
- Consequences: dist:check/promote:self:check 無影響(FR-6 AC)。tests/ の export(complexity-gate 等)を import する方向は tests→scripts の逆依存を作らない(scripts→tests の一方向)。
- Alternatives Rejected: (a) tests/ 配下 — ゲート(合否)とテレメトリ(観測)の責務混同、ランナーのテスト対象グロブへの誤取り込みリスク。 (b) core/tools — dist 7面同期コスト(C2)が生じ、フレームワーク製品機能でないため配布は不適切。

## D2: カバレッジ/テスト数の取得 = 既存 CI 実行の出力ファイルを読む(再実行しない)

- Context: scope 成功基準「CI 時間の実質非増」。フルスイートは数分(実測)。
- Decision: coverage/tests collector は `coverage-totals.json` / `tests-totals.json`(C4)を読む。snapshot 自身はスイートを実行しない。
- Consequences: snapshot は CI 上では coverage job の後段(needs)、ローカル手動では「直近の --ci 実行の出力」を読む(出力不在なら当該 collector は fault → loud fail、FR-4)。
- Alternatives Rejected: (a) snapshot がフルスイートを再実行 — CI 時間ほぼ倍で前提違反。 (b) Codecov API から取得 — 外部依存+SaaS 側値とローカル値の二重出典(物差し統一に反する)。

## D3: CI 統合 = ci.yml への job 追加(独立 workflow にしない)

- Context: FR-3。coverage 成果物への依存(D2)。
- Decision: ci.yml に `metrics-snapshot` job(needs: coverage、main push 限定、job 単位 permissions: contents: write)。
- Consequences: 同一 run 内 artifact 連携で単純。workflow 全体の permissions は read のまま(最小権限)。GITHUB_TOKEN push の非再トリガーでループ防止(release.yml 前例)。
- Alternatives Rejected: (a) 独立 workflow(workflow_run トリガー)— run id 解決と artifact 越境取得の複雑さ、失敗時の可視性低下。 (b) cron — バックログ B3(要件で不採)。

## D4: collector 抽象 = 判別ユニオン Result の配列駆動

- Context: FR-5(疎結合)。project.md のモデリング様式(functional-domain-modeling-ts)。
- Decision: collector は name+collect の一様インターフェースの配列。1要素追加で拡張完結。エラーは判別ユニオンで返し、C1 が集約して loud fail(例外の握りつぶしなし)。
- Consequences: FR-5 AC(追加が他部に非影響)がテスト可能。詳細型は functional-design で確定。
- Alternatives Rejected: (a) collector ごとの個別 CLI — 呼び出し面の増殖。 (b) クラス継承階層 — house 様式(class-free)に反する。
