# Business Logic Model — U6: journal-reader-swap

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 処理シーケンス

### 共通 reader 経由の読取（全 tool 共通）

1. tool（doctor／recovery／presence／grant／merge／runtime graph／learnings）が Journal 読取を要求
2. 共通 reader（U3 の Journal Module、components.md「doctor／recovery／presence／grant 等 → reader 差替え」行）が対象 shard を走査
3. 行ごとに schema version を判別し、v1／v2 それぞれの codec で decode（FR-JRN-2）
4. tool が依存する属性のみを持つ正規化 record へ写像して返却。tool は schema version を意識しない
5. clone／worktree 横断の複数 shard は mixed-version のまま merge して返す（FR-JRN-2、services.md スケーリング特性どおり）

### 消費者ごとの読取内容

- **doctor**: shard 走査による整合性検査（破損行・version 判別不能行の検出、BR-4 のエラー経路）
- **recovery**: state 復元に必要な event 列の読取（mixed shard からの復元が FR-MIG-4(a) の削除ゲート条件）
- **presence**: session 生存情報の読取（v2-only 属性に依存しない、BR-8）
- **grant**: 権限付与 record の読取
- **merge**: clone／worktree 横断 shard の mixed-version merge（BR-5 の同等性が主検証点）
- **runtime graph**: event の trace/span 相関を含む graph 構築入力の読取（v1 record では相関 ID 欠損を許容、BR-8）
- **learnings**: learning entry の読取（§13 ゲートの判定入力）

### tool ごとの差替えワークフロー（トポロジ）

1. 対象 tool の Journal 読取 call site を特定し、旧 v1 reader 呼出しを共通 reader Interface へ差替え
2. 差替えは tool 単位で完結させ、tool 間で差替え状態を共有しない（BR-6 の rollback 独立性の根拠）
3. CLI 出力・終了コード・エラーメッセージ形式は差替え前後で不変（BR-2 の不可視性）
4. 7 tool（doctor／recovery／presence／grant／merge／runtime graph／learnings）すべてが共通 reader 経由のみで読む状態が Unit の完了形（FR-JRN-4）

### v1 reader 削除への接続

1. 本 Unit は v1 reader の削除を行わない（削除は FR-MIG-5 の retention 条件達成後、U8 側のスケジュール管理）
2. ただし「v1 codec 非搭載の reader 構成」で 7 tool が v2-only Journal に対して動作することを本 Unit で証明し、削除ゲート FR-MIG-4(a) の入力とする（FR-JRN-4）

## 検証フロー（テスト先行、#1678 のテスト先行順序に倣う）

1. **fixture 先行**: v1-only／v2-only／mixed-version の3種の shard fixture と、各 tool の期待出力ゴールデンを先に作成する（実装に先行、red-green）
2. **同一性検証**: 各 tool について、旧 reader 経由の出力と共通 reader 経由の出力が fixture 上で一致することをテストで固定（BR-2/BR-3）
3. **既存スイート不変検証**: doctor／recovery／presence／grant／merge／runtime graph／learnings の既存テストを一切変更せず実行し、全 pass を確認（BR-3）
4. **mixed merge 検証**: mixed-version shard を clone／worktree 横断で merge した結果が、v1-only 読取と event 集合・順序で同等であることを検証（BR-5）
5. **v2-only 検証**: v1 codec を外した reader 構成で 7 tool が v2 Journal を読めることを検証（FR-JRN-4 後段）
6. **rollback 検証**: 任意の1 tool の差替えを revert した構成で、残りの tool のテストが影響なく pass することを確認（BR-6）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

READY: FR-JRN-4 fully covered by BR-1〜22, no orphans or invented APIs; 3 minor wording/traceability notes (BR range wording, BR-8/16 citation, upstream reader-signature gap noted for supplement).

### Findings

- None
