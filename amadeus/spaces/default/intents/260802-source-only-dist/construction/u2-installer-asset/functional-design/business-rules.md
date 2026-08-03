# Business Rules — u2-installer-asset

上流入力(consumes 全数): requirements(FR-2.1〜2.5)、component-methods(C2 契約)、components(C2)、unit-of-work(u2 = FR-2 対応、u1→u2 統合点)、unit-of-work-story-map(Slice 1 出荷判定)、services(fail-closed 契約表と実測ホスト)。

## ルール一覧

- **BR-U2-1(版境界の純粋関数)**: 経路判定は `semverGte(version, ASSET_INTRO_VERSION)` のみ。ネットワーク状態・asset 有無 probe を判定に使わない(G7 — silent fallback の構造的排除)
- **BR-U2-2(fail-closed 3面)**: 新版の asset 404 / checksum 不一致 / SHA256SUMS 欠落はすべて typed error で停止。codeload への黙った降格を実装しない(検証: 3面それぞれの落ちる実証テスト)
- **BR-U2-3(locate 2段 fallback)**: `wrapper/dist/<harness>`(codeload 形 — payload-factory.ts:38,:57)→ `wrapper/<harness>`(asset 形)の2段のみ。第3の探索を足さない
- **BR-U2-4(ALLOWED_HOSTS 最小拡張)**: 追加は `github.com` と `release-assets.githubusercontent.com` の2ホスト(ADR-A4)。ワイルドカード禁止。redirect 検査(:79)・MAX_REDIRECTS=5(:7)は不変。実装時に自リポ実 asset で Location ホストを再実測し、相違があれば設計へ差し戻す(再実測条項)
- **BR-U2-5(旧版 byte 不変)**: `< ASSET_INTRO_VERSION` の経路は現行コードパスを変更しない。既存テスト(setup-installation / setup-resolved-version / setup-http)は無改修で green を維持
- **BR-U2-6(ADR-003 改訂)**: resolved-version-factory.ts:4 のコメントを二経路契約へ書き換え、decisions.md ADR-A1 を正本として参照する
- **BR-U2-7(fixture の契約源)**: 単体テストの asset fixture は ADR-A2 の tar 契約(単一トップディレクトリ・SHA256SUMS 書式・manifest schema 1)から機械生成し、手書き fixture の独立進化を作らない。E2E は u1 の draft release 実物(Slice 1)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U2-1 | FR-2.1/2.2 / 受け入れ「経路判定が導入バージョン定数の純粋関数」(G7) |
| BR-U2-2 | FR-2.1 / 受け入れ「asset 欠落・checksum 不一致は fail closed」+ NFR-3 |
| BR-U2-3 | FR-2.1(G6 の wrapper 契約消費側) |
| BR-U2-4 | FR-2.3 / A-1(実装時実測) |
| BR-U2-5 | FR-2.2 / 受け入れ「既存バージョン指定が codeload フォールバックで動作」 |
| BR-U2-6 | FR-2.4(ADR-003 改訂) |
| BR-U2-2 の役割分担面 | FR-2.5(checksum = 転送破損検出、改竄耐性 = HTTPS + host allowlist — ADR-A9 を正本に BLM で明記) |
| BR-U2-7 | Slice 1 出荷判定(G10)+ u1→u2 統合点 |
