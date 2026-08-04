# Stakeholder Map — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## Stakeholders and Interests

| Stakeholder | Role | Interest / Need |
|---|---|---|
| Amadeusプロジェクト保守者 | 主要顧客・実装担当 | Kimi CodeとKiro CLIの配布面を、共通contractに基づき安全かつ再現可能に検証したい |
| Issue #1717のオーナー | 意思決定者 | Phase 2の境界、直接接続と後続Issueの二択、受け入れ条件を維持したい |
| Kimi Code利用者 | 直接受益者 | 実CLI・実モデルで配布物が動作し、認証・設定が安全に扱われる証拠を得たい |
| Kiro CLI利用者 | 直接受益者 | ACP/TUIで成立する検証経路、または成立条件が明確な後続計画を得たい |
| Amadeusのレビュー担当者 | 品質インフルエンサー | adapter境界、共通contract、違反注入、live green証拠を追跡可能にレビューしたい |
| CI・リポジトリ運用者 | 安全性インフルエンサー | 通常のGitHub Actionsでlive processが起動せず、秘密情報が漏れないことを保証したい |

## Decision Makers and Influencers

- 最終意思決定者: Issue #1717のオーナーおよびAmadeusプロジェクト保守者。
- 技術的意思決定者: 対象adapterと共通live E2E policy/lifecycleの保守者。
- 品質インフルエンサー: PRレビュー担当者、contract testとlive journeyの検証担当者。
- 利用者インフルエンサー: Kimi CodeとKiro CLIの実行特性、認証方式、設定分離の制約を実測する利用者・保守者。
- 非対象ステークホルダー: Kiro IDE、Cursor、OpenCodeの利用者。要望は本Intentへ取り込まず、Issue #1717の後続Phaseで扱う。

## Communication Requirements

1. 進捗と完了判定はIssue #1717のPhase 2受け入れ条件へ紐づける。
2. Kimi Codeはadapter/contract testとopt-in live journeyの結果を、実行条件・skip reason・失敗分類とともに記録する。
3. Kiro CLIはACP/TUIごとに、直接接続の証拠または後続Issueの阻害要因・推奨seam・受け入れ条件を提示する。
4. live実行結果には実行対象、revision、結果、skip/timeout/実失敗の分類を残し、credentialやraw transcriptは保存しない。
5. スコープ変更、とくにKiro IDEのGUI/CDPやPhase 3対象の追加は、実装へ入る前に意思決定者の承認を得る。
