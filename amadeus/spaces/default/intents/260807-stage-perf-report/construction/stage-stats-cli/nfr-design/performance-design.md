# Performance Design — stage-stats-cli(nfr-design)

上流入力(consumes 全数): business-logic-model(A1〜A9 の処理列を性能設計の対象として消費)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements ステージが本スコープで SKIP のため不在(設計上の欠落)— 代替正本は inception の requirements.md NFR-1〜NFR-5 とする(捏造補完しない)

## 性能目標(NFR-1 の設計化)

- 上限: observed 全コーパス(222 シャード・131,074 行+record 691 ファイル)の走査+集計+出力を **60 秒以内**(回帰上限)。実測接地: RE 試作 aggregator は数秒で完走 — 上限には大きな余裕がある
- 検証: t482(integration)で実行時間の回帰上限を assert(実時間待機を作らない範囲の軽量測定 — cid:build-and-test:bt-timeout-verification-shape の趣旨に従い、上限は緩い安全帯として固定)

## 性能設計(機構)

- **単一パス・ストリーミング走査**: A1 はシャード単位に逐次読取し、レコードを一度だけ走査して各集計器(窓・センサー・モデル)へ供給する。二次結合・全体ソートの反復を作らない(ステージ表の最終ソートのみ O(k log k)、k = ステージ数)
- **メモリ上限の構造**: 保持するのは窓・区間・集計 Map のみ(行テキストは保持しない)。observed 規模(窓 1,532)では数 MB 級 — 明示的なストリーミング解放機構は不要(過剰設計の回避)
- **cache 層は設けない**(cid:nfr-design:c1 — 単発実行の決定的 CLI に cache は複雑性の純増。決定性 FR-6 AC i とも競合)

## 縮退・退行の扱い

- 60 秒超過は「欠陥」ではなく回帰シグナル — t482 の上限 assert が赤くなった時点でプロファイルし、走査の多重化(同一シャード再読)混入を第一容疑とする

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T22:22:11Z
- **Iteration:** 1
- **Scope decision:** none

5成果物とも consumes 不在(nfr-requirements SKIP)を正しく宣言し requirements.md を代替正本として扱い、CLI の業務特性に比例した設計(セレモニー不適用+fail-loud/決定的再実行/バケット集約)を選択。business-logic-model の A1〜A9・恒等 W/M と整合し、構造的保証は層別に明示。残る指摘は FD 側 FOLLOW-UP の縁辺ケースの NFR 側明文化不足のみで BLOCKER なし。

### Findings

- FOLLOW-UP | reliability-design.md:9,13; business-logic-model.md:38,44-46,66 — zeroSecond/unclosedIdle の相互排他(FD iteration 2 FOLLOW-UP)について、落ちる実証節は両条件同時成立 fixture を明記済みだが、判定順序の排他化そのものが reliability-design 本文に設計として明文化されていない — reliability-design か logical-components に排他順序を一言追記することを推奨。
- NIT | performance-design.md:7 — 60秒上限の根拠が「数秒で完走」の定性表現のみで対象コーパス規模への定量実測値の記載がない(設計化としては現状でも十分接地)。
