# Business Rules — upgrade-flow

> ステージ: functional-design (3.1) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-005/007/008/009/016)、`../../setup-foundation/functional-design/business-rules.md`(BR-F 系)、`../../install-flow/functional-design/business-rules.md`(BR-I 系の再利用)

## バージョン境界ルール(FR-005 — UpgradeAssessment が所有)

| ID | ルール |
|----|--------|
| BR-U01 | 導入済み = 解決/要求バージョン → already-up-to-date を報告し無変更・終了コード 0(変更不要は成功) |
| BR-U02 | 要求 < 導入済み → downgrade-unsupported で無変更・終了コード 1 |
| BR-U03 | 導入済み > 既定解決の最新(--version なし)→ installed-newer-than-latest を報告し無変更・終了コード 1 |
| BR-U04 | より新しい版への proceed のときのみ取得・プラン作成へ進む |
| BR-U05 | 境界判定は manifested のときのみ実施。manual-or-unknown / partial-forced は導入版不明のため保守的プランへ直行 |

## 導入状態ルール(FR-005 — UpgradeSource が所有)

| ID | ルール |
|----|--------|
| BR-U06 | 認識可能な導入なし → no-installation で install を案内し無変更終了 |
| BR-U07 | 非対応旧レイアウト → unsupported-layout で無変更終了 |
| BR-U08 | 部分導入 × 非対話 × --force なし → partial-refused で無変更終了。--force ありは partial-forced として保守的続行 |
| BR-U09 | manual-or-unknown 系の `source.dispositionFor` は期待 md5 を持たないため、既存共有ファイルを全件退避してからコピー(保守的既定、FR-008) |

## 処遇・退避ルール(FR-008/009)

| ID | ルール |
|----|--------|
| BR-U10 | Disposition → PlanAction 写像は overwrite→update / backup-then-copy→backup / preserve→skip / 非存在→add に固定 |
| BR-U11 | manifested の処遇判定は `source.dispositionFor` 経由で U1 `manifest.dispositionFor` の呼び出しへ**そのまま委譲**(UpgradeSource がマニフェストを封入し経路のみ提供)— 判定ロジックを二重実装しない。独自判定は委譲先が存在しない manual-or-unknown 系に限定 |
| BR-U12 | `--force` 下でも退避(backup-then-copy)は免除されない(FR-009。NFR-002 のサイレント破壊禁止) |
| BR-U13 | upgrade に conflict アクションは存在しない — 既存ファイルの処遇は Disposition が全決定するため、非対話でもレポート出力後に適用へ進む(FR-010 の中断要件は install 固有) |

## マニフェスト更新ルール(FR-016)

| ID | ルール |
|----|--------|
| BR-U14 | manifested: `manifest.upgradedTo`(イミュータブル更新)で新バージョンへ。manual-or-unknown: `Manifest.build` で初回マニフェスト化 |
| BR-U15 | apply 部分失敗時はマニフェストを更新しない(次回 detect が partial を検出する — U2 BR 同等) |
| BR-U16 | 新期待 md5 は配布物側内容からプラン時に計算(PlanEntry.md5 — U2 と同一規約) |
