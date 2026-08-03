# Requirements Analysis 質問 — 260801-silent-drop-gate

> モード: Guide me（対話式）
> 上流証跡: `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`。Ideation で確定済みの3形態、3 authored roots、shrink-only、15秒、CI blocking、Comprehensive test は再質問しない。

## Q1. emit／Result 戻り値破棄の検出境界

名前だけの広い推測は偽陽性を増やし、限定しすぎると新規 API を見逃す。静的ゲートが「成否を表す呼び出し」を識別する正準境界を決める。

- A. 明示カタログ方式（推奨）: 対象 API／戻り値型をレビュー済みの正準カタログで管理し、追加時は positive／negative fixture と census 証跡を必須にする。名前ヒューリスティック単独では違反にしない
- B. 名前ヒューリスティック方式: `emit*`、`persist*`、`set*` 等の命名規則だけで対象を判定する
- C. 全戻り値方式: 戻り値のある呼び出しを原則すべて対象にし、免除で絞る
- D. 既知 Issue 限定: #1878／#1874 で現れた API だけを対象にする
- X. Other (please specify)

[Answer]: A — 明示カタログ方式。対象 API／戻り値型をレビュー済みの正準カタログで管理し、追加時は positive／negative fixture と census 証跡を必須にする。名前ヒューリスティック単独では違反にしない（2026-08-02T02:30:46Z、Guide me、「すべて推奨で」）

## Q2. #1874 の対象行不存在時の契約

`setCheckbox`／`setStageSuffix` の対象行がない場合、成功扱いを禁止したうえで、どこまで自動回復させるかを決める。

- A. typed loud failure（推奨）: state のバイト列を変更せず型付き失敗を返す。再同期・再試行は、呼び出し元が既存契約上それを明示的に選べる経路だけで行う
- B. 自動再同期: 対象行がなければ常に再同期して1回だけ再試行し、それでもなければ失敗する
- C. 警告付き no-op: warning を出して成功終了する
- D. 例外統一: 詳細な失敗型を設けず例外を投げる
- X. Other (please specify)

[Answer]: A — typed loud failure。state のバイト列を変更せず型付き失敗を返す。再同期・再試行は、呼び出し元が既存契約上それを明示的に選べる経路だけで行う（2026-08-02T02:30:46Z、Guide me、「すべて推奨で」）

## Q3. #1878 の永続化失敗の伝播境界

`persistBlocked` 相当が失敗したとき、既存コードとの整合を保ちながら偽成功と部分更新を防ぐ契約を決める。

- A. 既存 Result 境界を維持（推奨）: 既存の判別可能な Result／exit-code idiom で呼び出し元まで伝播し、全 callsite に検査を要求する。失敗時は state／audit を byte-identical に保ち、新しい全域 Result 型は導入しない
- B. 新しい全域 Result 型: この intent で persistence／state 系 API を共通 Result 型へ統一する
- C. 例外統一: 永続化失敗はすべて throw し、最上位だけで処理する
- D. ログ後継続: error を記録し、主処理は成功として続ける
- X. Other (please specify)

[Answer]: A — 既存 Result 境界を維持する。既存の判別可能な Result／exit-code idiom で呼び出し元まで伝播し、全 callsite に検査を要求する。失敗時は state／audit を byte-identical に保ち、新しい全域 Result 型は導入しない（2026-08-02T02:30:46Z、Guide me、「すべて推奨で」）

## Q4. 偽陽性率5%以下の分母と証跡

S-02 を再現可能に判定するため、偽陽性率の計算単位を固定する。

- A. 検出 finding 単位（推奨）: 3 authored roots の完全走査で得た全 finding を TP／FP に根拠付き分類し、`FP ÷ (TP + FP) × 100` を5%以下にする。fixture の100%分類は別指標として維持する
- B. ファイル単位: 偽陽性を含むファイル数を走査ファイル総数で割る
- C. 行単位: 偽陽性行数を走査対象 LOC で割る
- D. 数値なし: レビューで許容可能と判断できれば合格とする
- X. Other (please specify)

[Answer]: A — 検出 finding 単位。3 authored roots の完全走査で得た全 finding を TP／FP に根拠付き分類し、`FP ÷ (TP + FP) × 100` を5%以下にする。fixture の100%分類は別指標として維持する（2026-08-02T02:30:46Z、Guide me、「すべて推奨で」）

## Q5. baseline／exemption 増加の例外経路

初期 census の登録後に真に新しい既存債務や intentional drop が必要になった場合の統治境界を決める。

- A. 通常変更では増加不可（推奨）: 初期の全件分類でだけ台帳を作成し、以後の増加は CI で拒否する。必要なら理由・影響・代替案を示す明示的 scope change と人間再承認を先に行う
- B. 理由があれば通常 PR で増加可: 非空理由とレビューだけで baseline／exemption の追加を許す
- C. baseline のみ通常増加可: exemption は shrink-only のまま、既存債務は通常 PR で追加できる
- D. exemption のみ通常増加可: baseline は shrink-only のまま、intentional drop は理由付きで追加できる
- X. Other (please specify)

[Answer]: A — 通常変更では増加不可。初期の全件分類でだけ台帳を作成し、以後の増加は CI で拒否する。必要なら理由・影響・代替案を示す明示的 scope change と人間再承認を先に行う（2026-08-02T02:30:46Z、Guide me、「すべて推奨で」）

## 合意サマリの確認

- A. 確認OK（推奨）: Q1〜Q5 の回答を確定し、requirements.md を生成する
- B. 修正する: 対象の質問番号と変更内容を指定する
- X. Other (please specify)

[Answer]: A — 確認OK。Q1〜Q5 の回答を確定し、requirements.md を生成する（2026-08-02T02:31:35Z、Guide me、ユーザー回答「1」）

## Q6. #1878 の commit 前後における失敗契約

既存の transactional outbox は、state の rename 後に audit append が失敗しても、commit 済み state と保留 outbox を維持し、後続 drain で audit を収束させる。Q3 の「失敗時は state／audit を byte-identical」を全失敗点へ適用すると、この既存契約と矛盾するため境界を確定する。

- A. commit 境界に合わせる（推奨）: commit 前の失敗は state／audit を byte-identical に保つ。directory fsync 失敗は durability-unknown として成功を返さず次回 read で整合させる。commit 後の audit append／outbox clear 失敗は、commit 済み state と transactional outbox を許容し、偽成功による喪失を起こさず後続 drain で収束させる
- B. commit 後も rollback する: audit append／outbox clear 失敗時に state も旧 bytes へ戻し、常に state／audit を byte-identical にする
- C. outbox 保留を利用者向け失敗にする: commit 済み state は維持するが、audit が drain されるまで呼び出し元へ失敗として返す
- X. Other (please specify)

[Answer]: A — commit 境界に合わせる。commit 前の失敗は state／audit を byte-identical に保つ。directory fsync 失敗は durability-unknown として成功を返さず次回 read で整合させる。commit 後の audit append／outbox clear 失敗は、commit 済み state と transactional outbox を許容し、偽成功による喪失を起こさず後続 drain で収束させる（2026-08-02T02:44:00Z、Guide me、ユーザー回答「1」）

## Q7. baseline の確定時点と S-06 の比較対象

`scope-document.md` は「#1878／#1874 修正後に残存 TP を baseline 登録」とする一方、依存シーケンスには修正前の「初期ベースライン確定」、S-06 には「baseline 件数の修正前後比較」があり、正本 baseline の確定時点が矛盾している。改訂で正準語彙を固定する。

- A. 修正前は candidate、修正後に初回 commit（推奨）: 修正前は census `C_pre` と candidate TP 集合 `B_pre` を evidence として凍結するが CI baseline にはしない。修正後の残存 TP 集合 `B0` を初回 committed baseline とする。S-06 は `B_pre` と `B0` の identity 集合差分で減少を判定し、`scope-document.md` の「初期ベースライン」は「candidate baseline」へ用語訂正する
- B. 修正前 baseline を一度 commit: `B_pre` を初回 CI baseline として commit し、修正と同時に `B0` へ shrink する。「修正後に登録」は2回目の登録と解釈する
- C. baseline の前後比較を廃止: 修正前後は raw census だけを比較し、baseline は修正後の `B0` だけを持つ。S-06 から baseline の語を削除する
- X. Other (please specify)

[Answer]: A — 修正前は census `C_pre` と candidate TP 集合 `B_pre` を evidence として凍結するが CI baseline にはしない。修正後の残存 TP 集合 `B0` を初回 committed baseline とする。S-06 は `B_pre` と `B0` の identity 集合差分で減少を判定し、`scope-document.md` の「初期ベースライン」は「candidate baseline」へ用語訂正する（2026-08-02T03:00:29Z、Modify、ユーザー回答「1」）
