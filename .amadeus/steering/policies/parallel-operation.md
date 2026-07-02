# 並行運用ポリシー

## 目的

この policy は、Amadeus 本体の自己開発を 1 人の人間と複数エージェント（複数 worktree）で並行に進めるときの判断基準を扱う。

並行させる単位の判断、共有成果物の統合、ゲート承認の運用、同一 worktree での直列化を、Intent 成果物、PR 説明、review 対応から参照できる長期方針として定義する。

判断基準は、観察済みの実例に根拠がある範囲だけを扱う。
並行運用で新しい実例（統合の失敗、想定外の衝突）が観察された場合は、実例の根拠付きで判断基準を更新する。

## 対象

- Amadeus 本体リポジトリの target workspace。
- 1 人の人間と複数エージェント（複数 worktree）による並行の自己開発作業。
- 複数 Intent の並行、フェーズパイプライン（ある Intent が Construction の間に別の Intent が Ideation を進める形）、ゲート承認の運用。

複数人チームでの並行と、複数 workspace での組織利用は扱わない。

## 責務分担

[Git Branching Policy](git-branching.md) は、単一 branch の lifecycle（起点、基準 branch、branch 名、追従、PR 作成前検証、PR 作成、phase PR の統合、PR 監視、merge、merge 後処理）を扱う。

この policy は、複数 worktree にまたがる並行の判断（並行させる単位、共有成果物の統合、ゲート承認の運用、直列化）を扱う。

両方にまたがる判断では、branch の操作は Git Branching Policy に、並行の可否と順序はこの policy に従う。

## 並行させる単位

並行は Intent 単位で行い、worktree を Intent ごとに分ける。

並行を開始する前に、候補 Issue の変更対象（skill、ファイル群、promote 単位）を列挙し、進行中の Intent の変更対象（Bolt の実装対象、PR）と突き合わせる。

接触面がない場合は並行してよい。

同一 skill への変更集中は避ける。
promote はスキルディレクトリを丸ごと置き換えるため、同じ skill を触る 2 つの branch は promote 単位で衝突する。

索引行の追加だけの接触（`policies.md` や README への行追加など）は、統合手順で解消できる小さい接触として並行してよい。

phase をまたぐパイプライン（ある Intent の Construction と別の Intent の Ideation の並行）は、変更対象が分かれていれば並行してよい。

接触面の有無を成果物から判断できない場合は、並行を開始せず、変更対象の記録を先に確認する。

## 共有成果物の統合

並行 branch のマージ後は、次の順で共有成果物を整合させる。

1. 最新の `origin/main` を取得し、継続中の作業 branch を追従させる（追従の操作は [Git Branching Policy](git-branching.md) の追従に従う。新しい作業を始める場合は merge 後処理に従い、merge 後の `origin/main` を基点に branch を作る）。
2. 共有インデックス（`intents.md`、`discoveries.md`）に影響する変更がある場合は、再生成を実行して整合させる。
3. 標準検証で整合を確認してから作業を再開する。

steering 共有資産の索引行が両 branch で追加されていた場合は、行追加同士の衝突として通常の conflict 解消で統合し、再生成対象であれば再生成を正とする。

## ゲート承認の運用

フェーズパイプラインでは、人間の役割はゲート審査官へ寄る。

承認待ちの確認には、承認待ちキュー一覧を使う。

```sh
bun run .agents/skills/amadeus-validator/scripts/GateQueueList.ts <workspace>
```

承認待ちが複数ある場合は、内容を確認してまとめて処理してよい。

承認のたびに、承認判断を decision として記録し、承認 evidence を `state.json` に追加する。

実装やマージが先行して承認記録が取り残された場合は、遡及承認として承認判断を decision に記録し、`state.json` の状態を補正してから finalization へ進む。

## 同一 worktree での直列化

同一 worktree 内では、Bolt と検証を直列に実行する。

標準検証（`npm run test:all` など）は作業ツリー全体を対象にするため、同一 worktree 内の並行実行は検証結果の信頼性を壊す。

並行は worktree 単位で行い、同じ worktree の中では順番に進める。

## 根拠

この policy の判断基準は、次の観察済みの実例に基づく。

| 判断基準 | 実例 | 参照 |
|---|---|---|
| 並行させる単位（接触面による並行可否） | Issue #350 の Construction 中に、開いている Issue 群を接触面（amadeus-validator への変更集中、promote 単位、`package.json` の共有行）で並行可否に分類し、Issue #351 の Ideation と並行した。 | [20260702-gate-queue-visualization](../../intents/20260702-gate-queue-visualization.md)、[PR #359](https://github.com/amadeus-dlc/amadeus/pull/359)、[PR #362](https://github.com/amadeus-dlc/amadeus/pull/362) |
| 共有成果物の統合（追従と再生成） | Issue #334 で共有インデックスを生成物化し、並行 branch の統合後に再生成することで手動コンフリクト解消が不要になった。 | [20260702-shared-index-generation](../../intents/20260702-shared-index-generation.md)、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |
| ゲート承認の運用（キュー確認と遡及承認） | 承認待ちキュー一覧の導入直後に、承認記録が取り残された Intent の滞留 3 件を検出し、遡及承認（decision 記録と state 補正）で解消した。 | [20260702-construction-internal-next-skill-parent-routing の D003](../../intents/20260702-construction-internal-next-skill-parent-routing/construction/decisions/D003-task-generation-retroactive-approval.md)、[PR #363](https://github.com/amadeus-dlc/amadeus/pull/363) |
| 同一 worktree での直列化 | Issue #334 の Construction で、検証競合を避けるために同一 worktree 内の Bolt を直列実行し、並行は worktree 間で行った。 | [20260702-shared-index-generation の B001 notes](../../intents/20260702-shared-index-generation/construction/bolts/B001-regeneration-script-and-verification/notes.md)、[PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) |
