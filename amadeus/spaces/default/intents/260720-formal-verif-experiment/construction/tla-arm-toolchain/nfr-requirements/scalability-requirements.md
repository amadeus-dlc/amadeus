# Scalability Requirements — tla-arm-toolchain

## Finite capacity

`business-logic-model.md` のFiniteElectionDomain、`business-rules.md` のclosed domain、`requirements.md` のexhaustive-small profile、`technology-stack.md` のsingle-process local runに従う。voters=3、valid choices=3、submitted tokens=5、received tokens=3、GoA 1..8、initial / amend各voter1、global hold1、workers1を固定する。

## Scaling behavior

- domain cardinality、action union、invariant set、profileをruntime入力で増減しない。
- TLCは1 cell / 1 process / 1 workerで到達可能state graphのfixed pointまで探索する。horizontal workerやdistributed TLCを追加しない。
- state count、queue、depthはsafe integer上限内でparseし、overflowや負値をHARNESS_ERRORにする。
- jar cacheはdescriptor identityごとにimmutable artifact 1件、single acquisition staging slot、failed quarantine最大1件 / 128 MiBを持ち、version変更は新revision namespaceとする。

## Growth policy

voter / choice / timestamp / GoA / action budget / workers / heap / timeout変更は全cell新revisionを要する。部分的なbound拡張、adaptive depth、旧/new profile混在を禁止する。

## Verification

全closed cardinalityのacceptと各+1 / unknown token reject、workers 2 reject、profile identity drift、state stats overflow、2 revision artifact分離、repeated failed download後もstaging 1 / quarantine 1を検証する。active TLC process数1、run中download0、unknown action0を合否とする。
