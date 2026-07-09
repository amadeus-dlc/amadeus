# Reverse Engineering — Architect 合成サマリ(integrity-batch)

## 実行メタデータ

- Date: 2026-07-09
- Intent: `260709-integrity-batch`(scope: `bugfix`、対象バグ4件 — #705 / #706 / #707 / #708)
- Stage: `reverse-engineering`(2.1)Architect 合成
- 入力: `inception/reverse-engineering/developer-scan.md`(Developer スキャン結果)
- 手法: diff-refresh(`a1c79dc12..162553b99`、15コミット・227ファイル)。前回 intent `260709-bug-zero-batch` の `codekb/amadeus/`(9ファイル)への差分反映。フルスキャン・全書き直しは行わない。

## 更新した codekb ファイルと更新内容

| ファイル | 更新種別 | 更新内容 |
| --- | --- | --- |
| `codekb/amadeus/code-quality-assessment.md` | 追記 | 「## 既知の欠陥 — 今回 intent」節を新設。#708/#705/#707/#706 を file:line 付きで「修理対象」として記述。前回6バグ節は温存 |
| `codekb/amadeus/architecture.md` | 追記 | 「## 差分リフレッシュで反映した構造変化」(codekb 一本化・pyramid 整備・class-B standalone)+「## 4バグ焦点領域のアーキテクチャ上の位置づけ」表を新設 |
| `codekb/amadeus/code-structure.md` | 追記 | 「## 差分リフレッシュで反映した構造」に codekb ストア / テストハーネス / knowledge 配布の焦点ファイル表を追加 |
| `codekb/amadeus/component-inventory.md` | 追記 | presence/gate・codekb 永続化・テストハーネス・knowledge 配布の4コンポーネント群を追加 |
| `codekb/amadeus/reverse-engineering-timestamp.md` | 更新 | Base `a1c79dc12` / Observed `162553b99` / Focus を今回4バグへ差し替え。#707 の自己言及(単一 timestamp = last-writer-wins)を明記 |

未更新(差分に実質変更なし): `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。

前回6バグ(#674/#675/#676/#677/#678/#668)の記述は bug-zero-batch スキャンの成果として温存した。それらの修理状態は本 intent のスコープ外であり、状態確認は行っていない。

## 4バグ焦点領域のアーキテクチャ上の位置づけ

4件は2軸に整理できる。「検証機構の正しさ」(偽の信頼を生む機構 = 検証劇場 Forbidden の趣旨に直結)と「共有ストア/参照の一貫性」(#693 後の単一 codekb ストアという新しい共有面で顕在化)。

### presence 機構(#708、P1・検証機構の正しさ)

hook → audit → gate 判定の3層。mint 側 `amadeus-mint-presence.ts:23-31` が UserPromptSubmit で `HUMAN_TURN` を **stdin 未読・無条件**に mint(コメント L12-13 が「prompt text is irrelevant」と明言)。gate 側 `amadeus-lib.ts:1442-1479` `humanActedSinceGate` は偽の `HUMAN_TURN` を `isHumanTurn` 経路(L1451)で無条件カウントし、#671 の委任承認 provenance(`verifyDelegatedApproval`、L1480-)を経ずゲートが開く。消費点は `amadeus-state.ts:1311`/`1479`。前提機構は #671 delegate provenance(`1289608c6`)。

### codekb 永続化(#707、P2・共有ストアの一貫性)

#693(`909e590d4`)で `codekbRepoName`(`amadeus-lib.ts:556-565`)が origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指す単一共有ストアになった。ステージ定義 `reverse-engineering.md` の L5(常時リフレッシュ)/L36(9固定ファイル)/L110(**単一** timestamp marker)により、per-intent の base/observed を分離できず並行リフレッシュで相互上書きされる。**本合成の timestamp 更新自体がこの緊張の当事者**であり、last-writer-wins 前提で記述した。

### テストハーネス(#705、P2・検証機構の正しさ)

`tests/run-tests.ts:31` の `Level` と `levelFiles`(L577-587)による tier discovery が `tests/harness/` を含まないため、`sdk-drive.calibration.test.ts` は substrate skip(L485-489)の管理外で通常 CI の tier 外(CONFIRMED)。加えて calibration の doctor 期待値 `DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)は現行 doctor 出力に不在で、現行 `amadeus-utility.ts:628` は `workspace shell ready ...` を出力(CONFIRMED)。trust anchor(既知回答)のドリフト。前提機構は #696/#700 pyramid 整備(`7da09f0c7`)。

### knowledge 配布(#706、P3・共有参照の一貫性)

`workflow-planning-guide.md:3` が不在の `product-guide.md` を tree 外参照。delivery-agent のロードパス(`amadeus-delivery-agent.md:71-77`)は自 dir と `amadeus-shared/` のみで product-agent dir を読まない。`product-guide.md` は `amadeus-product-agent/` に実在(7箇所に伝播)。破損参照は core→dist→self-install の全複製に伝播済みで、L3 は今回区間未変更 = 恒久的既存欠陥。修正は core を直し全ツリー再同期(`dist:check`/`promote:self:check` 同一コミット)。

## 後続ステージ(requirements-analysis / code-generation)への引き継ぎ事項

### 実装段の必須課題(最重要)

1. **UserPromptSubmit ペイロードの実機キャプチャ(#708、code-generation の前提作業)**: 修正判別材料の有無は実測でしか確定できない。実 UserPromptSubmit の stdin JSON を1件実機キャプチャし、機械注入(Stop-hook フィードバック / task-notification)と人間の生タイプを区別できるフィールドが来るかを file:line で確認する必要がある。**推定に留めてはならない**。
2. **`ClaudeCodeHookInput` 型の既宣言(#708)**: `amadeus-lib.ts:2029-2047` が既に `source?` / `prompt?` を宣言済み — **フィールド追加は不要**。ただし**型に在る≠ランタイムで来る**。`source` は SessionStart 固有(`amadeus-session-start.ts:86-96` が読む)であり、UserPromptSubmit に来る保証はない。判別材料が実機で確認できない場合は、#708 提案(b)「gate は #671 delegate provenance を正道とし、ローカル単独 `HUMAN_TURN` を信頼しない」への運用転換が現実的な緩和方向。
3. **stdin parse の canonical パターン(#708 修正の型)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` の `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput` → fail-open(`process.exit(0)`)へ mint-presence を寄せる。**fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須**。

### requirements-analysis で確定すべき設計判断

4. **#707 の修正方向**: timestamp を per-intent 記録化し本文 last-writer-wins を明文化するなら、ステージ定義 `reverse-engineering.md` の L110(単一 marker)と L36(9固定ファイル・単一ディレクトリ)の両方に規約追記が要る。単一ファイル構造を維持したまま並行安全にする代替も含めて要件で確定する。
5. **#706 の修正方向**: (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — のいずれか。3案のトレードオフを requirements で確定。
6. **#705 の修正方向**: doctor 期待値の更新に加え、`tests/harness/` をランナー tier に登録するか(#705 提案 A/B)を確定。登録するなら substrate skip の適用範囲も併せて設計。

### 全 intent 共通の実装制約

7. **修正は core を編集**: file:line は `.claude/` を実測面として引用したが、source of truth は `packages/framework/core/`。修正後は `bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(self-install 反映)を**同一コミット**に含める(team.md Mandated / project.md: `dist:check`・`promote:self:check`)。#706 は特に core→dist(4 harness)→self-install(.claude/.codex)の全ツリー同期が必須。
8. **「落ちる実証」の要求**: #705・#708 は「検証機構の正しさ」系であり、team.md/project.md の「検証劇場 Forbidden」の趣旨に直結する。修正の完成扱いには失敗ケース注入で赤くなることの実証(team.md Mandated)が要る。
9. **バグ横断リグレッションテストの配置**: framework 側(#705/#707/#708)は `tests/` 配下、knowledge 参照検証(#706)はドリフトガード相当を検討。#705 修正で `tests/harness/` の tier 登録を選ぶ場合、その回帰テスト自体が tier discovery に載ることを確認する。
