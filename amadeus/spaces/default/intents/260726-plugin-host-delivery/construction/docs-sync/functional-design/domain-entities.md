# Domain Entities — U8 docs-sync

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U8 行(C8 — components.md の C8「docs 同期」行と C1-C9 対応表が本 Unit の責務境界の正)。文書 Unit のため「エンティティ」= docs の構造契約。UI なし(services.md — frontend-components.md 非該当につき不生成)。

## DocsTarget(更新対象の全数)

| 対象 | 言語 | 更新内容 |
|---|---|---|
| `docs/guide/19-plugins.md` | 英語 | install / doctor / drop の実装後手順、ハーネス別クラス(ADR-4 正準 3 値)と degrade 契約、`--single` 撤廃後の formal-model-check 起動法 |
| `docs/guide/19-plugins.ja.md` | 日本語 | 同上(対訳同期 — 内容差ゼロ) |

追加対象の要否(reference 系 — 例: docs/reference のプラグイン機構章)は実装後の対象語彙 repo 全域 grep で棚卸しして確定する(enumeration-completeness-review 追補 — docs/ 起点の列挙は正本知識ファイルを見逃す)。

## DocsSection(19-plugins の必須節構成)

| 節 | 内容源(転記元) |
|---|---|
| インストール(ハーネス別) | U1 マトリクスの確定クラス+**U2(claude 面の投影 — walking skeleton で先行着地)**+U3 投影レイアウト(残面)(component-methods.md C3) |
| 自動 compose | **U2(claude SessionStart 配線)**+U4 の残面配線一覧+degrade 契約(manual-only / deferred 面の手動手順) |
| doctor | U5 の DoctorLine 表示規約(component-methods.md C5 の行形式) |
| drop / baseline 復元 | U2 フロー 3 |
| formal-model-check の起動 | U6 の activation policy(ADR-1 案 A — advisory の読み方) |

## 不変条件

- docs 記載のコマンド・パスは実装からの転記のみ(記憶起草禁止 — compilation-stage-source-first)。手順は実行して確認したものだけを載せる(requirements FR-9 合否: docs 参照整合ゲート通過)
- 日英ペアの内容差ゼロ(既存 docs 言語切替リンク検査・legacy-refs ゲートの通過)
- 現行 `19-plugins.ja.md:7`「パッケージャが全ハーネスへ投影し」の記述は、実装後の実態(対応面クラス別)へ置換する
