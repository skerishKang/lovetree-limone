export type CrystalAngleId = "front" | "threequarter" | "profile" | "rear";
export type CrystalExpressionId = "sleeping" | "eyes-open" | "watching" | "smiling";
export type CrystalMaterialId = "rose" | "ice" | "obsidian" | "aurora";

export const LINEAGE_56_REVIEW_LABEL = "NATIVE FIDELITY REVIEW — SOURCE DEMO VALUES ONLY";

export const LINEAGE_56_SOURCE = {
  lineageId: "lt-56-crystal-memory-atelier",
  revisionId: "56-v3-direct-expression-rotation",
  candidateId: "lineage:56-v3-crystal-memory-atelier",
  sourceFile: "index-v3.html",
  sourceDriveId: "1Sd9KFxEFWoJKHiiidaRspGh2bALg9iOr",
  sourceBytes: 19_262,
  sourceSha256: "9a7bb3415dade7d6fd04cecfe1be6ae04595d3b46d326f2b596dab819633a66c",
  sourceGitBlobSha: "883e9f0aa1fe18d79fdbb6cc7163ecf69ae63d88",
  sourcePath: "reference/lineage-56-crystal-memory-atelier-v3/source/index-v3.html",
  runnerRoute: "/design-lab/lineages/56/v3",
  implementationMode: "native-react-2.5d-review",
  productBoundary: "design-lab-candidate-only",
  sourceDemoMoments: 148,
  sourceDemoGoal: 200,
  sourceDemoMilestones: [100, 200, 365] as const,
} as const;

export const LINEAGE_56_ASSETS = [
  { id: "front", kind: "angle", file: "crystal-front.png", driveId: "1MEbm4oqQtZQsTuTkwXH7lTqwoXeECTUT", bytes: 548_429, width: 627, height: 627, colorType: 2, sha256: "22ff5cbd7a125bc2d6fa955668e5c2a3140840aaefee63a6fefaa33ce7c6598a", gitBlobSha: "7b8e604aebf7fd5bc2306d6256aedc8f7e281de5" },
  { id: "threequarter", kind: "angle", file: "crystal-threequarter.png", driveId: "1okeYPdKQqfYbuX4_KoPgcxt0c0L_md_o", bytes: 548_301, width: 627, height: 627, colorType: 2, sha256: "f42888b30bf417c486b0c28dbb153c2983de42c6a14ed81c74058b22d2842e9b", gitBlobSha: "e606abd762e58715cd7b62a91a0a0a2233c54f88" },
  { id: "profile", kind: "angle", file: "crystal-profile.png", driveId: "191d_QX80-lYbPfa8D6LCrTXnylzAh691", bytes: 550_521, width: 627, height: 627, colorType: 2, sha256: "a7a3f9c92bccfd75927a2f05f7866c1d2517e705737a4386ac36cc0169df8138", gitBlobSha: "3cca9fc05610c83e1ce64a1fff002d0b6dd683ee" },
  { id: "rear", kind: "angle", file: "crystal-rear.png", driveId: "1NXRWiVUsPEYLatgrxNZRPsbr9CtNEq7m", bytes: 568_418, width: 627, height: 627, colorType: 2, sha256: "fdb40900e5c8e971ec2b5d0c20a3aeb6f33ec2d169ee7d0a109629962d716217", gitBlobSha: "a6d3f8493410d5b1252caa5200008e6433f1a0bc" },
  { id: "sleeping", kind: "expression", file: "crystal-awake-01.png", driveId: "1upW0xiLrU2JKMaJqMEANHpLck9jGiaaQ", bytes: 559_524, width: 627, height: 627, colorType: 2, sha256: "c8fa0d3849e7e841d23f3c227eac31161623f36f4ba6470e689aa4e0806d8b9c", gitBlobSha: "32f9a9a76dbd7262bd7aca493acbab06202a2814" },
  { id: "eyes-open", kind: "expression", file: "crystal-awake-02.png", driveId: "18CGPj5qLyQGYq_kuVWUZvhvbOTbrWrBi", bytes: 555_716, width: 627, height: 627, colorType: 2, sha256: "bead2e9c2c834e716bb903516abdaa7de9a784e5582516272b1c5c0e88221d84", gitBlobSha: "b0f2a2e5822842994c0dbc84bfb99be4cd0a3e6e" },
  { id: "watching", kind: "expression", file: "crystal-awake-03.png", driveId: "1Am493SFeLzxPv6lNTGqttqfuJbUe0Une", bytes: 558_172, width: 627, height: 627, colorType: 2, sha256: "75893d9563fffe35cac171c7fb47feda9455494dc7c3e015f49f75ab992a6421", gitBlobSha: "b91741222330167db94a48219d93eb330541bcae" },
  { id: "smiling", kind: "expression", file: "crystal-awake-04.png", driveId: "17qtqWjLUfpGPVze_F-0mCDy8WZiSt9lU", bytes: 557_520, width: 627, height: 627, colorType: 2, sha256: "4f39a44fbd69c9c0c91aa8c15604c42e55bce97b385416abf898257675e80811", gitBlobSha: "3512d422e9bbb283e674d16831df17edf74f60db" },
] as const;

export const CRYSTAL_ANGLE_ORDER: readonly CrystalAngleId[] = ["front", "threequarter", "profile", "rear"];
export const CRYSTAL_EXPRESSION_ORDER: readonly CrystalExpressionId[] = ["sleeping", "eyes-open", "watching", "smiling"];
export const CRYSTAL_EXPRESSION_AUTOPLAY: readonly number[] = [0, 1, 2, 3, 2, 1];
export const CRYSTAL_DRAG_START_PX = 10;
export const CRYSTAL_ANGLE_STEP_PX = 48;
export const CRYSTAL_EXPRESSION_INTERVAL_MS = 1150;
export const CRYSTAL_ASSET_ROOT = "/reference/lineage-56-crystal-memory-atelier-v3/assets";
