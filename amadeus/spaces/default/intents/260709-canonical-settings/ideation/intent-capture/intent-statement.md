# Intent Statement — canonical-settings

> 出典: GitHub Issue #623「Amadeus 共通設定を型付き canonical settings として定義する」(関連: #622)。明確化質問への回答はエージェント間選挙で確定(`intent-capture-questions.md` 参照)。

## Problem Statement

Amadeus にはプロジェクト/space 単位の機械的設定を置く単一の canonical な場所が存在しない。ステージ/スコープ定義は Markdown+frontmatter、compiled runtime data は JSON、state は Markdown、intent registry は JSON、memory/rules は Markdown と、それぞれの責務に応じた形式は確立している一方で、「interaction mode の表示可否」のような**フレームワーク共通の挙動設定**を置く先がない。

この欠落のまま設定をハーネス別設定(`.claude/settings.json`、`.codex/config.toml`、`.kiro/settings/cli.json`)に置くと、同一の Amadeus 設定が JSON / TOML / 別 JSON の3形式に複製され、ドリフトする。ドリフトは (1) フレームワーク保守者にとってはハーネスを跨いだ整合維持コストと不具合源になり、(2) 導入チームにとっては「どのハーネスで開いても同じ設定が同じ場所にある」体験を壊す。

`Guide me` / `Grill me` などの interaction mode 表示制御(#622)を実装する前に、設定の置き場所・形式・型・読み込み順・既定値・エラー方針を確定する必要がある。

## Target Customer

選挙結果(Q1=C)により、**2つの受益者を対等に扱う**:

1. **フレームワーク開発チーム(保守者)** — Amadeus 共通設定を1形式・1箇所の source of truth として読めるようになり、ハーネス別設定への重複記述と整合維持コストが消える。
2. **amadeus 導入チーム(エンドユーザー)** — どのハーネスを使っても Amadeus の機械的挙動の設定が同じパス・同じ形式・同じ既定値で扱え、設定不備は `--doctor` 系の仕組みで検出できる。

受け入れ条件はこの両視点で立てる(保守者視点: 重複記述ゼロ・型と validation の存在/導入チーム視点: 既定値の明確さ・不備検出の可用性)。

## Success Metrics

Issue #623 の受け入れ条件を測定可能な形で引き継ぐ。検証形態は選挙結果(Q4=A)により**受け入れ条件ごとの自動テスト**とし、doctor 検出は失敗ケース注入による「落ちる実証」まで行う:

- canonical settings のファイルパスと形式が1つに確定している(成果物に明記され、実装がそのパスを読む)
- TypeScript の型と validation が存在し、bun test の自動テストで検証されている
- 設定ファイル不在時の既定値が定義され、テストで検証されている
- エラー方針(未知キー・型不一致・全 interaction mode 無効化)が決まっており、各エラーケースは失敗ケース注入テストで「落ちる実証」済み
- `amadeus --doctor` 等での設定不備検出が動作する、または検出方針が成果物に明記されている(検出実装がある場合は落ちる実証付き)
- Codex / Claude / Kiro のハーネス別設定に同じ Amadeus 設定の重複記述が存在しない
- 後続 Issue #622(interaction mode 表示制御)が canonical settings の上に実装可能である(スキーマに interactionModes が定義済み)

## Initiative Trigger

interaction mode 表示制御(#622)の実装要求が直接のトリガー。表示制御の設定を置く先が未定のまま実装するとハーネス別設定への分散・ドリフトが確定するため、**土台(設定基盤)を先に固める**判断がなされた(Issue #623 起票、2026-07-09 leader からの conductor 依頼)。

## Initial Scope Signal

scope は **feature**(エンジン確定済み)。完了境界は選挙結果(Q2=A)により**設定基盤のみ**:

- 含む: canonical settings のパス・形式・型・validation・既定値・エラー方針・doctor 検出。`interactionModes`(guideMe / grillMe / editFile / chat)はスキーマ上のキー定義と既定値まで
- 含まない: interaction mode 表示制御の消費側実装(#622 に委ねる)
- 既存ハーネス別設定の移行(Q3=A、全会一致): 新規キーのみ canonical に置く。既存項目は**棚卸しのみ**実施し、移行候補は GitHub Issue として起票する(本 intent では移行しない)

**Architect 視点(支援)**: 消費者ゼロの「検証劇場化」リスク(選挙の少数派懸念)は、doctor 検出と validation の自動テストが実消費者になることで緩和されるが、requirements 以降のステージで consumer 配線(誰がいつ settings を読むか)の実在を明示的に扱うこと。また settings の読み込み順・レイヤリングは既存の5層 rule 解決(org → team → project → phase → stage)と混同しない設計整理が必要 — rules は「AI への指針」、canonical settings は「機械的挙動の設定」であり、責務が異なる。
