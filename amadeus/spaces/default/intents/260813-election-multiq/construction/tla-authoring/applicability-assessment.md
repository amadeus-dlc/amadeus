# TLA+ Authoring — 適用性評価

入力は [requirements](../../inception/requirements-analysis/requirements.md)。経路は **not-applicable**（終端）。author-new / revise-model には進まない。

## 検査した識別子

FR-DEF-1..4, FR-BAL-1..5, FR-TAL-1..6, FR-RER-1..4, FR-COMP-1..4, FR-OBS-1..2, FR-FML-1, FR-NORM-1..2, NFR-1..5。

## 判定

並行または再開可能なアクターが状態を共有し、無音の安全性違反が残りうる subject を、**本段の残差**としては採用しない。

- FR-FML-1 / FR-TAL-2 / FR-RER-1 / FR-RER-2 は U7 で FormalElection に既に載っている。B&T の TLC run `3a25cbcd-b863-4011-b99c-e1a59c6177c5` は NOT_DETECTED。reachable behaviour の追加変更はない。
- これらをここで再選定すると、model-map の trace 交差が空のため judge は author-new に倒れ、既登録モデルを二重に書き始める。それは本段の完了条件ではない。
- 残りの FR/NFR は形・互換・観測・規範・性能であり、新しい共有状態機械を導入しない。

## この判定を覆す条件

FormalElection の reachable behaviour を変える不変量・アクターを requirements が新たに要求した場合は、その識別子を選定して revise-model へ進む。
