# Business Logic Model — U2 election-promotion

> 上流入力(consumes 全数): unit-of-work(U2 定義)、unit-of-work-story-map(FR-1/2 トレース)、requirements(FR-1/FR-2)、components(C2/C3)、component-methods(C2/C3 契約)、services(選挙 CLI の単発実行形態)

## 移動ロジック(FR-1a/1b)

- git mv 5ファイル: `scripts/amadeus-election{,-model,-store,-record,-transport}.ts` → `packages/framework/core/tools/`(scripts/ 側削除)
- import 修正は**1行のみ**: `amadeus-election.ts:46` の `../packages/framework/core/tools/amadeus-norm-metrics` → `./amadeus-norm-metrics`。他4ファイルは無修正(dependencies 実測: model=import ゼロ、store/record/transport=node:+相互のみ — 移動後に import 全数を第3再列挙で再確認)
- 公開契約は不変(NFR-2): CLI verb 9種・directive JSON・store レイアウト・exit code 意味論に変更なし

## スキル昇格(FR-2a〜2d)

- `contrib/skills/amadeus-election/` → `packages/framework/core/skills/amadeus-election/`(contrib 側削除)
- SKILL.md 書き換え: `scripts/amadeus-election.ts` 全出現 → `{{HARNESS_DIR}}/tools/amadeus-election.ts`(packager のトークン置換で各ハーネス展開)。compatibility 行を「Requires bun(CLI は配布コピー {{HARNESS_DIR}}/tools/ に同梱)」へ
- 配線2点(ADR-3 実装): (a) claude manifest coreDirs へ skills/amadeus-election の1 entry(manifest.ts:51-54 様式)(b) codex emit.ts:338 リストへ "amadeus-election"
- 非対象4面(cursor/kiro/kiro-ide/opencode)の dist に skills/amadeus-election が**不在**であることを機械確認(symmetric-pair-review の配線⇔非配線対検査)

## テスト追随+U1 green 化(FR-1d、FR-5b の後半)

- t234〜t244 の import/spawn パスを新正本へ更新(消費側は実装時に repo 全域 grep で全数棚卸し — enumeration-reverify-at-implementation)
- U1 live 参照検査の有効化: SKILL.md 書き換え完了後に live tree で Finding 0 を実測(赤→green の実証完結 — 同一 Bolt 内)
- 再生成: package.ts + promote:self → dist:check / promote:self:check exit 0(FR-1c)

## ADR-1 の成果物化(FR-1e)

core 配置根拠の ADR は AD decisions.md ADR-1 を正本とし、実装 PR の説明へ参照を記載(新規文書は作らない — 二重化回避)。

FR-1e 充足の verbatim 照合(decisions.md は本ステージ consumes 宣言外のため正本直読 2026-07-23): ADR-1 Decision 行 verbatim「core/tools 配置。選挙プロトコルはどのハーネスのチームでも同一(E-ETF-CANON で CLI が正本)であり、ハーネス中立層の定義に合致する」+ Context 行の cid:code-generation:harness-tools-placement 参照 — FR-1e の要求「全6ハーネス投影の妥当性 = 選挙エンジンのハーネス中立性を明文化」を内容として充足していることを確認済み。実装 PR レビューでは参照実在に加え本照合の再確認を検証項目とする(BR-6 の検証を内容照合込みへ強化)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:22:24Z
- **Iteration:** 1
- **Scope decision:** none

Major2件(上流 requirements/components の Review 履歴が NOT-READY 終端のまま — 記帳ギャップ / FR-1e 充足照合が FD 内で非閉包)+Minor1件(t243 表記)。FR-1a〜2d 全数カバー・NFR-2 担保・Bolt 内順序・4面不在確認は良好

### Findings

- Major1: 上流2成果物の Review 履歴未閉包 → conductor 記帳の Post-review closure 節を追記(diary+ゲート承認の実在参照)
- Major2: FR-1e の内容充足照合が FD 内で閉じない → ADR-1 Decision 行の verbatim 照合節を追加し BR-6 検証を内容照合込みへ強化
- Minor3: t243 表記の不統一 → 番号域内である旨へ統一

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:24:29Z
- **Iteration:** 2
- **Scope decision:** none

iter1 の3指摘すべて閉包確認(Post-review closure 記帳の誠実性・本文一致、FR-1e verbatim 照合の内的整合、t243 表記統一)。スコープ外部分(decisions.md 実文)は限界明示+実装 PR 再確認の検証項目化を妥当と判定。新規指摘なし

### Findings

- None
