# Intent Capture Questions — 260706-harness-codex

出典: Issue #552 本文（Maintainer 確定、2026-07-06）と leader ディスパッチ定型文（agmsg 2026-07-06T05:42:53Z）。
以下の 4 問は Issue とディスパッチが確定済みの内容から記入する（人間非同席の多体連携運用。確定済み事項の再質問は行わない）。
三層化の設計論点 5 件は本ファイルでは扱わず、feasibility ステージの questions + 全メンバー同報ピア協議で確定する（ディスパッチ指示）。

## Q1. 解決するビジネス上の問題は何か

- A. ディレクトリ構造の三層化で解決する 3 問題: 二重管理（source/昇格先の人力同期）、ハーネス差分層の不在（Codex 対応物の置き場がない）、ビルドと配布の未分離（manifest 生成点がない）
- B. Codex 対応のみ
- C. インストーラの改善のみ
- D. その他
- X. Other (please specify)

[Answer]: A。Issue #552「背景」の 3 問題（2026-07-06 の運用実測に基づく）。本 Intent はうち (a) 三層化全体の設計確定と (b) Phase 1 = harness/codex/ の新設まで。

## Q2. 顧客は誰で、どんな痛みがあるか

- A. 内部 = Amadeus 開発チーム（人力同期の運用ルール負担、生成物手編集の事故リスク）と、外部 = Codex ハーネス利用者（skill 別 agents/openai.yaml の置き場がなく Codex で Amadeus を使えない）
- B. Claude Code 利用者のみ
- C. Maintainer のみ
- D. その他
- X. Other (please specify)

[Answer]: A。Issue #552 背景 1〜2 と、上流 dist/codex に対応物が実在する事実（モデル移行に直結 = 設計論点 5 の Phase 1 根拠）。

## Q3. 成功の定義と測定基準は何か

- A. Issue #552 の受け入れ条件 4 件（手編集場所の一本化 + 生成物手編集の検査検出、test:all / parity:check / インストーラ eval の新構造 pass、粒度制約の「ビルド再現性検証」への置き換え + team.md 更新、manifest 生成点のビルド統合）のうち、本 Intent は「設計確定成果物の存在」と「harness/codex/ が新構造で pass」を担う
- B. 受け入れ条件 4 件すべてを本 Intent で満たす
- C. その他
- X. Other (please specify)

[Answer]: A。Phase 分割判断（ディスパッチ）により、受け入れ条件の全達成は Phase 2（後続 Intent）込み。本 Intent の成功 = 設計論点 5 件の確定記録 + harness/codex/ の実装と検証 pass。

## Q4. このイニシアチブのトリガーは何か

- A. 技術負債（人力同期の運用実測 2026-07-06）+ 機会（上流 v2 が core/harness/dist で同問題を解決済み、rename #526 の着地で単独実行枠の前例が確立）+ モデル移行（Codex 対応物の必要性）
- B. 市場圧力
- C. 規制
- D. その他
- X. Other (please specify)

[Answer]: A。Issue #552 背景と「制約・段取り」（#526 着地後に実施）。
