# Requirements Analysis Questions — 260706-pr-gate-discipline

Issue #534 は構成（ルール = 不変条件 + ポインタ、知識 = 監視手順と判断基準）、不変条件の核、知識文書の内容一覧、受け入れ条件を Maintainer 確定済みである。
本ファイルは、Issue が「本 Intent で確定する」と残した配置・言語・切り分けの 4 問だけを扱う。

上流入力（codekb）: 運用モデル（Issue 起点、PR 単位は phase / Bolt、merge は人間）は `aidlc/spaces/default/codekb/amadeus/business-overview.md`、配布と層構成（installer が `.agents/amadeus/` 7 dirs + amadeus* skills を配布し、workspace memory は乗らない）は `codekb/amadeus/architecture.md`、parity・dev-scripts の位置づけは `codekb/amadeus/code-structure.md` を参照した。各問の前提はこれらに基づく。

## Q1. ルール側（不変条件 + ポインタ、3〜4 行）の配置

Issue の候補は「team.md『PR 監視』節の短縮 + ポインタ化、および/または memory/phases/construction.md。メソドロジ既定として配布に乗せる形の検討を含む」である。
前提: installer（scripts/amadeus-install.ts）の配布対象は `.agents/amadeus/`（agents / amadeus-common / hooks / knowledge / scopes / sensors / tools）と amadeus* skills であり、workspace memory（`aidlc/spaces/*/memory/`）は配布に乗らない。

- A. team.md「PR 監視」節を不変条件 + ポインタへ短縮し、memory/phases/construction.md にも不変条件を追記する（workspace 層のみ。配布は知識文書側だけに乗せる）
- B. A に加え、配布に乗る `amadeus-common/protocols/stage-protocol.md` 等のメソドロジ既定へも不変条件を追記する（利用者環境でもルール側が立つ）
- C. team.md の短縮 + ポインタ化のみ（phases は触らない）
- D. memory/phases/construction.md のみ（team.md は現状維持）
- E. 配布側（メソドロジ既定）のみに置き、workspace 層は現状維持
- X. Other (please specify)

[Answer]: B（team.md「PR 監視」節の短縮 + ポインタ化、memory/phases/construction.md への不変条件追記、配布側 stage-protocol.md への最小追記）。ピア協議 2026-07-06（回答: leader、engineer1、engineer2、engineer3、engineer5 の 5/5。全員 B）で確定。条件: ①stage-protocol.md は sha256 パリティロック対象。engineFileExceptions には #531（engineer3）で同ファイルのエントリが既に存在するため、新規例外は作らず既存エントリの reason へ追記理由（「PR gate 不変条件の最小ポインタ」、対象行、Issue #534）を統合する。skills/ 正準ソースへの同一反映も必ず伴う。②追記は最小（不変条件 1〜2 行 + 知識文書への参照 1 行）に抑え手順の重複を持ち込まない（乖離は将来の統合コスト）。③engineer1 の #428（PR #539）は stage-protocol.md を変更しておらず非接触と確認済み。④不変条件 + ポインタは上流提案候補である旨を decision に残す（提案するかは人間判断）。⑤knowledge/ への新規ファイルは現行 parity 実装（baseline 起点の欠落・hash 不一致検査）では fail しない見込みだが、将来の検査強化に備え出自を parity-map 宣言または PR 説明で追跡可能にする（engineer1 実測）。

## Q2. 知識文書（監視手順と判断基準の本体）の配置

- A. `.agents/amadeus/knowledge/amadeus-shared/`（メソドロジ層。installer 配布に乗る。Issue 推奨）
- B. `aidlc/spaces/default/knowledge/`（workspace 層。配布に乗らない）
- C. 両方（メソドロジ層を正とし、workspace 層へ参照 stub）
- D. `docs/amadeus/`（設計文書層）
- E. その他の既存ディレクトリ
- X. Other (please specify)

[Answer]: A（.agents/amadeus/knowledge/amadeus-shared/。メソドロジ層、installer 配布に乗る）。Issue 推奨どおり。ピア協議で全員 A。installer の実配布実態（7 dirs 丸ごとコピー）とも整合（engineer2 = #451 実装者の確認）。

## Q3. 知識文書の言語

前提: amadeus-shared の既存ファイル（audit-format.md 等）は英語である。docs/amadeus の言語方針（#509 = PR #536 確定）は docs/amadeus/*.md を対象とし、knowledge/ は明示対象外。skill-language-policy は SKILL.md と TS を対象とする。

- A. 英語で書く（amadeus-shared の既存慣行に従う。生成物・gate 文言の日本語維持には影響しない）
- B. 日本語で書く（aidlc 成果物の既定に合わせる）
- C. 英語正本 + 日本語対訳を併置する（docs/amadeus 方式を knowledge へ拡張）
- D. leader へエスカレーションして方針を確定する
- E. 配置先が workspace 層（Q2=B）の場合のみ日本語にする
- X. Other (please specify)

[Answer]: A（英語。amadeus-shared の既存慣行に従う。audit-format.md は全文英語であることを engineer2 が #506 で grep 実測済み）。補足条件（leader）: ユーザー向け gate 文言・エラーメッセージを知識文書に含める場合は、その部分だけ日本語維持ルール（言語方針のカーブアウト）に従う。

## Q4. チーム固有分の切り分け

個人設定・チーム事情（レビューボットの銘柄 = Devin / CodeRabbit / Bugbot、codecov.yml という具体名など）の扱い。

- A. 知識本体は一般化して書き（「遅いボットも必ず待つ」「カバレッジ検証設定の変更による回避の禁止」等）、固有名は team.md 側の短縮節に例として残す
- B. 知識本体は一般化して書き、固有名はどこにも残さない（削る）
- C. 知識本体に固有名も含めて書く（配布先でも銘柄例があった方が実用的）
- D. 固有名一覧を別ファイル（workspace 層）に分離する
- E. その他
- X. Other (please specify)

[Answer]: A（知識本体は一般化して書き、固有名 = Devin / CodeRabbit / codecov.yml 等は team.md 側の短縮節に例として残す）。ピア協議で全員 A。
