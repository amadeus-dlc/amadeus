# Memory — units-generation (260801-tla-multi-model)

## Interpretations
- 2026-08-01T17:30:00Z — (conductor 記録)reviewer iteration 1 READY(findings 0)。compile 済み(bolt_dag 5 units / 4 batches)

- 2026-08-01T20:30:00Z — stories 未生成(user-stories SKIP)のため story-map は FR→Unit 写像で代替; requirements.md の FR が最小受入単位
- 2026-08-01T20:30:00Z — テスト採番は現行最大 t401 の次から連番(t402-t406)を予約; 直近 intent(260731-formal-verif-value-chain)の「テスト採番」表記流儀に倣う

## Deviations

- 2026-08-01T20:30:00Z — Step 3-5 の Q&A/計画承認は delegation 実行のためユーザー対話なしで実施; 設計ハンドオフの U1-U5 案をそのまま計画として採用(境界変更なし)

## Tradeoffs

- 2026-08-01T20:30:00Z — C8(model-map.json)を u3(FormalElection vocabulary)/u4(MirrorLifecycle 宣言)に分割; 同一ファイルを2 Unit が触るが別エントリのため行競合なし。1 Unit=1 エントリ群の方が red 実証の帰属が明確になるため採用
- 2026-08-01T20:30:00Z — 実走系テスト(tlc-runtime/run-model-check-real)は「維持」に仮仕分け; 語彙供給切替で落ちる場合は u3 改訂へ再仕分けする条件を明記

## Open questions

- 2026-08-01T20:30:00Z — FR-5 の 30 分 timeout 内実測は未検証(ADR-8 measure-first どおり u5 で実測し、超過時は time-box 後続裁定へ)
