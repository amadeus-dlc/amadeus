# Intent Statement — semi 再定義と --autonomy 起動宣言(#2253)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。一次入力は Issue #2253 とユーザー裁定)

## Problem Statement(解決するビジネス課題)

Amadeus の自律走行には2つの運用上の欠落がある(Issue #2253、クロスレビュー2名成立済み・収束 ESTABLISHED_WITH_REFINEMENTS):

1. **headless 起動宣言の不在** — `--autonomy` フラグは全域 grep 0 件(origin/main `bb51a2823` / `2f255bc69` の両断面で実測)。自律レベルの設定経路は `amadeus-bolt set-autonomy` のみで、`claude -p`・夜間・CI などの非対話起動では宣言がプロンプト文依存になり再現性が無い。#2067 旧本文(2026-08-03T00:50:11Z 版)には「自律度の1軸宣言(none/semi/full — 発行/起動時に明示、監査・statusline・UI で同一語彙)」が実在したが、同日 03:01:01Z の grilling 置換で脱落し実装にも入らなかった。
2. **semi の走行単位が不定形** — 現行 canonical(FR-AUT-005)では semi の質問は人間裁定であり、phase 途中でも質問が出た時点で park する。走行単位が「質問が出るまで」という予測不能な形になり、「まとめて任せて節目で検収する」という semi の存在意義を損なう。推奨回答を許容しない利用者には none がそのまま残る。

## Target Customer(誰がどう恩恵を受けるか)

Amadeus を headless / スケジュール実行で運用する開発者(第一顧客は本リポジトリのユーザー自身 = 内部)。恩恵: 起動時に自律レベルを決定的な CLI 契約として宣言でき、semi は「phase 1個ぶん」という決定的単位で走る(質問での不定形 park が消える)。

## Success Metrics(測定可能な成功)

#2253「期待結果・完了条件」の全数達成(クロスレビュー反映済み版):

- semi の質問が full と同一の無人解決4段(方針なしは3段縮退)で解決され、`AUTO_DECIDED` + unreviewed queue に記録される
- walking skeleton / phase 境界 / Intent 終端は semi では人間裁定のまま(変更しない)
- `/amadeus --autonomy semi|full` が動作: semi は即時設定、full は grant 実在時走行・不在時 fail-closed 停止(**落ちる実証**で回帰固定)
- 旧仕様ピンの明示改訂: テスト(`t431:313`、`t121:1138`)+ docs 11 ファイル(日英対訳同時)
- 実装面の完全性: `resolveAutoDecision:702` と `createGateAutoDecision:667` の両改訂、`amadeus-stop.ts` の質問 carve-out 述語、`--policies-file` 無音破棄の loud 化
- 後方互換なし — 旧 semi 挙動の互換モード・フォールバック・移行シムを作らない(ユーザー裁定 2026-08-05)

## Initiative Trigger(なぜ今か)

intent 260803-intent-autonomy(#2067)の完了直後、ユーザーが `claude -p` 起動時の詰まりを指摘し、調査で (a) #2067 旧本文の「発行/起動時に明示」スコープが grilling 置換で脱落していた事実、(b) semi と none の差分が小さく「推奨回答が嫌なら none で十分」というモード軸の非一貫、の2点が確定した(2026-08-05 のユーザー裁定で semi = full − 節目 と再定義)。#2067 実装の記憶が新鮮なうちに一貫化するのが最も安価。

## Initial Scope Signal

`self-feature`(Amadeus 自体の仕様変更+新機能 — canonical 表の改訂を含むため self-fix ではない)。requirements 段へ送る裁定事項3件が #2253 に明記済み: (1) semi の grant 非依存な認可基体 (2) semi の方針の担体と確認 digest (3) 走行単位の主張の限定(stop 継続予算との整合)。
