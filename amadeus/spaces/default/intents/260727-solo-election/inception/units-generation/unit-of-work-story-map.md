# Story Map — solo-election

上流入力(consumes 全数): unit-of-work.md(U1/U2)、requirements.md(FR の AC がジャーニー各段の合否基準)、components.md(担当 Unit 列の変更対象)、component-methods.md(spawn 定型・resume 手順の設計正本)、component-dependency.md(U1→U2 依存のジャーニー面)、services.md(シーケンス)、decisions.md(ADR-4 resume 裁定)、intent-statement.md(Target Customer / Success Metrics)。

## ジャーニー: ソロユーザーの判断が選挙で処理される

| 段階 | ユーザー体験 | 担当 Unit |
|---|---|---|
| 発動 | 設計逸脱・ブロッカー・§13 選定で conductor が自動発動(または「選挙にかけて」)。spawn 不能なら loud 告知でユーザー裁定へ | U2(発動規則・降格告知) |
| 投票 | 2 subagent が blind view から独立実測し自分で投票。ユーザーは何もしない | U1(投票経路・記録)+U2(spawn 定型) |
| 裁定 | 2-0 なら即採用で進行。record で事後追跡できる | U1(tally・record) |
| 割れたら | 1-1 スプリット/棄権/ブロック/再議論後の5残存だけがユーザーに上がる | U1(hold 判定)+U2(人間委譲手順) |
| 再議論 | 5×1票なら同一 subagent の resume で1ラウンド再投票、なお割れたらユーザーへ | U1(amend 集計)+U2(resume 手順) |

## Success Metrics との対応

- 指標1(subagent 票2票の実データ固定)→ U1 スケルトン実証
- 指標2(2-0/1-1 両分岐)→ U1 落ちる実証+e2e
- 指標3(ノルム同時着地)→ U2
- 指標4(チーム無退行)→ U1 regression(FR-06)
