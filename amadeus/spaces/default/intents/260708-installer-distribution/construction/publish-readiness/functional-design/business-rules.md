# Business Rules — publish-readiness

> ステージ: functional-design (3.1) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-001/015/017/018)、team.md Mandated(落ちる実証)、project.md 是正事項 c4

| ID | ルール |
|----|--------|
| BR-P01 | pack 検証は実ツール(`npm pack --dry-run --json`)の出力に対して行う。シミュレーション・ハードコード済み期待値の自己参照比較は禁止(検証劇場 — team.md Forbidden) |
| BR-P02 | 同梱物契約は `PackContract.current()` の単一定義から導出する。`package.json` `files`(TS を import 不能な静的 JSON)との同期は**ドリフトテスト**で機械的に強制し、手書き複製の放置を CI が検出する |
| BR-P03 | 契約は不足(missing)と混入(unexpected)の両方向を検出する |
| BR-P04 | pack 契約テストは既存 `tests/run-tests.sh` の CI プロファイルに含め、常時実行する(新規 CI ジョブ・ランナーを作らない) |
| BR-P05 | 完成条件に「落ちる実証」を含む: 契約違反を注入してテストが赤くなることを実証してから完成扱い(team.md Mandated) |
| BR-P06 | setup の version は 0.1.0 起点の独立 semver。バンプは publish する PR で行い、framework の CHANGELOG/t68/タグ同期の対象外(FR-017) |
| BR-P07 | プレリリースは `X.Y.Z-rc.N` + dist-tag `next` のみ。`latest` には安定版のみ(FR-015) |
| BR-P08 | publish は手動。CI 自動 publish・provenance は導入しない(CON-004) |
| BR-P09 | `packages/setup/package.json` は root の I1/I2 不備を継承しない。root 自体の是正は**公開前必須だが実施 Unit は U5**(ユーザー可視 PR にバンプ/CHANGELOG と同乗 — business-logic-model ワークフロー3のシーケンス参照) |
