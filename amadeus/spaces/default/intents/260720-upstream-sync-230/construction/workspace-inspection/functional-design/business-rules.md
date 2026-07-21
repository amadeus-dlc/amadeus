# Business Rules — workspace-inspection

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Scan invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U06-01 | Workspace inspectionはread-onlyであり、source tree、`.gitmodules`、submodule状態を変更しない。 | mutationをtest failureとして拒否 |
| BR-U06-02 | rootで既存brownfield signalまたはparse可能submodule signalが発火したら、depth-1 fallbackを実行しない。 | 過剰走査・nested誤帰属として差戻し |
| BR-U06-03 | fallbackはworkspace直下候補だけを対象とし、depth>1のcontainer discoveryへ拡張しない。 | scope逸脱として差戻し |
| BR-U06-04 | hidden、excluded、known source、symlink、非directoryはcandidateにしない。比較はentry名のcanonical sort順で行う。 | 非決定的またはsample誤検出として拒否 |
| BR-U06-05 | 単一hitだけが`nestedRoot`になれる。複数hitは全件を`nestedCandidates`とadvisoryへ残し、自動選択しない。 | silent selection禁止 |
| BR-U06-06 | nested候補の言語、framework、build systemは同じsignal evaluatorから導出し、既知source dirを二重集計しない。 | primary language反転testで拒否 |
| BR-U06-07 | root、classification signal、fallback候補の読取不能はpath付きadvisoryを持つ`inconclusive`にし、読めた断片からprojectTypeを確定しない。 | silent Greenfield/Brownfield判定または部分mutation禁止 |

## Submodule invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U06-08 | `.gitmodules`はworkspace rootの一つだけを読み、parse可能なrelative pathが1件以上ならbrownfield signalとする。 | submodule-only workspaceのGreenfield判定を拒否 |
| BR-U06-09 | absolute、Windows drive absolute、`..` segment、空pathを持つentryはprobeしない。 | root外readをsecurity failureとして拒否 |
| BR-U06-10 | 初期化済みは`path/.git` entryの実在で判定する。directoryだけ、空directory、`.git`なしは未初期化である。 | false initialized判定を拒否 |
| BR-U06-11 | parserはコメント・未知keyを許容するが、malformed contentでthrowしない。`.gitmodules`存在+parse 0件は`UNPARSEABLE_GITMODULES`付き`inconclusive`であり、Greenfieldへ縮退しない。 | crash、架空entry、silent Greenfieldを拒否 |
| BR-U06-12 | inspectorは`git submodule update --init --recursive`をremedyとして返せるが、実行してはならない。 | 外部mutationとして即時差戻し |
| BR-U06-13 | 未初期化pathはsorted先頭5件まで表示し、それ以上は`(+N more)`でboundedにする。 | 非決定的・無制限出力を拒否 |
| BR-U06-14 | 未初期化submoduleがあってもLanguagesは実scan値を維持する。未取得コードの言語をurl/nameから推定しない。 | 推測値をverification failureとして拒否 |

## Projection and compatibility rules

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U06-15 | birth、detect、doctor、auditは一回の`WorkspaceScan`から投影し、consumerごとに再走査しない。 | snapshot driftをintegration failureとして拒否 |
| BR-U06-16 | `nestedRoot`はstate fileへ保存せず、auditとdetect JSONへadditiveに出す。複数候補は`nestedRoot`で連結表現しない。 | state contract変更または自動選択誤認を拒否 |
| BR-U06-17 | 未初期化submoduleはdoctor advisoryであり、単独ではdoctor exitをfailedへ変えない。 | CI破壊として差戻し |
| BR-U06-18 | no nested/no submoduleの既定経路では既存human output、audit Details、state bytesを変えない。 | NFR-3違反として差戻し |
| BR-U06-19 | WorkspaceScanのJSON追加fieldは観測がある場合だけ出力し、配列順はcanonicalである。 | snapshot driftとして拒否 |
| BR-U06-20 | warning/error文は対象path、観測状態、remedyを区別し、advisoryを成功や初期化済みと表現しない。 | misleading outputとして差戻し |

## Fail-closed projector rules

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U06-21 | C3のscan結果は`classified | inconclusive`の判別unionであり、`projectType`はclassified variantだけが持つ。 | 二値への早期collapseを型/compile failureで拒否 |
| BR-U06-22 | birth/state projectorはexhaustive matchし、`inconclusive`ではstate、plan、graph、audit、workspaceの全mutation前にrejectする。 | partial writeをbyte比較で拒否 |
| BR-U06-23 | detect/doctor/audit projectorは同一snapshotのadvisoryをpureに投影する。birth reject経路はaudit emitterを呼ばない。 | consumer再走査・snapshot drift・reject audit mutationを拒否 |
| BR-U06-24 | nested/submodule観測なしのclassified経路はhuman output、detect JSON全体、state、audit bytesを変更前と一致させる。 | NFR-3 golden failureとして差戻し |

## Traceability and tests

- BR-U06-01〜07はFR-3 item 11、C3、`detectDepthOneProjects`へtraceする。
- BR-U06-08〜14はFR-3 item 12、`inspectSubmodules`、upstream `242953e`へtraceする。
- BR-U06-15〜24はNFR-1〜4、E-USSU06FD1、U06のbirth/detect/doctor/JSON共通投影制約へtraceする。
- 各正常系に対し最低2つのerror/edge fixtureを置き、permission failure、unsafe path、multiple candidateでは対象分岐へ実際に到達したことをcoverageで確認する。

| Input | Ruleへの実質利用 |
|---|---|
| `unit-of-work.md` | BR-U06-01〜07のUnit境界と公開seam |
| `unit-of-work-story-map.md` | U06がFR-3 items 11–12を実装し、U12はverification集約だけを担う責務分離 |
| `requirements.md` | BR-U06-02、05、07〜12、18の受け入れ契約 |
| `components.md` | BR-U06-15のC3単一snapshotと既存consumer再利用 |
| `component-methods.md` | BR-U06-02〜16を実装する3関数と`WorkspaceScan` shape |
| `services.md` | BR-U06-01、12、15のread-only invocation-local境界 |
