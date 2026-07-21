# Business Rules — sealed-fixture-registry

## Traceability

以下は`unit-of-work.md` のU2完成条件、`unit-of-work-story-map.md` のS-1/S-4/S-6/S-8/S-9、`requirements.md` のFR-1〜FR-3・NFR-2/NFR-3、`components.md` のRegistry境界、`component-methods.md` のfixture methods、`services.md` の中央orchestrationを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜07 | FR-1、NFR-2、S-1 |
| BR-08〜12 | FR-2、S-4/S-8 |
| BR-13〜17 | NFR-3、S-9 |
| BR-18〜23 | FR-3、S-4/S-6/S-8 |

## Defect closure規則

- **BR-01 Closed row:** defect ID、source PR / Issue、fix commit、predicate、baseline expectation、patch、regression、affected path、root clusterが揃わないrowを受理しない。
- **BR-02 Same baseline:** 全proofとfixture branchは同じhealthy origin/main baseline SHAを使う。
- **BR-03 Green baseline:** target / non-target regressionがbaselineで全greenでなければfalling proofを開始しない。
- **BR-04 Independent red:** candidate patch適用後、target predicateだけがredでnon-target集合がbaselineと同じ場合だけ独立proofをmintする。
- **BR-05 No double count:** 同じroot causeまたは同じ観測predicateを2 rowとして数えない。
- **BR-06 Closed cardinality:** 7 independent proofsが揃えばD-COUNT=7、1件でも不能なら根拠ある5 root clusterへ全体を縮約する。6を禁止する。
- **BR-07 Denominator sync:** D-COUNTとrequirements成功指標 / matrix分母の訂正receiptが一致するまでbranch作成・sealを禁止する。

## Branch / seal規則

- **BR-08 One fixture branch:** branchはbaselineの直接系譜に1 fixture patchだけを持ち、merge commitや別cluster hunkを含まない。
- **BR-09 Hunk containment:** baselineとの差分はcanonical allowed hunk setへ完全包含されなければならない。
- **BR-10 Provenance linkage:** branch名、baseline SHA、injection SHA、tree / patch hash、proof identityを相互参照する。
- **BR-11 Immutable seal:** proof、branch、payload manifest、scan bijectionが全validの場合だけcontent-addressed sealed recordをatomic publishし、更新・削除を許さない。
- **BR-12 Blind exclusion:** sealed path、defect ID、patch、期待failure、既存regression名をarm freeze前の入力manifestへ含めない。

## Data safety規則

- **BR-13 Complete scan:** sealed payload manifestへpatch、metadata、disclosure payload、synthetic dataの全logical path / content hash / lengthを列挙し、scanner inputをmanifestから導出する。
- **BR-14 Closed categories:** secret、personal data、external election store referenceの3分類を固定rule-setで検査する。
- **BR-15 Zero and bijection:** manifest entryとscan entryが欠落・重複・追加なしのbijectionで、3分類すべてmatch 0件の場合だけpassとする。scanner failure、read failure、rule driftを0件にしない。
- **BR-16 No sensitive receipt:** receiptは分類別count、scanner / rule-set identity、path hashだけを持ち、match contentを複製しない。
- **BR-17 Public source boundary:** fixture dataはsyntheticまたはrepository内公開recordに限定し、外部選挙storeのURI / path / contentを参照しない。

## Reveal / promotion規則

- **BR-18 Freeze-before-reveal:** 対象armの有効な`ARM_FROZEN` eventより前、別arm event、unknown fixtureで開示しない。
- **BR-19 Risk-first reveal:** Arm T freeze後の最初の開示は#1252 aliasだけとし、skeleton確定前に残fixtureを開示しない。
- **BR-20 Atomic disclosure:** arm / fixture pairのeventとtarget arm / worktree / pathへbindしたread grantを共有successor slotへatomic commitし、grant経由だけでpayloadをmaterializeする。sealed payload自体を書換えない。
- **BR-21 Permission required:** 両freezeとskeleton passを含むCoordinatorのsingle-use promotion permissionなしにmanifestを生成しない。nonce claim、manifest、promotion eventを共有nonce slotへ一括commitする。
- **BR-22 Complete manifest:** closed D-COUNT件のproof / branch / scan / seal identityがexactly oneずつ揃い、canonical alias順の場合だけpromotionする。
- **BR-23 No autonomous timing:** Registryはpromotion可否を検証するが、invoke時機、arm採否、winnerを独自決定しない。

## Negative scenarios

baseline red、target非red、non-target波及、重複root cause、6件分母、根拠なし5縮約、wrong parent、merge branch、allowed hunk逸脱、scanner / read failure、3禁止分類の各match、seal overwrite、freeze前 / 別arm reveal、#1252以外の先行開示、permission欠損・再利用、manifest件数 / identity driftをred fixtureとして固定する。
