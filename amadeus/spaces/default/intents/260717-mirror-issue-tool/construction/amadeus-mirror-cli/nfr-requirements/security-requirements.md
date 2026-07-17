# Security Requirements — amadeus-mirror-cli

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

- S-1: 認証情報を保持しない — gh keyring 委譲(トークンをコード・設定・ログに書かない。construction ガードレール「シークレットのハードコード禁止」)
- S-2: gh 呼び出しは Bun ランタイム(technology-stack.md)の Bun.spawnSync による引数配列形のみ(シェル文字列非経由)— コマンドインジェクション面を構造的に排除(ADR-2)
- S-3: Issue 本文へ流し込む値(intent 名・パス等)は repo 内の自データのみ。外部入力のサニタイズ対象なし(入力は argv のサブコマンド+--intent のみで、未知値は usage 拒否 = 境界検証)
- S-4: 認可は GitHub 側(リポジトリ権限)に委譲。バイパス経路なし

## 検証

- unit テスト: 未知サブコマンド拒否(exit 2)。integration テスト: fake GhRunner に渡る引数が配列形であることの固定

## Review

**Verdict:** NOT-READY(Major 1件、是正後 READY 見込み)
**Reviewer:** amadeus-architecture-reviewer-agent(subagent、review 対象は5成果物全体。追記はスコープ制約により本ファイルのみ)
**Date:** 2026-07-17T00:00:00Z

### Findings

| # | Severity | Location | Finding | Status |
|---|---|---|---|---|
| 1 | Major | performance-requirements.md:3, security-requirements.md:3, scalability-requirements.md:3, reliability-requirements.md:3 | 4ファイルすべての冒頭「上流入力(consumes 全数)」行に `technology-stack.md` が列挙されているが、本文中のどこにも technology-stack.md の内容への参照がない(`grep -n "technology-stack" <各ファイル>` で本文ヒット 0 件、ヒットは冒頭行のみ)。実際に technology-stack.md を参照して使っているのは tech-stack-decisions.md 一件のみ(表中「出典」列で NFR-1 と併記)。team.md cid:code-generation:artifact-upstream-inputs-header は「冒頭行は実際に消費した artifact 名の列挙に限る(参照実体のない装飾トークンはセンサーを通っても趣旨を空文化するため禁止 — 検証劇場 Forbidden と同族)」と明記しており、この4ファイルはその禁止パターンに該当する。upstream-coverage センサーは artifact 名の文字列一致のみを見るため(`.claude/tools/amadeus-sensor-upstream-coverage.ts` 実測: consumes リストと本文の正規表現一致のみ)、冒頭行の記載だけで機械的に PASS してしまい、センサーが空文化している(sensor 詳細ファイル不在 = FAILED なし、`.amadeus-sensors/nfr-requirements/` 実測で `required-sections-*.md` の2件のみで upstream-coverage 検出ファイルなし)。是正: 4ファイルの冒頭行から `、technology-stack.md` を削る(このユニットは brownfield で technology-stack は `required: false` の任意 consumes であり、性能/セキュリティ/スケーラビリティ/信頼性の判断が technology-stack.md の内容に実際に依拠していないなら削除が正)。もし実際に依拠している判断があるなら(例: Bun-only 前提が S-2 の gh 呼び出し方式選択に影響している等)、該当箇所に一言でも実体参照を追記する | Open |

### Validation Tool Results

| 確認項目 | コマンド | 結果 |
|---|---|---|
| 4ファイルの本文中 technology-stack 参照有無 | `grep -n "technology-stack" performance-requirements.md security-requirements.md scalability-requirements.md reliability-requirements.md` | 各ファイルとも冒頭行(3行目)のみヒット、本文(## 要求/## 検証)には0件 |
| tech-stack-decisions.md の実体参照 | 目視(表内「出典」列) | `technology-stack.md、NFR-1` として Bun ランタイム決定の出典に使われており、実体参照あり(この1ファイルは問題なし) |
| upstream-coverage センサーの判定方式 | `.claude/tools/amadeus-sensor-upstream-coverage.ts` 読解 | consumes リストの各文字列を本文へ正規表現一致させるのみ。冒頭行の列挙自体が一致対象になるため、装飾トークンでも機械的に PASS する構造 |
| sensor 実行結果ディレクトリ | `find .amadeus-sensors/nfr-requirements -type f` | `required-sections-*.md` 2件のみ存在(過去の FAILED 是正跡)。upstream-coverage の FAILED 検出ファイルは存在せず、今回は(装飾的にせよ)PASS 扱いだったことと整合 |
| N/A 根拠の反証可能性(scalability-requirements.md) | 目視 | intents.json 現行39件・週次ペースという実測数値を伴う反証可能根拠あり。environment-provisioning:c3 様式に適合。問題なし |
| 数値要求の強制メカニズム由来(performance-requirements.md) | 目視 | P-2 は独自タイムアウトを追加しない、と明記(nfr-requirements:c3 遵守)。マジックナンバーなし。問題なし |
| 信頼性 R-3 と FR-2.3/P4 の整合 | business-logic-model.md create フロー(:9-15)と reliability-requirements.md:9 の突き合わせ | business-logic-model の create フローには「Issue 起票成功後のフィールド書き込み失敗」分岐が図示されていないが、これは nfr-requirements が nfr-design より先行するステージ順序上、新しい失敗経路を NFR 側が識別して後続 nfr-design/code-generation へ引き渡す正常な流れであり矛盾ではない。P4(不可逆操作の自動化回避)の引用も適切(自動クローズをしない判断の根拠として妥当) |
| tech-stack-decisions.md の新規決定密輸有無 | ADR-2/ADR-3/ADR-5 の実在確認 — `grep -rn "ADR-2\|ADR-3\|ADR-5" inception/application-design/decisions.md` | 3件とも `inception/application-design/decisions.md` に実在し、tech-stack-decisions.md は再掲のみで新規決定はない。問題なし |
| セキュリティ要求と construction ガードレールの整合(S-1〜S-4) | 目視+ `inception/application-design/decisions.md:21`(ADR-2 Security/Compliance 欄)との突き合わせ | S-1(シークレット非保持)は ADR-2 の「トークン非保持(keyring 委譲)」と整合。S-2(引数配列形)は ADR-2 Decision 欄と一致。S-4(認可は GitHub 委譲、バイパス経路なし)は construction ガードレール「認証・認可バイパスにフラグ」の対偶を満たす(バイパス経路がないため該当コードなし)。問題なし |

### Summary

5成果物全体の実質的な内容(数値要求の裏付け、N/A の反証可能性、信頼性の部分失敗設計、tech-stack の再掲のみという密輸なしの確認、セキュリティ要求の construction ガードレール整合)には Critical/Major な欠陥は見当たらない。唯一の Major 指摘は、4ファイルの上流入力ヘッダーに technology-stack.md を列挙しながら本文で一切参照していない点で、team.md が明示的に禁止する「参照実体のない装飾トークン」パターンに該当し、upstream-coverage センサーをすり抜けて機械的に PASS させてしまっている。是正(該当4ファイルの冒頭行から該当エントリを削るか、実体参照を追記する)は軽微だが、検証劇場と同族の禁止パターンである以上、是正を経てから READY とすることを推奨する。

## Review(iteration 2)

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent(subagent、独立検証)
**Date:** 2026-07-17T15:00:00Z

### 是正内容の独立検証

builder は「削除ではなく実参照化」で是正したと申告。4ファイル本文を独立に grep・目視して、各 NFR 判断が technology-stack.md のどの事実に実際に依拠しているかを確認した。

| # | ファイル | 追加された本文参照(該当行) | 依拠している technology-stack.md の事実 | 実体性の評価 |
|---|---|---|---|---|
| 1 | performance-requirements.md:7(P-1) | 「technology-stack.md の実行モデル(Bun 直接実行の単発 CLI、常駐プロセスなし)を前提とする」→ ネットワーク往復が支配的なので専用の性能要求を設けない、という結論の根拠になっている | codekb `amadeus/spaces/default/codekb/amadeus/technology-stack.md:13`「永続 daemon を追加する計画はない」/ `:21`「TypeScript(ESM)を Bun ランタイム上で直接実行する構成を維持」 | 実体あり — 単発実行・非常駐という事実がなければ「専用性能要求なし」の結論は成立しない |
| 2 | security-requirements.md:8(S-2) | 「gh 呼び出しは Bun ランタイム(technology-stack.md)の Bun.spawnSync による引数配列形のみ」 | 同上 `:21`(Bun ランタイム直接実行) | 実体あり — Bun.spawnSync という API 選択自体が Bun ランタイム決定に直接依存する |
| 3 | scalability-requirements.md:7(N/A根拠) | 「technology-stack.md の実行モデルどおり単発 CLI(サーバー・常駐面なし)であり…スケール軸が存在しない」 | 同上 `:13`(daemon 計画なし) | 実体あり — N/A 判定(スケール軸なし)の直接の反証可能根拠として機能している |
| 4 | reliability-requirements.md:10(R-4) | 「リトライ機構は持たない…単発 CLI(technology-stack.md の実行モデル)では再実行が人間の自然な回復手段」 | 同上 `:13`/`:21` | 実体あり — リトライ機構を持たないという設計判断が実行モデルの事実から導出されている |

4件とも、同一の上流事実(Bun 単発 CLI・常駐プロセスなし)を出典としつつ、それぞれ異なる NFR 判断(性能要求の要否/API 選択/スケール軸の有無/リトライ機構の要否)へ紐付けて言及しており、単なる語の反復ではなく判断の根拠として機能している。tech-stack-decisions.md(是正対象外の5件目)は従来どおり表形式で実体参照済みであり、今回の是正で新たな不整合は生じていない。

### リグレッション確認

- 4ファイルの他の記述(検証節、既存の要求番号 P-2/S-1/S-3/S-4/R-1〜R-3、N/A の反証可能根拠の数値)は iteration 1 レビュー時点の内容から変化なく、追加は各既存箇条書きへの一言挿入に留まる(新規箇条書きの水増しや既存判断の書き換えはない)
- `grep -n "technology-stack" performance-requirements.md security-requirements.md scalability-requirements.md reliability-requirements.md` は各ファイル1件ずつ本文ヒットを確認(冒頭行を除く実体参照)— 是正前の0件から改善
- iteration 1 で問題なしと判定した項目(数値の強制メカニズム由来、N/A の反証可能性、信頼性の部分失敗設計、tech-stack-decisions.md の新規決定密輸なし、セキュリティ要求と construction ガードレールの整合)は本文が変化していないため再検証も同一結論

### 補足(スコープ外・非ブロッキング)

`.amadeus-sensors/nfr-requirements/` 配下に required-sections センサーの FAILED 詳細ファイルが2件残存している(`required-sections-5ca17a2e.md`: scalability-requirements.md、`required-sections-ad385784.md`: tech-stack-decisions.md、いずれも H2 見出し数不足を指摘、timestamp 2026-07-17T14:52:39Z/40Z)。scalability-requirements.md は現状「## 要求」「## 検証」の2見出しを持つため fire 時点より後に是正済みの可能性がある一方、tech-stack-decisions.md は現状も「## 決定」の1見出しのみで「## 検証」節がない。今回の iteration 2 レビュー対象(technology-stack.md 参照実体化の Major 指摘)には該当しないため verdict には影響させないが、gate 準備完了報告の前に conductor が team.md cid:manual-sensor-fire-before-gate-report に従って再発火・是正判断を行うことを推奨する。
