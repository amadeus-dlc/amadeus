# Intent Statement — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
先行Intent: `260803-harness-live-e2e`

## Problem Statement

Phase 1で確立したlive E2Eの共通policy/lifecycleに対し、Kimi CodeとKiro CLIはまだ同じ安全契約と検証経路へ接続されていない。そのため、実CLI・実モデルを使った動作確認、明示opt-in、GitHub Actionsでのhard deny、認証・設定の隔離、skip・timeout・実失敗の機械判別を、対象ハーネス間で一貫して保証できない。

Phase 2では各CLIの実行特性をadapter境界に残し、共通contractを弱めずにKimi CodeとKiro CLIを接続可能な状態へ進める。Kiro CLIを直接接続できない場合も、調査記録だけでは完了とせず、阻害要因・推奨seam・受け入れ条件を備えた後続Issueへ接続する。

## Target Customer

主な対象は、Amadeusのハーネス配布面とlive E2Eを保守・変更する開発者である。変更対象のCLIについて、実行可否、安全境界、失敗分類を再現可能な形で検証できる必要がある。

直接の受益者にはKimi CodeとKiro CLIの利用者も含まれる。利用者にとっての価値は、配布物が実CLI・実モデル・実認証の境界で動作し、認証情報やユーザー設定を不要に複製・漏洩しないことを確認できる点にある。

## Success Metrics

1. Kimi print driverを共通policy/lifecycleへ接続し、credential symlink、設定home、child environmentの境界をadapter testで固定する。
2. Kimi Codeへ共通contract testを適用し、明示opt-inでのみ起動する最小live journeyを1本greenにする。
3. Kiro CLIのACP/TUIを実測し、共通policy/lifecycleへ接続するか、阻害要因・推奨seam・検証可能な受け入れ条件を持つ後続Issueへ接続する。
4. 対象live pathで、opt-inなしと`GITHUB_ACTIONS=true`の場合にprocessを起動せず、sensitive keyやsource auth/config pathをchild environmentへ漏らさない。
5. skip reasonをcanonical理由コードで機械判別でき、skip・timeout・実失敗を区別する。
6. Kiro IDEのGUI/CDP、Cursor、OpenCodeへ作業範囲を拡張せず、Phase 2の完了証拠だけを残す。

## Initiative Trigger

Phase 1の共通seamとCodex・Claude Code対応が完了し、Phase 1.5のPi正式対応もマージ済みとなったことで、Issue #1717が定めるPhase 2の優先ブロックが解除された。共通contractとPiで得たadapter/lifecycleの実装基盤を再利用できる今、Kimi CodeとKiro CLIへ段階展開する。

## Initial Scope Signal

Amadeus自体へKimi CodeとKiro CLIのlive E2E接続を追加するため、スコープは`self-feature`とする。DepthはStandard、Test StrategyはComprehensiveである。

対象はIssue #1717のPhase 2に限定する。

- 対象: Kimi Codeのprint driver、Kiro CLIのACP/TUI、共通policy/lifecycleとの接続、adapter/contract test、opt-in live journey、または条件付き後続Issue。
- 対象外: Kiro IDEのGUI/CDP、Cursor、OpenCode、transportの単一方式への統一、通常のGitHub Actionsでのlive process起動、共通contractの弱体化。
