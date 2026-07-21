# Security Requirements — swarm-and-next-stage

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。BoltDag、RunEvidence、CompiledGridをvalidated runtime inputとして扱い、stale evidenceによる不正advanceを防ぐ。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U03-01 | stale/別run claim | currentRunのconvergedだけを完了根拠にする。 | 別run evidence fixtureでadvance 0。 |
| SEC-U03-02 | merge failureのfalse convergence | merge failure unitをconverged集合へ入れない。 | check成功+merge failureでも同batch残留。 |
| SEC-U03-03 | scope bypass | CompiledGridでeffective SKIPを除外し、実在in-scope slugだけ返す。 | SKIP/架空slug出力0。 |
| SEC-U03-04 | projector divergence | gate表示とengine nextが同じresolver結果を使う。 | 表示/directive差分0。 |

未知/malformed inputの新failure policyを本Unitで作らず、既存C1/C2 validationを維持する。seamはlock/state/audit writeを所有しない。

## Supply chain・compliance

新runtime dependency、service、database、network、UI、credential、audit event、retentionを追加しない。追加規制要件はなく、既存human gate/audit/license境界を維持する。

## トレーサビリティ

SEC-U03-01〜04は`business-rules.md`のBR-U03-01〜16、`business-logic-model.md`のIntegration boundaries、`requirements.md`のNFR-2/3/8、`technology-stack.md`に対応する。
