# Requirements Analysis — 明確化質問(intent: 260710-kiro-stale-hooks / #719)

> 回答方式: チームノルム(cid:requirements-analysis:election-protocol)に従い、エージェント間選挙で決定する。
> 既決事項は質問対象にしない(cid:requirements-analysis:no-election-for-decided-norms)。
> 既決の前提: (1) バグ実在はクロスレビュー2名で VERIFIED (2) マスキングは2層構造(#719 コメント 4931194718 の訂正が正)
> (3) kiro-ide 側の authoredExempt `.kiro.hook` regex は出荷実体があるため正当・維持(レビュー合意済み)
> (4) 落ちる実証・deslop・claude レビュー・人間承認マージは leader 指示の通常運用。

## Q1: dist 側マスキング(2層目)の修正方式 — kiro CLI の stale `.kiro.hook` 7件と空振り exemption をどう扱うか

背景(実測済み):
- kiro CLI は hook を `agents/amadeus.json` の adapter 経由で登録し、`.kiro.hook` を1件も出荷しない設計(dist 実測 0 件)
- source の 7 件は登録・出荷とも dead(消費者ゼロ、t147/t148 は dist のみ参照 → 削除で壊れない)
- 7 件中 6 件は kiro-ide 版と byte 一致、session-end のみ adapter 非経由の旧世代 command で drift
- `harness/kiro/manifest.ts:81` の authoredExempt 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は守る実体がなく、将来 dist に stale が混入しても無音で通す純粋マスキング

A. **stale 7 件を削除 + kiro CLI manifest の authoredExempt から `.kiro.hook` regex を除去**(クロスレビュー2名の推奨。CLI の adapter 設計を正とし、dead ファイルと空振り免除を両方消す)
B. 出荷経路を追加(harnessFiles に 7 件を載せて dist へ ship し、exemption を実体付きにする)— CLI の adapter 登録設計と二重化する
C. 削除のみ行い、exemption regex は温存(将来 kiro-ide からのコピー事故に備える)
D. exemption 除去のみ行い、ファイルは温存(fixture として文書化)
E. 何もしない(現状維持、Issue クローズ)
X. Other(具体案を記述)

[Answer]: 

## Q2: source 側マスキング(1層目)への対処 — 「manifest 未参照の source ファイルを検査する機構の不在」を本 intent で塞ぐか

背景(実測済み):
- `scripts/package.ts` の `checkHarness`(:554-633)は dist ツリーのみ walk し、`packages/framework/harness/<name>/` 配下の manifest 未参照ファイルはどのゲートにも映らない(7 件が残存できた直接の理由)
- leader 申し送り: 「単に exemption regex を消すだけでは片層しか塞がらない可能性」を踏まえて設計せよ
- 一方、チームスコープは bugs-only であり、汎用の新規検査機構の追加はスコープ膨張のリスクがある

A. **本 intent で塞ぐ: `package.ts --check` に source 側 unreferenced-file 検査を追加**(全 harness 対象、authored/manifest 参照済み/core 由来を除く未参照 source を FAIL に。誤 green の恒久是正=検証劇場の解消。落ちる実証は stale ファイル注入で行う)
B. 本 intent では 7 件削除+exemption 除去(Q1)のみ行い、1層目の検査機構は別 Issue に起票して分離(bugs-only スコープの厳格解釈)
C. kiro CLI 限定の狭い検査(hooks/ 配下の `.kiro.hook` 未参照チェックのみ)を追加し、汎用化は別 Issue
D. 検査機構は追加せず、docs(harness-engineering ガイド)に「source 追加時は manifest 参照必須」の注意書きのみ追加
E. 何もしない(1層目は許容されたギャップとして記録のみ)
X. Other(具体案を記述)

[Answer]: 
