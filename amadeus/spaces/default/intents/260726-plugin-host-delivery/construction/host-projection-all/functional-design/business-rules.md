# Business Rules — U3 host-projection-all

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U3-1(単一正本)**: 全対応面の投影は中立正本 1 つから派生し、面別テンプレの手書き複製を作らない(ADR-5 / components.md Reuse Inventory。検証: 正本変更 1 箇所 → 全面投影へ反映のテスト)
- **BR-U3-2(マトリクス駆動)**: 投影対象面とクラスは U1 マトリクスの機械可読列挙(BR-U1-7)からの転記のみ。FD・実装での面の追加/除外判断を禁止(検証: spec 構成関数が U1 列挙を入力に取ること)
- **BR-U3-3(拒否集合)**: OutDirRefusal 5 ケースは mutation 前(plan 段)で拒否し、生 stack を出さない。真正な先行投影のみ上書き可(上流 t188 #27-32 と 1:1 — requirements FR-2 合否。検証: 6 ケースの fixture 対照テスト)
- **BR-U3-4(0-plugin byte-identical)**: 0-plugin build の dist ツリーは現行 baseline と byte-identical(検証: hash 比較 — U2 の claude 面検証を全面へ拡張)
- **BR-U3-5(--check 対称)**: 投影(write)と検査(check)は同一の hash 判定を共有し、stale / orphan の両方向を検出する(write⇔check の対称性 — symmetric-pair-review。検証: stale fixture / orphan fixture の両側で --check 赤)
- **BR-U3-6(未実測面の非確約)**: U1 で deferred のセルに依存する投影(marketplace metadata 等)は生成対象から除外し degrade 契約へ落とす(external-seam-vocab-measurement。検証: deferred 面の投影出力に当該成果物が無いこと)
- **BR-U3-7(drift ガード編入)**: 新投影面は dist:check / promote:self:check の守備範囲に入り、CI で drift が赤になる(project.md Mandated。検証: 投影物の手編集 fixture で --check 赤 — 落ちる実証)
- **BR-U3-8(部分失敗 loud)**: 面単位の投影失敗は失敗面の列挙+exit 非 0(検証: 1 面失敗 fixture で他面成功でも exit 非 0+失敗面名の出力 assert)

## 検証への trace

BR-U3-3/5/7 は落ちる実証必須(注入はテストが読む面へ — injection-surface-verify)。BR-U3-4 は U7 適合テスト(t188 対応)と共有。数値・件数はコマンド出力転記のみ。
