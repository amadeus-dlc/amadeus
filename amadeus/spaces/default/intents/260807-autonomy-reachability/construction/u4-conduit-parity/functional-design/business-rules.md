# Business Rules — u4-conduit-parity

上流入力(consumes 全数): requirements.md(FR-5 の規則化)、components.md(C6/C7 境界)、component-methods.md(検査契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(物語保証)、services.md(read-only 契約)。

## 規則

- **BR-U4-1(面の全数)**: 導線追記は harness 面(glob discover)+固定4面(help/README/docs 対訳/stage-protocol)の全数に対して行う。片面残しはパリティテストが赤で検出
- **BR-U4-2(u2 仕様の記載)**: 起動宣言の記載内容は u2 の確定仕様(scope 名指し形・ask 経路 loud 拒否・full の儀式待ち停止)と一致させる — 実装と異なる手順を書かない(citation-semantics)
- **BR-U4-3(semi 手順段落)**: stage-protocol の semi decide-question 段落は :131 の契約と :135 の full 段落に整合し、carrier 様式・fail-closed 分岐・AUTO_DECIDED 記録・milestone 検収提示を含む
- **BR-U4-4(count-free)**: テスト・文書とも面の件数語を持たない(glob discover+固定パス列挙のみ — count-comment-sync 対策)
- **BR-U4-5(空集合 fail-closed)**: glob 0件は赤(検査の無音空文化防止)
- **BR-U4-6(落ちる実証)**: 完成条件は「全面 Green」+「1面の語彙除去で赤の実測 → 復元 → 残渣ゼロ確認」の1セット(falling-proof-injection-one-set)
- **BR-U4-7(対訳同時)**: docs/reference/24 は日英を同一変更で更新(docs-language-ownership)
- **BR-U4-8(:248 整合)**: 「AUTONOMY IS NEVER INFERRED」の趣旨(会話からの推論禁止)を保ったまま、canonical audit 記録済み mode の自動裁定を明示的に区別する — 既存原則の削除・弱体化はしない

## 受け入れ基準への写像

| BR | FR | 検証形 |
|---|---|---|
| BR-U4-1/4/5 | FR-5a/5b/5d | パリティテスト(blocking) |
| BR-U4-2 | FR-5a(内容正確性) | reviewer の u2 FD 突合 |
| BR-U4-3 | FR-5c | stage-protocol の共起 assert+reviewer 実読 |
| BR-U4-6 | FR-5d(落ちる実証) | 赤の実測記録(code-summary) |
| BR-U4-7 | FR-5b | 対訳2ファイルの同一 PR 内更新 |
| BR-U4-8 | FR-5c(:248) | reviewer 実読 |
