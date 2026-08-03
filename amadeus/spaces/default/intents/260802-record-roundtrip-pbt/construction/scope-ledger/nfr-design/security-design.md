# Security Design — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD): business-rules.md、domain-entities.md(本文で実参照)。

測定 ref: repo 内 file:line は **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD` の出力転記)の実測。

## 1. 判定: 一般的なセキュリティ関心は N/A(根拠付き)

本 unit は実行される構成要素を持たず(business-logic-model.md §1 実文 `実行可能な振る舞い(プロダクションコード・テスト・CI)を一切持たない。`)、外部からの入力を受け取る境界も、権限を行使する経路も持たない。

| 関心 | 判定 | 根拠 |
| --- | --- | --- |
| 認証・認可 | N/A | 実行される処理が無く、保護すべき操作が存在しない |
| 入力検証・サニタイズ(実行時) | N/A | 実行時に外部入力を受ける境界が無い(執筆時の出典検証は §2 で扱う) |
| シークレット管理 | N/A | 台帳に資格情報を書かない(§3)。本 unit はコードを持たず、環境変数・シークレットストアの参照も生じない |
| 暗号・通信路保護 | N/A | 通信を行う構成要素が無い。出典取得は執筆者の `gh` 実行であり、成果物側の経路ではない |
| 依存関係の脆弱性 | N/A | 依存を追加しない(business-rules.md `:27` BR-SL-13 の書込面限定) |
| 監査ログ | N/A | 本 unit が発行するイベントが無い。record への追加は Git 履歴が担う |
| インジェクション | N/A | 台帳は機械が実行・評価するデータではない。domain-entities.md `:100` 実文 `台帳は機械が消費するデータではなく人間が読む記録であり` |

## 2. 実質面: 出典由来の「信頼できない内容」の扱い

本 unit で唯一セキュリティ的性質を持つのは、**外部所有の可変資源(GitHub Issue 本文)の内容を record へ取り込む**という一点である。これは実行時の攻撃面ではないが、内容の完全性(integrity)の問題として扱う。

- **S-1(出所の明示)**: 取り込む内容には必ず出所を併記する。何が repo 内の確定物由来で、何が外部資源由来かを読者が判別できる状態を保つ。domain-entities.md `:84` の `SourceCite` が `origin` フィールドでこの区別を型として持つ(`"requirements.md" | "#1980本文"`)。
- **S-2(改竄・改稿の検出可能性)**: 外部資源からの引用は verbatim 断片・取得コマンド・取得日を併記し、後から照合できる状態にする(business-rules.md `:24` BR-SL-10、設計は reliability-design.md §1)。これにより、原本が事後に改稿された場合に**無音で食い違うのではなく検出できる**。
- **S-3(推測混入の禁止 = fail-closed)**: 出典に無い情報を推測で補わない。business-rules.md `:19` BR-SL-5 実文 `分担先として書けるのは **出典に明記された Issue 番号または明記された措置語**のみで、明記が無い件は \`未割当(出典に記載なし)\` と書く。推測で Issue 番号を補わない`。これは記録の完全性を守る fail-closed 契約であり、不足を埋める(fail-open)方向へ倒さない。
- **S-4(権威の一本化)**: 出典間に食い違いがある場合の正本を1つに固定する。business-rules.md `:22` BR-SL-8 実文 `射程判定は Issue #1980 本文 \`:72\` の分類行を**唯一の正本**とし、台帳側で再判定しない。\`:72\` と \`:65\` / requirements.md \`:80\` が食い違う場合は \`:72\` を採り、相違を台帳の注記へ書く`。複数権威の併存は、どちらを採ったかが不可視になる形の完全性喪失を招く。

## 3. 機微情報の非記載

- **S-5**: 台帳に記載するのは公開 Issue の番号・公開本文からの1行要約・射程判定・分担先のみである(domain-entities.md `:27-33` の `LedgerRow` 5 フィールド)。資格情報・トークン・個人情報・非公開の内部情報を書かない。
- 検査(機械): 台帳に対する秘密様パターン(`ghp_`、`Bearer `、`-----BEGIN` 等)の grep が 0 件であること。単発の独立ステップで実行し、`&&` 連鎖の中間に置かない(0 件時の exit 1 が後続を無音スキップさせるため — cid:code-generation:no-grep-count-mid-chain)。
- 本検査は台帳の内容構成上ほぼ確実に 0 件だが、**「そうなるはず」ではなく実行して 0 件を確認する**ことを受入手順に含める(検証劇場を避ける)。

## 4. 他 unit との境界

- 本 unit は election の読み側検証(破損台帳の棄却 = fail-closed 入力検証)を**実装しない**。business-logic-model.md §1 実文 `ADR-4(\`:275\` 実文 \`| ADR-4 | election の読み側検証は **store 内 private \`parseElectionFile\`** に置き、\`Store.load\` と \`Store.setState\` の2読み口が経由する。汎用 \`readJson\` は変更しない。 |\`)が election 境界を本 intent の実装対象として確定している` とおり、その面は U1(election-readpath)の所有である。本 unit は #1459 行を「射程内」と判定する根拠としてこの裁定を参照するのみで、検証コードを持たない。
- domain-entities.md `:104` 実文 `\`ElectionFile\` / \`StoreError\` / \`Election\`(decisions.md ADR-4 \`:275\` の所有、U1)— 本 unit は参照も再定義もしない。`

## 5. 保証の層別

| 層 | 保証 | 非保証 |
| --- | --- | --- |
| 記載層(S-5) | 機微情報を台帳へ書かない・grep で確認 | 上流成果物・Issue 本文側の機微情報(所有外) |
| 引用層(S-1/S-2) | 出所の判別可能性・改稿の検出可能性 | 外部資源そのものの改竄防止(外部所有) |
| 判定層(S-3/S-4) | 推測混入ゼロ・権威一本化 | 正本(`:72`)自体の正しさ(上流の責務) |
| 実行層 | — | 該当なし(実行される構成要素が存在しない) |

全層を貫く単一の「安全である」断定は行わない。層ごとに守る対象と守らない対象を上表のとおり分ける。

## 6. 上流参照の補足

- business-logic-model.md §3 の状態遷移 `[S4] 受入可 / 不可` は `1つでも不通過なら S1 へ戻す(部分受理を作らない)` と定め、同 §3 末尾が `本 intent 全体の主題である fail-closed の姿勢を、文書生成側でも同じ形で守る` と位置づけている。本書の S-3(推測混入禁止)はこの姿勢の記載規則面での現れである。
