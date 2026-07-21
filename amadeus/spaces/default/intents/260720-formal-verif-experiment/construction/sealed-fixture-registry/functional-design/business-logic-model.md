# Business Logic Model — sealed-fixture-registry

## 上流契約と責務

本Unitは、`unit-of-work.md` のsealed-fixture-registry責務、`unit-of-work-story-map.md` のS-1/S-4/S-6/S-8/S-9、`requirements.md` のFR-1〜FR-3・NFR-2/NFR-3、`components.md` のSealed Fixture Registry、`component-methods.md` のseal / reveal / promotion methods、`services.md` の`fixture-seal` / `fixture-reveal` lifecycleを実装可能なfail-closed modelへ落とす。arm code、verdict oracle、promotion時機、採否は所有しない。

処理は次の5段階である。

1. 候補predicateと一次資料をclosed defect rowへparseする。
2. isolated worktreeでgreen baselineと単独再注入redを実測し、独立falling proofを作る。
3. D-COUNTを7または根拠ある5へ閉じ、各fixtureをscanしてsealする。
4. Coordinatorのfreeze eventに対して必要最小限のfixtureだけを開示する。
5. 両freeze、skeleton pass、件数、scan、proofを検証したpermission receiptでmanifestをpromotionする。

## Defect closureとfalling proof

candidate rowはpredicate ID、source PR / Issue、fix commit、baseline SHA、target regression、non-target regression set、逆適用patch、allowed hunk set、affected paths、root clusterを必須とする。PR同梱の追加防御を別predicateと数える場合も、同じroot causeや観測predicateとの重複がないことを明示する。

各proofは同一healthy baselineから作った使い捨てisolated worktreeで実行する。baselineではtargetとnon-target regressionが全てgreenでなければ開始しない。candidate patchだけを適用し、実diffがallowed hunksへ完全包含され、targetだけが期待どおりred、non-target集合がbaselineと同じ結果である場合だけ`IndependentFallingProof`をmintする。command、exit、test identity、baseline / patch / resulting tree hash、raw artifact referenceを保存し、会話上の申告やexit codeだけでproofを作らない。

7 predicate全てが独立proofを持つ場合だけD-COUNT=7とする。1件でも独立実証不能なら、事前定義したroot-cause equivalenceに基づき5 incident/root clusterへ全行を写像し、各cluster representativeのproofを再検証する。6件はclosed cardinalityに存在せず、7/5以外ならbranch作成・seal・promotionを拒否する。縮約はrequirements成功指標とmatrix分母の訂正receiptを伴うまで有効化しない。

## Branch / patch isolationとseal

D-COUNT closure後、全fixture branchは同じbaseline SHAから作る。1 branchには1 registry rowのpatchだけを適用し、resulting diffをcanonical hunk identity列へ正準化する。branch headの親、injection commit、tree hash、patch hash、allowed hunk set、proof identityを相互参照する。別clusterのhunk、baseline drift、merge commit、複数fixture patchを検出したbranchはsealしない。

seal前に、patch、fixture metadata、disclosure payload、参照するsynthetic dataからclosed `SealedPayloadManifest`を生成する。manifestは全logical path、content hash、byte lengthをcanonical順で列挙し、symlink、directory entry、allowlist外pathを拒否する。scanner inputはcaller指定列ではなくこのmanifestからだけ導出する。scannerは固定version / rule-set identity、manifest identity、走査entry identity、secret / personal-data / external-election-storeの分類別match数をmachine-readable receiptへ記録する。seal時にmanifest entriesとscan entriesのbijectionを検証し、欠落・重複・追加が0件かつ全分類0件だけをpassとする。scanner failure、読めないpath、rule-set driftを0件として扱わず、match内容そのものをreceiptへ複製しない。

`sealFixture`はproof、branch isolation、scan receiptを再検証し、sealed payloadをcontent-addressed immutable recordへatomic publishする。seal identityはidentity fieldを除いたcanonical payloadから生成する。既存identityの同一bytes再送だけを成功とし、overwrite、削除、別bytes衝突を拒否する。sealed record path、defect ID、patch、期待failure、既存test名はarm authoring input manifestから除外する。

## Revealとpromotion

`revealFixture`はCoordinatorがmintした有効な`ARM_FROZEN` event、対象arm / worktree、fixture alias、sealed identityを入力とする。eventが不存在、別arm、sealより前、既開示、または現在stateで禁止なら開示しない。Arm Tの最初の開示はfreeze後の#1252 aliasだけとし、skeleton evidence確定前に残fixtureを開示しない。

開示transactionはappend-only `DisclosureEvent`と、event ID / sealed identity / target arm / frozen event / worktree / materialization path allowlistへbindしたopaque `DisclosureGrant`を同じstaging directoryへ置き、Registry単一writer lock下で共有arm-fixture successor slotへexclusive atomic renameする。arm codeはsealed storeを直接readできず、`materializeDisclosure(grant)`だけがcommit済みeventとgrant bindingを再検証してpayloadをallowlisted worktree pathへ提供し、content identityを再照合したmaterialization receiptをappendする。eventなしのcopy、別worktree / armでのgrant使用、payload driftを拒否する。

promotionはCoordinatorが両arm freezeと`SKELETON_PASSED`をfold検証して発行したsingle-use `ManifestPromotionPermission`を必須とする。Registryはpermissionのstate identity、両freeze event IDs、closed D-COUNT、全fixture proof / branch / payload manifest / scan / seal identities、disclosure順を照合する。1件でも欠損・重複・unknown rowがあればmanifestを生成しない。

repo-local manifestはhealthy baseline、D-COUNT、canonical fixture alias順、branch / injection SHA、patch / proof / payload manifest / scan / seal identitiesだけを公開する。arm freeze後なので期待predicateへの参照を含められるが、secret / personal data / external store contentは含めない。manifestはidentity除外canonical JSONのSHA-256でcontent-addressする。

publish時はpermission nonceを共有successor keyとする `promotions/by-permission/<nonce>` を唯一のcommit先にする。Registry単一writer lock下でnonce未消費とstateを再検証し、permission claim、manifest、append-only promotion eventを同じstaged transaction directoryからsuccessor keyへexclusive atomic renameする。同一nonce・同一canonical transactionの再送は全bytes再照合後に同じsuccess receiptへ収束し、同一nonce・異内容、別manifest identityへの再利用、未承認promotionを拒否する。

## Failure flowとtest境界

parse、proof、branch、scan、seal、reveal、promotion errorはclosed discriminatorと対象identityを保持する。scan tool failureを0 findingsへ、proof欠損を未検出へ、D-COUNT mismatchを警告へ丸めない。fixture branchやsealed recordをmainへmergeしない。

test doubleとtemporary repositoryで、baseline red、target非red、non-target波及、wrong parent / branch、allowed hunk逸脱、7→6禁止、根拠なし5縮約、scan manifest entry欠落 / 重複 / 追加、secret / personal data / external store match、scanner failure、freeze前 / 別arm reveal、eventなしcopy、grantの別worktree使用、#1252以外の先行開示、permission欠損・並行二重消費・同一nonce異内容、D-COUNT mismatch、atomic publish collisionを検証する。
