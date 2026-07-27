# Scope Document — solo-election

上流入力(consumes 全数): intent-statement.md(裁定 Q1-Q6・承認系譜・除外)、feasibility-assessment.md(実装ギャップ5点を Must 項目の導出元に使用)、constraint-register.md(C-01〜C-07 を境界条件として反映)。

## MoSCoW

### Must

| ID | 項目 | 由来 |
|---|---|---|
| M-01 | tally の2体 GoA 意味論(voters-aware 化): 5×1票→追加議論 hold、棄権1票→quorum-short hold(単票成立不能)、賛成1・反対1→スプリット hold。チームモード既存帯は挙動不変(regression 固定) | feasibility ギャップ1、Q6、C-01 |
| M-02 | ソロ選挙の end-to-end 駆動: open → 2 subagent spawn(blind view の verbatim 参照)→ 各自 CLI 投票(voterKind=subagent)→ tally → 裁定 record 固定 | Q4、feasibility ギャップ3 |
| M-03 | amadeus-election SKILL.md のソロ分岐(管理委員手順・spawn プロンプト定型・同期完遂文言・再spawn 1回→エスカレーション) | feasibility ギャップ2、R-02 |
| M-04 | 発動条件の明文化: 設計逸脱・ブロッカー・§13 選定の3類型自動+ユーザー明示発動。仕様変更・正準リスト事項は対象外 | Q1 |
| M-05 | team.md ソロモード節のノルム改定(2体 subagent 選挙の正規形態化、Q1-Q3/Q6 の裁定内容の明文化) | Q5=A |
| M-06 | 両分岐の実証: 2-0 即採用と 1-1 エスカレーション発火(落ちる実証を含むテスト固定) | 成功指標2 |
| M-07 | 7ハーネス dist・self-install・EN/JA docs・テストの同一変更同期 | C-06(ALWAYS 付随) |

### Should

- S-01: spawn 不能ハーネスでの loud 降格告知(現行挙動=全件エスカレーションへの明示的フォールバック文言)

### Could

- C-01: spawn 時のモデル/effort 指定オプション(独立性の上積み。機構必須化はしない — Q2 で「任意」)

### Won't(厳格除外)

- W-01: supervise 機能(要件未達巻き戻し)— 別議論
- W-02: 質問への推奨自動選択機構
- W-03: standing grant 機構の変更
- W-04(改訂 2026-07-27T14:28:11Z ユーザー裁定): チームモード選挙の挙動変更(定足数・agmsg 輸送・3体以上の GoA 規則)。**例外 = 2体選挙の GoA 集計規則**: §12a レビュー(iteration 1 C-1)が「member 2体でも {賛成1,反対1}同一選択肢が established になる現行 tally は、チームモードの偶数設計(2/4/6体、スプリット→人間裁定)と矛盾する」仕様バグを検出し、ユーザーが「次いでに矛盾がないように修正」と裁定(RA 質問ファイル裁定の記録参照)。2体規則(FR-05)は輸送非依存で適用する
- W-05: 3体以上のソロ定足数・動的定足数(将来のノルム再裁定に委ねる)

## Walking Skeleton

Q4=A: 実選挙1件の end-to-end 完走(M-02 の全経路)+ M-06 両分岐実証を最初の Construction Bolt とし、ゲートで人間確認する(amadeus-feature スコープの ALWAYS)。

## 境界条件

- 選挙プロトコルの正本は TS/CLI(C-02)。SKILL.md は手順追従のみ。
- main agent は管理委員専任・不投票、配布 verbatim(C-03)。
- 1-1/ブロック/棄権/追加議論後の 5 残存はユーザーエスカレーション(C-05)。
