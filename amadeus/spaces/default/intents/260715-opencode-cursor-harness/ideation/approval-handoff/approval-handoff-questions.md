# Approval & Handoff — 確認質問

intent: `260715-opencode-cursor-harness`(Issue #626)
起草: 2026-07-16 / conductor e3(amadeus-delivery-agent ペルソナ、amadeus-product-agent 支援)
上流入力: intent-statement(intent-capture)、scope-document / intent-backlog(scope-definition)、feasibility-assessment / constraint-register / raid-log(feasibility)

> **選挙不要判定(E-OC1 3段順序、[Answer] は leader 承認後に記入)**: 以下4問はすべて承認済み上流成果物(ゲート通過履歴)・既決ノルム・実測に帰着すると判定。market-research / team-formation / rough-mockups はスコープ SKIP のため、それらに関する質問(市場調査の投資裏付け・モブ編成・モックアップ)は対象成果物が存在せず、質問自体を N/A として除外した(存在しない成果物への合意を問わない)。
>
> 根拠種別(1問1行):
> Q1 = 実測(intent-capture / feasibility / scope-definition の3ゲートすべて delegate-approval で承認済み — 監査行 GATE_APPROVED 実在)
> Q2 = 承認済み上流(raid-log.md R-1〜R-4 に緩和策併記済み — approval-handoff:c1 の様式充足)
> Q3 = 既決+実測(P2・期限なし・チーム編成は role-model ノルムで既定、追加予算という概念が本 repo に不在)
> Q4 = 既決(ui-less-mockups ノルムの適用外 — rough-mockups は SKIP であり、CLI 出力契約の確定は inception/construction の設計ステージで行う)

## Q1: すべてのステークホルダーが intent とスコープに合意しているか?

- A. はい — intent-capture / feasibility / scope-definition の3ゲートすべてが leader delegate-approval 経路で承認済み(意思決定者 = ユーザーの承認系譜は delegate provenance で担保)。最終のイニシアチブ承認は本ステージのゲートで leader delegate により確定する
- B. 一部ステークホルダーが未確認
- C. 合意形成はこれから
- D. 反対意見が未解決
- E. 不明
- X. その他

[Answer]: A

## Q2: すべてのクリティカルリスクは緩和策付きで認知されているか?

- A. はい — raid-log.md の R-1(Cursor hook seam 未確認)〜R-4(opencode 権限既定)にそれぞれ緩和策を併記済み。最大リスク R-1 は「RE で反証確認+機能差の文書化で吸収」という代替緩和まで提示済み(approval-handoff:c1 準拠)
- B. リスクは列挙のみで緩和策なし
- C. クリティカルリスクが未特定
- D. 緩和策に合意がない
- E. 不明
- X. その他

[Answer]: A

## Q3: 予算・リソースのコミットメントはあるか?

- A. 本 repo に金銭予算の概念はなく、リソース = チーム稼働のみ。P2(通常優先度)として leader のディスパッチ済み割当が実効コミットメント。トークン資源制約下では rate-limit-idle-allowance に従う
- B. 予算承認待ち
- C. リソース未定
- D. 外部調達が必要
- E. 不明
- X. その他

[Answer]: A

## Q4: ラフモックアップは共有ビジョンを反映しているか?

- A. N/A — rough-mockups はスコープ SKIP(amadeus スコープの stage grid)。CLI/ゲート系の出力契約(ui-less-mockups-as-output-contract ノルムの適用面)は inception 以降の設計ステージで既存兄弟ツールの既習様式に揃えて確定する
- B. モックアップあり・反映済み
- C. モックアップあり・乖離あり
- D. モックアップ作成が必要
- E. 不明
- X. その他

[Answer]: A

## 回答モード記録

チームモード実行。E-OC1 の3段順序に従い、空欄起草→判定申告→leader 承認(16:36:47Z)後に記入した。矛盾検出: Q1〜Q4 間に矛盾なし。
