# Team Allocation — 形式検証対照実験

## 上流入力と割当原則

本割当は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`を入力とする。Team FormationはSKIPであり、未確定の人名や常設teamを捏造しない。E-FVEDP2=Aに従い、Constructionでは役割分離したAI mob / agent sessionを使い、arm独立性をidentity・worktree・session・input allowlistで機械的に立証する。

## 役割とアクセス境界

| Role | Bolt | Owns | 読取可能 | 禁止 |
| --- | --- | --- | --- | --- |
| Shared contract / coordinator mob | B1 | U1、公開schema、state validator、provenance mint | 公開契約、healthy baseline | arm固有oracleの解釈、sealed fixture本文 |
| Registry / evidence mob | B1 | U2、U3、sealed registry、raw evidence | defect一次資料、許可hunk | Arm T / S author sessionへのprivate入力転送 |
| Arm T author | B1 | U4のTLA model / adapter freeze | 公開契約、healthy baseline、verified TLC toolchain | sealed registry、Arm S、期待failure、既存回帰test名 |
| Skeleton integrator | B1 | U5専用integration harness | frozen Arm T、限定開示#1252、U1〜U3 ports | Arm S author contextへのB1 evidence転送 |
| Arm S author | B2 | U6のTS oracle freeze | B1 branchを含まない同一healthy baseline、公開契約 | B1 evidence、Arm T path、sealed fixture詳細、期待failure |
| Integration / measurement mob | B3 | U7、manifest promotion後のmatrix / cost | 両freeze成立後の両arm、promoted manifest | freeze前のarm横断アクセス、raw evidence改変 |
| Decision / report mob | B4 | U8 evaluator、report、wiring-only root | verified matrix / raw cost、U1〜U7 handlers | 採否ロジックのwiring moduleへの重複実装 |
| Independent quality verifier | 各Bolt gate | DoD、provenance、allowlist、testの検証 | gate対象の完成証拠 | authorと同一identityによる自己承認 |

## Bolt別mob構成

### B1

Shared contract / coordinator、Registry / evidence、Arm T author、Skeleton integratorを分ける。U2〜U4はU1 public ports確定後に独立起草できるが、B1 closureは各Unit境界と専用U5 harnessのend-to-end成功で判定する。U1単独Boltは禁止する。

### B2

Arm S authorはB1とは別identity、別session、別worktreeで作業し、同一healthy baselineをbaseにする。prompt / context / filesystem inputをallowlist化し、B1 evidence、Arm T path、sealed fixture詳細が0件であることをfreeze前に検査する。

### B3

Integration / measurement mobは両arm freeze後にだけ開始する。frozen成果物は内容変更せず統合し、変更が必要な場合は初回結果を上書きせず新revisionとして扱う。

### B4

Decision / report mobがclosed evaluatorとreportを実装し、別のquality verifierが同一evidenceから判定を再計算する。wiring-only rootはhandler登録だけを所有する。

## 機械的provenance

各arm authorについて次を必須記録とする。

- author identityとrole
- session identifier
- worktree path
- healthy baseline SHA
- 公開input allowlistとcanonical input hash
- clean-worktree receipt
- freeze SHA
- freeze前に参照したpath一覧と禁止入力0件の検査結果

Coordinatorだけがこれらをmintし、author自身の自己申告だけではfreezeを成立させない。integration開始時には両armのfreeze SHAとallowlist receiptを再検証する。

## 実行並列性と承認

Bolt間はB1→B2→B3→B4の直列である。B1内部のU2 / U3 / U4だけはU1 ports成立後に並行起草可能だが、B1 gateは全Unitのtest境界とU5 closureをまとめて確認する。AIはmain mergeや不可逆な外部操作を行わず、各gateで人間へhandoffする。
