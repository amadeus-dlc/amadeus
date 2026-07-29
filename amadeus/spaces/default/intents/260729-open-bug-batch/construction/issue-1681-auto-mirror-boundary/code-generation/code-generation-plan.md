# Issue #1681 コード生成計画

## 目的

`auto-mirror=auto` の phase boundary で Mirror Issue が存在しない場合も、人間への確認を挟まず、既存の mirror lifecycle coordinator に処理を委譲する。coordinator が durable identity と receipt を用いて guarded create または guarded sync を選択する既存契約は維持する。

## 前提と変更境界

- 不具合原因は `amadeus-orchestrate` の一時的な境界判断が `auto + Mirror Issue 不在` を `ask` に変換していることに限定される。
- 固定コマンドは create/sync を直接選ばず、`amadeus-mirror-lifecycle.ts boundary phase` を呼び出す。
- `prompt` は create/sync/skip の確認を維持し、`off` は GitHub mutation と mirror 質問を行わない。
- Issue #1607 で確立した workflow completion transaction、pending receipt、再開処理は変更しない。

## TDD の観測境界

公開 CLI の `amadeus-orchestrate next/report` が返す directive と永続 state を観測する。内部関数の呼び出し回数ではなく、次を契約として固定する。

1. `off/prompt/auto × Mirror Issue 不在/存在` の6組すべての decision。
2. `auto` は Issue の有無にかかわらず固定 lifecycle boundary command を出し、質問を出さない。
3. `prompt` のみ質問し、Issue 不在時だけ create を選択肢へ含める。
4. `off` は lifecycle command と質問を出さない。
5. 境界 command の発行だけでは workflow state が進まない。
6. 既存 lifecycle integration で、create 後のローカル失敗を再試行しても同じ Issue に収束する。

## 実装手順

1. unit/integration/e2e テストを上記契約へ更新し、現行実装で Red になることを確認する。
2. `MirrorBoundaryDecision` の `auto-sync` を、operation を決めない `auto-lifecycle` に置き換える。
3. `auto` の全ケースから固定 lifecycle boundary command を発行する最小修正を行う。
4. 英日 reference document を新しい境界契約へ更新する。
5. package/promote を再生成し、canonical/generated の byte equality を確認する。
6. 対象テスト、typecheck、lint、complexity gate、全 CI を実行する。

## 完了条件

- FR-1681-1〜3 の6セル、guarded create/sync、prompt、off、retry-safe/idempotent の回帰テストが通る。
- `bun scripts/package.ts --check` と `bun run promote:self:check` が通る。
- `bun run typecheck`、`bun run lint`、対象 suite、`bun run test:ci` が通る。
- Issue #1681 に直接対応する変更だけを Conventional Commit として記録する。
