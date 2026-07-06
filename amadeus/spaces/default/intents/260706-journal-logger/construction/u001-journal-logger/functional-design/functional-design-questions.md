# Functional Design Questions — u001-journal-logger

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

設計の大枠は feasibility（4 問）と requirements（FR-1〜5）で確定済み。実装細部 3 問を自己判断（理由付き。記録先 = 本ステージの memory.md Deviations 欄）で確定する。

## Q1. validator の journal 検査の実装位置

- A. AmadeusValidator.ts の checkSpaceLayers() へ追加する（journal は space レベル成果物であり、memory / knowledge / codekb の存在検査と同じ呼び出し点。intentId なしの既定起動でも必ず実行される）。journal/ は optional 扱い（checkOptionalDirectory 系 = 存在する場合のみ構造検査。amadeus-validator は全 workspace 配布のため、未導入 workspace を fail させない）
- B. lifecycle-v2.ts へ追加（record スコープのため space 成果物に届かず、intentId 指定時しか走らない = 不適）
- C. その他
- X. Other (please specify)

[Answer]: A。当初 B（lifecycle-v2.ts）を自己判断したが、reviewer iteration 1 が実装実測で反証: space 成果物検査は AmadeusValidator.ts::checkSpaceLayers()（L268〜、無条件実行）にあり、lifecycle-v2.ts は record スコープ専用で journal に届かない（既定起動で検査が走らず FR-2 が空文になる）。指摘どおり checkSpaceLayers へ配置し、optional 扱い（未導入 workspace を壊さない = 配布互換）も反映して確定。

## Q2. eval の形

- A. dev-scripts/evals/journal-contract/check.ts を新設: 隔離 workspace に「正しい journal（FR-4 の実移行データのコピー）」と「壊した journal（フィールド欠落・語彙外種別・命名違反の 3 変異）」を置き、validator 実 CLI を起動して pass / fail を検査（RED 確認 = 実装前に fail 変異が pass してしまうことを確認）
- B. 単体関数テストのみ
- C. その他
- X. Other (please specify)

[Answer]: A（隔離 workspace + 実 CLI + 実データ fixture + 変異 3 種）。Testing Posture（実 CLI 起動・エンジン実出力形）と bolt-plan の #458 型回避設計のとおり。自己判断（理由付き）。

## Q3. 手順書とチェックリストの配置（reviewer iteration 1 指摘 2 による明示化）

- A. `amadeus/spaces/default/knowledge/` に置く（journal-logger-runbook.md / journal-logger-verification-checklist.md）。gate 承認済み FR-2.1 の閉列挙（journal/ 直下は README.md と <YYMMDD>.md のみ）を変更しない
- B. journal/ 配下に logger-*.md として置く（FR-2.1 を 3 種列挙へ変更する必要が生じ、承認済み要求の変更になる）
- C. その他
- X. Other (please specify)

[Answer]: A（knowledge/ 配置）。当初 B を暗黙に選び FR-2.1 を無断で 3 種へ拡張していた（reviewer が承認済み契約の無断変更として blocking 指摘）。上流は配置を指定しておらず、knowledge/ は free-form のチーム知識置き場（workspace-scaffold の規定）で運用手順書の置き場として適合する。FR-2.1 は承認どおり 2 種列挙を維持。journal/README.md から knowledge/ の 2 文書へリンクする。
