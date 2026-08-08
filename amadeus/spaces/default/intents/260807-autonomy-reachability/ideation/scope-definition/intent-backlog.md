# Intent Backlog — autonomy-reachability(#2378)

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md の Success Metrics を proto-Unit へ展開)。feasibility-assessment / constraint-register は feasibility SKIP により未生成(設計どおりの不在)。

## Proto-Units(MoSCoW+dependency-first 順)

D2 裁定(dependency-first)によるキュー順。優先度は D1 裁定の MoSCoW。

| # | Proto-Unit | MoSCoW | 依存 | 概要 |
|---|---|---|---|---|
| U1 | 導線追記+パリティテスト | Must | なし(根元) | SKILL.md 全ハーネス正本・utility help・README・docs 対訳へ `--autonomy` 追記。stage-protocol の decide-question 手順へ semi 追記。導線パリティ(全面に `--autonomy` 記載が存在すること)を固定する回帰テスト |
| U2 | 裁定不能理由の可視化 | Must | なし | `SCOPE_OUT`/`MODE_REQUIRES_HUMAN` の audit イベント化、`preview-autonomy` の非裁定種別列挙、state 投影と canonical audit の非対称是正 |
| U3 | engine 未経由質問の観測 | Must | U2(イベント基盤) | decide-question 未経由の人間直接質問を検出するイベント/sensor |
| U4 | birth 同時宣言+実測固定 | Must | U1(導線)、仕様裁定(ユーザー) | `--autonomy` を birth と同時に受理する意味論の裁定→実装。「最初の質問より前に mode 有効化」の e2e 実測固定 |
| U5 | 回帰計測レポート | Must | U2・U3(新イベント形) | ベースライン C1/C3 との比較。測定述語を新イベント形へ更新し計測 ref 明記 |
| U6 | plugin stage 文書 drift 是正 | Should | なし(独立) | formal-model-check / pr-convergence の stage 文書を #2318 実装後の実挙動へ整合 |

## 価値ストリーム(テキスト)

利用者が `--autonomy` を発見(U1)→ 宣言が birth 時から効く(U4)→ 止まった理由が audit で読める(U2)→ conductor の梯子迂回が検出される(U3)→ 改善が数値で確認される(U5)。U6 は opt-in ステージ利用者の誤解除去。

## 備考

- U4 の birth 同時宣言は既存挙動(`--autonomy needs an active intent`)の変更 = 仕様変更の可能性があるため、requirements 段で正準リスト(4)に従いユーザー裁定を得てから確定する
- 各 Unit の粒度・Bolt 編成は units-generation / delivery-planning で確定する(本表は proto)
