# コード品質評価

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

---

## 既知の欠陥 — 今回 intent(`260709-integrity-batch`)の修理対象4件

> 上記の6バグ(#674/#675/#676/#677/#678/#668)は前回 intent `260709-bug-zero-batch` のスキャン記述であり、本 intent のスコープ外。本節が今回の diff-refresh(`a1c79dc12..162553b99`)で焦点化した4件。いずれも当該区間の焦点コードに未着手で残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の隣接領域として顕在化した。file:line は self-install ツリー(`.claude/`)を実測面として引用する — 修正は source of truth の `packages/framework/core/` を編集し dist/self-install へ伝播させる(team.md Mandated)。

### #708 human-presence 偽陽性(P1、検証機構の正しさ)

- **mint 側(無条件 mint・stdin 未読)**: `.claude/hooks/amadeus-mint-presence.ts:23-31` — `resolveProjectDirFromHook(import.meta.url)` → `existsSync(stateFilePath(...))` なら **無条件に** `appendAuditEntry("HUMAN_TURN", {}, projectDir)`。冒頭コメント L12-13 が「Presence-only: the prompt text is irrelevant, so stdin is not read.」と明言し、UserPromptSubmit を発火させた入力が人間の生タイプか機械注入(Stop-hook フィードバック / task-notification)かを区別する情報を取得しない。これが偽陽性の直接原因。
- **gate 側(mint を消費する判定)**: `.claude/tools/amadeus-lib.ts:1442-1479` `humanActedSinceGate` は `HUMAN_TURN`(および検証済み `DELEGATED_APPROVAL`)とゲート解決イベントを時系列比較し `lastHuman > lastResolution` で true を返す(空台帳は fail-open で true、L1444)。委任承認 provenance `verifyDelegatedApproval`(L1480以降、#671)は健全だが、偽の `HUMAN_TURN` が mint 側で湧くと `isHumanTurn` 経路(L1451)で無条件カウントされ、provenance を経ずゲートが開く。消費点は `amadeus-state.ts:1311`(approve/reject 共通ヘルパー)と `amadeus-state.ts:1479`(delegate-approval)。
- **修正の型(既存様式)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` が `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput`(`amadeus-lib.ts:2049-2051`)→ fail-open(`process.exit(0)`)の定型を確立済み。hook 入力型 `ClaudeCodeHookInput`(`amadeus-lib.ts:2029-2047`)は既に `source?` / `prompt?` を宣言済み(フィールド追加不要)。ただし**型に在る≠ランタイムで来る**。`source` は SessionStart 固有(session-start.ts が読む)で、UserPromptSubmit に判別材料が来る保証はない — 実 UserPromptSubmit stdin JSON の実機キャプチャが必須(code-generation 段)。判別材料が無ければ #708 提案(b)「gate は delegate provenance を正道とし、ローカル単独 HUMAN_TURN を信頼しない」が現実的な緩和方向。fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須。

### #705 sdk-drive calibration のランナー管理外・doctor ドリフト(P2、検証機構の正しさ)

- **doctor 期待値ドリフト**: `tests/harness/sdk-drive.calibration.test.ts:55-72` が既知回答 doctor 文字列をピン留めするが、`DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)は現行 doctor 出力に存在しない(CONFIRMED)。現行 `amadeus-utility.ts:628` は `label: \`workspace shell ready (${harnessDir()}/ + amadeus/spaces/default/memory/)\`` を出力し、旧文字列は現れない。よって calibration 2 は依存導入後も失敗する。コメント L61-66 が指す `utility.ts:396` の旧行自体もドリフト。
- **ランナー管理外**: `tests/run-tests.ts:31` の `type Level = "smoke" | "unit" | "integration" | "e2e"`、`levelFiles(level)`(L577-587)は `join(SCRIPT_DIR, level)` 直下のみ列挙。`tests/harness/` はどの Level にも属さず、substrate skip(`shouldSkipForClaude`、L485-489)も掛からない(CONFIRMED)。ad hoc 実行時のみ走り、通常 CI では tier 外。`tests/gen-coverage-registry.ts`(L675以降)のカバレッジウォークは `tests/harness/` を静的集計するが、これは**実行**ではなく substrate ゲートとは別系統。
- 修正はテスト側の期待値更新 + ランナー登録方針の決定(#705 提案 A/B)。team.md/project.md の「検証劇場 Forbidden」(偽の trust anchor)の趣旨に直結し、「落ちる実証」が要求される。

### #707 codekb 並行リフレッシュ衝突(P2、共有ストアの一貫性)

- **前提機構(#693)**: `.claude/tools/amadeus-lib.ts:556-565` `codekbRepoName` は recorded repos が1件ならその名、0件なら `originRepoSlug(projectDir)`(L560)、解決不能時 `basename(projectDir)`。#693 で origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指す = #707 の前提。関連: `codekbDir`(L530-533)、`originRepoSlug`(L571-580)。
- **単一 timestamp 構造(構造的原因)**: ステージ定義 `.claude/amadeus-common/stages/inception/reverse-engineering.md` の L5 `condition:`(「Always rerun for freshness」= 常時リフレッシュ前提)、L36 `outputs:`(`codekb/<repo>/` の**9固定ファイル・単一ディレクトリ**)、L110(`reverse-engineering-timestamp.md` は freshness marker、**単一ファイル**)。timestamp は per-intent の base/observed を分離して持てず、並行リフレッシュで base/observed が互いに上書きされる。現行 `codekb/amadeus/reverse-engineering-timestamp.md` の実形式も単一 intent の単一スキャン点を前提とし、複数 intent の並行 base/observed 欄が無い。
- 修正方向 C(timestamp を per-intent 記録化、本文 last-writer-wins 明文化)を採るなら、このファイル構造とステージ定義 L110/L36 の両方に規約追記が要る。**本 timestamp 更新自体がこの緊張(自己言及)の当事者** — last-writer-wins 前提で書く必要がある。

### #706 delivery knowledge の tree 外参照(P3、共有参照の一貫性)

- **破損参照**: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` — 「Use this alongside `product-guide.md` when leading execution plan creation.」だが、delivery-agent の宣言済みロードパス(`amadeus-delivery-agent.md:71-77`)は自分の `knowledge/amadeus-delivery-agent/` と `amadeus-shared/` のみで product-agent ディレクトリを読まない。
- **実配置**: `knowledge/amadeus-delivery-agent/` は `mob-programming-guide.md` / `team-topologies.md` / `workflow-planning-guide.md` の3ファイルのみで **`product-guide.md` は不在**。`product-guide.md` は `knowledge/amadeus-product-agent/product-guide.md` に存在(core / `.claude` / `.codex` / `dist/{claude,codex,kiro,kiro-ide}` の7箇所に伝播済み)。
- **伝播構造**: 破損参照は既に `.claude/knowledge/.../workflow-planning-guide.md:3` と `dist/claude/` 複製にも伝播済み。L3 は今回 diff 区間で未変更(L55 のみ #672 で編集)= 恒久的な既存欠陥。修正は core を直し `bun scripts/package.ts` + `bun run promote:self` で全ツリー再同期(`dist:check`/`promote:self:check` を同一コミット)。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — 設計判断は requirements-analysis へ。

### 構造的共通性(4バグの分類)

- **検証機構の正しさ系(#705・#708)**: どちらも「偽の信頼を生む機構」= team.md/project.md の「検証劇場 Forbidden」の趣旨に直結。修正時は「落ちる実証」(失敗ケース注入で赤くなること)が team.md Mandated で要求される。
- **共有ストア/参照の一貫性系(#706・#707)**: #693(origin 由来 repo 名)後の単一 codekb ストアという新しい共有面で、並行書き込み(#707)と tree 外参照(#706)が顕在化。
