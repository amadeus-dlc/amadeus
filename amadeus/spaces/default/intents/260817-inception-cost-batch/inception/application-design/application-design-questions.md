# Application Design 質問ファイル — 260817-inception-cost-batch

> 本ステージの material 裁定は、requirements.md「未解決事項」が application-design へ委ねた3点。Intent Autonomy Mode = full につき `amadeus-bolt decide-question` 梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。機構事実の根拠は RE scan record(`codekb/amadeus/re-scans/260817-inception-cost-batch.md` §3)。
>
> リーダー承認(Intent autonomy grant 経由): 2026-08-17T23:20:00Z — full グラント `intent-grant-edcb102bc13cb317c58295042495ae77` 配下の梯子裁定 AUTO_DECIDED ×3 で回答を確定(E-OC1)。各 [Answer] に decision id を記録済み。

## Q1: #3181 の取り込み実装形はどれか(Issue 明示の設計裁定事項)

A. intent-birth 統合 — issue-evidence の取得を intent birth(mirror 面)へ組み込み engine が自動 fetch
B. 独立 read-only CLI verb — `amadeus-utility.ts` に fetch verb を新設し、github-gateway の第3 read-only adapter(`viewArgv`/`parseIssueObject`/`readiness` 再利用)で取得。artifact は record へ書き、RA/RE の `consumes:` へ optional 追加。producing 宣言は intent-capture の `optional_produces`(off-path producer は advisory — self-fix でも graph が壊れない)
C. 契約 prose のみ(機械化なし — Request 自由文搬入の明文化に留める)
X. Other (please specify)

[Answer]: B — full autonomy 梯子 AUTO_DECIDED `auto-decision-190a2c10161bd6ad7355301a66a865da`(2026-08-17)。独立 read-only CLI verb + gateway 第3 adapter + record artifact + consumes optional 追加。birth 非結合(fail-open 自然成立)・verb 単体 TDD 可・producersOf 制約は intent-capture optional_produces で充足

## Q2: #2415 の除外集合はどの範囲か(Issue 明示の設計裁定事項)

A. `amadeus/spaces/*/intents/` のみ(Issue の第一候補、最小)
B. 排出物クラス宣言 — intents + elections + codekb + metrics + memory を除外クラスとして列挙し、`amadeus/spaces/*/specs/**`(build 台帳 — model-map.json / tla-evidence)は明示的に除外対象外と規定
X. Other (please specify)

[Answer]: B — 梯子 AUTO_DECIDED `auto-decision-30c7a89ac4fcf8afae46df9188334fed`(2026-08-17)。排出物クラス宣言(intents+elections+codekb+metrics+memory 除外、amadeus/spaces/*/specs/** は明示除外対象外)。クロスレビュー両名の同根勧告と specs/tla 罠の実測に基づく

## Q3: 設計 provenance 引用(codekb が工程記録を引用する既存用法)の扱いは(FR-EXC-3)

A. 許容して失う — 除外導入後、codekb 本体成果物は工程記録を新規引用しない構造とし、その旨を契約へ明文化。既存引用2件は履歴として残存。自 intent の事実の正規流入経路は #3181 の issue-evidence が担う(両 Issue の設計が接合する点)
B. 自 intent record 例外 — Focus が名指す自 intent の record に限り読取・引用を許す例外分岐を除外規定に持たせる
X. Other (please specify)

[Answer]: A — 梯子 AUTO_DECIDED `auto-decision-1ff6f6c50e3c7df015ec3414e91cd6a7`(2026-08-17)。許容して失う+契約明文化。自 intent 事実の正規経路は issue-evidence(#3181)が担い、除外規定へ例外分岐を持ち込まない(P5 surgical)
