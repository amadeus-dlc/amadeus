# Feasibility Assessment — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`
>
> 実測基準: commit `2126ec1144a6fd0808021d7c386c1afbfdea6ae2`、2026-07-24

## 判定

**条件付き GO** とする。`intent-statement.md` が定める `off | prompt | auto` は、既存の3層設定、Issueミラーツール、engineのphase境界検知を拡張して実現できる。新しいクラウド基盤、外部ライブラリ、認証情報管理は不要である。

ただし、次の2点をRequirementsとDesignで必須条件として閉じる。

1. `auto` createがGitHub上では成功し、ローカルの`Mirror Issue`記録だけが失敗した場合でも、次回再試行で重複Issueを作らないこと。
2. 自動closeの対象が「Amadeusが当該Intent用に作成したIssue」であることを、Issue番号だけでなく永続的な由来情報で証明できること。

## Technical Viability

| 評価面 | 現行の実測 | 3モード化の評価 |
|---|---|---|
| 設定 | `amadeus-mirror-config.ts`はGlobal→Space→Intentの3層解決と型エラー集約を実装済み | booleanを3値unionへ置換し、既定値を`prompt`に変更できる。旧booleanは既存の型検証面で明示拒否できる |
| create | `handleCreate`は重複create拒否、`gh` readiness、Issue作成、state書込みを実装済み | Intent Capture承認後のengine seamから呼び出せる。ただし「Issue作成成功・state書込み失敗」の部分成功を再試行可能にする必要がある |
| sync | `decideMirrorBoundary`とreceiptがphase境界の再入を制御済み | `prompt`と`auto`の分岐を3値へ拡張し、phase完了・park・workflow完了へ同じ同期契約を適用できる |
| close | `handleClose`は`intents.json=complete`とstateの`Status=Completed`を両方検証し、最終sync成功後だけcloseする | 既存の着地確認を維持したまま、Amadeus作成Issueの由来確認を追加できる |
| 障害処理 | `gh`不在・未認証・API失敗はloud failureとなり、phase receiptは`pending`を保持できる | Workflow継続へ変更し、未同期状態と警告を保持して次の境界で再試行できる |
| 配布 | coreのtoolsは既存manifestから各harness、`dist/`、self-installへ投影される | 既存のpackage/promote経路とdrift guardをそのまま利用できる |

## AWS Landscape Assessment

AWSサービス、AWSアカウント、ネットワーク、IAM、データストアの追加は **N/A** である。本変更はローカルBun CLIから既存の`gh` CLIを呼ぶリポジトリ内機能であり、クラウドインフラの予算・リージョン・可用性設計を必要としない。

## Compliance and Data Assessment

- 新しい認証情報は保持しない。GitHub認証は既存どおり`gh`のcredential storeへ委譲する。
- Issue本文は既存ミラーと同じ最小共有面を維持し、Intent record全体やtokenを転記しない。
- `auto`は外部書込みを増やすため、明示設定を限定的な常任同意として扱い、対象Issue、実行境界、由来確認を機械的に制限する。
- 新しいPII、PHI、決済情報、データレジデンシー要件は導入しない。GitHubリポジトリの既存アクセス制御と可視性を継承する。

## Norm Feasibility

現行の`team.md` P4と`project.md`の`gh-scripts-boundary`はcreate・closeの都度確認を要求するため、承認済み`intent-statement.md`の`auto`契約と衝突する。ユーザー裁定により、次の限定条件で規範を最小改定する。

- version-controlledな`auto-mirror: auto`を、Intentミラー操作に限定した明示的な常任同意として扱う。
- createはIntent Capture承認後、syncは承認済み境界、closeはAmadeus作成Issueかつ最終sync・着地確認成功後に限る。
- この例外をPR merge、release、他のIssue操作、他の外部サービス操作へ拡張しない。

## Delivery Estimate

既存機構の拡張であり、新規サービスやパッケージは不要である。一方、設定契約、engineの複数ライフサイクルseam、再試行可能性、由来情報、全harness投影、日英文書が同時に変わるため、単一の小修正ではなく複数Unitへ分割すべき中規模featureと評価する。詳細な工数と順序はScope Definition以降で確定する。
