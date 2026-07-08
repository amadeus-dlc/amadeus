# Reliability Design — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-F01〜F05)・`tech-stack-decisions.md`(標準 API 構成)、`../functional-design/business-logic-model.md`

## REL-F01(失敗時ファイル無変更)の実装構造

REL-F01 の原文範囲(nfr-requirements)は **resolver / fetcher の失敗時**であり、実装構造は範囲を正確に分けて保証する:

- **resolver / fetcher**: 対象プロジェクトへの書き込み API を一切持たない。resolver は FsWrite を注入されず、fetcher の FsWrite は **`TmpWrite`(mkdtemp 配下限定の書き込みポート)** — 対象プロジェクトのパスを受け取れない(構造的保証)
- **manifest-io**: 対象プロジェクト配下の**マニフェスト1ファイルのみ**を書く正当な書き込み保持者(FR-016 — U1 所有)。ただし cli のオーケストレーションが `manifestIo.write` を呼ぶのは **applier 成功後のみ**(U2 workflow 2 の順序契約)であり、resolver/fetcher の失敗経路では write に到達しない — REL-F01 は「到達順序」で守られ、書き込み能力の有無とは別の機構である
- 旧記述(「U1 モジュールは書き込み API を持たない」)は manifest-io を含めると偽になるため撤回し、上記の2段構えに置換する

## REL-F02(リトライ境界)の実装構造

- リトライは fetcher 内の**単一の再試行ブロック**(ループではなく明示的な2回目試行)。`e.isTransient()` の判別ユニオン網羅は switch+never 検査で型レベル担保

## REL-F05(Windows 安全タイムスタンプ)の実装構造(tech-stack-decisions の標準 API 方針に従う)

- `Timestamps.of(now: Date)` が `{ iso: string, token: string }` の**対を一度に生成**する内部ユーティリティを planner に提供(U2 の Plan.startedAtIso / backupTimestamp の供給源)。2表現を別々の時刻から作る事故を構造的に防ぐ
- token 生成は `iso.replace(/[-:]/g, "").replace(/\.\d+/, "")` 相当の純関数+Windows 予約文字不含のユニットテスト(REL-F05 検証)
