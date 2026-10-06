# Reusable Components

Only Source/Codex implementations that have passed source↔split parity may become reusable components here.

A component is not source authority. It may expose adapters and product-facing contracts, but it must preserve the validated visual/interaction semantics of its contributing source family unless an explicit owner-authorized exception exists.

The #569 setup slice created no real component. The first component candidate
now exists: `SRC064/` (#674 S5 candidate, released by #673 comment
6014271766, state `S5_CANDIDATE_PENDING_CENTRAL`). No consumer is wired to it
yet — MVP001 keeps its existing files byte-unchanged; consumer connection is a
later, separately released slice. Its adoption record lives at
`src/01_registry/adoptions/SRC064.json` with `adoption_status =
ADOPTION_CANDIDATE` (not `REUSABLE_ADAPTER_BOUND`).
