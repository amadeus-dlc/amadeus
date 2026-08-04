# Scope Document — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [intent-statement.md](../intent-capture/intent-statement.md)  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## 目的と境界

`intent-statement.md`が定義したPhase 2の目的に基づき、Kimi CodeとKiro CLIをPhase 1で確立済みの共通live E2E policy/lifecycleへ段階接続する。共通化対象は安全policyとlifecycleであり、起動コマンド、transport、認証方式、設定隔離、出力形式、終了条件は各adapter境界に残す。

本Intentではfeasibilityとconstraint-registerの生成ステージがスキップされているため、両成果物は存在しない。境界判断は、承認済み`intent-statement.md`、Issue #1717、先行IntentのPhase 2定義を正本とする。

## In Scope — Must

| ID | 能力 | 完了境界 |
|---|---|---|
| M1 | Kimi print driver接続 | `kimi -p`を共通policy/lifecycleへ接続し、credential symlink、設定home、child environmentの境界をadapter内へ閉じ込める |
| M2 | Kimi決定的テスト | adapter integration testと共通contract testを適用し、opt-in、GitHub Actions hard deny、sensitive env隔離、skip reason、失敗分類を検証する |
| M3 | Kimi live journey | 明示的なローカルopt-inでのみ実CLI・実モデルを起動する最小journeyを1本greenにし、実行revisionと結果を記録する |
| M4 | Kiro CLI実測 | ACP/TUIについて非対話または安定終了経路、認証・設定境界、child environment、配布面、live実行可能性を実測する |
| M5 | Kiro CLI二択完了 | ACP/TUIを共通policy/lifecycleへ接続するか、阻害要因・推奨seam・検証可能な受け入れ条件を備えた後続Issueへlinkする |
| M6 | Phase 2証跡 | KimiとKiro CLIの最終結果をcapability matrix、テスト、live実行記録、関連Issueへ追跡可能にする |

M1〜M6はすべてMustである。Kiro CLIは「直接接続」または「条件を備えた後続Issue」の二択で完了できるが、調査記録やmatrix更新だけでは完了としない。

## In Scope — Should / Could

### Should

- 実測失敗時に、利用者がskip、timeout、実失敗を短時間で判別できる診断情報を保全する。
- adapter固有の認証・設定前提とlive journey実行手順を保守者向け文書へ反映する。

### Could

- 最小journeyを遅らせない範囲で、追加の短いlive scenarioや補助診断を加える。
- capability matrixから導けるトラブルシューティング例を追記する。

ShouldとCouldは、Mustの安全契約、決定的テスト、最小live journey、Kiro二択完了を遅らせない場合に限る。

## Out of Scope — Won't

| ID | 除外項目 | 理由 |
|---|---|---|
| W1 | Kiro IDEのGUI/CDP | Phase 2はKiro CLIのACP/TUIに限定するユーザー裁定済み |
| W2 | CursorとOpenCode | Issue #1717のPhase 3対象であり、本Intentへ混在させない |
| W3 | transportの単一方式への統一 | ハーネス固有能力をadapter境界に残す方針に反する |
| W4 | 通常のGitHub Actionsでのlive process起動 | live E2Eは課金・認証を伴うローカルopt-in専用である |
| W5 | capability不足を隠す共通contractの弱体化 | ハーネス横断の安全不変量を維持するため |
| W6 | モデル出力の完全一致 | 非決定性を避け、exit code、構造化出力、ファイルまたは状態をアンカーにする |
| W7 | Phase 1、Phase 1.5の再実装 | 完了済み基盤は回帰確認の対象であり、再設計対象ではない |

## Dependencies and Sequencing

1. 承認済み`intent-statement.md`と既存共通live E2E contractを基準線とする。
2. Kiro CLIのACP/TUI capabilityを早期実測し、直接接続か後続Issueかの成立条件を先に明らかにする。
3. Kimi print driverのadapter境界を固定し、決定的なintegration/contract testをgreenにする。
4. Kimiの最小opt-in live journeyを実走する。
5. Kiro CLIについて選択した完了経路を閉じ、Phase 2証跡を統合する。

KimiとKiro CLIは独立proto-Unitとして進められる。共有依存は既存共通contractであり、新しい共通抽象を先に発明することは依存条件にしない。順序はKiroの不確実性を早期に下げるrisk-firstを基本とし、実装DAGが判明した後の詳細なBolt順序はDelivery Planningで確定する。

## Value Stream Map

```text
Issue #1717 Phase 2
  → 既存共通contractの確認
  → Kiro CLI capability実測 ─→ 直接接続 ─┐
  │                            └→ 後続Issue ─┤
  → Kimi adapter + contract test            ├→ Phase 2証跡 → 保守者が安全に再実行可能
  → Kimi opt-in live journey ────────────────┘
```

顧客価値は、各CLIの能力差を隠さず、実CLI・実モデル・実認証の境界を安全かつ再現可能に検証できることである。

## Timeline and Quality Boundaries

外部の特定期限は設けない。Kiro実測を早期に行い、不確実性による手戻りを抑える。完了速度より、次の品質境界を優先する。

- opt-inなし、または`GITHUB_ACTIONS=true`では対象processを起動しない。
- source auth/config pathとsensitive env keyをchild environmentへ漏らさない。
- skip、timeout、実失敗を機械判別する。
- live journeyは直列・短時間・最小プロンプトとし、credentialやraw transcriptを保存しない。
- Kiro CLIを直接接続できない場合は、阻害要因と成立条件を検証可能な後続Issueへ移す。
