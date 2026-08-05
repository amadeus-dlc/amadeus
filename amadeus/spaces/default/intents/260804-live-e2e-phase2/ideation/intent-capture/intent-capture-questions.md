# Intent Capture Questions — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
回答モード: Guide me

ユーザー承認: 2026-08-04T08:34:07Z — 統合回答の確認に対する直接回答「1」（audit `QUESTION_ANSWERED`）

## Q1. 解決する中心課題

Phase 2で解決すべき中心課題はどれですか？

A. Kimi CodeとKiro CLIの実行特性を隠さず、Phase 1で確立した共通live E2E policy/lifecycleへ安全に接続できる状態を作る  
B. Kimi CodeとKiro CLIのcapability matrixだけを作り、接続実装は後続作業にする  
C. Kimi CodeとKiro CLIのtransportを単一方式へ統一する  
D. Kimi Codeだけを共通policyへ接続し、Kiro CLIは調査結果だけを残す  
E. Kiro CLIだけを共通policyへ接続し、Kimi Codeは既存挙動を維持する  
X. Other (please specify)

[Answer]: A — Kimi CodeとKiro CLIの実行特性を隠さず、Phase 1で確立した共通live E2E policy/lifecycleへ安全に接続できる状態を作る（2026-08-04T08:32:11Z、Mode: Guide me）

## Q2. 主な顧客と痛点

主な対象者と、解消すべき痛点の組み合わせはどれですか？

A. Amadeus保守者と各CLI利用者。実CLI・実モデルでの動作、安全な認証・設定隔離、skip/timeout/実失敗の区別を一貫して検証しづらい  
B. Amadeus保守者のみ。テストコードの重複だけを減らしたい  
C. CLI利用者のみ。CLIの操作方法を統一したい  
D. CI運用者。通常のGitHub Actionsでlive testを常時実行したい  
E. Kiro IDE利用者。GUI/CDP経由の検証を自動化したい  
X. Other (please specify)

[Answer]: A — Amadeus保守者と各CLI利用者。実CLI・実モデルでの動作、安全な認証・設定隔離、skip/timeout/実失敗の区別を一貫して検証しづらい（2026-08-04T08:33:05Z、Mode: Guide me、根拠: 既存Intentを継承）

## Q3. 成功境界

Phase 2の成功境界として最も適切なのはどれですか？

A. Kimi print driverは共通policy/lifecycle接続・adapter test・contract test・opt-in live journeyを完了し、Kiro CLI ACP/TUIは同等接続または阻害要因・推奨seam・受け入れ条件を備えた後続Issueへのlinkを完了する  
B. Kimi CodeとKiro CLIの両方を必ず本Intent内で直接接続し、後続Issueへの分離を認めない  
C. Kimi Codeの接続だけでPhase 2完了とし、Kiro CLIは対象外にする  
D. capability matrixと調査記録だけでPhase 2完了とする  
E. Phase 3のCursorとOpenCodeも同じIntentへ含める  
X. Other (please specify)

[Answer]: A — Kimi print driverは共通policy/lifecycle接続・adapter test・contract test・opt-in live journeyを完了し、Kiro CLI ACP/TUIは同等接続または阻害要因・推奨seam・受け入れ条件を備えた後続Issueへのlinkを完了する（2026-08-04T08:33:05Z、Mode: Guide me、根拠: 既存IntentおよびIssue #1717を継承）

## Q4. 着手トリガー

今Phase 2へ着手する主な理由はどれですか？

A. Phase 1の共通seamとPhase 1.5のPi正式対応がマージ済みとなり、優先ブロックが解除されたため  
B. Kiro IDEのGUI自動化が緊急になったため  
C. 通常CIでlive model testを必須化する必要が生じたため  
D. Phase 1の設計を破棄して新しい共通contractを作り直すため  
E. Phase 3を先に進めるため、Phase 2を調査だけで閉じる必要があるため  
X. Other (please specify)

[Answer]: A — Phase 1の共通seamとPhase 1.5のPi正式対応がマージ済みとなり、優先ブロックが解除されたため（2026-08-04T08:33:05Z、Mode: Guide me、根拠: Issue #1717を継承）
