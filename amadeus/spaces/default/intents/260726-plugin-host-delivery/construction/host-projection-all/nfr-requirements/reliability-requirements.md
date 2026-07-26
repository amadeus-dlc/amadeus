# 信頼性要件 — U3 host-projection-all

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 信頼性の中核契約

U3 の信頼性は 3 つの決定的 file 契約に還元される — (1) 0-plugin byte-identical、(2) write⇔check 対称、(3) 部分失敗 loud。いずれも `business-rules.md` の BR と 1:1 で、`technology-stack.md` 実測の `scripts/package.ts --check` の byte 比較(`MISSING` / `DIFFERS` / `ORPHAN`)機構を土台とする。常駐サービスの可用性 SLO ではなく、決定的な fail-closed 契約として表現する。

## REL-U3-1: 0-plugin byte-identical(BR-U3-4)

`business-rules.md` BR-U3-4 のとおり、0-plugin build の dist ツリーは現行 baseline と byte-identical でなければならない。`requirements.md` FR-2 の第 2 合否と対応し、`business-logic-model.md` フロー 1 末尾の「0-plugin 時は全セクション no-op」が実装契機。

- 合否: 0-plugin build 出力を現行 baseline と hash 比較して byte-identical(U2 の claude 面検証を全面へ拡張 — BR-U3-4)。この検証は U7 適合テスト(t188 対応)と共有する

## REL-U3-2: write⇔check 対称(BR-U3-5)

`business-rules.md` BR-U3-5 のとおり、投影(write)と検査(check)は同一 hash 判定を共有し、stale/orphan の両方向を検出する(symmetric-pair-review)。`business-logic-model.md` フロー 2 の `DriftEntry[]` がこの対称の実体。

- 合否(落ちる実証): stale fixture(正本変更後に再投影せず)と orphan fixture(対応正本の無い投影物)の両側で `--check` が赤になる
- 合否(drift ガード編入 — BR-U3-7): 新投影面が `dist:check` / `promote:self:check` の守備範囲に入り、投影物の手編集 fixture で CI が赤になる(project.md Mandated・落ちる実証)

## REL-U3-3: 部分失敗 loud(BR-U3-8)

`business-rules.md` BR-U3-8 と `business-logic-model.md` エラー処理のとおり、面単位の投影失敗はサイレントに継続せず、失敗面を列挙して exit 非 0 で終える(construction.md「サイレントな失敗は許容しない」)。

- 合否: 1 面が失敗する fixture で、他面が成功しても exit 非 0 となり、失敗面名が出力される(部分成功の無音継続禁止)

## REL-U3-4: アトミック性(既存契約の維持)

`requirements.md` NFR-1 と FR-6 のアトミック性契約(compose 途中失敗時に host bytes / composition record / audit が不変)を、U3 の投影が退行させない。投影は既存 engine のアトミック commit/recovery 経路を壊さない。

- 合否: 投影中の I/O 失敗後もホストツリーが中間状態で残らない(plan 段で拒否 → mutation の順序 — BR-U3-3 と連動)。既存 t253 系のアトミック性テストが green を維持

## 非該当カテゴリ(N/A + 根拠)

- 可用性 SLO / MTTR / フェイルオーバー: N/A。U3 はビルド時単発ツールで常駐 service ではない(technology-stack.md 実測)。信頼性は決定的 file 契約(byte-identical・fail-closed exit)へ置換される
- リトライ / サーキットブレーカー: N/A。ビルド失敗は即時 loud fail(REL-U3-3)で開発者へ返し、自動リトライ層を持たない
