# コード品質評価

## 260709-gate-mechanics(本 intent)対象2バグの評価

### #675 は解消済み(前回 codekb からの更新)

前回 codekb は `handleReject`(`amadeus-state.ts`)に human-presence guard が無いことをリスクとして記録していたが、`cb9d19a8e`「Wire human-presence guard into reject (fix #675) (#692)」がすでに main にマージ済みであることを本スキャンで確認した。現在は `assertHumanPresentForGateResolution`(L1301-1325)を `approve`/`reject` が共有し、ガードは対称化されている。以降の節にある #675 関連の記述(強み・リスク表・修理時の安全要件など)は歴史的記録であり、現状のコードには適用されない。

### リスクと技術的負債(#685・#670)

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#685**: REJECT に遠隔委任機構がない | 中〜高(agent-team topology の運用可能性そのものを制約) | リモート conductor がゲートを拒否できないため、agent-team 構成で「承認だけ委任でき拒否は委任できない」非対称な運用になる。対称性の欠落自体がユーザー体験上の欠陥 |
| **#685**: `DELEGATED_APPROVAL` を REJECT に転用するリスク | 高(誤った修理をした場合の意味論破壊) | 既存イベント種別を REJECT 目的で再利用すると、`humanActedSinceGate` の `GATE_RESOLUTION_EVENTS`/`isDelegated` 判定や audit trail の読み手が「approval だったのか rejection だったのか」を取り違える。新規イベント種別(例: 相当する delegated-rejection 用)が必要 |
| **#670**: `assertNotSiblingWorktree` が正当な sibling worktree も拒否する | 中〜高(マルチワークツリーのチーム運用で Bolt worktree モードが使えない) | ガードの意図(Bolt 自身が作るネストしたワークツリーからの誤実行防止)と実装(cwd がいずれの worktree であるかを区別しない)がずれている。修理は「区別すべき2種の sibling」をどう見分けるかの設計判断を要する |

### 修理時の安全要件(#685・#670)

1. **#685**: 新規の delegated-rejection 機構は、`verifyDelegatedApproval` と同じ「issuer shard 内の実 `HUMAN_TURN` を検証する」forgery-resistance 契約を満たす必要がある。既存の `DELEGATED_APPROVAL` イベント・検証関数を変更せず、並行する新規イベント種別・検証関数として追加する(既存の approve 経路に回帰を起こさない)。
2. **#670**: `assertNotSiblingWorktree` の緩和は、「Bolt が作ったネストしたワークツリー」と「マルチワークツリーのチーム体制で人間/エージェントが個別に持つ sibling ワークツリー」を区別する具体的な判定基準を requirements-analysis で先に確定する。既存の呼び出し箇所(L204、L277、L512 近傍)すべてに一貫して適用する。

## 既存の品質ゲート(変更なし)

- `dist:check`、`promote:self:check`、`.github/workflows/ci.yml`(typecheck → lint → dist:check → promote:self:check → tests)は変更なし。
- 6件のバグは、どれも既存テストが「合成 evidence」または「正常系」のみをカバーしており、実際に問題になる境界条件(merge 失敗、ガード欠落、audit の bare fallback、不正 JSON、chunk 分割、worktree 実行)を突く既存テストは確認できなかった(#674〜#678、#668 いずれも)。

## 強み

- `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts` は audit-first の設計思想(状態変更前に audit emit、または audit emit 後に state write)が徹底されており、#674/#675/#676 の修理はこの既存パターンに沿って局所化できる構造になっている。
- `packages/setup/src/ports/http.ts`・`internal/tar-archive-extractor.ts` は Result 型でエラーを表現する規律が徹底されており、#677 の修理(`try/catch` 追加)はこの既存パターンへの単純な合流で完結する。
- `amadeus-lib.ts` の record-dir/repo-name 解決系は1箇所に集約されているため、#676/#668 の修理は同じファイルの2つの関数に閉じた変更で済む見込み。

## アーキテクチャ横断パターン(6バグの構造的共通性)

個別の欠陥コード位置は code-structure.md に記録済みだが、6件を並べると5つの構造パターンに整理できる。修理時はパターン単位で「同型の欠陥が他にもないか」を確認する価値がある。

1. **監査と実行結果の分離(#674)**: `handleFinalize`(`amadeus-swarm.ts:484-631`)は「exit code / envelope の `merge_failures`」と「`results[]` → audit trail(`emitUnitConverged`/`emitUnitFailed`)」という2つの真実源を持ち、`results[]` を再検証フェーズ(L551-553)で確定してから merge-back フェーズ(L588-599)を走らせるため、後者の失敗が前者に反映されない。原因は「2つの経路が別変数に書かれる設計」自体ではなく、「片方の経路が確定した後にもう片方が更新される順序」にある。
2. **ガードの非対称(#675)**: `handleApprove`(L1286-1379)と `handleReject`(L1430-1487)は `withAuditLock`/`validateSlugInState` という共通骨格を持つ姉妹ハンドラだが、`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate` という3関数の呼び出しが片方(approve)にのみ配線されている。ガード機構自体は健全で、もう一方の呼び出し口への配線が単に存在しない、という「配線漏れ」型の欠陥。
3. **識別子・パス導出の安定性欠如(#676・#668)**: `auditFilePath`(`amadeus-lib.ts:1267-1270`)と `codekbRepoName`(`amadeus-lib.ts:501-504`)はどちらも「唯一解が求まらないときに、より低精度な識別子へ黙って差し替える」フォールバックを持つ(`recordDir` が null → space-root 直下、`intentRepos` が0/2+件 → `basename(projectDir)`)。フォールバック自体の存在は妥当な設計判断だが、発火がログや戻り値に一切現れないため、呼び出し元は精度の低い識別子で処理を続けていることに気づけない。`stateFilePath`(L1255-1259)も同型のフォールバックを共有しており、#676 の修理範囲を検討する際にはこの姉妹関数への影響有無も確認対象になる(code-quality-assessment 修理時の安全要件 #3 に既述)。
4. **ポート境界での例外漏れ(#677)**: `Http` 型(`http.ts:9-12`)は `Promise<Result<unknown, FetchError>>` を全経路の契約として宣言しているが、`fetchChecked()` の try/catch は Response の取得までしか覆っておらず、その後に `getJson()` 自身が行う `.json()` の await(L27)は契約の外に置かれている。Result 型で境界を守る規律(強みの節に既述)は「境界に入る最初の非同期呼び出し」にだけ適用され、「境界内で追加される2番目の非同期呼び出し」には再適用されていない。
5. **ストリーム状態機械の chunk 境界未検証(#678)**: `extractTarGz` の `carry`/`pendingLongName`/`current`(L36-38)は `for await` ループの外側で宣言されたクロージャ変数であり、chunk をまたいで状態が保持される設計自体は静的スキャン上は妥当に見える。他の4パターンとは異なり、これは「欠陥が実測で確認された」パターンではなく「欠陥の有無が実測でしか確認できない」パターン — 修理着手前に、まず合成 fixture による実証(安全と確認できるなら codekb にその旨を明記、破綻するなら修理)が必要という点で扱いが分岐する。

パターン1・2・3は「機構は存在するが、2つの経路/2つの呼び出し口/2つの姉妹関数のうち片方にしか正しく適用されていない」という同じ形をしており、修理は既存機構への「もう片方への配線」で完結する見込みが高い(bugfix スコープの小規模修正という前提と整合する)。パターン4は既存規律の再適用漏れ、パターン5は検証負債であり、この2件は「直す」前に「本当に直すべきか/どう直すべきか」を requirements-analysis で先に確定する必要がある(既存の「移行しない選択肢の評価」節と整合)。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#674**: merge-back 失敗が audit/`results[]` に反映されない | 高(監査ログの正確性、conductor の後続判断を誤らせる) | `merge_failures`/exit code だけを見る呼び出し元は正しく検知できるが、`units[].status` や audit trail だけを見る消費者は誤認する。二重の真実源(exit code 経路と audit 経路)が食い違う構造そのものが負債 |
| **#675**: `reject` に human-presence guard が無い | 高(ゲートの公正性、approve/reject の非対称性) | 誰が呼んでも無条件に `revising` へ遷移できる。悪意の有無に関わらず、自動化スクリプトの誤操作でも人間の意思決定を経ずにゲートが後退しうる |
| **#676**: `auditFilePath`/`stateFilePath` の bare fallback が静かに発火する | 中〜高(audit trail の欠落、デバッグ困難性) | 呼び出し元にエラー・警告が一切出ないため、intent 解決失敗という異常状態が正常系のように見える。`error-classification` の観点では「回復不能なはずのエラーを黙って握りつぶす」パターンに該当しうる |
| **#677**: `getJson()` の `.json()` が未保護 | 中(信頼性、原因不明のクラッシュ) | GitHub API のレスポンスボディが期待通りでない場合、`Result` 契約を破って未処理の Promise rejection になる。呼び出し元のエラーハンドリングが `Result` のみを想定していれば、そこで例外が素通りする |
| **#678**: PAX/GNU longname の chunk 跨ぎが実測未検証 | 中(配布物の展開失敗、サイレントな破損の可能性) | 静的スキャンでは明確な破綻は確認できなかったが、実際の chunk 境界での動作は未実証。「検証しないまま安全と断定する」ことも「検証しないまま欠陥と断定する」こともproject.md の evidence-discipline 是正事項に反する |
| **#668**: `codekbRepoName` の fallback が worktree 名を使う | 中(codekb 出力先の非決定性) | 「決定的な per-repo ディレクトリ」という契約(`codekb-path` のコメント)に反する。本スキャン自体がこの fallback の実例(`codekb/claude-engineer-1/`) |

## 修理時の安全要件

1. **#674**: merge-back フェーズの結果を `results[]` に反映してから audit emission フェーズを走らせる順序に変更する。exit code 契約(L630)は変更しない。修理後、意図的に `complete --merge` を失敗させる(例: 競合するブランチ状態を用意する)テストで、`emitUnitFailed`/`emitBoltFailed` が発火し `emitUnitConverged` が発火しないことを実証する(team.md Mandated の「落ちる実証」原則)。
2. **#675**: `handleReject` にガードを追加するかどうかは意図的な設計判断を要する(reject は「人間が却下した」ことを示す操作であり、approve と同じ厳格さを求めるべきかは要件次第)。requirements-analysis で明示的に決定し、ADR 相当の根拠を残す。
3. **#676**: `recordDir` が `null` を返すケースを bare fallback で握り潰さず、`--worktree` の `start` からは明示的に失敗させる(またはログに警告を出す)分岐を追加する。既存の `stateFilePath` の同型 fallback(L1255-1259)への影響有無も確認する。
4. **#677**: `getJson()` の `.json()` 呼び出しを try/catch で包み、`FetchError.classify` 相当のエラー分類を追加する。不正 JSON を返す fixture でユニットテストを追加し、`Result.err` が返ることを実証する。
5. **#678**: PAX/GNU longname ヘッダが2つの `chunk` に分割される、または longname ヘッダとその本体ヘッダが別 chunk に分かれる合成 fixture を用意し、`extractTarGz` が正しく展開できるかを実測する。破綻するなら修理し、破綻しないなら「検証済みで安全」と codekb/テストに明記する。
6. **#668**: `codekbRepoName` の fallback を worktree 対応にする(例: `git rev-parse --show-toplevel` で実体リポジトリのルートを取得し、その `basename` を使う、または `.git` ファイルの `commondir`/`worktrees/<name>` パスから親リポジトリ名を逆算する)。複数 worktree(`claude-engineer-1`、`claude-engineer-2` 等)から同一リポジトリ名が解決されることをテストで実証する。

## 移行しない選択肢の評価

6件とも既存機能の欠陥修理であり、「修理しない」選択肢は intent の目的そのものを満たさない。ただし #675(reject のガード追加)と #678(実測検証)は、修理範囲が「バグである」という前提そのものの検証を要する点で他の4件と性質が異なり、requirements-analysis で先に「これは本当に欠陥か」を確定すべきである。
