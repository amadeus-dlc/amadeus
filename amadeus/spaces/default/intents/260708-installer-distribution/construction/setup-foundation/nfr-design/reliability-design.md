# Reliability Design — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-F01〜F05)、`../functional-design/business-logic-model.md`

## REL-F01(失敗時ファイル無変更)の実装構造

- U1 のモジュール(resolver/fetcher/manifest)は**対象プロジェクトへの書き込み API を持たない**(FsOps ポートのうち書き込み系は applier にのみ注入される — 構造的保証)
- fetcher の書き込み先は一時領域のみ(SEC-F03 の mkdtemp 配下)

## REL-F02(リトライ境界)の実装構造

- リトライは fetcher 内の**単一の再試行ブロック**(ループではなく明示的な2回目試行)。`e.isTransient()` の判別ユニオン網羅は switch+never 検査で型レベル担保

## REL-F05(Windows 安全タイムスタンプ)の実装構造

- `Timestamps.of(now: Date)` が `{ iso: string, token: string }` の**対を一度に生成**する内部ユーティリティを planner に提供(U2 の Plan.startedAtIso / backupTimestamp の供給源)。2表現を別々の時刻から作る事故を構造的に防ぐ
- token 生成は `iso.replace(/[-:]/g, "").replace(/\.\d+/, "")` 相当の純関数+Windows 予約文字不含のユニットテスト(REL-F05 検証)
