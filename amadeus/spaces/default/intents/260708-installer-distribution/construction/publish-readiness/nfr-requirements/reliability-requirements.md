# Reliability Requirements — publish-readiness

> ステージ: nfr-requirements (3.2) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-P01〜P05)・`business-logic-model.md`、team.md Mandated(落ちる実証)

## REL-P01: 検証の決定性

pack 契約テストとドリフトテストは**入力(package.json・ビルド成果物)だけに依存する決定的テスト**とする。ネットワーク・レジストリ到達を要しない(`npm pack --dry-run` はローカル完結)— CI のフレーク要因を持ち込まない。

- 検証: 同一コミットでの2回実行が同一結果になることを初回実装時に確認

## REL-P02: 赤の実証(検証劇場の防止)

BR-P05 のとおり、完成条件に失敗注入の実証を含む: (a) `files` から LICENSE を外す → missing 検出、(b) 契約外ファイルを `files` に足す → unexpected 検出、(c) ドリフトテスト — `files` と PackContract の不一致 → 赤。3方向すべての赤を PR 記録に残す。

## REL-P03: 手順書の実行可能性

publish 手順書は「コピペで実行できるコマンド列+期待出力」で書き、曖昧な指示(「適宜確認」等)を含めない。公開後検証(`npx @amadeus-dlc/setup@<version> --help`)まで含めて一本道にする(FR-015)。
