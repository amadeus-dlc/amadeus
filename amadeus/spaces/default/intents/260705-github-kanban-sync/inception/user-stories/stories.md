# User Stories（260705-github-kanban-sync）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[personas.md](personas.md)

ペルソナは Maintainer の 1 人だけである（personas.md）。
優先度は requirements.md の proto-Unit 依存順（P1 → P2 → P3）に従う。

## Stories

### US-1 台帳で Intent と Issue を紐付けたい（P1）

Maintainer として、`intents.json` の各 entry に Issue 番号を持たせたい。board のカードから対応 Issue へ確実に飛べるようにするためである。

受け入れ基準:
- `issues` フィールドを持つ entry の Issue 番号が board のカードに反映される（FR-1.1、FR-3.3）。
- フィールドが無い entry でも既存ツール（エンジン、validator）の挙動が変わらない（FR-1.2）。
- 判別可能な既存 entry に遡及補完が済んでいる（FR-1.3）。

### US-2 全 Intent の作業状況を一覧したい（P2）

Maintainer として、進行中の全 Intent の担当エージェント、ホスト、worktree、phase / stage、Issue を board から一覧したい。横断 grep をやめるためである。

受け入れ基準:
- `kanban-sync.ts` を実行すると、default space の全 Intent がカードとして board に現れる（FR-2.1、FR-3.4）。
- カードの Agent / Host / Worktree / Scope / Stage / Issue フィールドが `aidlc-state.md` と audit shard 名の値に一致する（FR-2.1、FR-2.2、FR-3.3）。
- 列（Status option）またはカスタムフィールドが存在しない既存 project に対して初回 sync を実行すると、不足分が自動作成されてから反映される（FR-3.5）。
- 同じ状態に対して sync を複数回、また複数 worktree から同時に実行しても、board の最終状態が一致する（FR-3.4 / N1、Issue #470 受け入れ条件 3）。
- board 側でカードのフィールドや列を手編集した後に sync を実行すると、ローカル成果物の値へ上書きされて収束する（FR-3.4、Issue #470 受け入れ条件 6）。

### US-3 承認待ちをひと目で見つけたい（P2）

Maintainer として、承認待ちゲートを持つ Intent を Awaiting Approval 列で見たい。放置ゲートをなくすためである。

受け入れ基準:
- `[?]` ステージを持つ Intent のカードが Awaiting Approval 列に置かれる（FR-2.3、FR-3.2）。
- 承認後に sync すると、カードが本来の phase 列へ戻る（FR-3.4）。

### US-4 鏡の鮮度を知りたい（P2）

Maintainer として、board がいつ時点の状態かを知りたい。古い鏡を実況と誤読しないためである。

受け入れ基準:
- 各カードの Synced At に最終 sync 時刻が入る。形式は text フィールドに ISO 8601（UTC）とする。Projects v2 の date フィールドは時刻を持てないためである（FR-3.7）。

### US-5 認証不備なら即座に分かってほしい（P2）

Maintainer として、`project` scope が無い状態で sync が走ったら、何も書き込まずに分かりやすく失敗してほしい。中途半端な板を信用しないためである。

受け入れ基準:
- scope 不足時、sync は書き込み前に明示エラーで終了する（FR-4.1）。
- 対象 project が見つからない場合も同様に明示エラーで終了する（FR-3.1）。

### US-6 手を動かさなくても board が追従してほしい（P3）

Maintainer として、エージェントが作業を進めるだけで board が追従してほしい。同期操作を日課にしないためである。

受け入れ基準:
- Intent record への書き込みでキューが記録され、セッション終了時に flush が走る（FR-5.1、FR-5.2）。
- flush 失敗時は drop が記録され、次回 flush で回復する（FR-5.4、FR-4.2）。
- PostToolUse hook はネットワーク接続を含まない（FR-5.1 = AC-4 の代理基準）。

## ストーリー外（Won't）

計測・通知・統計・双方向 sync・statusline 表示（requirements.md スコープ外）。
