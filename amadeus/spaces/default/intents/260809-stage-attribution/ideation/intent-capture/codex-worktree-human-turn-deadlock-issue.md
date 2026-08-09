## 概要

Codex で Amadeus の intent を新しい専用 worktree から開始すると、active hook ファイルがない状態でも `intent-birth` と最初の `run-stage` まで成功する。その後、番号付き質問へ人が回答しても `HUMAN_TURN` が記録されず、質問回答と Intent autonomy の設定が provenance guard に拒否される。

## 再現手順

対象 revision: `9c8933b796036e94c423abb6c18ec6147c693d37`

1. Codex task の開始後に、Amadeus 自己開発用の専用 worktree を作る。
2. 専用 worktree で `mise trust`、build、`intent-birth --scope self-feature` を実行する。
3. `amadeus-orchestrate.ts next` が返す `intent-capture` の番号付き質問を人へ提示する。
4. 人が番号で回答した後、`amadeus-log.ts answer` を実行する。
5. Intent autonomy を `amadeus-bolt.ts set-autonomy --mode semi` で設定する。

観測結果:

- intent の audit shard に `DECISION_RECORDED` はあるが `HUMAN_TURN` がない。
- `amadeus-log.ts answer` は「この checkpoint turn に real human action がない」と拒否する。
- `amadeus-bolt.ts set-autonomy --mode semi` は `PROVENANCE_REQUIRED` で拒否する。
- `amadeus-codex-hooks.ts doctor --json` は `ACTIVE_MISSING` を返す。
- `amadeus-codex-hooks.ts activate` 後は doctor が pass するが、既に動いている Codex task では次の人入力でも `HUMAN_TURN` が記録されず、deadlock は解消しない。

## 期待結果

人の回答が必要になる前に hook availability を fail-fast で検査し、必要なら task 再開を含む復旧手順を提示する。または、専用 worktree で開始した workflow の `UserPromptSubmit` が、その workflow の active intent に `HUMAN_TURN` を記録できる。

少なくとも `intent-birth` が成功した後、最初の質問まで進んでから回復不能な provenance failure へ陥らない。

## 実際の結果

workflow は最初の human checkpoint まで正常に進んだように見えるが、人の回答を監査へ結び付けられない。activation は active hook ファイルを作成するだけで、起動済み task の hook 登録を更新しないため、その task 内では回答・autonomy・approval を先へ進められない。

## 影響

- Amadeus の Codex self-development で要求される専用 worktree と human-presence guard を同時に利用できない。
- intent record は作成済み・in-progress のまま残り、利用者は原因が hook activation だと分かるまで質問回答を繰り返す。
- guard を迂回すべきではないため、同じ task 内に安全な workaround がない。

## 完了条件

1. active Codex hooks がない worktree では、intent の最初の human checkpoint より前に fail-fast する。
2. エラーは `amadeus-codex-hooks.ts activate` と、必要な場合は Codex task の再開が必要だと明示する。
3. 専用 worktreeで、番号付き質問への実際の人入力が owner intent の audit shardへ `HUMAN_TURN` を1件だけ記録する統合テストを追加する。
4. その `HUMAN_TURN` により `amadeus-log.ts answer` と `set-autonomy --mode semi` が成功することを検証する。
5. inactive hooks のまま `intent-birth → run-stage → human answer` が静かに deadlock する回帰を防ぐ。
