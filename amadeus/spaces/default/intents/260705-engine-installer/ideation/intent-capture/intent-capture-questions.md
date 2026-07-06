# Intent Capture 質問（260705-engine-installer）

対象 Issue: [#451 エンジンの copy 配布を成立させるインストーラを設計・実装する](https://github.com/amadeus-dlc/amadeus/issues/451)

Issue #451 に背景と設計論点が、grilling session の転記コメント（https://github.com/amadeus-dlc/amadeus/issues/451#issuecomment-4887231697 、Maintainer + leader、2026-07-06）に設計論点 6 件の確定判断が記録済みである。
この質問票は Intent の土台（業務課題、顧客、成功指標、トリガー、初期スコープ信号）の確認だけを扱い、回答はすべて上流（Issue #451 本文と grilling 確定判断）から転記する。新規のピア協議は行わない。

---

## Q1. このインストーラが解決する中心の課題はどれですか？

A. 利用者の workspace へエンジンを配る正準手順が存在しない（手動コピーでは symlink・settings.json 配線・skills 2 系統が壊れる）
B. 開発者向けの bun install 手順が複雑である
C. エンジンのバージョン管理ができない
D. #441（OTel 計装基盤）の受け入れ条件が検証できない
E. A を主、D を従とする複合課題
X. Other (please specify)

[Answer]: E（出典: Issue #451 背景。正準手順の不在が主課題であり、#441 の受け入れ条件「copy 配布した workspace で全ツール・全 hook が動作する」が再現可能な形で検証できないことが従課題。#441 より先に本 Issue を解決する依存関係が明記されている）

## Q2. インストーラの主要な利用者は誰ですか？

A. Amadeus を自分の workspace へ導入する利用者（Claude または Codex ハーネスで使う開発者）
B. Amadeus 本体の開発者だけ
C. CI システムだけ
X. Other (please specify)

[Answer]: A（出典: Issue #451 背景「利用者の workspace へエンジンを配る」と grilling 確定 2「Claude + Codex 両対応」。本体開発者と CI（専用 eval）は二次利用者として検証層で扱う）

## Q3. 成功指標はどれですか？（複数）

A. 正準のインストール手順が 1 コマンドで実行できる
B. インストール先 workspace（node_modules なし、bun cache 冷、オフライン）で全ツールと全 hook が module load 時に落ちずに動作する
C. インストールを再実行しても壊れない（冪等）
D. README に利用者向けの導入手順が記載される
X. Other (please specify)

[Answer]: A、B、C、D（出典: Issue #451 受け入れ条件（案）の 4 点をそのまま採用。B は専用 eval で、C は上書き更新型 + aidlc/ 不可侵（grilling 確定 5）で担保する）

## Q4. この Intent のトリガーは何ですか？

A. 配布前提（単一公開入口、host 中立の .agents/ 移設 = CD009）が整った一方、配る正準手順が存在しないギャップ
B. 利用者からの導入失敗報告
C. #441 の作業開始が正準手順不在でブロックされたこと
X. Other (please specify)

[Answer]: A（出典: Issue #451 背景。C は優先順位の根拠であり、起点は配布前提と手順のギャップ）

## Q5. 初期スコープ信号（配布単位）はどれですか？

A. フルセット: エンジン .agents/amadeus/ 一式（7 dir）+ amadeus* skills 2 系統 + .claude/ symlink 配線 7 entry + settings.json の hooks 配線（マージ）+ AMADEUS.md。.agents/rules/ は本体開発向けのため除外
B. エンジン .agents/amadeus/ だけ
C. skills だけ
X. Other (please specify)

[Answer]: A（出典: grilling 確定 1（配布単位 = フルセット）。scope は feature、導入形態はリポジトリ内 TS スクリプト（確定 4）、symlink は再作成（確定 3）、更新は上書き型 + aidlc/ 不可侵（確定 5）、検証は 3 層分担（確定 6））
