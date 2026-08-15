# Functional Design — Questions(unit config-visibility)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: `solo-election.trigger.mode` の廃止(置換先を持たない廃止)を既存の `LEGACY_KEY_REPLACEMENTS` 機構でどう表現するか

- A. `AMADEUS_CONFIG_REGISTRY`(`amadeus-config.ts:583-665`)から `solo-election.trigger.mode` のエントリ(:602-613)を削除し `AmadeusConfigKey` union(:63-71)からも除く。その上で `LEGACY_KEY_REPLACEMENTS`(:667-673)を構築する `entry.legacy` 由来の自動収集に加え、**置換先を持たない廃止**用のエントリを "solo-election.trigger.mode" 自身と既存 legacy alias "auto-solo-election" の両方について追加する。案内メッセージは新しい config パスを名指さず「mode から自動導出されるため設定不要」の旨を `expected` に載せる — `appendUnknownPathIssue`(:701-717)の `replacement.path` が既存の型(`AmadeusConfigKey`)を満たす必要がある実装上の細部(どのプレースホルダー値を使うか)は code-generation への申し送りとする
- X. Other

[Answer]: A(ただし内部型の具体的な扱いは handoff)— ADR-8「`solo-election.trigger.mode` を廃止し mode 導出…旧キーは LEGACY_KEY_REPLACEMENTS 経路(:706-716)再利用の loud fail(新キー名をエラーへ明示・互換シムなし)」。「新キー名をエラーへ明示」は consent 軸2キー(Q2)には字義どおり適用できるが、`solo-election.trigger.mode` 自体には「新キー」が存在しない(mode 由来の導出に統合される)。この非対称は ADR-8 が明示的に扱っておらず、本 FD は「置換先なし廃止」という外部から観測可能な契約(loud fail・案内文言が mode 導出を指す)のみを規定し、`LEGACY_KEY_REPLACEMENTS` の型シグネチャ内部でこれをどう表現するかは code-generation の実装判断に委ねる(brief 指示「新しい設計裁定を発明しない」に従い、ここでは新ルールを追加しない)。

## Q2: consent 軸2キーの改名(`.mode` → `.consent`)は値の語彙も変えるか

- A. 変えない。`manual`/`auto`(mirror・finding とも `off`/`prompt`/`auto` — 実装は `MirrorMode` 型 `parseMode` を再利用)という既存の値語彙はそのまま、**キー名のみ** `intent-mirror.github.issue.mode` → `intent-mirror.github.issue.consent`、`finding.github.issue.creation.mode` → `finding.github.issue.creation.consent` に変更する
- X. Other

[Answer]: A — ADR-8「consent 軸2キーは…へ改名(語彙 manual/auto 不変)」。実装上の値域は現行registry(`amadeus-config.ts:585-592`, `:615-622`)がすでに `MirrorMode`(`off`/`prompt`/`auto`)を使っており、RFC が言う「manual/auto」は概念上の語彙(「人手 vs 自動」の意味)であって型そのものの改変を要求しない — 値パーサ(`parseMode`)は変更しない。

## Q3: `--status`/statusline が表示する実効値は誰の関数を直結するか

- A. C8(本 unit)は独自の判定ロジックを持たず、既存/他 unit の実効判定関数へ直結するだけの薄い集約層とする: 対話性は U2 の `resolveSessionInteractivity`、mode の投影(sanction / gated)は U5/U6 の投影関数(`amadeus-intent-autonomy-production.ts` 等)、mirror/finding の実効 consent は本 unit の C7 が解決した config 値(`resolveAmadeusConfig` の `intentMirror.github.issue.consent`/`finding.github.issue.creation.consent`)をそのまま使う
- X. Other

[Answer]: A — component-methods.md C8「`statusAutonomyFacet(projectDir): {...}` // C3/C5/C6/C7 の実効関数から直結」、FR-8 UI 真実性の契約「表示は実効値のみ」。既存 `renderAutonomyStatus`(`amadeus-utility.ts:352-366`)・`autonomySegment`(`amadeus-lib.ts:5172-5175`)もこの「既存の実効判定関数を素通しで表示する」設計を踏襲しており、C8 は新しい判定基準を作らない。

## Q4: `solo-election.trigger.mode` の実消費者(`amadeus-election.ts:274`、`amadeus-orchestrate.ts:4139`)の改修は本 unit が担うか

- A. 担わない。本 unit の owned files は `amadeus-config.ts` と `--status` ハンドラ・statusline hook のみ(unit-of-work.md)。上記2消費者は config leaf の削除に追随して `deriveSoloElectionTrigger(mode)`(C7 の新設純関数)を呼ぶよう改修される必要があるが、そのファイルはどの unit の owned files にも列挙されていない — 本 FD はこれを upstream の欠落として報告するに留め、当該ファイルには一切書込まない
- X. Other

[Answer]: A(報告のみ、修正しない)— brief の rule「Do NOT touch any path outside your assigned unit dirs」+「report, do not fix」。詳細は本 unit の最終報告(親エージェントへの応答)に記載する。
