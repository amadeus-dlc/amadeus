# Functional Design — Questions(unit presence-closure)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: `approve-batch` の presence 検証(D7)はどの既存述語を再利用するか

- A. `humanActedSinceGate(pd)`(`amadeus-lib.ts:3877`、verb 省略の verb-less 形)を再利用する。`approve-batch` は特定の approve/reject ゲートではなく swarm バッチ境界という別種の人間ゲートだが、「直近の解決以降に人間行為があったか」を問う一般述語(:3885-3887 の verb-less 分岐)は意味論上そのまま適用できる — `approve-batch` 自体が成功時に `GATE_APPROVED` を発行し(`amadeus-bolt.ts:1254`)、これが `scanPresenceLedger` の `res: "gate"` 解決イベントとして次回境界を作る(既存 `handleDelegateApproval`/`handleDelegateRejection` と同じ「検証 → 自分の発行イベントが次の境界になる」構造)
- B. 新規の判定ロジックを一から書く
- X. Other

[Answer]: A — ADR-11「FR-12 はコード改修だが選挙質問を要さない(RFC が是正内容を一意に規定)」、component-methods.md C13「`verifyBatchApprovalPresence(projectDir)`: 未消費 HUMAN_TURN を要求」。project.md 是正知識「消費者の棚卸しは…複製しない」「意図ベースの重複排除」に従い、同じ意図(直近ゲート解決以降の人間行為)を持つ既存述語を複製せず再利用する。

## Q2: presence 検証の実行位置 — `withAuditLock` の内側か外側か、バッチ番号の妥当性検証・冪等ショートカットとどちらを先に行うか

- A. 引数の数値妥当性検証(`Number.isInteger` 等、`amadeus-bolt.ts:1229-1232`)の**後**、`withAuditLock` の**内側**(コールバックの最初の操作)で presence を検証する。ロック取得より前・ロックの外で検証を済ませてはならない。presence 拒否はロックを保持したまま `error()` で即座に拒否し、state 読取・冪等判定・RMW・`GATE_APPROVED` emit のいずれにも進まない
- B. `withAuditLock` に入る前(ロック取得より前)で検証する
- X. Other

[Answer]: **A(ロック内側)** — presence の実測(監査シャード読取による「未消費 HUMAN_TURN があるか」の判定)と `GATE_APPROVED` の追記を**同一のロック区間**に収めることで、検証した時点と記録する時点の間に別プロセスが同じ `HUMAN_TURN` を別のゲート解決で消費してしまう TOCTOU(time-of-check to time-of-use)競合を構造的に排除する。ロックの外側(B)で検証すると、検証成功から `withAuditLock` 取得までの間に別プロセスがその `HUMAN_TURN` を消費でき、`approve-batch` は「検証時点では存在したが記録時点では既に他ゲートに使われた presence」で承認を記録しうる — これは D7 が塞ごうとしている「presence なしでも通る」構造的欠陥の変種である。監査シャードの読取コストは小さく、ロック保持時間の増分は無視できる(`amadeus-bolt.ts:1216-1219` が既に「read->decide->emit->write section runs under withAuditLock」と明記しており、presence の read->decide もこの区間へそのまま合流させるのが一貫した設計)。`amadeus-bolt.ts:1213`「Validation is numeric (parse, don't validate) and runs BEFORE any emission」という既存契約(数値妥当性検証はロック外・emission より前)とは階層が異なる — 数値妥当性検証は入力形式の検証でロックを要さないが、presence 検証は監査シャードという共有可変状態の読取を伴うため、状態読取・冪等判定・RMW・emit と同じ排他区間に属する。既に承認済みのバッチ番号への冪等な再呼出しであっても、ロック内側で state を読む前に presence ゲートを一律適用することで「presence なしで `approve-batch` を叩けば常に拒否される」という単純な不変条件を保つ(バッチが既承認かどうかで拒否可否が変わる特例を作らない)。

## Q3: `resolveGatePresence` の ledger-absent 判定は scope(active/legacy vs named record)を問わず一律にするか

- A. 一律 `present: false`(fail-closed)にする。現行の `intent === undefined ? true : false` という scope 分岐(`amadeus-lib.ts:3884`)を廃止し、ledger 不在は常に「presence なし」とする
- X. Other

[Answer]: A — D8「ゲート presence 検査は active-scope で fail-open」が是正対象そのもの、component-methods.md C13「ledger 不在/読取不能 → `{ present: false, reason: "ledger-absent" }`(素通り廃止)」に scope 限定の記述はない。既存コメント(`amadeus-lib.ts:3866-3872`)が述べる「フレッシュクローンをブリックさせない」という懸念は、対話ハーネスでは `HUMAN_TURN` を発行する UserPromptSubmit フックがゲート解決コマンドより先に走るため、正当な人間操作では ledger が真に空にはならない(そのシャードに直前のターンが記録済み)という事実で相殺される — 落ちる実証は D7/D8 の Red 各1件に加え、既存の正当経路(実 HUMAN_TURN あり)の無退行テストを対で置くことが component-methods.md C13 に明記されている。

## Q4: G25(ゲート解決)以外の呼出し元(`amadeus-state.ts` の `handleDelegateApproval`/`handleDelegateRejection`)への影響はどう扱うか

- A. `amadeus-state.ts` は一切編集しない。`humanActedSinceGate`/`scanPresenceLedger` は `amadeus-lib.ts` が所有し、`amadeus-state.ts` はこれを import して呼ぶだけの消費者なので、`amadeus-lib.ts` 内部で ledger-absent の扱いを fail-closed に変えれば 3 箇所の呼出し元(`assertHumanPresentForGateResolution` :3731、`handleDelegateApproval` :4581、`handleDelegateRejection` :4670)はコード変更なしに新しい挙動を継承する
- X. Other

[Answer]: A — unit-of-work.md の owned files は `amadeus-bolt.ts` と `amadeus-lib.ts` のみで `amadeus-state.ts` を含まない。関数のシグネチャ(`humanActedSinceGate(pd, verb?, intent?, space?): boolean`)を変えず内部実装のみ改修することで、owned-files 境界を守ったまま 3 呼出し元すべてを同時に是正できる(component-inventory.md の G25/G26/G27 いずれもこの経路)。
