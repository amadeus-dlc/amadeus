# Decisions(ADR)— grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6) / **Depth**: Standard(ADR 3件)

上流入力(consumes 全数): `requirements.md`(FR-PROTO-1 の「行範囲 or マーカー」委譲と FR-CONTRACT-4 のマーカー定義委譲 — 本書 ADR-1/2 の入力)、codekb `architecture.md`(センサー advisory 契約 — ADR-3 の実装位置判断の前提)、codekb `component-inventory.md`(既存マーカー慣行・行ピン stale 前例の出典)。

## ADR-1: 骨格ブロックの識別は begin/end マーカー方式

- **Context**: FR-PROTO-1 は骨格(上流ピン原文 1872 bytes)の機械抽出可能な配置を要求し、識別手段(行範囲 or マーカー)を設計へ委譲した。抽出は受け入れ基準の diff 照合と将来の上流再同期(NFR-3)の両方が使う。
- **Decision**: 骨格ブロックを `<!-- amadeus-grilling-skeleton:begin upstream=1495d014303e041c51c29f9e442485ba06f5878d -->` / `<!-- amadeus-grilling-skeleton:end -->` の対マーカーで囲む。抽出 = マーカー間テキストの機械切り出し(protocol 内に手順を自己記述、FR-PROTO-1)。
- **Consequences**: 行番号に依存しないため overlay の増減で抽出が壊れない。begin マーカーが上流 SHA を運ぶため FR-PROTO-2 の帰属とも一貫。マーカー自体は骨格外(HTML コメント)なので byte 照合を汚さない。
- **Alternatives Rejected**: (a) 行範囲指定 — overlay 編集のたびにシフトし stale 化する(coverage allowlist の行ピン stale が実測前例: cid:code-generation:allowlist-line-pin-stale)。 (b) 骨格を別ファイルに分離 — 配布面が1ファイル増え、t199/投影・スキルからの参照が2ファイル参照になる。protocol は「単一ファイルが規律の正本」という現行契約(stage-protocol Step 3d が同一ディレクトリの1ファイルを指す)を崩す。

## ADR-2: grilling モードマーカーは questions ファイル1行目の HTML コメント

- **Context**: FR-CONTRACT-4 は question-budget センサーが grilling セッションの questions ファイルを判別する機械可読マーカーを要求。書き手は conductor(C1 の規定に従う)、読み手は C3。
- **Decision**: questions ファイル先頭に `<!-- amadeus-grilling:v1 mode=grilling -->` の1行 HTML コメントを置く。版付き(v1)・属性形式は既習の `<!-- amadeus-issue-form:v1 type=... -->` に揃える。C3 は先頭領域のみ走査し、タグ実在+版・属性の異形は loud finding(無音 fallback 禁止)。
- **Consequences**: 既存 answer-evidence 述語([Answer] 行と「承認」行の走査)と行が交差しない。markdown レンダリングに不可視。既習様式のため書き手・レビュアーの学習コストが最小。
- **Alternatives Rejected**: (a) YAML frontmatter — questions ファイルは frontmatter を持たない現行様式で、frontmatter 追加は required-sections 等の他センサー・既存 parse(checkQuestionsEvidence)への影響面が広い。 (b) ファイル名 suffix(`*-grilling-questions.md`)— センサーの matches glob(`**/*-questions.md`)は通るが、stage の produces 宣言名と乖離し artifact guard(宣言名との実在照合)に構造的に衝突する(stage-artifact-declared-names)。
- **意味論適合の明示(citation-semantics-check、§13 選挙 E-GFR-ADS13 の subagent-1 反証で是正)**: 引用元 `amadeus-issue-form:v1` マーカーの実消費者は **issue-labels.yml ではない**(同 workflow はマーカーを一切参照せず、見出しテキストで分類する — `grep -c amadeus-issue-form .github/workflows/issue-labels.yml` = 0 の実測)。実消費者は (i) `.github/ISSUE_TEMPLATE/*.yml` 4テンプレの本文冒頭(書き手)と (ii) `tests/integration/t426-issue-form-contract.test.ts`(様式の契約検査)。つまり引用元マーカーは「テンプレが書き、契約テストが様式を固定する」識別子であり、runtime 消費者を持たない。本マーカー(ADR-2)はこれと異なり **runtime 消費者(C3 センサー)を持つ** — 不在 = 通常モード(数値検査)への切替であり fail-open ではなく、異形のみ loud。様式(1行 HTML コメント・版付き・属性形式)のみを踏襲し、消費意味論は本 intent が新規に定義する。この相違は意図的。

## ADR-3: 遮断器は protocol 規律+センサー事後検査の二層(engine 強制はしない)

- **Context**: FR-PROTO-8 の回路遮断器(depth 指定時 目安×3で明示開示停止)の強制位置。候補: protocol prose のみ / センサー併用 / engine(orchestrate)へのハード実装。
- **Decision**: 二層 — (i) C1 の overlay が遮断器をセッション実行規律として定義(会話内でエージェントが守る)し、(ii) C3 が事後の questions ファイル検査で「数値上限超過なのに超過記録行がない」を FAIL finding として捕捉する(§8 recorded-justification 接続の機械面)。engine への実装はしない。
- **Consequences**: engine(amadeus-orchestrate)は無変更 — 変更面が protocol/センサー/テストに閉じ、scope-document の規模見積り内に収まる。センサーは advisory(現行契約)だが cutoff 以降 enforced=true で finding が gate 報告に載る。実行時の real-time 強制は人間ゲート(毎ラウンド応答)が担う。
- **Alternatives Rejected**: (a) prose のみ — 超過の無申告(silent 打ち切り・記録なし超過)を機械が捕捉できず、検証劇場 Forbidden の「消費されない検証フィールド」類型に近づく。 (b) engine 強制(ラウンド数を state で数えて refuse)— grilling は engine 非関与の会話規律であり、engine に質問数の実行時カウンタを新設するのは規模超過(engine 変更 = 本 intent の Out)かつ standalone(engine 不在)に届かない。

## 横断整合

- 3 ADR とも requirements 裁定3点((a) Free 語彙 (b) §8 接続 (c) semi 除外)と矛盾しない。裁定にない構造の追加は ADR-1/2 のマーカー2種のみで、いずれも FR が設計へ明示委譲した実現形の確定(c2c5-structural-addition-not-execution の「委譲された設計判断」側)。
- negative-vocabulary check: 非採用案の固有トークン(frontmatter 化・別ファイル分離・engine カウンタ)は他成果物の Decision 記述に不使用。
