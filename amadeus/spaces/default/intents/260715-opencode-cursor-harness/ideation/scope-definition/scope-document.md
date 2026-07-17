# Scope Document — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)
上流入力: `../intent-capture/intent-statement.md`(Success Metrics・非目標)、`../feasibility/feasibility-assessment.md`(実現性判定・port 容易度)、`../feasibility/constraint-register.md`(C-T1〜C-T7 / C-O1〜C-O4)。

## In(スコープ内)

Issue #626 の受け入れ条件7項を境界の正とする(intent-statement の Success Metrics と同一):

1. **実行モデル文書化** — opencode / Cursor それぞれの受け取り単位・起動導線・権限モデル・制約の文書化(feasibility の外部実測を RE で版付き深掘り)
2. **harness surface 追加** — `packages/framework/harness/opencode/` と `packages/framework/harness/cursor/` の manifest.ts(+必要なら emit.ts)。既存4 harness の構造準拠(constraint-register C-T1/C-T3)
3. **dist 生成** — `scripts/package.ts` の manifest 自動発見 seam で `dist/opencode/` / `dist/cursor/` を生成(C-T2)。生成不能な未解決事項が出た場合はその明確化も In
4. **最小起動導線** — opencode: `$amadeus` 相当のコマンド/skill、Cursor: rules/コマンド surface。両者とも `--doctor` / `--version` / basic workflow start が動くこと
5. **無回帰** — 既存 harness(claude/codex/kiro/kiro-ide)の CI green 維持(C-T7)
6. **検証** — 最小 smoke test または packaging drift check の追加(新 dist ツリーを既存ガードの宇宙に編入)
7. **ドキュメント** — README / harness guide に対応状況と制限(機能差を含む)を記載

## Out(スコープ外 — Issue 非目標 verbatim)

- 全 stage / swarm / reviewer loop の完全互換
- `core/` への opencode / Cursor 固有分岐の直書き
- 機能差を隠した「既存 harness と完全同一 UX」の偽装
- TAKT executor 互換
- (追加)受け入れ条件を超える高度統合(hook 相当の深い統合・statusline 等)は nice-to-have として後続 intent へ送る

## 境界の判断基準

迷ったら「初期到達ライン(--doctor / --version / basic workflow start)に必要か」で判定する。必要 = In。不要だが受け入れ条件7項に含まれる = In。どちらでもない = Out(Issue 起票または後続 intent)。

## 前提とリスクの参照

実現性・リスク・制約は feasibility-assessment(総合判定: 実現可能・高確度)と constraint-register / raid-log を正とする。特に Cursor の hook seam 未確認(R-1)は RE で反証確認し、結果次第で「文書化された機能差」として In 側で吸収する(スコープは変えない)。
