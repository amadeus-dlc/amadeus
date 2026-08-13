<!-- amadeus-issue-form:v1 type=bug -->

### 重複・現行状態の確認

- [x] open/closed の両方を対象に、同じ課題・提案・質問の Issue を検索しました（GitHub検索: `full` autonomy conductor 質問 / AskQuestion HUMAN_TURN / commit push PR create。近接する #2967 は advisory `run-now` receipt 後の engine 再提示であり別機序。#2378 は人間ターン残存の計測であり本症状の修正ではない。#2914 はノルムの適用経路未規定であり、本観測はノルム違反の実測）
- [x] origin/main と関連する open/merged PR を確認し、現行状態でも起票が必要だと確認しました（観測 HEAD = `97581b3e39187b13413c046e86f820d290a389eb`。#2967 の修正はこの症状を解消しない）

### 背景・対象範囲

Intent autonomy が `full` で、directive が `autonomy_auto_approve: true` を持つ間、コンダクタはエンジンが `ask` / `await-advisory-choice` / fail-closed halt を出していない限り、ステージ契約上必要な実行（成果物作成、検証、ゲート承認報告）を人間へ質問せず続ける契約である。

観測では、`code-generation` が `pr-convergence-report` 欠落で `report --result approved` を拒否したあと、エンジンは質問 directive を出していない。コンダクタが git 安全ルール（「明示されるまでコミットしない」）を Intent grant より優先し、コミット・push・plugin `create` の可否を人間へ質問して forwarding loop を止めた。

対象:
- コンダクタの `full` 実行契約（`.claude/skills/amadeus/SKILL.md` forwarding loop、`stage-protocol.md` HARD STOP / `autonomy_auto_approve`）
- `project.md` `cid:scope-definition:c1-semi-ladder-routing`（semi/full 中のステージ内判断を人間へ直接提示しない）
- `project.md` `cid:requirements-analysis:c5`（決定済み事項を再質問しない）
- セッション／ユーザー側 git 安全選好と Intent grant の優先順位（文書化されていない衝突）

対象外（別 Issue）:
- #2967 — `run-now` auto-decision 済み advisory を `next` が再提示する engine 経路

### 根拠・実測証拠

1. エンジン状態: Intent grant `full`、`autonomy_auto_approve: true`。`code-generation` の `report --result approved` は成果物欠落で拒否されただけであり、`kind: ask` ではなかった。

```text
Transition rejected ... missing required artifacts ... (declared: code-generation-plan, code-summary, pr-convergence-report)
```

2. `pr-convergence-report.md` の正本ライターは plugin CLI の `create` であり、手書きは禁止。`create` はクリーンな worktree と local==remote HEAD を前提とする。つまりステージ完了にはコミットと push が実行経路に入る。

3. コンダクタ出力（要約）: 実装は入ったがゲートは閉じられない、と述べたうえで「続けてコミット → push → `create` までやってよければ、その指示をください」と人間へ質問して停止した。これは engine directive ではなくコンダクタが発明した質問である。

4. 利用者が「autonomy=full なのになぜ質問するのか」と指摘。#2967 との同一性を問われ、コンダクタは「いまの質問は #2967 ではない」と認めた。

5. 正準ノルム: `amadeus/spaces/default/memory/project.md` は semi/full 中のステージ内判断質問を人間へ直接提示しない（`cid:scope-definition:c1-semi-ladder-routing`）。承認済み／契約上必要な実行を再質問しない（`cid:requirements-analysis:c5`）。

### 期待結果・完了条件

1. `full` かつ `autonomy_auto_approve` のとき、エンジンが `ask` / `await-advisory-choice` / typed fail-closed halt を出していない限り、コンダクタは人間へ進行可否を質問しない
2. ステージ契約がコミット・push・PR `create` を成果物の唯一の合法経路とする場合、それらは grant 下の実行であり、別途の人間許可質問にしない
3. セッションの git 安全選好は Intent grant と衝突したら grant が勝つ、とハーネス／コンダクタ契約に明示する。衝突を質問で解消しない
4. 人間へ戻すのは、エンジンの stop set（`ask`、`select-intent`、`error`、`parked`、`await-completion`、`done`）と、ノルムが定める fail-closed 結果に限る
5. 回帰: `full` grant 下で `pr-convergence-report` 欠落により approve が拒否されたとき、コンダクタが「コミットしてよいか」を提示せず `create` 前提の git 操作へ進む（または engine が typed halt を出す）ことをテストまたはプロトコル文面で固定する

### 影響・価値

- `full` を選んでも、エンジンが止めていないところで unattended run が止まる
- 利用者には既決の実行許可を再確認され、#2967 と同じ体験（裁定済みなのに再質問）になるが、修正対象コードが異なる
- 回避策は「進めてよい」と答えることだが、根本はコンダクタが grant を無視していること

### 関連 Issue・PR・intent

- #2967 — advisory `run-now` 再質問（engine）。本 Issue はコンダクタ発明の質問
- #2378 — full でも人間裁定が残る構造要因の計測。修正ではない
- #2914 — 意思決定ノルムの semi/full 適用経路が未規定
- 観測 intent: `260813-remove-team-up`（ミラー Issue #2973）
- ノルム: `project.md` `cid:scope-definition:c1-semi-ladder-routing`、`cid:requirements-analysis:c5`

### 優先度（いつ対応するか）

P1 — 重要だが回避可能

### 観測環境・対象リビジョン

- revision: `97581b3e39187b13413c046e86f820d290a389eb`
- branch: `remove-team-up.sh`
- OS: macOS / Darwin 25.5.0 / arm64
- Bun: 1.3.13

### ハーネス名

cursor

### ハーネスバージョン

Cursor Grok 4.6（セッション提供版）

### Amadeus バージョン

開発中（revision `97581b3e39187b13413c046e86f820d290a389eb`）

### 再現手順

1. Intent autonomy を `full` にし、有効な grant を発行する
2. self-* の `code-generation` まで進め、ソース変更は worktree に置くが未コミットのままにする
3. `pr-convergence-report.md` が未作成の状態で `amadeus-orchestrate.ts report --stage code-generation --result approved` する（成果物欠落で拒否される）
4. エンジンは `ask` を出さない。コンダクタはステージ完了にコミット／push／`create` が必要なことを認識する
5. 期待: grant 下でコミット／push／`create` を実行する。または engine が typed halt を返す
6. 実際: 人間へ「コミットしてよいか」を質問して停止する

### 機序

仮説（確度中）: コンダクタが (a) ユーザー／セッションの git 安全選好（明示要求があるまでコミットしない）と (b) Intent `full` grant を独立制約として扱い、(a) を (b) より強く適用した。エンジンの stop set に無い質問を発明した。#2967 の `await-advisory-choice` フォールバックとは独立。`stage-protocol.md` の HARD STOP は人間裁定ゲート用であり、本観測の質問はゲートでも advisory でもない。

### 重大度（どれだけ深刻か）

S3-MAJOR — 回避策のある誤動作、または限定条件での発現

### 原因の所在

設計は正しいが実装が逸脱

### 原因の根拠・導入経緯

設計は `stage-protocol.md` の `autonomy_auto_approve`（grant がゲート効果を既に選んでいる）と `project.md` の semi/full 梯子に明示されている。git 安全選好はハーネス外のセッション規則であり、Intent grant を無効化する契約ではない。この優先順位をコンダクタが誤って逆転させた実測である。
