# Intent Backlog — Amadeus Grilling 統合(proto-Units)

**Intent**: mattpocock の grilling スキルを Amadeus Grilling として統合する
**Date**: 2026-07-06 / **Stage**: scope-definition (1.4)
**優先順位付け**: MoSCoW(全 Must)+リスク順シーケンス。`scope-document.md` の In Scope 6項を proto-Unit に分解した。

## Backlog(リスク順)

| # | Proto-Unit | 内容 | 価値 | リスク | 依存 |
|---|---|---|---|---|---|
| PU-1 | 1問ずつレンダリング検証 | 「1問ずつ・推奨回答つき」を question-rendering annex の枠内(バッチサイズ1固定+説明文への推奨案の織り込み)で表現できるかのスパイク検証 | 設計の土台を確定 | 高(最大の仮説) | なし |
| PU-2 | grilling 規律のプロトコル定義 | stage-protocol.md への第4モード「Grill me」追記(Step 2 の選択肢+Step 3d の対話規律: 1問ずつ/推奨回答/事実の自己調査/書き戻し/監査/ハイブリッド終了条件) | モード統合の中核 | 中 | PU-1 |
| PU-3 | スタンドアロンスキル | `/amadeus-grilling` read-only 汎用スキル(core/skills 配下+4ハーネスへのランナー/パッケージング、MIT 帰属コメント込み) | ワークフロー外でも grilling 可能 | 低(session-cost 同型) | PU-2(規律定義を参照) |
| PU-4 | docs+帰属+テスト+配布 | docs の対話モード説明更新、クレジット記載、テスト追加、dist 再生成+promote:self、バージョンバンプ+CHANGELOG | リリース完結 | 低(確立済みの手順) | PU-2, PU-3 |

## Value Stream

```
PU-1 スパイク検証 ──→ PU-2 プロトコル定義 ──→ PU-3 スキル ──→ PU-4 リリース
   (リスク解消)        (Grill me 成立)      (汎用化)      (ユーザーに届く)
```

テキストフォールバック: PU-1(検証)→ PU-2(プロトコル)→ PU-3(スキル)→ PU-4(リリース)の直列。PU-2 完了時点で Grill me モードがドッグフーディング可能になり、PU-4 で外部ユーザーへの価値(dist 配布)が実現する。

## Notes

- 全 Must・不可分パッケージのため、バックログの分割出荷はしない。順序はリスク解消の順であってリリース順ではない。
- PU-1 が不成立(annex の枠に収まらない)の場合、スコープ Out の「annex 拡張しない」制約と衝突するため、設計ステージで人間の再判断ゲートに戻す。
