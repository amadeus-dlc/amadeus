# Business Rules — U1 protocol-core

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: protocol-core (spec)

上流入力(consumes 全数): `requirements.md`(FR-PROTO-1〜10 / FR-CONTRACT-1/2/5 / FR-PROJ-1 — 各 BR の正本)、`unit-of-work.md`(U1 完了条件 — BR の合否面)、`components.md`(C1/C2/C5 の所有境界)、`component-methods.md`(C1 の文書契約 = 骨格抽出・超過記録行)、`services.md`(ラウンドループのオーケストレーション — BR-U1-4/5 の実行時文脈)、`unit-of-work-story-map.md`(スライス1の体験 — BR の利用者可視面)。

## BR 一覧(grilling-protocol.md 改訂の規則)

- **BR-U1-1(骨格の byte 不変)**: 骨格ブロック(`<!-- amadeus-grilling-skeleton:begin upstream=1495d014303e041c51c29f9e442485ba06f5878d -->` 〜 `<!-- amadeus-grilling-skeleton:end -->`)の間のテキストは #2785 ピン原文(sha256 `fa5c1e5e…`、1872 bytes)と byte 同一。マーカー行自体は骨格外。抽出手順(マーカー間切り出しコマンド例)を protocol 冒頭の overlay に自己記述する。FR-PROTO-2 は begin マーカーの `upstream=` 属性で充足し、既存 MIT ヘッダ本文(:1-6)は変更しない(SHA は repo 内で他に出現しないため grep 1 hit の AC を満たす)。[FR-PROTO-1/2/3]
- **BR-U1-2(rounds/frontier の終了意味論)**: 終了条件は「(枝刈り後の)frontier が空」または「done」。質問総数は終了条件に使わない。「one at a time」を義務付ける規則を置かない。[FR-PROTO-4/5]
- **BR-U1-3(depth = materiality 閾値)**: overlay に枝刈り表 — Minimal = 実装をブロックする決定・不可逆な決定のみ / Standard = +実質的トレードオフのある設計判断 / Comprehensive = +エッジケース・拡張点・運用細部 / (standalone のみ)Free = 枝刈りなし。workflow の depth はステージ契約の3値から来る(Free は wire に現れない — 裁定 (a))。[FR-PROTO-6]
- **BR-U1-4(刈りノードの列挙)**: 合意サマリ(C-4 相当)に「閾値未満として明示的に先送りした点」節を必須で置く。Free では空の明示(「刈りなし」)。[FR-PROTO-7]
- **BR-U1-5(回路遮断器)**: depth 指定時のみ、総質問数(提示済み全ラウンドの合計、estimate 確認・followup 込み)が目安×3(M12/S24/C36)に達したら「ツリー未完走」を明示開示して停止。silent 打ち切りの禁止を明文化。Free は適用外。[FR-PROTO-8]
- **BR-U1-6(超過の機械記録)**: workflow(Grill me)で質問総数が §8 の数値上限(4/8/12)を超えるとき、超過発生時点で questions ファイルへ固定様式の記録行を1行追記する: `<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->`。この行が §8 :729 recorded-justification の常設形(裁定 (b))。様式は U2 センサーが verbatim 照合する正本 — Answer 行様式(`[Answer]:`)・承認語彙と非交差。[FR-CONTRACT-2 の C1 側]
- **BR-U1-7(質問ファイル・監査の1問1件)**: ラウンド一括提示でも、質問ファイル追記(提示前 blank [Answer])・書き戻し・監査イベントは1問1件の既存契約を維持。questions ファイル先頭に grilling モードマーカー `<!-- amadeus-grilling:v1 mode=grilling -->` を置く(ADR-2)。[FR-PROTO-9、FR-CONTRACT-4 の C1 側]
- **BR-U1-8(annex 写像)**: 1コール複数問対応ハーネスはラウンド一括(≤4問/コールなら分割提示、ラウンド境界の意味論保存)、非対応ハーネスはラウンド内連続提示。overlay の §4 相当(Workflow vs Standalone 表)に統合。[FR-PROTO-9]
- **BR-U1-9(事実の自己調達)**: 骨格の sub-agent 事実調達を D3/D4(estimate + confidence)へ接続する overlay 規定。[FR-PROTO-10]
- **BR-U1-10(stage-protocol 側)**: Step 3d の要約を frontier 駆動へ差し替え(`hybrid termination` 0 hit)、:277 のモード説明文を新契約の説明へ、§8 へ接続段落(数値表は不変)、§3 に semi/full 除外の1行(裁定 (c))。[FR-CONTRACT-1/2/5]
- **BR-U1-11(スキル)**: SKILL.md をレベル引数(Minimal/Standard/Comprehensive/Free、既定 = Free)+frontier 規律参照へ改訂。standalone は record 非接触・監査なしの現行分類を維持。[FR-PROJ-1]
- **BR-U1-12(t415 暫定整合)**: 本 Bolt 内で t415 の旧 pin(D6 文言等)を新文言 pin へ最小差し替えし、`hybrid termination` / 旧 D6 文言の not.toContain を追加。完全な新 pin 群・対角実測・センサーテストは U2 の所掌。CI を赤にしたまま PR を出さない。[FR-CONTRACT-6 の暫定面]

## 合否基準(U1 完了条件との対応)

unit-of-work.md の U1 完了条件全数と1:1(diff 空 / SHA 1 hit / overlay 分離 / 各規定の実在 grep / hybrid 0 hit / semi 除外明文 / Free 既定)。検証コマンドは Bolt 1 の DoD(bolt-plan)に従い、t415(暫定)・t199・typecheck・lint の green を含む。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T06:43:16Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2): FR 14件の BR 全数写像、stage-protocol 実分岐(:277/:349/§8/:107-137)の file:line 一致、M12/S24/C36 = 4/8/12×3 の機械一致、ANSWER_TAG_RE 実読による2マーカーの語彙非交差、裁定 (a)(b)(c) の BR-U1-3/6/10 反映、t199 非干渉による Bolt 1 CI green 設計を確認。FOLLOW-UP 3件(FR-PROTO-2 の充足経路明示・BR-U1-7 の FR-CONTRACT-4 二重タグ・unit-of-work U1 行への FR-CONTRACT-6 暫定注記)は conductor が同一ターンで反映済み

### Findings

- FOLLOW-UP | BR-U1-1 に FR-PROTO-2 の充足経路(begin マーカー upstream= 属性、既存 MIT ヘッダ本文は不変)を明記 — 反映済み
- FOLLOW-UP | BR-U1-7 のマーカー記述に FR-CONTRACT-4 の C1 側タグを追記 — 反映済み
- FOLLOW-UP | unit-of-work.md U1 行の対応 FR に FR-CONTRACT-6(暫定)を追記 — 反映済み
