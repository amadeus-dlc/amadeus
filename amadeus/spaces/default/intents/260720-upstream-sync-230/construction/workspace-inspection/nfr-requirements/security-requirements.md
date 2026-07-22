# Security Requirements — workspace-inspection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。workspace entries、metadata、`.gitmodules`をuntrusted filesystem inputとして扱い、root外readと誤Greenfield mutationを防ぐ。

## Filesystem trust boundary

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U06-01 | path traversal | submodule pathは非空relativeだけを受理し、absolute、drive absolute、`..` segmentをprobeしない。 | unsafe path fixtureのroot外I/O 0。 |
| SEC-U06-02 | symlink escape | depth-1 candidateからsymlink、hidden、excluded、non-directoryを除外する。 | excluded/symlink fixtureの内部read 0。 |
| SEC-U06-03 | malformed metadataの誤分類 | `.gitmodules`存在+parse可能entry 0を`inconclusive`とし、Greenfieldへ縮退しない。 | unsafe-only/malformed fixtureでmutation 0。 |
| SEC-U06-04 | incomplete observationのcommit | root/signal/candidate読取不能をpath/reason付き`inconclusive`にし、birth/stateを全mutation前rejectする。 | state/plan/graph/audit/workspace bytes不変。 |
| SEC-U06-05 | external mutation | inspectorはsubmodule init、repair、filesystem writeを実行しない。 | scan前後tree bytes一致。 |

`git submodule update --init --recursive`はremedy文字列としてのみ表示し、commandを起動しない。未取得codeのlanguageをurl/nameから推定しない。

## Data・supply-chain controls

- host pathとreasonは既存advisoryへ必要最小限投影し、credential、file content全量、network送信面を新設しない。
- new runtime dependency、service、database、UI、permission、audit event、retentionを追加しない。
- upstream sourceは検査根拠として扱い実行しない。sourceからgeneratorで6 harnessへ投影し、dist手編集を禁止する。
- `classified`だけがProject Type等のcommit pathへ進み、二値projectTypeだけを返すpublic APIを追加しない。

## Failure・compliance

read/lstat/parse failureを成功や空観測へ読み替えず、typed advisory付き`inconclusive`として処理する。detect/doctorはread-onlyで両variantを表示できるが、birth reject時はaudit emitterを呼ばない。

追加規制要件はない。既存human approval、audit、license境界を維持し、未根拠な規制適合を主張しない。

## トレーサビリティ

SEC-U06-01〜05は`business-rules.md`のBR-U06-01、07〜12、21〜24、`business-logic-model.md`のFail-closed boundary、`requirements.md`のNFR-2/3/8、`technology-stack.md`に対応する。
