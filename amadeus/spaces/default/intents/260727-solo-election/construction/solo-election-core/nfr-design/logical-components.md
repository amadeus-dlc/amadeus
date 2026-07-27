# Logical Components — solo-election-core (U1)

上流入力(consumes 全数): performance-requirements.md(U1-PERF)、security-requirements.md(U1-SEC)、scalability-requirements.md(U1-SCALE)、reliability-requirements.md(U1-REL)、tech-stack-decisions.md(層配置・形式検証の決定)、business-logic-model.md(tally 2体分岐・TLA 対応の設計正本)。

## 変更コンポーネントと配線(実装単位)

| # | ファイル | 変更 | 検証 |
|---|---|---|---|
| 1 | packages/framework/core/tools/amadeus-election-model.ts | HoldReason +split(:419)、tally 2体分岐(:440-477 内挿) | t234 追加+regression |
| 2 | packages/framework/core/tools/amadeus-election.ts | HOLD_RESOLUTIONS +split(:81-86) | 型検査(Record 網羅)+解決経路テスト |
| 3 | specs/tla/FormalElection.tla | Voters 2体化・SPLIT・HoldReason(r) 分岐 | TLC 両インスタンス完走 |
| 4 | specs/tla/model-map.json | SHA 写像更新 | model-completeness センサー |
| 5 | tests/unit/t234-election-model.test.ts | per-assertion 監査・書換+2体ケース追加 | CI |
| 6 | tests/integration/(新規)solo loop テスト | open→2票(voterKind=subagent)→tally→recorded+不正 ballot 拒否 | CI |
| 7 | dist 7面+self-install 5面 | 再生成(bun scripts/package.ts / promote:self) | dist:check / promote:self:check |

## 実装順序(bolt-plan の順序を配線レベルへ具体化)

5(落ちる実証 red)→ 1・2(実装)→ 5(反転 green)+6(新規)→ 3・4(TLA)→ 7(再生成)→ スケルトン実選挙。
