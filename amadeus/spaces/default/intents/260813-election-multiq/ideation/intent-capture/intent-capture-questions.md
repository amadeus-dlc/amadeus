# Intent Capture 質問 — Election CLI 多問対応

## 回答方法

- Guide me

## Q1: 今回、最優先で解決する課題は何か？

- A. 複数の問いを一つの Election にまとめると、問いごとの choice・GoA・留保が失われ、どの問いが成立または保留になったかを機械判定できない
- B. 保留後の再実行で、成立済みの問いまで投票し直す必要がある
- C. Election に関する bundled norm が肥大化している
- D. 既存の単問 Election データを新形式へ移行できない
- E. Election CLI の対話表示が分かりにくい
- X. その他（自由記述）

[Answer]: A（E-OC1: ユーザー回答 1）

## Q2: 主な利用者と、その利用者が抱える痛みは何か？

- A. Election を実行する conductor と裁定を監査するメンテナー — 問いごとの結果を追跡できず、部分成立や部分再実行を安全に扱えない
- B. Election を実行する conductor のみ — CLI 操作が煩雑である
- C. Amadeus の実装開発者のみ — 型定義が扱いにくい
- D. Intent Mirror を閲覧するプロジェクト管理者 — Issue の表示が分かりにくい
- E. 外部の GitHub 利用者 — Election の存在を発見しにくい
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-f84e95ee3eb5aaab5b1f5f0e217d7bbd）

## Q3: 成功をどの範囲で定義するか？

- A. 問いごとの choice・GoA・留保を tally に保持し、部分成立・保留分のみの再実行・既存単問データの後方読み取り・関連 norm の縮約をすべて満たす
- B. 問いごとの tally を保持できれば完了とし、部分再実行は対象外にする
- C. 部分再実行までを対象とし、既存単問データの後方読み取りは対象外にする
- D. データモデルと CLI の変更までを対象とし、norm の縮約は別 Intent に分ける
- E. 設計文書のみを作成し、実装は別 Intent に分ける
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-3082f407121acd7096d3105268e4af69）

## Q4: この取り組みを今開始する直接のトリガーは何か？

- A. Issue #2813 の未完了を確認し、失われた旧 Intent の代わりに新しい self-feature Intent で実装を再開するというユーザー判断
- B. 本番障害またはデータ破損が発生した
- C. 外部ユーザーから期限付きの要望が届いた
- D. upstream 仕様の変更へ追従する必要が生じた
- E. 定期的な技術負債解消の一環
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-b0c04861af8e491783218ee9614f1da4）
