# Security Test Instructions — fix-2143-phase-boundary-approval

## 脅威面と検証

- **承認バイパス**: phase-check guard は不変(C-1)。境界テストが「artifact 不在 → 拒否」を3境界+SKIP構成で pin(fail-closed 維持、NFR-1)。
- **advisory receipt の偽造**: `record` は直近 real `HUMAN_TURN` への provenance 束縛・shard 一致・grounded 検査・同一 HUMAN_TURN 二重消費拒否を既存経路と同一に課す(t-advisory-choice-record が拒否アームを全数 pin)。
- **人間ターンなしの確定**: HUMAN_TURN 不在 / pending 不在 / DECISION_RECORDED 提示未記録はいずれも typed error で拒否(無音 false なし、FR-5d)。

## 実測

2026-08-05: 拒否アーム含む 15 pass / 0 fail。mutation probe による guard 無効化の検出も実証済み。
