# Unit of Work Dependency — 260802-source-only-dist

上流入力(consumes 全数): component-dependency(C1〜C9 依存グラフ — 本 DAG の導出元)、components / component-methods(Unit 境界の実体)、decisions(ADR-A8 の原子切替 = u8 統合の根拠)、services(u1/u2 の外部境界順序)、requirements(移行順序 0→6 の制約)。

## Unit DAG(parseBoltDag 用 edge block)

```yaml
units:
  - name: u1-asset-build
    depends_on: []
  - name: u2-installer-asset
    depends_on: [u1-asset-build]
  - name: u3-scope-promotion
    depends_on: []
  - name: u4-hook-dispatcher
    depends_on: []
  - name: u5-agents-import
    depends_on: []
  - name: u6-allowlist-canonical
    depends_on: []
  - name: u7-ci-stage1
    depends_on: []
  - name: u8-source-only-switch
    depends_on: [u2-installer-asset, u3-scope-promotion, u4-hook-dispatcher, u5-agents-import, u6-allowlist-canonical, u7-ci-stage1]
  - name: u9-docs-norms
    depends_on: [u8-source-only-switch]
```

テキストフォールバック: u1 → u2 →(u3, u4, u5, u6, u7 と合流)→ u8 → u9。u3〜u7 は根から独立(並行可能)。

## 統合点(contracts)

- **u1 → u2**: ADR-A2 の asset レイアウト契約(単一トップディレクトリ直下にハーネス群)+ SHA256SUMS 書式 + manifest schema。u2 の fixture はこの契約から機械生成し、E2E は u1 の draft release 実物で閉じる(G10 skeleton)
- **u2 → u8**: 追跡除外は installer の asset 経路が本番で機能していることが前提(requirements Constraints — 逆順は installer 決定的破壊)
- **u3 → u8**: scope 正本昇格なしの追跡除外は self-* scope の恒久喪失
- **u4/u5 → u8**: bootstrap 両循環の解消なしにフック実体・suffix を未追跡化するとフレッシュクローンが壊れる
- **u6 → u8**: u8 の `.gitignore` 反転は allowlist 正本(u6)から導出した期待値と整合テストで突合される
- **u7 → u8**: 旧 check の撤去(u8)は再現性検査(u7 で並存導入済み)が後継として稼働していることが前提(ADR-A8 の空白防止)
- **u5 ⇔ u8 の共有ファイル**: 両者とも `scripts/promote-self.ts` を変更する(u5 = composeRootAgents 廃止、u8 = check 再責務化)。DAG 依存はないが Bolt 編成で直列化するか実 diff の非交差を確認する(c6)
- **u8 → u9**: 文書・ノルムは切替後の実態を記述する

## 移行順序との対応

requirements の移行順序 0→6 は DAG 上で 0=u3、1=u1、2=u2、3=u4/u5/u7(+u6)、4=u2 の受け入れ検証、5=u8、6=u9 に対応する。順序の安全性(installer 先行・追跡除外後置)は u8 の depends_on 全数で構造的に強制される。
