# Requirements — gate-mechanics-batch (260709-gate-mechanics)

> bugfix スコープ。2件の確認済みバグ(いずれもチーム2名クロスレビューで CONFIRMED)を修正する。各要件はテスト可能な合否基準を持ち、修正前に赤・修正後に緑を実証する回帰テスト(落ちる実証)を必須とする。上流トレーサビリティ: 本 intent の brief(ゲート/worktree 機構バグ)+ Issue #685 / #670 + codekb(architecture.md / code-structure.md の gate-resolution・worktree-guard セクション)。

## スコープと非スコープ

- **スコープ**: Bolt1=#685(遠隔 conductor のゲート却下=delegate-rejection)、Bolt2=#670(sibling worktree からの Bolt worktree 作成拒否の緩和)。2 Bolt = 2 PR。
- **非スコープ**: #675(handleReject の human-presence guard 欠落)は PR #692 で修正済み(`assertHumanPresentForGateResolution` を approve/reject 共有)。本 intent では再修正しない。delegate-approval(#671)の approve 側は既存・変更しない。worktree guard の意図(真のネスト防止)は維持する。

---

## FR-1(#685): 遠隔 conductor のゲート却下を委任 provenance で成立させる

**背景**: #671 で承認(approve)側は delegate-approval により遠隔成立するが、却下(reject)側に対称の機構がない。agent-team トポロジーで遠隔 conductor がゲートを却下できない。`handleReject` の human-presence guard(`assertHumanPresentForGateResolution`)は #692 で入ったが、それはローカル HUMAN_TURN を要求するため遠隔セッションでは満たせない。

**契約**:
- FR-1.1: 新しい監査イベント型を1つ追加する(`DELEGATED_APPROVAL` の流用は意味破壊のため禁止)。名称は設計ステージで確定するが、**却下の委任である**ことが型で区別できること(例: `DELEGATED_REJECTION`、または承認/却下を判別フィールドで持つ `DELEGATED_GATE_RESOLUTION`)。どちらを採るかは design で決定。
- FR-1.2: leader 側の発行コマンド(`amadeus-state delegate-rejection` 相当)は、発行元セッションの実 HUMAN_TURN で gate される(`humanActedSinceGate` 相当が真でなければ拒否)。モデルが自己却下を捏造できないこと。
- FR-1.3: conductor 側の reject-path presence 判定は、ローカル HUMAN_TURN に加え、**検証済みの委任却下イベント**を人間行為として受理する。検証は発行元シャードの実 HUMAN_TURN 行への裏取り(`verifyDelegatedApproval` と同型)であり、自己申告でないこと(検証劇場 Forbidden)。
- FR-1.4: 却下委任は承認委任と**混用不可**。`DELEGATED_APPROVAL` は approve ゲートのみ、却下委任は reject ゲートのみを開ける(承認委任で却下が通る/その逆が起きない)。
- FR-1.5: パストラバーサル等の異常入力は fail-closed(#671 の verify と同じ防御)。

**受け入れ基準(Given/When/Then)**:
- AC-1a: Given 発行元セッションに最終ゲート解決以降の実 HUMAN_TURN があり、conductor intent の audit dir に検証可能な委任却下イベントが着地している。When conductor が `report --result rejected`(reject 経路)を実行する。Then ゲートは却下としてコミットされる(GATE_REJECTED + STAGE_REVISING)。
- AC-1b: Given 委任却下イベントが存在するが発行元シャードに対応する HUMAN_TURN が無い(偽造/改竄/存在しないシャード参照)。When 検証する。Then 人間行為として受理されず reject はローカル HUMAN_TURN 不在で拒否される(fail-closed)。
- AC-1c: Given 承認委任(`DELEGATED_APPROVAL`)のみが存在する。When reject 経路の presence 判定を行う。Then 却下は成立しない(承認委任で却下を通さない)。
- AC-1d: **落ちる実証**: 上記 AC-1b/AC-1c を誤ラベル/偽造 fixture で注入し、修正前(または naive 実装)で偽成立=赤、修正後で fail-closed=緑 を実測する。

## FR-2(#670): sibling worktree セッションから Bolt worktree を作成可能にする

**背景**: `assertNotSiblingWorktree`(`amadeus-worktree.ts:112`)は `dirname(git-common-dir)`=main checkout と現在の toplevel を比較し、**任意の git worktree から実行すると拒否**する。マルチ worktree チーム運用で conductor が自 worktree から Bolt worktree を切れず、Bolt worktree モードが構造的に使用不能。

**契約**:
- FR-2.1: sibling worktree セッションから `amadeus-worktree create` / `bolt --worktree` を実行しても、**main checkout をアンカーに Bolt worktree を main の sibling として作成**できること(現在の worktree 直下にネストしない)。
- FR-2.2: ガードの本来の意図(**真のネスト防止** = Bolt worktree の中でさらに worktree を切る等)は維持する。ネスト作成は引き続き拒否。
- FR-2.3: main checkout の解決は既存の `dirname(git-common-dir)` を用いる(worktree からでも main checkout を正しく指す)。作成先パスは main checkout の sibling 位置に固定する。
- FR-2.4: `list`(read-only、既にガード対象外)の挙動は不変。
- **FR-2.5(review#1 critical 反映): `create` だけでなく、同じ `assertNotSiblingWorktree` を呼ぶ全 write 経路を対象にする。** 呼び出し3箇所(`amadeus-worktree.ts` の `handleCreate`:204 / `handleMerge`:277 / `handleDiscard`:512)はいずれも実 CLI 表面(`amadeus-bolt complete --merge` / `--discard` が委譲、`amadeus-bolt.ts` の `BOOLEAN_FLAGS`)。`create` だけ緩和して merge/discard を残すと、sibling worktree の conductor は Bolt worktree を作れても完了(merge)・破棄(discard)できず「Bolt worktree モードが構造的に使用不能」というバグが半分しか直らない。3経路すべてで同じ緩和(sibling 実行成功・真ネスト拒否維持)を適用する。

**受け入れ基準(Given/When/Then)**:
- AC-2a: Given sibling worktree(例: `~/worktrees/.../claude-engineer-3`)から実行。When `amadeus-worktree create --slug <x> --base main`。Then Bolt worktree が main checkout の sibling として作成され、エラーにならない。
- AC-2b: Given main checkout から実行。When 同コマンド。Then 従来どおり成功(回帰なし)。
- AC-2c: Given Bolt worktree(ネスト元)から真にネストした作成を試みる。When create。Then 引き続き拒否される(意図の維持)。
- AC-2d: **落ちる実証**: 修正前は sibling worktree から拒否=赤、修正後は成功=緑 を実測。かつ真ネスト拒否の維持も実測(過剰緩和でないこと)。
- AC-2e(FR-2.5): Given sibling worktree から実行。When `amadeus-worktree merge`(および `amadeus-bolt complete --merge`)。Then エラーにならず処理される(create と同じ緩和)。真ネストは拒否維持。
- AC-2f(FR-2.5): Given sibling worktree から実行。When `amadeus-worktree discard`(および `amadeus-bolt complete --discard`)。Then エラーにならず処理される。真ネストは拒否維持。
- AC-2g(FR-2.4): Given sibling worktree / main checkout の双方から。When `amadeus-worktree list`。Then 従来どおり成功(ガード対象外の挙動が不変=回帰なし)。

---

## 横断要件(team.md / phases 準拠)

- NFR-1: 2 Bolt = 2 PR(束ねない)。各 PR は codex 直接レビュー、CI green、人間承認マージ。
- NFR-2: core 正本編集 → `bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(セルフインストール昇格)を同一コミット。監査/セルフインストールドリフトガードを緑に保つ。
- NFR-3: 検証は `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci`。新規イベント型追加時は event-registry 同期ガード(t28/t48/t81/t111 + audit-format.md + 12-state-machine.md EN/JA)をすべて更新。
- NFR-4: 後方互換シム・要求外のフォールバックを追加しない(古い挙動は置換)。
- **NFR-5(review#1 high 反映): `tests/e2e/t06.test.ts` は #670 修正前の CLI 契約(sibling worktree からの `create` を拒否=`must run from the main repo checkout`)をロックしている。**本 Bolt はこの契約を意図的に反転させるため、t06 のアサーションを「sibling からの create/merge/discard は成功・真ネストは依然拒否」へ**書き換える**(単なる green 維持ではない)。この反転は team.md の「既存スイート green 維持」ノルム上の**回帰ではない**(変更対象そのもののテスト)ことを Bolt2 の PR に明記する。
- NFR-6(review#1 minor 反映): #685 の delegated-rejection 回帰テストは、既存 `tests/unit/t112-delegated-approval.test.ts` の対称(delegated-rejection 版、または同ファイルへの追加)として配置し、承認委任テストと対称のカバレッジにする。最終的なファイル位置は design/code-generation で確定。
