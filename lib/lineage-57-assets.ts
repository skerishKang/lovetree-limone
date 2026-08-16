export interface Lineage57Asset {
  filename: string;
  driveId: string;
  bytes: number;
  width: number;
  height: number;
  mode: "RGB" | "RGBA";
  sha256: string;
  targetPath: string;
}

const c = (id: string, expression: string, driveId: string, bytes: number, sha256: string): Lineage57Asset => ({
  filename: `${id}-${expression}.webp`, driveId, bytes, width: 362, height: 362, mode: "RGB", sha256,
  targetPath: `public/reference/lineage-57-living-character-world-v2/assets/characters/${id}/${id}-${expression}.webp`,
});
const l = (pose: string, driveId: string, bytes: number, sha256: string): Lineage57Asset => ({
  filename: `lubt-${pose}.png`, driveId, bytes, width: 512, height: 512, mode: "RGBA", sha256,
  targetPath: `public/reference/lineage-57-living-character-world-v2/assets/lubt/lubt-${pose}.png`,
});

export const LINEAGE_57_CHARACTER_ASSETS: readonly Lineage57Asset[] = [
  c("M01","neutral","1zb57wiZtEaRolI3F5QKdw9JGt-CaA-B9",5926,"4eea001ec1e4527aa2a9d1d2657d59ae23dc7d0fc9d921f0018b0e3c73768ccc"),
  c("M01","smile","1CxUECbnEaLVl1e_j8PZu5Ipv4pqwmXUf",6114,"5a0aaa877c77b8edcfe286f839f27e611a9647166f3eae2db7b0040147de1a77"),
  c("M01","laugh","1PDNoribR4Qa_kVJKLbc_9esw6YQUIj5K",6344,"8b8335bd204d388d9a8440e539168ec2b02d13bd6624e8115c8d21d2bdab5728"),
  c("M01","wink","1Mnh5pIdwnTOno5n30QSKvkAjvwNx9Etu",6074,"1845933a42688fd573a9d5f069b013f8bdbb87eeedf284355a5fd07d816f9dd5"),
  c("M01","shy","1Weik-LT-njhMxs8R3ftHfADBAprWS2GB",5822,"648cc682a8348b2a4110f00226628ca315ba94926e4654c92ac5e14ea0f82fc2"),
  c("M01","surprise","1gdovdpA4O3cHDJmg3IEcAgvIHKtP57Ya",6098,"a220e3c00f436158dc794c1ca2d2fc372bfc0d7f8ef00f5fdb76de79f5ec5181"),
  c("M01","angry","1CduWaRs6PC6CTzDIYg49aqXC4v6_Jyy_",6198,"03d54bc67963aca41640389c9e127fe7ea40c63c13691920797b5ed729683afb"),
  c("M01","sing","1InppsfnKtStNWHeXGJn_3JXoyrnbMCAq",5676,"1642af13327fa295491a4569d1bbea90d8d323362c894c2d890d180475a9ccb5"),
  c("M01","talk","1B7QVDIHOqJwHv56qg906PCy79W9tmjeD",5700,"3ec338d008336ae2b7e214e5449f0035508a0dc26d985d66d92688454e5d0149"),
  c("M01","cry","1dNDccxC7uTSLVX6lYAGUwlD3Oy3cGHAB",5834,"e07d366ecf083c695c1fc67631d8e5f3babef3dbb85196d60a58978fc1d13514"),
  c("M01","touched","1XLibceR_DMa7IgTCFUrWoDHfBMj0ZCqH",5796,"0a511c5eda938a8c25e96d44d9a7fdb52fb5a2ba4e8a793abdf18b14cab38821"),
  c("M01","sleepy","19yd2RACWFyhLi-Y_7uDY2rZT-6aVM3S8",5444,"e1fa7621d41ac3570c33011d5d6dcd58f4abf2ad11947c1ebf897b5f252e6b92"),

  c("M02","neutral","1mQdqf0jPDBao0KOsc-o7YmSs_1sW7nKQ",7404,"ce8aaf55e95d6d8dc3a53ae852a7317c942d1dfbdc2574dbe910a653349b3a0b"),
  c("M02","smile","1jz9tkK91QGiU_IZBxCshPLq6DuD7AG7u",7364,"e3b10404d3ce31c0cb88d478848fe320361ee79327b3b5973de21039fc901105"),
  c("M02","laugh","16G0KJ0jMW-BDW2AogTaIEo2lMz4810s9",7276,"975da7dac3af8ebe1cc36076663adf28723e6454acf642b8a809d483eacd42f4"),
  c("M02","wink","1iOr3o96jD70OhuXihSXeNsukL3beFaRS",7512,"d3c09ea559e19f107eca3057d8767ca8ddfeacf8b3b3340185adac05626e9984"),
  c("M02","shy","1EuzH8bh0nvR6SRSJzpJIlLffhiOQWoZr",7592,"9b08210cbc4f1c93726e3ac90609f8132086501982bb60a04effd8f050d349e9"),
  c("M02","surprise","14FwFPik1hB78GJk_YrzNccAF__NgytGx",6836,"1e6ce19f1b9fd1a67533a339e4e5d58b72be5d51c27a13b4c5aeb282991cb892"),
  c("M02","angry","1r7yHINfZZMdFxSIhgMXijXqekOb9MDjr",6952,"01340d1edf596e80bb4ee9ed348680254541875080d40f7992502517fa6a2cba"),
  c("M02","sing","1Uc3TmxdzHGoC9NPSHyMDoYKdJrILFY48",6526,"cafbdb05d0bb2345c26a9701ade90f5e3a6409823e0ca4367edb2410b5559991"),
  c("M02","talk","1q5VD1BKEknScuo_Ej-tfMtsdObdAniIZ",6626,"27ff43547eff2e6e81b715f74bd424e7d3c7bd9ae9728ea089a95f39e4f03bbf"),
  c("M02","cry","1FtRvdkPGnCLc1kjqAi8dqMQaUjhnqr_c",6746,"a0b149ff0b85fb811089b104fc2111219c4a14aa4e90e6b093eb6e24ec607c13"),
  c("M02","touched","1nUEJCFZfSkcmrFmsCfzJ_L6D4EIuzVVf",6718,"ca55bd72db88ea0edbd57d6a3bcc003730d43218cb92a67657f5d473cb7cca99"),
  c("M02","sleepy","1TkZaLwSI1B72y8GX_yXLnpXkU40W93DP",6570,"d318e49ae1690b5abfda57bbe0157d50220a21ffd4248b02b0d6e50dd3f8bca4"),

  c("F01","neutral","1osX-cEjUrFpsSiRqvNILorWw5pWm2N_I",9120,"aea1b65c10f6a937afc2a95d7892b5c277fe65cec4a56167696bfe56151cbef6"),
  c("F01","smile","1HQLN_0AzcdSVTjFleQwuHafyeeefTy0I",8660,"e6d41ce3ea7e8f1a82e76d728719386af5d65a946437f05f751e9dde157bd03d"),
  c("F01","laugh","1KAymj5j850BP2QCXNTCog7ZOLnFmq1AS",9374,"1d36199b5642fed0214d37aafb3bd146659532e8064e4dd5c64597ea1d3d74ca"),
  c("F01","wink","1LkTRuOOkqYpMMTyPbktONARxgA1qqRD0",8938,"53a5ceaf24a7e58de7a2a83d2af82265566064a587ad0bced99ee8dd56743d6e"),
  c("F01","shy","1bvTJuTBk_Rd3ALnDc41weViltQM7wo2f",8204,"3b7be337bb77a4c360cb658fd9bd40586b6397079cdff3cf4148b017c169141f"),
  c("F01","surprise","1CvSSEdNS5tF3qnyyph2NSlz_0xgCzd4-",8966,"5cb238840878962edb688d56e834e31de5c75162c8cb8fb6b8e3cccc90a34ae1"),
  c("F01","angry","1x41Nh-VmWF0hk0xr_L0RpyDoY4GW7MHJ",9442,"5bd4f39a3504a6108d76ab4f8be9b5d374308ca8f20d15badcf32b8233b4e31c"),
  c("F01","sing","1iZsLBlgZzPlJpUD9za4Et68zhddbRtCx",8298,"2139e9f9aa39ddb4074f3177c3892958bae9999d76a1cea453209d0905a387f3"),
  c("F01","talk","1OBOEdCa3X41Wmba8EtCnpwwpcOnUFzqE",9232,"a5c4a5b3429bff71fa9bb82bf4a72f898cf482dcea12e50470bea0e384d34087"),
  c("F01","cry","1mO7e0i2Q8za184WVR-v5WPtKniDmkitT",8998,"f9f86ab5942778e2f0699380a397566b848fb9c0e9a8da767c78bd10813eddf9"),
  c("F01","touched","1E_BrH6fg4Flg1LwS9QXqlmYRZroQMK9V",9162,"9ee926a2e59a2c6243ff27064001b1f5aa5ee4ef0d65cfac3bdbd8f3b4ac358b"),
  c("F01","sleepy","1aTapKNoNJo5yPiLcOMHzRSETMnD4AajD",8634,"2f0578e30b5934f3f8f5d09fa722a1e07a7fd4dfb59aaf1f520683c30f8699bd"),

  c("F02","neutral","1qVSQWCcEUsn6DDzeeZdT3Adz_5NvEjdM",7870,"fdc11894b9b799cd8dcd6b65fd1ab74df52cdd9ed1940588f1396877e5b1d211"),
  c("F02","smile","1j3LhTYsKtuylHHEy0KvpW3DczZ5mm2xe",7960,"d56b89a6da805fae3e9ddfc43bdc57c6273b89adab84bfebd3fcff51a5b7a3f3"),
  c("F02","laugh","1TqNtTy7EFJJ6tRbW7P1OC5Zox0dfTJz8",7814,"e751ed3e7601b7e43d815dcedffb335c688a08c87569dd9153a33f1368606b25"),
  c("F02","wink","1HoMgfZe3tYuoKAXEHmBn5VfUmbmJhTLD",7594,"7d8244caff2f3dfe5833ba16aca4ca1be6ad44723bdff19185891f33f1e40f1b"),
  c("F02","shy","1PnQajKK8uHICVNgNVUnZ4VjGE4k9NZTs",7732,"a32a66da07f5f362303660f23d02b4469a84edda96d1085ee864eb68cb7886c3"),
  c("F02","surprise","13tDqugp2N8O3aQ6PcdIwCf-xFw-QMoI5",7540,"5e82f7ad918733269403b692ad197dcc901c57bc75da2f4c62d69d8f4e7d90bb"),
  c("F02","angry","1fDGYFPnic1-LZHEwdext_lRGDYdRyphj",8166,"99e0e7d128e171e55b2686e7dc9d0f17cce60cc098287f448c1f91746d1ecdaf"),
  c("F02","sing","1YGW8QhALMwFmVQ8bxtlsdpufuo9lTXXx",7174,"15a0c4ba5e12a7de1e6c9fe08c43d6a341cf677f5841ddf1f28b03bcf0a25270"),
  c("F02","talk","1lBugumA-WppRVfScxe5Q9BoiS91CxeOR",7256,"f0a77a1aba7628c153e45e743efe7d959616c1c87873763b184515e1fad33e19"),
  c("F02","cry","1aV7Hva49tNBhsoh4olrtomUy7AB_OVGo",7356,"c86a3e2033c400b28135d7f82f20fcc92f77a4aa824af2f91511a6d102d882e5"),
  c("F02","touched","10wDIHjIDdrvNx-Cvhu1KPve5UK6b4r19",7626,"93e7c6dc523903c55ca96884300da671983a1e6d06ba1b190828a9b52385c19c"),
  c("F02","sleepy","1ru3ve4u3STmsJm16Gh-rVuTjXIuE246a",7474,"df74394d111faff1a981d07e253adc84979c2fb8c43feeb584a20d33dcba132d"),
] as const;

export const LINEAGE_57_LUBT_ASSETS: readonly Lineage57Asset[] = [
  l("idle","1YibyPbJD_ctfjujkAo1-I1uSVUj1_BMr",128008,"fbc36d5741ba18e227045a3127e7945490d2d0bcd52d60707173e71f6b213af0"),
  l("heart","1vF8l1ANFOk6KCnhKjRGfzhIu2jKNd5TN",136977,"a340ef518d05ab1ba468a7f6eb27b8531ed8b44126c3c0f0c3c77f8c0e1c825a"),
  l("scan","18DZkGunEwFvU5h5U6kA6lDnWl9MEz5eR",161005,"344c16202a2e1d18cf6b8c44ac895947312ec39196fef1a570d4116fdec2e7c9"),
  l("guide","1MAfv2GNuAsgms_wIAh37jiJE53DmuoK9",200528,"3bf54d766cb9ab2857d812a4de9924d1fa01f80c9e0a7c5b08d9a867fef065b6"),
  l("magic","1MCCAnk3IAOtZsUHRjZUBWkcVwOygLa5y",139114,"20696898e498db2a5ea7f5803847c47e9b8785bcf8758de43ac026b8045cff3f"),
  l("bloom","1GZfX-lwEqIFIFL7rug2hlYatuYyUFTSd",199669,"61d634973e388a6545640c5a341668d07c0fdd802ab18bf8ee6b396196b1d68c"),
] as const;

export const LINEAGE_57_ASSETS: readonly Lineage57Asset[] = [
  ...LINEAGE_57_CHARACTER_ASSETS,
  ...LINEAGE_57_LUBT_ASSETS,
];

export const LINEAGE_57_EXPECTED_ASSET_COUNT = 54;
