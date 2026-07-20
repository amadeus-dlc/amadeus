# Architecture Decisions — 形式検証対照実験

## 上流入力

本ADR集合は `requirements.md`、brownfieldの `architecture.md` と `component-inventory.md`、実行規律の `team-practices.md`、およびE-FVEAD1〜3を正本とする。未決判断は残していない。

## ADR-1 Repo-local modular monolith

### Context

対象は既存TypeScript/Bun CLIの短期対照実験であり、外部利用者、独立deploy、database、AWS resource、UIがない。

### Decision

`scripts/formal-verif/`内のCLI + pure modulesを採用し、process分離はTLC / Bun subprocessだけに限定する。

### Consequences

- repositoryの既存test / script規律を再利用できる。
- service運用コストは0。production CIへの昇格は別intentとなる。
- module interfaceでarm / evaluatorを分離する責任がある。

### Alternatives Rejected

- Separate package: 実験段階でpackage / release境界を増やす。
- Microservice / AWS: NFRと利用形態に根拠がなく、不可逆な運用面を増やす。

Reversibility: 高。勝者armだけを後でpackageへ抽出できる。

## ADR-2 Split ownership with sealed-to-public fixture promotion

### Context

再利用可能資産はrepositoryに残したいが、freeze前のdefect情報公開はblind性を破る。

### Decision

E-FVEAD3=Aを採用する。runner / arm / schemaはrepo-local、raw evidenceはintent recordへ置く。fixture manifestはauthoring中はrecord内でsealし、両arm freeze後だけ `tests/formal-verif/fixtures/` へ昇格する。walking-skeletonの#1252開示はArm T専用実行worktreeに限定し、Arm Sへ伝播しない。

### Consequences

- reproducibilityとblind性を両立する。
- Coordinatorが公開順序とhashを検査する必要がある。
- Phase PRには実装を含めず、Construction完了時に昇格する。

### Alternatives Rejected

- Record-only: 勝者arm / reusable runnerの本採用初版性が弱い。
- Repository-only: freeze前漏洩とraw evidence混入の危険がある。
- CI-only: artifact retention終了後に再現不能。

Reversibility: 中。証跡pathはreport linkとなるためConstruction開始後の変更コストがある。

## ADR-3 Exhaustive-small TLC profile

### Context

深さ上限は未探索を成功に見せ得る。対象状態機械は有限かつ小さい。

### Decision

E-FVEAD2=Aを採用する。voter 3、choice 3、initial / amendは各voter上限1、holdはglobal上限1とする。submittedAt / amend-refは3つの正規時刻とinvalid-format / invalid-date、receivedAtは3つの正規時刻の有限domainを持ち、`TLC_WORKERS=1`で到達可能state graphを固定点まで探索する。completion markerとstate統計が揃わず120秒以内に完走しなければ`HARNESS_ERROR`であり、深さ制限による部分探索を`NOT_DETECTED`へ変換しない。

### Consequences

- boundの意味がdomain cardinalityとして説明可能になる。
- parallel TLCの非決定性とrunner競合を避ける。
- state explosion時はArm Tが失格し得るが、結果を偽装しない。

### Alternatives Rejected

- 2×2 minimal: 3者間のchoice / resolve挙動を覆う根拠が弱い。
- Depth 20: exploration completenessがない。
- Two-profile: matrix間で条件が不均一になる。

Reversibility: 低〜中。bound変更は全TLC cellの新revision再測定を要する。

## ADR-4 Fixed benchmark profile and closed Pareto

### Context

CI時間は揺らぎ、反復数変更は比較を汚染する。異なる単位の重み付き合算は恣意的である。

### Decision

E-FVEAD1=Aを採用する。1 runはhealthy baselineに続けてmanifest正準順の全D-COUNTを1 armへserial適用するfull suiteとする。1 full-suite warmup、5 measured full suites、suiteごとに120秒、suite総時間中央値を固定する。全runのcell verdict一致、全件`DETECTED`、`HARNESS_ERROR`なし、baseline false positive 0をhard eligibilityとし、その後だけ`ARM_AUTHORED_LOC`、authoring event間経過時間、CI suite中央値をPareto比較する。

### Consequences

- raw sampleから代表値と採否を再計算できる。
- 3 / 7 runより速度 / 安定性の中間になる。
- trade-offが残る場合は勝者を作らず「両方適格・勝者なし」となる。

### Alternatives Rejected

- Adaptive runs: armごとに測定回数が変わり得る。
- Lexicographic / weighted score: 単位間優先度を捏造する。
- CI軸除外: 上流成功指標を満たさない。

Reversibility: 低。最初の測定後は変更せず、変更時は全cellの新revisionとする。

## ADR-5 Verified TLC acquisition

### Context

TLCは未導入で、binaryをcommitするとrepositoryを肥大化させる一方、実行時downloadは再現性とavailabilityを壊す。

### Decision

公式latest release v1.7.4の `tla2tools.jar` を専用fetch commandでignored cacheへ取得し、SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` を検証する。CIではacquisition stepとoffline execution stepを分離する。

### Consequences

- binaryをGit管理せずsupply-chain evidenceを残せる。
- acquisition failureはArm Tの`HARNESS_ERROR`となる。
- checksum更新は明示ADR改訂と全再測定を要する。

### Alternatives Rejected

- Jar commit: binary review / repository size負担。
- Floating latest URL: byte再現性がない。
- Build from source:実験工数へ不必要なtoolchainを持ち込む。

Reversibility: 高。version / checksum pairを新revisionで置換できる。

## ADR-6 Coordinator-minted authoring events

### Context

commit timestampやarm authorの自己申告では実装経過時間を公平に比較できず、freeze後開示も証明できない。

### Decision

Coordinatorがpublic-input hashとclean worktreeを検証した直後に`ARM_AUTHORING_STARTED`、test / clean freeze SHA / input hash不変を検証した直後に`ARM_FROZEN`をappend-only ledgerへmintする。経過時間はこのUTC timestamp差だけを使う。

### Consequences

- author間で同じ開始 / 終了条件を持つ。
- idle timeも経過時間に含まれるが、恣意的なactive-time自己申告を避ける。
- ledger破損・event欠損はそのarmを比較不能にする。

### Alternatives Rejected

- Commit timestamp: authorが変更可能で開始eventを表せない。
- Self-reported active minutes:検証不能。
- CI durationで代用: authoring costではない。

Reversibility: 中。event schemaはreport provenanceに固定される。
