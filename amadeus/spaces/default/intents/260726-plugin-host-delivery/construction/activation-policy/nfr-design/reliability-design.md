# 信頼性設計 — U6 activation-policy

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## computeSpecHash の決定性設計(ソート済みファイル列)

reliability-requirements「決定性(同一入力 → 同一判定)」の合否を、次の計算規約で実装する:

1. `ActivationWatch.globs`(security-requirements の path 安全のとおり compose 通過済みのみ — security-design)を展開し、**相対 path の辞書順ソート** でファイル列を固定する(glob 展開順・FS 列挙順への依存を排除)
2. ハッシュ入力は `相対 path + 区切り + ファイル内容` の連結列(path を含めることで rename を内容不変でも changed として検出 — 集合の同一性まで判定対象)
3. sha256(`node:crypto(stdlib — tech-stack-decisions の決定(依存追加ゼロ)の具体的帰結として選定)` stdlib — 依存追加なし)の単一 digest を SpecHash とする。時刻・環境変数・実行順・mtime を入力に含めない
4. **fail-closed(読取不能)**: 展開結果のファイルが読取不能な場合、無音で除外して hash を「たまたま一致」させる fail-open を禁止する。判定は typed failure として advisory 経路では stderr 1 行 loud+安全側(advisory 提示側)へ倒し、SpecHashState は書かない

- 検証: 同一 fixture への 2 回判定の一致 assert(BR-U6-1)+ファイル 1 バイト変更 → changed / rename → changed / 復元 → current の対照テスト

## SpecHashState のファイル境界(単方向・アトミック書込)

reliability-requirements「状態の単方向」を、決定的なファイル境界として具体化する:

- **形式・位置**: composition record 隣接の JSON 1 ファイル(`{ lastVerdictHash, recordedAt }` — C6 契約)。gitignore 対象(機械ローカル状態)。実パスは composition record の実配置に隣接させ実装時確定
- **読み**: `readActivationState` — ファイル不在 = `never-run`(fail-closed: 不在を current と読まない)。parse 不能も never-run へ縮退し stderr 1 行 loud(壊れた state で advisory を止めない)
- **書き**: `writeActivationState` は run-model-check 完了時(フロー 4)のみ。temp ファイル書込 → rename の置換で部分書込を残さない。advisory・doctor 経路は read-only(security-design の配線で型上到達不能 — 発火の冪等性)
- 検証: 発火経路実行前後の state ファイル mtime / bytes 不変(BR-U6-6)+verdict 記録時のみの書込 assert

## 0-plugin ゼロ影響・stdout 純度・advisory 回数

- 0-plugin baseline での next 出力 byte 同一比較テスト(BR-U6-4 — scalability-requirements の 0-plugin 合否を scalability-design の分岐設計で実測固定)
- advisory 発火時の stdout parse 成功+既存 next 消費テスト green(BR-U6-3 — security-design の挿入点設計の実測固定)
- advisory は指令発行 1 回につき最大 1 行(BR-U6-8)。実装時に呼出し点数を grep で実測し、複数ならラッチで 1 行化(guard-announcement-callsite-count)

## 独自設計と `--single` 撤廃の順序制御

- reliability-requirements「独自設計」のとおり、判定は spec-hash 独自機構のみで構成し、上流 `when:` パーサ・plugin scope 生成への参照を持たない(BR-U6-9 — grep 検証: 実装に当該参照 0 件)
- reliability-requirements「`--single` 撤廃の範囲限定」のとおり、撤廃は compose 済み plugin stage の明示 `--stage` 起動に限定し、scope grid へ formal-model-check を出さない(stock 編入なし)。Bolt 内実行順は business-logic-model「実行順」どおり **spec-hash 判定+テスト green を先に確定 → その後に撤廃を適用** し、「ゲートなし到達可能」窓を作らない(リスク制御としての順序 — intra-bolt-order-as-risk-control)。condition 文の更新は中立正本 `plugins/formal-model-check/stages/formal-model-check.md` で行い投影配布(dist 手編集禁止)。performance-requirements の非常駐前提により、可用性・リトライ等の常駐信頼性設計は N/A を継承する

> 補足(U6 ND レビュー Minor 是正 2026-07-27): 監視対象ファイルの読取不能・SpecHashState の parse 不能は、既存 3 値のうち **never-run 相当**(advisory 発火側)へマップする — 型上の第 4 分岐は作らず、SpecHashState への書込も行わない(fail-closed の一意確定)。
