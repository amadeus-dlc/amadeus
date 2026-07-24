# Unit Story Map — 260722-tla-plugin

上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements

## 価値ストリーム上の Unit 配置

利用者(フレームワーク開発者)の体験順に Unit を写像する(user-stories ステージは SKIP のため、intent-backlog の価値ストリームを正とする):

| 体験ステップ | 担う Unit | 利用者に見える価値 |
|---|---|---|
| 1. spec 変更時にモデル未更新の警告を受ける | U5 completeness-sensor | 見えないドリフトが可視化される |
| 2. .tla モデルを編集し登録簿を更新する | U1 tla-externalize | モデルが独立ファイルとしてレビュー・編集可能 |
| 3. ローカルで完全探索を1コマンド実行する | U3 run-model-check | fail-closed な機械保証(exit 契約) |
| 4. opt-in チームがステージとして組み込む | U2 plugin-skeleton | compose/drop の可逆な採用 |
| 5. CI で検証エビデンスを残す | U4 ci-integration | dispatch 一発で artifact 付き実証 |

## Unit 内の実装順序(Story implementation order)

- U1: .tla/.cfg 転記 → loader 差替 → identity 同値テスト → map 初期化
- U2: walk 拡張(C-1)→ plugin バンドル作成(C-8)→ compose/compile/実行 E2E → drop 検証
- U3: TlcSpawnPlanner 抽象(C-3)→ prepare/run 委譲(C-3b)→ CLI(C-2)→ 両 planner 落ちる実証
- U4: formal ジョブ追加 → 旧 workflow 削除 → dispatch 実測
- U5: manifest → 実装 → 両側実測(落ちる/正当データ)

## カバレッジ検証(Coverage verification)

体験ステップ5件は5 Unit に1:1で全数割当済み(未割当ステップ 0、ステップなし Unit 0 — 上表の機械照合)。user-stories は SKIP のため story 単位の割当は intent-backlog の価値ストリーム(承認済み)を代替とする(逸脱として diary 記録済み)。

## 完了の全体像

5 Unit がすべて着地すると、intent-statement の成功指標5点と 1:1 で対応する E2E(モデル外部化 → 汎用実行 → plugin ライフサイクル → CI green → sensor 落ちる実証)が成立する。
