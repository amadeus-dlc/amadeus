# Intent Capture Questions — 260706-journal-logger

出典: Issue #557（Maintainer と leader の設計討議で確定）と leader ディスパッチ（agmsg 2026-07-06T08:48:30Z）。
4 問とも確定済み内容から記入する（確定済み事項の再質問は行わない）。

## Q1. 解決するビジネス上の問題は何か

- A. Intent に紐づかない調整記録（ディスパッチ・調停・委任・体制変更）の置き場と書き込み機構の欠如（#556 の手動 Issue 運用が暫定）
- B. audit の容量問題
- C. その他
- X. Other (please specify)

[Answer]: A。Issue #557 背景（設計討議で確定）。

## Q2. 顧客は誰で、どんな痛みがあるか

- A. leader（記録の受け皿がなく手動 Issue 運用）と全 engineer（記録先が不明確）、Maintainer（未昇格エントリの棚卸し不能）
- B. 外部利用者
- C. その他
- X. Other (please specify)

[Answer]: A。stakeholder-map を参照。

## Q3. 成功の定義は何か

- A. Issue の受け入れ条件 4 件（契約文書化 + validator 検査、追記 + ack + 日次 PR、仕分け 1 件以上の定着経路接続、#556 移行とクローズ）
- B. その他
- X. Other (please specify)

[Answer]: A。ただしディスパッチ付帯指示により、logger の実 spawn と運用検証（条件 2〜3 の実績）は「手順書 + 人間 / leader の初回起動」を経て確認する段取り。本 Intent の PR には契約・設計・手順書・#556 移行と validator 拡張を含め、運用実績の確認は初回起動後に行う（scope-definition で境界を確定する）。

## Q4. トリガーは何か

- A. 多体連携の実運用拡大（5〜6 体）による横断判断の増加 + 設計討議での構成確定
- B. その他
- X. Other (please specify)

[Answer]: A。Issue #557 の関連（steering 反映 3 周目の契約化論点の具体化）。
