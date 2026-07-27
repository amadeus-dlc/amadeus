# Business Rules — U6 activation-policy

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U6-1(決定性)**: 同一のファイル集合・内容に対する ActivationJudgment は常に同一(requirements FR-7(c)。検証: 同一 fixture への 2 回判定の一致 assert)
- **BR-U6-2(自動実行禁止)**: changed 判定は advisory(stderr 1 行)+doctor 行の提示まで。TLC の自動実行は行わない(ADR-1 案 A と却下案 D の境界。検証: changed 判定経路で run-model-check 呼出が発生しないこと)
- **BR-U6-3(stdout 純度)**: advisory は stderr のみ。next の stdout directive JSON は byte 不変(stdout-directive-stderr-advisory。検証: advisory 発火時の stdout parse 成功+既存 next 消費テストの green — stderr 追加の消費側棚卸しは stderr-addition-consumer-grep に従い実装時に repo grep)
- **BR-U6-4(0-plugin ゼロ影響)**: plugin 未 compose 時、engine の挙動・出力は現行と byte 同一(検証: 0-plugin baseline での next 出力比較)
- **BR-U6-5(`--single` 撤廃の範囲)**: 撤廃は compose 済み plugin stage の明示 `--stage` 起動に限る。stock scope への自動編入・auto-select はしない(FR-7(a)(b)。検証: scope grid に formal-model-check が現れないこと+ `--stage formal-model-check`(--single なし)の受理)
- **BR-U6-6(状態の単方向)**: SpecHashState の書込は verdict 記録時のみ。advisory・doctor 経路は read-only(検証: 発火経路での state ファイル mtime/bytes 不変)
- **BR-U6-7(path 安全)**: ActivationWatch.globs は plugin 宣言由来につき、compose の path escape 拒否を通過したもののみ判定対象(NFR-1。検証: escape glob の compose 段拒否は既存テスト面)
- **BR-U6-9(独自設計 — FR-7(d))**: 判定は spec-hash 独自機構のみで構成し、上流の `when:` 述語評価・plugin scope 機構に依存しない(FR-7(d) の明示 trace。検証: 実装に when: パーサ・scope 生成への参照が無いことの grep)
- **BR-U6-8(advisory 回数)**: advisory は指令発行 1 回につき最大 1 行(guard-announcement-callsite-count — 呼出し点数を実装時に grep 実測し、複数点ならラッチで 1 行化)

## 検証への trace

BR-U6-1/2/6 は unit テスト(純関数+state seam)、BR-U6-3/4/5 は integration(next 実出力比較)、BR-U6-8 は実装時の呼出し点実測+テスト。落ちる実証は実行時消費行へ注入(inject-runtime-consumed-lines)。
