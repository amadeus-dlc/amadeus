# Unit of Work Story Map — plugin-host-delivery

> 上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements
> ジャーニー(利用者の到達価値の時系列)× Unit の対応。requirements.md Intent 分析の 3 受益者(利用者・保守者・プラグイン作者)を骨格とし、decisions.md ADR-4 の 3 クラス(native / folder-drop+auto / manual)がジャーニーの分岐を作る。

## ジャーニー 1: プラグインを導入して使う(利用者)

| ステップ | 体験 | 支える Unit |
|---|---|---|
| 選ぶ・入れる | ホスト標準機構(marketplace / folder-drop)でインストール | U1(方式確定)、U2/U3(投影成果物) |
| 使い始める | 次セッション起動で自動 compose(対応面)/ 1 コマンド手動 compose(manual 面) | U2/U4(フック)、U2(CLI 床) |
| 使う | 通常 scope 実行にプラグインステージ・contribution が現れる | U2(統合)、U6(`--single` 撤廃) |
| 確かめる | `--doctor` で installed / composed / drift / degrade を確認 | U5 |
| やめる | drop で当該プラグインだけ除去、baseline 復元 | U2(drop 経路) |

## ジャーニー 2: 状態を保ち続ける(保守者)

| ステップ | 体験 | 支える Unit |
|---|---|---|
| 変更を出荷する | 正本変更 → 投影 regen → drift ガード green | U3(--check 編入) |
| 上流に追従する | upstream sync レポートが適合テスト結果で追従状態を判定 | U7(追跡表+レポート欄) |
| 退行を検出する | 32 ケース層別テストが CI で red を出す | U7 |
| 手順を確認する | docs が実装と一致 | U8 |

## ジャーニー 3: プラグインを作る(作者 — 本 intent では既存 formal-model-check が代表)

| ステップ | 体験 | 支える Unit |
|---|---|---|
| 書く | `plugins/<name>/` 中立正本(既存契約 — 変更なし) | (既存) |
| 配る | packager が 7 面へ投影 | U3 |
| 発動を設計する | activation policy(spec-hash advisory — ADR-1 案 A) | U6 |

## リリース順(縦のスライス)

1. **U1**(調査 Bolt — record 文書 PR。walking skeleton には含まれない): 以降の対応面集合を確定
2. **U2 = walking-skeleton Bolt(単独ゲート — org.md の Bolt 1 契約はこの U2 のみに適用)**: ジャーニー 1 が Claude Code で端から端まで成立。ユーザー承認後に残 Bolt へ進む
3. **U3 + U5 + U6**(並行): 全面投影・観測・`--single` 撤廃
4. **U4**: 残面の自動化
5. **U7**: 保守者ジャーニーの機械化
6. **U8**: 手順書の同期

## FR 被覆の機械照合

U1=FR-1 / U2=FR-2(claude),3a,3b,3c,4,6 / U3=FR-2(全) / U4=FR-3b(残) / U5=FR-5 / U6=FR-7 / U7=FR-8,10 / U8=FR-9 → **FR-1〜FR-10 の 10/10 被覆**(unit-of-work.md の trace 列と一致)。
