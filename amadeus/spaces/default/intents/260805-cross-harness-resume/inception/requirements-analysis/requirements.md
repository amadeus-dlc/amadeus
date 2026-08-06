# Requirements — 260805-cross-harness-resume

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

## Intent 分析

別ハーネス(例: Claude Code)/ 別 project dir のセッションで実行中だったワークフローを、別セッション(例: Kimi)から引き継ぐ復旧経路が存在しない。ユーザー要件(2026-08-05、RE diary Interpretations)により、復旧経路は特定ハーネス限定でなく**どのハーネスの組み合わせでも**成立しなければならない。

RE(codekb: business-overview.md「利用者に約束されている価値」「実際に成立していない境界」節、re-scans/260805-cross-harness-resume.md)の実測により、目標は次の2点に確定した(質問票 Q1-Q5 のユーザー裁定 2026-08-05T13:33:27Z):

1. **復旧経路の二層化** — SessionStart 自動回復(自動層)+人間確認付き手動復旧 verb(手動層)
2. **拒否メッセージの原因判別化+復旧ガイド追加** — 現状4拒否原因が同一の `role "unknown"` に畳まれ判別不能(決定的再現 C1-C6 で実測確定)

ゴールは「ワークフロー状態(record)はハーネス非依存」という既存の約束(architecture.md「引き継ぎに関与する3層」節: 状態層=ハーネス非依存 / carrier 層=per-clone / 認可層=carrier のみを読む)を、carrier 層の事故時にも実際に成立させることであり、認可機構が守る対抗価値(subagent 詐称防止)は毀損しない。

## 機能要件

### FR-1: 拒否原因の判別化

`authorizeMainConductor`(packages/framework/core/tools/amadeus-caller-authorization.ts)の拒否は、少なくとも次の4原因を判別可能な値で区別して返すこと:

- (a) deny ラッチ残存(`kimi-subagent-transition-deny` / `kimi-session-ended-deny` / `.lock`)
- (b) role marker(`kimi-active-subagents.json`)不在・不読
- (c) `.current-session` と `mainSessionId` の不一致(別ハーネスによる上書きを含む)
- (d) アクティブ subagent role の残存(現行どおり role 名を返す — 現状で唯一判別可能な分岐)

**受け入れ基準**: 判別値は (a)(b)(c)(d) の4種であり、RE の決定的再現ケースへの写像は C1 → (b)、C2 → (c)、C3 → (a)、C5 → (d)、C6 → (b)(carrier 分裂の実効状態は marker 不在であり、**C1 と同一の (b) を返すことが正**)である。テストは次の2点を固定する: (i) C1/C2/C3/C5 が互いに異なる原因値を運ぶこと (ii) C6 が C1 と同一の (b) を運ぶこと。C4(整合状態)は authorized のまま。C6 専用の第5原因値は新設しない(分裂の根本是正は CON-3 でスコープ外であり、認可判定は単一 projectDir 配下しか読めないため分裂と不在は判定点で区別不能 — 区別は FR-5 手順書の原因別対応表が担う)。

### FR-2: 拒否メッセージへの復旧ガイド

`callerAuthorizationError` および同メッセージを表示する全経路は、(i) FR-1 の判別済み原因、(ii) 次の一手(FR-4 の手動復旧 verb の実行方法、または Kimi の再起動 = SessionStart 再発火)を含むこと。

**受け入れ基準**: 各原因値に対応するメッセージに復旧手順(実行可能なコマンド名)が含まれることをテストが固定する。既存 `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` の substring assert(`"is not the main conductor"` — 拒否側 :504/:536/:573/:646、許可側 not.toContain :669/:689 の全6件 — code-structure.md:23)は改訂せずグリーンを維持する(RE §6.1 実測: 全文 verbatim ピンは存在しないため、本文追記と両立する。本 AC の射程はメッセージへの**追記**であり、既存 substring の削除・変更は含まない)。

### FR-3: SessionStart 自動回復(自動層)

Kimi の SessionStart 発火は、FR-1 の (a)(b)(c) いずれの carrier 状態からも authorized へ回復させること。現行実装(amadeus-kimi-lib.ts `establishKimiMainBaseline` — RE 実測: baseline 再バインド+deny ラッチ 2 種の unlink)が既にこの大半を満たすため、本 FR は**回復性の閉包をテストで固定する**ことが主作業である。ギャップが実測されたら(例: `.lock` 残存の非解除)、同一 FR 内で是正する。

**受け入れ基準**: C1/C2/C3 の各 carrier 状態を合成 → SessionStart 相当の処理を実行 → `authorizeMainConductor` が authorized を返す、の閉包テスト。非 kimi ハーネスは現行どおり認可素通り(`:75`)のため自動層の対象は kimi のみ(制約 CON-2 参照)。

### FR-4: 手動復旧 verb(手動層)

caller-authorization にゲートされない手動復旧 verb を新設すること(名称・配置は設計に委ねる。例: `session-takeover`)。契約:

- (a) **人間確認必須** — 実行はその場の人間承認(HUMAN_TURN 接地)を前提とする(Q5 裁定 B)。確認なしの実行は fail-closed で拒否
- (b) FR-1 の (a)(b)(c) いずれの状態からも、現セッションを main conductor へ再バインドできること
- (c) アクティブ subagent role が残存する状態((d))では、無条件に奪わず、残存 role を明示して人間確認を経てからのみ再バインドする(subagent 詐称防止の対抗価値維持)
- (d) 実行を audit へ記録すること(検証劇場禁止 — 実行結果由来のイベントのみ)
- (e) `--project-dir` で対象 record tree を指せること(既存 `resolveProjectDir` ラダー準拠)— 別 worktree で走っていた intent の引き継ぎ(発端シナリオ)を、対象 worktree の carrier 再バインドとして扱えること
- (f) 実行後、当該セッションから `unpark` / `next` / `report` が通ること(RE 所見A のデッドロック解消の閉包)

**受け入れ基準**: (a)〜(f) の各契約をテストが固定する。(f) は「拒否状態 → verb 実行 → unpark 成功」の経路テスト。

### FR-5: 引き継ぎ手順書

docs にハーネス跨ぎ引き継ぎの手順書を追加すること(RE §4.2 実測: 現状不在)。内容: 自動層(対象ハーネスの再起動)→ 手動層(復旧 verb)の順の手順、原因別の対応表、`docs/guide/11-session-management.md` の「resume works on every harness」記述との整合。

## 非機能要件

- **NFR-1(env 非依存)**: 復旧経路は `AMADEUS_HARNESS_TYPE` env バイパス(RE 実測の未文書挙動)に依存しないこと。手順書・エラーメッセージのいずれもこの env を復旧手段として案内しない。バイパス自体は既知の制約として文書化する(Q3 裁定 B)
- **NFR-2(fail-closed 維持)**: 本変更は認可の既定を緩めない — 復旧 verb 以外の経路の拒否挙動は不変。人間確認のない takeover は常に拒否
- **NFR-3(テスト)**: TDD 既定(team.md)。carrier 状態の合成は repo 外 tmp ディレクトリの fixture で行い、実 FS を触るテストは integration 層に置く(cid:code-generation:fs-tests-integration-first)
- **NFR-4(台帳)**: `amadeus-caller-authorization.ts` への行挿入は coverage-patch-allowlist の機械 remap+span 検査、no-silent-drop census の再バインドを伴う(RE §6.3 実測の台帳実在。cid:code-generation:c1-allowlist-mechanical-remap / cg-allowlist-straddle-swell / c1-260803-state-integrity)

## 制約

- **CON-1**: self-fix スコープ — 変更面は FR-1〜FR-5 に限定。既存設計(kimi のみが carrier 認可を持つ構造)は維持する
- **CON-2**: `.current-session` を書かない3ハーネス(kiro-ide / opencode / pi — RE 所見B)の session-start 配線是正はスコープ外(Q2 裁定 B)。復旧経路は carrier 不在ケース((b))を吸収することでこれらのハーネスからの引き継ぎを成立させる
- **CON-3**: kimi adapter の raw-cwd による carrier 分裂(C6、t-kimi-adapter.test.ts:413 がピン)の根本是正はスコープ外(Q4 裁定 B)。分裂の実効状態は (b) marker 不在であり、復旧経路が吸収する
- **CON-4**: `AMADEUS_HARNESS_TYPE` バイパスの封鎖はスコープ外(Q3 裁定 B)
- **CON-5**: carrier は gitignored の per-clone / per-worktree ファイル(code-structure.md「患部の配置（core 中立層 / harness 表層の境界に跨る）」節)— 復旧は対象 clone / worktree の carrier に対して行う

## 前提

- **ASM-1**: Kimi SessionStart hook の配線(管理ブロック)は doctor が検査済みの正常系を前提とする。hook 未配線はそもそも SessionStart が発火しない環境問題であり、手動層(FR-4)がその場合の唯一の経路になる — これが二層構成(Q1 裁定 D)の根拠
- **ASM-2**: 拒否4原因の実測分類(C1-C6)は RE の決定的再現(repo 外 scratch、authorizeMainConductor 直 import)に基づく。実装時のテストは同じ合成手法を integration 層で再現する
- **ASM-3**: 別 Issue へ切り出す3件(CON-2/3/4)は intent 完了時に Issue-first で起票する(issue-first-capture)

## スコープ外

- kiro-ide / opencode / pi の session-start 配線是正(CON-2 → 別 Issue)
- `AMADEUS_HARNESS_TYPE` 認可バイパスの封鎖(CON-4 → 別 Issue)
- kimi adapter raw-cwd の marker 検証対称化と t-kimi-adapter:413 契約改訂(CON-3 → 別 Issue)
- 非 kimi ハーネスへの carrier 認可の拡張(認可対称化)— 現行の「kimi のみゲート」構造は本 intent では変えない
- resume 時のハーネス一致検査の新設(RE §3(a) — docs が「every harness で resume 可」を約束しており、一致検査はその約束に反する)

## 未解決事項

- 復旧 verb の名称と配置(amadeus-utility.ts の verb か、独立ツールか)— 設計/実装段で確定
- FR-4(c) の人間確認 UI(AskUserQuestion 相当の確認手順)の具体形 — 実装段で確定
- FR-3 のギャップ有無(`.lock` 残存の解除漏れ等)— 実装段の閉包テストで実測確定

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T13:41:41Z
- **Iteration:** 1
- **Scope decision:** none

FR-1 の受け入れ基準が C1 と C6 を『互いに異なる原因値』と要求しながら、同じ AC 内で C6 を『実効は marker 不在(=C1と同じ(b))』と明記しており自己矛盾している。開発者はテストを一意に書けない。

### Findings

- BLOCKER | requirements.md FR-1 の受け入れ基準は C1/C2/C3/C6/C5 が『互いに異なる原因値』を運ぶと規定するが、同文中で C6 を『実効は marker 不在』= C1 と同一カテゴリ(b)と明記しており自己矛盾。判別値は(a)(b)(c)(d)の4種のみで C1 と C6 は共に(b)へ写像される。C1/C2/C3/C5 は互いに異なる原因値、C6 は C1 と同一の(b)であることをテストが固定する形へ明確化するか、C6 専用の第5原因値を裁定してから確定すべき。
- NIT | Intent 分析が引用する business-overview.md の節見出し「約束された価値と成立していない5シナリオ」は実見出しと逐語不一致(合成的言い換え)。
- NIT | CON-5 が引用する code-structure.md の節名「患部のツリー配置」は実見出し「患部の配置(core 中立層 / harness 表層の境界に跨る)」と逐語不一致。
- FOLLOW-UP | FR-2 の t365 substring assert 行の列挙は4件だが code-structure.md:23 は6件(:504/:536/:573/:646/:669/:689)を記録 — 6件全数への言及に更新が望ましい。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T13:46:20Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の BLOCKER(FR-1 AC 自己矛盾)は (i)(ii) の2点固定で解消し、NIT/FOLLOW-UP も逐語一致へ是正済み。新規の軽微な見出し引用ずれ1件(architecture.md「引き継ぎに関与する3層」)も是正指示どおり反映済みで READY。

### Findings

- NIT | Intent 分析の architecture.md 節見出し引用「引き継ぎの3層構造」は実見出し「引き継ぎに関与する3層」(architecture.md:7)と逐語不一致(合成的言い換え、実害なし) — conductor が指摘どおり逐語形へ是正済み。
- FOLLOW-UP | BLOCKER 解消確認: FR-1 AC は (i) C1/C2/C3/C5 が互いに異なる原因値 (ii) C6 が C1 と同一の(b)、の2点固定へ再構成され一意にテスト可能。architecture.md:28/:46 と整合。
- FOLLOW-UP | NIT/FOLLOW-UP 解消確認: business-overview.md:7,11 / code-structure.md:7 の見出し逐語一致、FR-2 の t365 assert 全6件列挙(code-structure.md:23)を確認。Step 10 必須7節の実在と consumes 3成果物の実参照を確認。是正 diff への fix-diff-independent-reverify で追加の誤りなし。

## 追補 — FR-3a: role marker ロック奪取の所有者検証(2026-08-06、PR レビュー起点の設計改訂)

**承認系譜**: PR #2329 の CodeRabbit レビュー Major 指摘(`amadeus-kimi-lib.ts:244-251` — SessionStart の無条件 `rmSync` が他プロセスの生きたロックを削除しうる)→ ユーザー裁定 2026-08-06「設計がまずかったというコトだろ？状態破壊になるのはまずいだろ。2(所有者付きロックへ改修)」→ 同日ユーザー再確認「いいね。じゃあその方針でお願いします」。本追補はこの承認済み仕様改訂を record 正本へ固定するものであり、FR-3 本文の「ギャップが実測されたら同一 FR 内で是正する」条項の適用である。

### 背景(是正対象の欠陥)

FR-3 の `.lock` 残存ギャップ是正として実装された SessionStart の無条件 `rmSync(markerPath.lock)` は、「SessionStart は fresh-session 境界なので残存ロックは kill 残骸」という**未検証の前提**に依存していた。この前提は (i) 同一 project dir の再起動窓(SessionEnd の `clearKimiRoleCarrier` 進行中に次セッションの SessionStart が発火)、(ii) 終了間際の subagent stop フック進行中、で成立せず、進行中の read-modify-write と baseline 書き込みが同じ carrier を並行更新して状態破壊(torn update)に至る。単一エージェント運用の規律では (i)(ii) を塞げない。

### 要件

1. `withRoleMarkerLock` はロック取得時に所有者情報(PID+開始時刻)をロックディレクトリ内へ記録する。取得の原子性は従来どおり `mkdirSync` に依存する。
2. ロックの奪取(削除)は所有者プロセスの不在を実測(`process.kill(pid, 0)`、`ESRCH`=不在 / `EPERM`=生存)で確認した場合にのみ行う。**生存する所有者のロックは SessionStart を含む誰も削除しない**。
3. SessionStart の無条件 `rmSync` は上記の所有者検証付き奪取へ置き換える。
4. 所有者不在が確認できたロックは `ROLE_LOCK_STALE_MS`(30秒)の mtime 窓を待たずに即時奪取できること — FR-3 が本来解決したかった「kill 残骸による自動回復の空振り」はこの経路で従来より速く解消される。
5. 所有者情報が未書込みの窓・PID 再利用の疑義は「削除しない」側に倒す(fail-safe)。復旧遅延方向の失敗は許容し、状態破壊方向の失敗は許容しない。

### 受け入れ基準

- (両側実証) 生存所有者のロックが SessionStart で削除されないこと、および所有者不在のロックが mtime stale を待たずに奪取されること、の両方を integration テストで固定する。
- 現行実装(無条件 rmSync)で赤になる回帰テストを先に実測(Red)してから実装する(TDD)。
- 並行 role 更新と SessionStart の同時実行で carrier が破壊されないこと。
