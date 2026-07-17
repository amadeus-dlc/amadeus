# Intent Capture — 明確化質問

intent: `260715-opencode-cursor-harness`(Issue #626)
起草: 2026-07-16 / conductor e3(amadeus-product-agent ペルソナ)

> 回答方針(チームモード規範): 既決照合を先に行い、GitHub Issue #626(ユーザー起票の一次ソース)・memory 層の既決ノルム・リポジトリ実測で接地可能な質問はその根拠で回答する(cid:no-election-for-decided-norms)。真に未決の設計判断のみ選挙へ回す。本ステージの4問はすべて Issue #626 本文で接地可能であり、未決の設計判断は含まれない。

## Q1: 解決するビジネス課題は何か?

- A. Amadeus の対応 harness が Claude/Kiro/Codex に限られ、opencode / Cursor 利用チームが AI-DLC workflow を実行できない(cross-harness reusability の North Star が未達領域を持つ)
- B. 既存 harness のバグ・回帰の解消
- C. core の methodology 自体の機能不足
- D. 配布パイプラインの性能問題
- E. ドキュメント不足
- X. その他

[Answer]: A

根拠: Issue #626「概要」「背景」— 「Amadeus の強みは、AI-DLC methodology を一つの core/ から複数 harness に投影できる点にある」「roadmap でも cross-harness reusability は North Star の一部として扱われている。opencode / Cursor 対応は、この方向性を広げる追加 harness port として扱う」(Issue 本文 verbatim)。

## Q2: 顧客は誰で、どんなペインを抱えているか?

- A. opencode または Cursor を主ハーネスとして使う開発チーム(内部・外部両方) — 現状 Amadeus の AI-DLC workflow を自分のハーネスで実行できない
- B. Amadeus フレームワーク開発者のみ(内部)
- C. Claude Code ユーザー
- D. エンドユーザー(非開発者)
- E. CI/CD 運用者
- X. その他

[Answer]: A

根拠: Issue #626「概要」— 「opencode と Cursor でも AI-DLC workflow を実行できるようにする」。配布フレームワークとしての Amadeus の利用者 = 各ハーネスの開発チーム(codekb business-overview.md の製品定義と整合)。

## Q3: 成功の定義と計測可能なメトリクスは?

- A. Issue #626 受け入れ条件そのもの: (i) 両 harness の実行モデルと制約が文書化 (ii) harness/opencode/・harness/cursor/ が既存構造準拠 (iii) scripts/package.ts で dist/opencode/・dist/cursor/ 生成(または未解決事項の明確化) (iv) 既存 harness に回帰なし (v) core の harness-neutrality 維持 (vi) 最小 smoke test / packaging drift check 追加 (vii) README / harness guide に対応状況と制限記載
- B. 全 32 stage の完全互換動作
- C. opencode/Cursor でのユーザー数計測
- D. パフォーマンスベンチマーク
- E. TAKT executor 互換の達成
- X. その他

[Answer]: A

根拠: Issue #626「受け入れ条件」セクションを verbatim 採用。B と E は Issue「非目標」で明示的に除外済み(「初期対応で全 stage / swarm / reviewer loop の完全互換を求めない」「TAKT executor 互換をこの issue で実装しない」)。初期目標ラインは「--doctor / --version / basic workflow start が動くところまで」(初期スコープ案)。

## Q4: このイニシアチブのトリガーは何か?

- A. 戦略的機会 — roadmap の North Star(cross-harness reusability)を前進させる追加 harness port(市場圧力でも技術的負債でも規制でもない)
- B. 市場圧力(競合対応)
- C. 技術的負債の返済
- D. 規制・コンプライアンス要求
- E. 既存ユーザーからの障害報告
- X. その他

[Answer]: A

根拠: Issue #626「背景」— roadmap の North Star への言及。ユーザー(リポジトリオーナー)自身による enhancement/P2 起票であり、障害・規制起点ではない(ラベル実測: enhancement, P2)。

## 回答モード記録

チームモード実行のため、Guide Me / Grill Me / Edit File / Chat の対人モードは提示せず、既決ソース(Issue #626 本文・ラベル実測)への接地で全問回答した(先行 intent 260709-canonical-settings の feasibility ゲート「6/6 questions answered — all grounded in measurements or decided norms」と同一様式)。未決の設計判断は本ステージには存在しない。矛盾検出: Q1〜Q4 の回答間に矛盾なし。
