# Intent Backlog — 260820-fmc-drift-batch(proto-Units)

上流入力: `ideation/intent-capture/intent-statement.md` の Success Metrics を分解。優先度は MoSCoW。規模は数値見積(行数、FD 必須要素込みの較正 — 過去実測の 2.1〜2.6 倍係数を反映済み)。

| # | Proto-Unit | 対応 capability | MoSCoW | 見積規模(実装+テスト LOC) | 依存 | 並列性 |
|---|---|---|---|---|---|---|
| PU-1 | boundary-three-face(model-map 実装境界の3面是正 + PR系2モデル pin + 述語1定義化) | C-2929 | Must | 500–800(境界導出の1定義化 ~150、loader/sensor 改修 ~150、model-map entries 追加 + ハッシュピン resync ~100、両境界の落ちる実証テスト ~300) | なし | 完全独立 |
| PU-2 | revise-model-commit(replace-by-name + 不在名 cross-check + t448 再スコープ) | C-2289 | Must | 400–650(composeRegisteredMap の route 依存化 ~120、cross-check ~80、TDD 3面+fail-open テスト ~300、FD 改訂裁定記録 ~50) | なし | 完全独立 |
| PU-3 | advisory-retirement(authoring-hold 経路の完全撤去) | C-3187 | Must | 250–450(削除中心: plugin.json 宣言・advisoryHold/defaultSubjectsPath・t528 撤去、跡地の不在テスト + 台帳 resync) | なし | 完全独立(PU-4 の前提) |
| PU-4 | applicability-arms(語彙 drift 検出 + 欠陥再発トリガの2本の腕) | C-3186a/b | Must | 700–1100(判定契約の2腕 ~300、drift→revise-model 強制ルート ~150、落ちる実証(実 corpus 赤→緑) ~400、doc/harness 面 census ~150) | PU-3(tla-authoring.ts 共有) | PU-3 後に着手 |
| PU-5 | spinoff-filing(t448 自己参照比較の bug 起票のみ) | — | Should | 起票1件(コード変更なし) | なし | 任意時点 |

## 優先順位の根拠(WSJF 略式)

- PU-1 / PU-3 は他の価値を解放する enabler(PU-1 は governed 被覆の前提、PU-3 は PU-4 のファイル競合解消)→ 先行着手
- PU-2 は独立で、PU-4 の drift→revise-model 強制が実運用で意味を持つための前提部品
- PU-4 は価値の本丸だが依存末端 → 最後に合流
- すべて Must(閉ループはどれを欠いても成立しない — intent-statement §Problem Statement のとおり)

## Bolt 編成の示唆(delivery-planning への入力)

- Bolt 1(walking-skeleton ゲート): PU-3 を最小 end-to-end スライスとして推奨 — 削除中心で薄く、宣言(plugin.json)→コード→テスト→CI→PR の全統合点を通る
- Bolt 2(並列バッチ): PU-1 + PU-2(相互独立、worktree 分離)
- Bolt 3: PU-4(PU-3 着地後)
- PU-5 は Bolt 外(起票のみ、人間承認境界に従う)
