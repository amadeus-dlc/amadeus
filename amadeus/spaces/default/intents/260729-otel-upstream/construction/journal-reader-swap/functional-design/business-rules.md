# Business Rules — U6: journal-reader-swap

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: doctor／recovery／presence／grant／merge／runtime graph／learnings の7 tool はすべて共通 reader（U3 の Journal Module）経由でのみ Journal を読む。tool 内に旧 v1 reader の直接呼出しを残さない（FR-JRN-4）
- BR-2: reader 差替えはユーザーから不可視とする。各 tool の CLI 出力・終了コード・エラーメッセージ形式を差替え前後で変更しない（FR-JRN-4 の「読む」挙動の維持）
- BR-3: 既存テストスイートは変更せず pass すること。差替えのために既存テストの修正が必要になった場合は設計不備として差替えをやり直す（FR-JRN-4 の互換性の検証手段）
- BR-4: 共通 reader は v1／v2 両 schema を受理する。判別不能な schema version の行は silently skip せず、判別可能なエラーとして呼出し側へ返す（FR-JRN-2、FR-JRN-4）
- BR-5: mixed-version shard の merge 結果は、同一内容を v1-only で読んだ場合と event 集合・順序（clone-local sequence による整列）で意味的に同等とする（FR-JRN-2、FR-JRN-4）
- BR-6: rollback は tool 単位で独立に行える。ある tool の差替え撤回が他 tool の差替え済み経路に波及しないよう、tool 間で reader 差替え状態を共有する仕組みを持たない。撤回手段は git revert と差替え前 backup に限定する（FR-JRN-4、FR-MIG-2 の rollback 方針と整合）
- BR-7: v1 reader 削除後は v2-only で動作する。本 Unit は削除自体は行わないが、v1 codec 非搭載構成での v2-only 動作をテストで証明する（FR-JRN-4 後段、FR-MIG-5 との接続）
- BR-15: 各 tool が読み取る event の受理集合は差替え前後で同一とする。reader が理解する event 集合は Registry 登録語彙と一致させ、tool 独自のフィルタ解釈を reader 層へ移さない（FR-EVT-1 の4集合一致のうち「Journal reader 理解集合」と整合）
- BR-16: runtime graph は v1 record の相関 ID 欠損時に edge を推測・合成しない。欠損 record は相関なし node として表現する（FR-TRC-6 の事後推測排除と整合、BR-8 の特例）
- BR-17: 変更は正本 `packages/framework/core/` のみに行い、package/promote で全 harness 生成面へ同期して drift guard を通す。`amadeus-lib.ts` には追加しない（FR-DST-2、VER-6、unit-of-work.md 実装上の共通制約）

## 検証ルール

- BR-11: 各 tool の差替えは、v1-only／v2-only／mixed-version の3種 fixture に対する出力同一性テストで検証する。fixture 網羅なしに差替えを完了とみなさない（FR-JRN-2、FR-JRN-4）
- BR-12: doctor／recovery／merge の3 tool は FR-MIG-4(a) の削除ゲート条件の検証主体であり、mixed Journal での動作証明を機械可読な形で残す（FR-JRN-4、FR-MIG-4 への接続）
- BR-13: 差替え期間中も恒久 dual-read を導入しない。新旧 reader の並行参照は同一性検証テスト内に限定し、本番経路は共通 reader に一本化する（FR-MIG-1 の恒久 dual-write/dual-read 禁止と整合）
- BR-14: reader のエラーハンドリングは team-practices の既定どおり、ドメイン境界は判別ユニオン Result、CLI 境界は emitError とし、不変条件違反のみ例外とする（component-methods.md のエラーハンドリング方針を本 Unit の読取経路にも適用）
- BR-21: 全 harness 生成面への同期は distribution tests で検証し、これを Unit の完了条件に含める（VER-6、unit-of-work-story-map.md 横断要件どおり）
- BR-22: 各 tool の差替え完了には rollback 検証（当該 tool のみ revert した構成で残 tool が全 pass）を含める。rollback 手順の未検証な差替えを完了とみなさない（BR-6 の検証面）

## 条件付き振る舞い

- BR-8: v1 record の正規化時、v2 にのみ存在する属性（trace/span IDs・idempotency key・canonical marker 等、FR-JRN-1 のフィールド）は欠損を許容し、tool はこれらを必須属性として扱ってはならない（混在期間の後方互換。FR-JRN-2/4）
- BR-9: reader は読取専用とし、health 確認・version 判別のための書き込み probe を行わない（FR-EVT-5 の probe 非破壊性と整合）
- BR-10: 差替え後も Journal の物理配置（per-clone shard、mkdir lock）は変更しない。Exporter 層・writer 側の構造に本 Unit は触れない（services.md スケーリング特性、components.md の境界）
- BR-18: v2-only 構成（v1 codec 非搭載）で v1 shard に遭遇した場合は、silently skip せず判別可能なエラーとする。retention 未達の v1 shard を見落とさないための防御（BR-4、BR-7 の補完）
- BR-19: 対象 shard が存在しない場合（新規 intent・初期状態）は空集合を正常系として返し、エラーにしない。tool 側の従来挙動と一致させる（BR-2 の不可視性）
- BR-20: 各 tool の公開 CLI Interface（サブコマンド・引数・オプション名）は差替えで変更しない。変更が必要な場合は本 Unit の範囲外として差し戻す（FR-JRN-4 は reader の差替えのみを要求）

## 要件カバレッジ

- FR-JRN-4（所有要件）: BR-1〜BR-20 全体でカバー。共通 reader 経由の v1/v2 読取（BR-1/4/5/8）、v1 reader 削除後の v2-only 動作（BR-7/18）、7 tool 各々の差替えと検証（BR-2/3/11/12/20）
- 検証手順の実体は business-logic-model.md の検証フロー（テスト先行6ステップ）に、データ構造の根拠は domain-entities.md にそれぞれ置く
- 接続要件（他 Unit 所有、整合のみ）: FR-JRN-1/2（U3 の reader・codec の利用）、FR-EVT-1/5、FR-TRC-6、FR-MIG-1/2/4/5、FR-DST-2、VER-6 は引用ルールのトレース先どおり
