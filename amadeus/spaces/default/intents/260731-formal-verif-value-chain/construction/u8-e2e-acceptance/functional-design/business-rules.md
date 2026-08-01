# Business Rules — u8-e2e-acceptance

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U8-1: TDD 適用外+実測必須

u8 は検証 Unit で新規挙動を追加しない(glue 修正は各修正先の TDD 規律に従う)。検証形は S1〜S3 の実測貫通(two-layer-verification-posture の e2e 面 — 対象契約は component-methods.md C4/C5/C8、価値対応は unit-of-work-story-map.md のジャーニー表)。

## BR-U8-2: audit 証跡の verbatim 転記

実測記録への audit イベント転記は seq 番号付き verbatim(要約・改変禁止)。測定 ref(HEAD SHA)を明記(measurement-ref-in-artifacts)。

## BR-U8-3: 発見不具合の3値判定

S4 の発見は (i) FR 範囲内の glue → u8 で修正 (ii) 新機能・仕様変更 → Issue 起票+ユーザー裁定 (iii) 既知 Won't(#1838 実装等)→ 記録のみ。判定に迷えばエスカレーション。

## BR-U8-4: 検証コマンド集合

BR-U1-6 と同一(glue 修正がある場合)+S1〜S3 の実測記録の実在。
