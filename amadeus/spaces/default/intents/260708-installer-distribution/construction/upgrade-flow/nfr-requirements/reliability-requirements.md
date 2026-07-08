# Reliability Requirements — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-U01〜U16)、requirements NFR-002/003、U2 REL-I01〜I04(継承)

## REL-U01: 退避→コピーの順序保証(NFR-002 の中核)

backup-then-copy エントリは、**ファイル単位で退避の完了(rename の成功)を確認してから**新内容のコピーを開始する。退避失敗時はそのファイルのコピーを行わず ApplyFailure とする — 「退避できなかったのに上書きした」経路を構造的に排除する。

- 検証: 退避を失敗させる fault-injection テスト(書き込み不能な .bk パス)で、元ファイルが無傷であることをアサート(落ちる実証)

## REL-U02: 境界ケースの無変更保証

already-up-to-date / downgrade / installed-newer / no-installation / unsupported-layout / partial-refused の6経路すべてで、ファイルシステムへの書き込みがゼロであることをテストで検証(FR-005 受け入れ基準の「無変更」を fs スナップショット比較でアサート)。

## REL-U03: 部分失敗からの回復経路

apply 部分失敗 → マニフェスト未更新(BR-U15)→ 次回 detect が partial → `--force` 再実行で保守的続行(partial-forced)。この回復ループを integration テストで一周させて検証する。

## REL-U04: 継承事項

U2 の REL-I03(レポートと実適用の一致)・REL-I04(終了コード)を upgrade 経路に適用。already-up-to-date の終了コード 0(BR-U01)を含めて全経路をアサート。
