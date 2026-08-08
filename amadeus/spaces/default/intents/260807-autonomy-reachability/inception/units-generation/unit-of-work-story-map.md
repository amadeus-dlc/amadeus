# Unit of Work Story Map — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR を物語単位として使用)、components.md / component-methods.md / services.md / component-dependency.md / decisions.md(実装 Unit への写像)。stories(user-stories 成果物)は user-stories ステージ SKIP により未生成 — 設計どおりの不在のため、本 map は intent-statement のペルソナ(headless/自律運用の開発者・運用診断者)と FR を物語源として構成する。

## 物語 → Unit 写像

| 物語(ペルソナ視点) | FR | 実装 Unit |
|---|---|---|
| 宣言したモードが state・statusline・Stop hook すべてで一貫して見える | FR-2c/2d | u1 |
| なぜ人間に落ちたかが audit で読める | FR-2a | u1 |
| preview で「何が自動裁定されないか」が事前に分かる | FR-2b | u1 |
| 1コマンドで宣言して走行を開始できる | FR-1 | u2 |
| 質問が梯子経由か人間直行かを後から集計できる | FR-3 | u3 |
| `--autonomy` の存在を docs/help/SKILL のどこからでも発見できる | FR-5a/5b | u4 |
| semi の質問手順が conductor の読む面に書かれている | FR-5c | u4 |
| 導線の欠落が CI で検出される | FR-5d | u4 |
| 改善が数値で確認できる | FR-4 | u5 |
| opt-in ステージの起動挙動を文書が正しく説明する | FR-6 | u6 |

## 横断的関心

- 「宣言→走行→観測」のジャーニー全体は u1+u2+u3 の合成で成立(単一 Unit では完結しない唯一の物語)。u5 がジャーニーの成立を計測で裏付ける
- 監査イベントの登録・docs 同期(NFR-4)は u1(refusal イベント)と u3(属性)の両方に現れる — `amadeus-audit.ts` は u1 のみが触るため衝突しない(u3 は属性のみで登録不要)

## Unit 内の実装順序

- u1: canonical 化(FR-2c)→ refusal イベント(FR-2a)→ preview(FR-2b)→ 6読み手テスト(FR-2d)
- u2: t450×2 の契約改訂(Red)→ judgment 0/Branch 4ab 改訂(Green)→ intent-birth 引数 → e2e
- u4: stage-protocol semi 手順 → SKILL/commands 8面 → help/README/docs → パリティテスト(落ちる実証)

## 被覆検証

FR-1〜6 の全10物語が Unit に割当済み・全6 Unit に物語あり(漏れなし)。
