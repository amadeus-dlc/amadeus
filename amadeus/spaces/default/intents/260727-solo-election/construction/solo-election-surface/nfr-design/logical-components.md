# Logical Components — solo-election-surface (U2)

上流入力(consumes 全数): performance-requirements.md(U2-PERF)、security-requirements.md(U2-SEC)、scalability-requirements.md(U2-SCALE)、reliability-requirements.md(U2-REL)、tech-stack-decisions.md(prose+integration 層の決定)、business-logic-model.md(ソロ手順・降格・ノルム改定の設計正本)。

## 変更コンポーネントと配線(実装単位)

| # | ファイル | 変更 | 検証 |
|---|---|---|---|
| 1 | packages/framework/core/skills/amadeus-election/SKILL.md | 4節への内挿(起動: 発動類型+降格告知 / 転送: spawn テンプレ+同期完遂+再起動1回 / 人間委譲: split・棄権・再議論・resume 降格 / 終了: 不変) | t242 green+新規テンプレ検査テスト |
| 2 | amadeus/spaces/default/memory/team.md | ソロモード節の改定(2体 subagent 選挙の正規形態化、発動規則 = SKILL と同文) | 同文照合テスト+加算性照合記録 |
| 3 | tests/integration/(新規)SKILL ソロ内挿検査 | テンプレトークン集合・固有値不在・定型文実在・同文照合・vacuity guard | CI |
| 4 | SKILL 投影面(self-install 3面+dist 3面) | 再生成 | dist:check / promote:self:check |
| 5 | docs(EN/JA の選挙該当節 — 実装時 grep で有無確定) | 該当があれば同一変更で同期 | t174 系 docs ゲート |

## 実装順序

1(SKILL 内挿)→ 3(検査テスト)→ 2(team.md 同文)→ 5(docs 棚卸し)→ 4(再生成)。U1 着地後にのみ着手(依存)。

落ちる実証(両側): (i) 存在側 — 内挿前 SKILL で定型文 grep が赤(pre-fix 面切替は fix コミット後に `git checkout <fix-SHA>~1 -- <SKILL path>` の ref 明示 checkout で行い、stash は使わない — cid:code-generation:falling-proof-no-stash。復元は `git checkout <fix-SHA> -- <path>`) (ii) 禁止側 — テンプレ検査に `{recommendation}` 等の禁止トークンを一時注入した fixture で赤を実証(org.md Mandated の失敗ケース注入。注入は scratch fixture 内で行い canonical を汚さない)。
