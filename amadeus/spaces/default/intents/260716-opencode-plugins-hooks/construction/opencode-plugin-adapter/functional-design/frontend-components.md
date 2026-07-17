# Frontend Components — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR→U1)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、`../../../inception/application-design/components.md`(C1〜C5)、`../../../inception/application-design/component-methods.md`(公開 API)、`../../../inception/application-design/services.md`(境界)。2026-07-17。

## 該当なし(根拠)

U1 に UI・フロントエンドは存在しない — plugin は opencode プロセス内のイベントハンドラ+core hooks への subprocess spawn のみで構成され(services.md「新規サービスなし」、components.md C1〜C5 に UI コンポーネントなし)、コンポーネント階層・props/state・フォーム検証の設計対象がない。本ファイルは CONDITIONAL 成果物の該当なし宣言(FDQ-5 回答、E-OC1 承認 2026-07-17T00:11:22Z)。

## ユーザー可視面の代替(出力契約)

UI の代わりにユーザーが観測するのは stderr のみ(ui-less-mockups-as-output-contract の類推):

- 失敗経路の stderr 記録様式は cursor アダプタの既習様式に揃え、新規発明しない(AC-2a 同型)
- stderr は advisory であり opencode の表示・動作を変更しない(business-rules R-1/R-8)
