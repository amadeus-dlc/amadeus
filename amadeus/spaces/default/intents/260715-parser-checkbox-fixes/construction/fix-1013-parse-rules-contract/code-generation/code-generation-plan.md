# Code Generation Plan — fix-1013-parse-rules-contract

- Issue: #1013(practices-promote parseRules が契約非接頭行を verbatim 昇格)
- 裁定: E-PB2 = A(アトミック fail-closed、PRACTICES_OVERRIDE exit 非0、全違反収集、既存 fail() 経路再利用)
- 実装: worktree 隔離 builder(bolt/fix-1013-parse-rules-contract、base origin/main)

## 方針

`handlePracticesPromote` 内ローカル `parseRules` arrow を exported 純関数3つへ抽出し in-process テストシームとする(seam-placement-measured-module):

1. `parseRuleLines` — 旧 parseRules と同一のフィルタ(trim・非空・非コメント・非見出し)
2. `validateRuleLines(section, lines)` — 先頭 `- ` 除去後、Mandated=`ALWAYS `/Forbidden=`NEVER ` 前方一致。全違反収集(fail-fast にしない)
3. `parseRuleSectionsOrFail(draft, onViolation)` — parse→検証→違反時 `onViolation`(=既存 `fail()`)を write 前に呼ぶ(アトミック、AC-2a/2c)

検証分岐を純関数側へ寄せ handler CCN baseline 26 を維持(complexity gate)。

## テスト計画

- unit(small/pure): 純関数3つの全分岐(t-practices-promote-contract-seam)
- integration: 実 CLI spawn の exit code+無書き込み契約、handler 配線行の in-process 駆動(captureExit)(t-practices-promote-contract)
- 落ちる実証: 散文行(F)・節不一致(G)を修正前実装に対し先行実行して RED を記録、バレット受理(H)は対照

## 品質ゲート

typecheck / lint / dist:check / promote:self:check / complexity-gate / coverage-registry --check / 関連テスト、push 前ローカル lcov で追加行 DA:0 ゼロ、deslop、fix-diff-independent-reverify。
