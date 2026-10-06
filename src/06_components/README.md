# Reusable Components

Only Source/Codex implementations that have passed source↔split parity may become reusable components here.

A component is not source authority. It may expose adapters and product-facing contracts, but it must preserve the validated visual/interaction semantics of its contributing source family unless an explicit owner-authorized exception exists.

The #569 setup slice created no real component. The first component now
exists and is accepted at S5: `SRC064/` (#674, released for implementation
by #673 comment 6014271766, S5 accepted by CENTRAL exact-head review at
PR #675 comment 6020686874, state `S5_ACCEPTED`). Its adoption record lives
at `src/01_registry/adoptions/SRC064.json` with `adoption_status =
REUSABLE_ADAPTER_BOUND` bound to that exact owner release reference. No
consumer is wired to it yet — consumer ownership is `NONE`, MVP001 keeps
its existing files byte-unchanged, and product composition/product-route
release remain later, separately released slices (S6 is NOT released).
