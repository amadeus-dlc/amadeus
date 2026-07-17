# Initiative Brief — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功の姿4点)、`../feasibility/feasibility-assessment.md`(GO 条件付き)、`../feasibility/constraint-register.md`(C-1〜C-6)、`../feasibility/raid-log.md`(R-1〜R-3)、`../scope-definition/scope-document.md`(In 4/Out 5)、`../scope-definition/intent-backlog.md`(B-1〜B-3)。

## 何を(1段落)

opencode の plugins 機構へ amadeus core hooks を写像する Cursor 同型の薄いアダプタを提供する。核心は実測規律: payload が文書化(または @opencode-ai/plugin 一次ソースで確定)されたイベントのみ配線し、写像不能な面(HUMAN_TURN 相当の不在可能性を含む)は根拠付き「未対応」として機能単位表に固定する — 配線数 0 でも根拠付き確定表が完成すれば成功(scope-document 受け入れ境界)。

## なぜ今

#626 ADR-3 が意図的に分離した将来分の回収。dist/opencode には core hooks 10 ファイルが配布済み・未配線(実測)で、実装面は配線プラグイン+manifest に縮小済み — 投資対効果が確定した状態。

## リスクと緩和(c1 — 緩和策併示)

- R-1 HUMAN_TURN 相当イベント不在の可能性 → 一次ソース直読で確定、不在なら根拠付き未対応(presence は delegate 運用で代替済み)
- R-2 opencode の版間変動 → 配線最小+VERSION・検証時点の明記
- R-3 tool 名語彙の不一致 → 正規化写像+降格ルール(Cursor 工程0 同手法)

## 見積り・体制

S〜M、直列3段(B-1 語彙実測 → B-2 配線実装 → B-3 docs)。conductor = e3、builder = worktree 隔離 subagent、レビュー = 実装者以外。
