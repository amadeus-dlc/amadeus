# Feasibility Assessment — eoc1-gate-check

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(blocking 択)、`../market-research/market-trends.md`(機械化トレンド)、`../market-research/build-vs-buy.md`(自作継承)、Issue #1101(クロスレビュー3名の実装可能性実測)。

## 技術実現性(c1 — 実ツールで直接検証済み)

| 前提 | 検証 | 実測結果 | 判定 |
|------|------|---------|------|
| 挿入点の実在 | amadeus-state.ts 直読 | `:389` dispatch / `:1661` handleGateStart / 関数内 `validateSlugInState`(+19)→`setCheckbox`(+21)— 状態前提検査後・遷移書き込み前に挿入可 | ✅ 高確度 |
| fail-closed 経路の実在 | 既存 `error()` パターン直読 | 非0 exit+遷移なし、withAuditLock 内でアトミック(e3 実測を e4 独立照合済み) | ✅ 高確度 |
| questions ファイル様式 | 実 record ls | `<record>/<phase>/<stage>/<stage>-questions.md`(全ステージが持つわけではない — covci CG/B&T に不在を実測)| ✅(不在=正常の条件必須) |
| 正常系反例の実在 | 本日運用実測 | 裁定後 [Answer] 記入+gate-start 成功が正常系(E-1048-RA-Q1 実例+gate-start 9回)— 素朴空欄要求は偽陽性 | ✅ 含意形述語が必須 |
| L1 証跡様式の実在 | 本日3ファイル実測 | 承認タイムスタンプ行を questions 冒頭へ固定する様式が t224 以降の全 questions で運用済み(本 intent の IC/MR でも実演) | ✅ 検査対象の実データあり |

## リスク

- 偽陽性(正常フロー拒否)— 含意形述語+正常系非拒否テスト(落ちる実証3系目)で封鎖
- 既存 record の遡及不適合(旧 questions に L1 様式なし)— 検査は gate-start 時のみ発火(過去の approve 済みステージへ遡及しない)で自然回避。要件で明文化
