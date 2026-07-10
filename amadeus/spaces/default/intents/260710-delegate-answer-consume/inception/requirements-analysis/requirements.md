# Requirements — #736 委任 provenance の QUESTION_ANSWERED 先食い修正(delegate-answer-consume)

> ステータス: ドラフト(Q1〜Q3 選挙待ち)
> 上流: GitHub Issue #736(1人目クロスレビューの in-process 再現 comment 4931339814)、codekb(architecture.md「委任 presence 機構の verb-scoped 構造」/ code-quality-assessment.md「#736 観測面」、2026-07-10 diff-refresh。business-overview.md / code-structure.md は本件観測面に変更なしのため参照のみ)

## 1. Intent 分析

### 目的

エージェントチーム運用(#671 委任承認)で、leader が発行した delegate 1枚により conductor が「選挙回答の記録(`amadeus-log.ts answer`)→ ゲート approve」の実シーケンスを完遂できるようにする。現状は answer の emit する `QUESTION_ANSWERED` が presence 境界の resolution として delegate を先食いし、approve に2枚目の delegate が必要(実測: kiro-stale-hooks 2026-07-10、in-process 再現 true→false→true)。

### 根本原因(RE 確定、post-#685 現行コード)

- `GATE_RESOLUTION_EVENTS = {GATE_APPROVED, GATE_REJECTED, QUESTION_ANSWERED}`(`packages/framework/core/tools/amadeus-lib.ts:1506`)— QUESTION_ANSWERED は verb 非依存の resolution。
- 消費側 approve/reject は #685 で verb-scoped 化済み(`amadeus-state.ts:1456` の `humanActedSinceGate(pd, verb)`)だが、verb スコープは「どの **delegation** を human 行為に数えるか」のみを制御し、「どの **resolution** が境界を進めるか」は制御しない — よって #736 は #685 後も残存。
- answer 経路は verb 無し thin alias(`amadeus-lib.ts:1615-1617`)で、delegate を human 根拠として受理する(エージェントチームの選挙回答記録はこれに依存 — conductor セッションに HUMAN_TURN は無い)。

## 2. 機能要件

### FR-1: 委任シーケンスの1枚完遂(選挙 Q1/Q2 で方式確定)

- 実シーケンス「DELEGATED_APPROVAL 着地 → `amadeus-log.ts answer`(QUESTION_ANSWERED emit)→ `report --result approved`(approve)」が **delegate 1枚で成立**する。
- 方式: 【Q1 回答待ち — 推奨 A: 種別スコープ消費】
- 粒度: 【Q2 回答待ち — 推奨 A: 1 delegate = 1 answer + 1 gate のトラック別 consume-once】
- テスト可能条件: 上記シーケンスの in-process テスト(1人目レビューの再現ハーネスと同型: scaffold → delegate → QA → `humanActedSinceGate(root, "approve")` が true)。

### FR-2: 既存 presence 保証の非退行

- **anti-autopilot**: delegate なし・HUMAN_TURN なしで approve/answer が通らないこと(既存)。
- **one-answer-per-human-turn**(t188:325-348): ローカル人間運用で 1 HUMAN_TURN = 1 answer の契約を保つ。
- **偽造拒否**(t112): 検証不能な delegation が presence も境界も動かさない契約を保つ。
- **verb 混合拒否**(#685): DELEGATED_APPROVAL が reject を、DELEGATED_REJECTION が approve を開けない契約を保つ。
- テスト可能条件: t112・t188 の既存スイートがグリーンのまま+新規交差ケースの追加(FR-3)。

### FR-3: 交差回帰テストの新設

- RE 実測でテスト不在が確定した「QUESTION_ANSWERED × 委任」交差ケースを pin する: (a) delegate → QA → approve = 通る(修正後の主要件) (b) 修正前の挙動では落ちる形の落ちる実証 (c) Q2 の粒度契約(例: 1 delegate で 2 answer 目が拒否される等、選挙結果に従う) (d) delegate → QA → **reject** の対称ケース。
- 配置: `tests/unit/` に t112 と同型の in-process ハーネス(bun --coverage の spawn 盲点回避 — NFR 準拠)。

### FR-4: 修正範囲(選挙 Q3 で確定)

- 【Q3 回答待ち — 推奨 A: 消費側のみ(lib.ts 境界ロジック+必要なら state.ts:1456 周辺)。発行側 grounding(:1625/:1719)は現状維持】

## 3. 非機能要件・制約

- **NFR-1(dist 同期)**: 正本は `packages/framework/core/tools/`。同一コミットで `bun scripts/package.ts` 再生成+`bun run promote:self` 昇格、`dist:check`/`promote:self:check`/t28(audit-event-sync)グリーン。
- **NFR-2(検証コマンド)**: `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` 全 exit 0。
- 後方互換レイヤー・フォールバック分岐の禁止(team.md Forbidden)— 境界セマンティクスは1定義に置き換える(旧挙動の温存フラグを作らない)。
- 検証劇場の禁止: 新テストは修正前コードで実際に落ちることを実証してから完成扱い(Mandated)。

## 4. 前提

- 選挙回答の記録が delegate を human 根拠にできること自体は維持する(エージェントチーム運用の構造的要請 — Q2 の C 案は参考選択肢)。
- audit イベントスキーマ(DELEGATED_APPROVAL / QUESTION_ANSWERED のフィールド)は変更しない見込み(境界の解釈ロジックのみの修正)。変更が必要になった場合は audit-format.md との同期を FR に昇格する。

## 5. スコープ外

- 発行側 grounding の変更(Q3=A の場合。B 採択なら FR-4 に取り込む)。
- delegate の有効期限・失効機構(未起票の別論点)。
- #685 で実装済みの verb 混合拒否の再設計。

## 6. 未解決事項

- Q1〜Q3 の選挙結果(`requirements-analysis-questions.md`)。
