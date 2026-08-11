import { VIDEOFIGURE_ANGLES, type VideoFigureAngle } from "./videofigure-turntable";

export const LINEAGE_58_VIDEOFIGURE_ASSET_ROOT = "public/design-lab/lineages/58/videofigure/frames";
export const LINEAGE_58_VIDEOFIGURE_ASSET_HOLD = "EXACT_VIDEOFIGURE_ASSET_TRANSFER_HOLD" as const;

export interface VideoFigureAssetFingerprint {
  figureId: string;
  angle: VideoFigureAngle;
  filename: string;
  driveId: string;
  bytes: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  targetPath: string;
  role: "runtime-required";
  rightsStatus: "design-fixture-only";
}

type Registered = readonly [driveId: string, bytes: number, width?: number, height?: number, sha256?: string];

const REGISTRY: Record<string, Registered> = {
  A_000: ["1D9B38Hr_r8O49z-SQPS9qHN4L79hGxGX",85587,378,506,"3d2a75387485ead8a468dd89f0f21cb548b580d70094816b16c15fd2af3dda22"],
  A_045: ["19v0Q1MZtDXvhk1cGp89ihLxjfJHj19p7",79567], A_090: ["1_sMPkN_AHGdBXNIlts_WM8PXRzVRpdQJ",59409,378,506,"2f25c7e3d9f41440fe625015cc6a8354afcd365982a856c514f7292e5e725933"], A_135: ["1Jf3Ejmi3BIbClbjpix-5fgWbKzDlqUiw",76359], A_180: ["1hxw3C_IwyUneC_xre0BWBu2vgne2V7JT",84078], A_225: ["1aKC6puMdis_-okdPsmw8ZhVL2E-Mwb5y",75558], A_270: ["1qtb82gczOKcnRb21l_cHHw7sfhIy544j",59296], A_315: ["14JmThFzDByS1xGRtULAYKQhjdutZpmRR",81759],
  B_000: ["1DEcsf3Hmw79pdXFK7zSFbcTmUiuq2JhI",98978], B_045: ["1BIGHipPsIJrjRJ6CGbfdUhLddtImhNMT",93299], B_090: ["1GEtFKguASDg7AEJWcPF3cp8d9AMNLU1Y",67089], B_135: ["1cOmlt5xxo4qbIVvDkmb41KkDdmeOY8pC",81853], B_180: ["1K2LgD8bIUyUjvcG5jEZ0qxJwNCUen2jR",90894], B_225: ["1Uqd-aXI5ob_0aPnrCWlcBdSZVQEvCl1J",84954], B_270: ["1GowQ3lhRAvI7sFCBELMuzmpPkraHWBxw",65313], B_315: ["11RBdI6gY3PJyTDmrKLVb0kfG5mccLVbx",94590],
  C_000: ["1_RpJNqMSxbeyPbF9xpHP-Es9q2KwqRuR",85002], C_045: ["1_psMeo6vIGHorNkwrDgKMCq0Nb9R9NNu",76219], C_090: ["1x0hrs9OR9RayakmbYzHhsRNAdcAkdCTS",55147], C_135: ["1D7dMIUsoX9B7MjPnapnHJf7c0SCRZxHL",71430], C_180: ["1shkODpqvQ-iTEwFW2cGaGV6jp5PkvYwk",83365], C_225: ["1NMXejuZ_A1BhlW9LOeEeL51nHmTGAEIC",72698], C_270: ["1SwXkgkNW6wDerrZymZzHpEH-nuvwSAdt",57973], C_315: ["1rIzAZ_tCB3KmT95oeyBzzNp_QcDXzbjf",78076],
  D_000: ["1jtIUpXgWLRo6VtojTPeyI1GCv5kbcKD1",87576], D_045: ["1b_WOWztjRc3pY1d4bmLG5bPMIhnuZu5z",83938], D_090: ["1kOXbajqGLglX9fR9i97sRo-EAMP8X3cH",60622], D_135: ["1-0va4ymv_n1mnisWfHHKqw_NaO_nkg1o",83147], D_180: ["1l5Mnv61y7VK17HKeBsUbwiD3WskKZAGC",83711], D_225: ["1KEDxv7Ykn0g6Tow5iGiJlQZ7_hpsCujc",79840], D_270: ["18PAOoVdGjNZgGxl95PNbCZp69vQgbQcq",59005], D_315: ["1e-AvM2y50eekKOy0ELsCV4UqQIz-b7ZR",83454],
  E_000: ["1HJzWQUh0oq14WEOMWs1ruh4Ci0Tq9_dL",109002], E_045: ["1cSjBXPFf-yLht8QBJF_U2yOyE2Mnm6lh",99512], E_090: ["1fHIYInV7ANREvwaUteN346SIeeN4g5YN",74029], E_135: ["1BJFt2dbfF6FSyLuRqNsOsPIDsqhooH_j",97812], E_180: ["1n4P--wi_c8TQoF1q7Pp_JCA9DzRlsh_3",108105], E_225: ["12f2_MTtFpQDC4ltNQ1VyGgxSr2rMhLp_",95962], E_270: ["15WUzbZWjgT-hGpFWGH_m9BKkCU6hVX58",77070], E_315: ["1q0PbGTulQXei7TL9l-Wg4iSSffsW-g46",101774],
  F_000: ["1tXGC4CQCl0sto04rDl0ttt9YCiscQFtn",72623,412,464,"635edc36c4db1869c18bfe3c0ab64d9b309e00ca0c60f67b7ee2e3f34503b19c"], F_045: ["1Jc_ND8gPBpN5esvK4cAr33udA9Gj9hcx",69592], F_090: ["1EtSYg2grNUHeACjqdXytoXRZfe8OmOfj",60510], F_135: ["1OIxzfdpkOICLT5wN7ob7odQ13eUvRM50",63769], F_180: ["1sy7ffV0em7wo0se3d-ujrkmkdYkooaTP",67627], F_225: ["14wKRAba3M8a3RUPdNOyBupU0DHvaoBBE",61095], F_270: ["17UCiCrfKcEnOiomUaBR_Yds4yTvr5081",55380], F_315: ["1B-xf0keWR_I24iGh-QH19wVwXuv4Wzqk",68282],
  G_000: ["1arg_v64jfEOzmStdxJUnIN6JR_Jm2yNa",87570], G_045: ["10pFESS7n0fFdcBXJxzEJU9gNxg_KbDi_",85530], G_090: ["1kcylVPvr0Y0zmYUuz_qvHVwJ8lyCXRHg",62129], G_135: ["1GZbz3_1XU4UjX0fim2KEYIhvyMPvDA5b",77212], G_180: ["1OTi6xMJnp4vuNbw986ceRW7jBq_BJjYu",79600], G_225: ["147dU8UzvvPo9ctcWQlOVkKILy5BGJ5Op",74143], G_270: ["1AbZhwDrs8_S39KZeNHzUktWVCn-47wio",58932], G_315: ["1IxHcqpnyj4qioyAQfUzuPCA2Yos8UlnU",81525],
  H_000: ["1R9tTuowLfm3vSF9IPpoTdJMteaV7db0z",84572], H_045: ["1fbN3PWId3Qf-ACEY0uXgFZBWDkNYyilg",82154], H_090: ["1xV-JhqngtgA57U0zKAAbsbE7vfQSMjBh",58795], H_135: ["1LflYOcPX-CKmWo-RyEcuukOhXsjcjaMD",72826], H_180: ["1_gOmuX4sKFMNwOjle-8ue0nvwSgAZ8Hf",80322], H_225: ["1217mFNjv-opOBlzoJSAAdCG7DeBjE_9r",73445], H_270: ["1kmbYNdAm1S4943yj7CaVffckN7WSG5oD",56603], H_315: ["11nrdszb9T-omlXZkiGWxlt_WVQukS31f",87305],
  I_000: ["1OZViE0kMr0hTIt6atnLsdt00ActPDF9a",86137], I_045: ["1kWWZTdSS6dmBRhfylPaq_8ZUp2qxReLX",85759], I_090: ["1U_pvMi_JO70NaWfgtVTwycfbRDcm16r7",59168], I_135: ["10yJWt-ZnGzIU5hiwHfedJEx0ACMXsDHV",76377], I_180: ["17ce3taFN0i5h71mC82-5p_a-1vBkaS30",80506], I_225: ["1sgL7Ri4YNSXb63ULki2FAvfNSY7gGKI2",76192], I_270: ["1-0QdEGfmfqDQB3flxc7FrpyC58hBTxrB",59569], I_315: ["1Mwn_MN-DG265t18RSoEHRj4OURTiul8N",79909],
  J_000: ["1jc1Q6jAgst5ztyB4q-gvwO65mPc9UBFF",109532], J_045: ["109L58uF9O6cYEud3ZhRNKb6qB0a9qfHg",106445], J_090: ["1QE5h3mhsAvKBNajyo3Be8eChvXNASB8K",78247], J_135: ["1lHkqv7fI9-2iGPt51-y_7_fb9BXanaj9",101793], J_180: ["1sB6ItEzZqxZy3O_O72wbXHDIBpqocDIh",107823], J_225: ["19sw7l4hd61PpOeDswAXsWN1WA0ouwD-u",104639], J_270: ["18c644DRQ3Saf-2J7fzwTxweEs4nluoGi",79667], J_315: ["1u4Ro6QmBouVdbtNPvV-beVZxYl1Bu0K3",107432,378,506,"9cd73e2c1d9cb5119976eb2c4a456fd49be28cda587217b3c5e740bb1c0690ae"],
};

export const LINEAGE_58_VIDEOFIGURE_ASSETS: readonly VideoFigureAssetFingerprint[] = Object.entries(REGISTRY).map(([key, value]) => {
  const [figureId, angle] = key.split("_") as [string, VideoFigureAngle];
  const [driveId, bytes, width, height, sha256] = value;
  const filename = `${figureId}_${angle}.png`;
  return {
    figureId,
    angle,
    filename,
    driveId,
    bytes,
    width: width ?? null,
    height: height ?? null,
    sha256: sha256 ?? null,
    targetPath: `${LINEAGE_58_VIDEOFIGURE_ASSET_ROOT}/${filename}`,
    role: "runtime-required",
    rightsStatus: "design-fixture-only",
  };
});

export function validateLineage58VideoFigureAssetRegistry() {
  const expectedKeys = new Set<string>();
  for (const figureId of "ABCDEFGHIJ") for (const angle of VIDEOFIGURE_ANGLES) expectedKeys.add(`${figureId}_${angle}`);
  const actualKeys = new Set(LINEAGE_58_VIDEOFIGURE_ASSETS.map((asset) => `${asset.figureId}_${asset.angle}`));
  const missing = [...expectedKeys].filter((key) => !actualKeys.has(key));
  const unexpected = [...actualKeys].filter((key) => !expectedKeys.has(key));
  const metadataComplete = LINEAGE_58_VIDEOFIGURE_ASSETS.filter((asset) => asset.sha256 && asset.width && asset.height).length;
  return {
    expected: 80,
    registered: LINEAGE_58_VIDEOFIGURE_ASSETS.length,
    metadataComplete,
    exactGatePass: missing.length === 0 && unexpected.length === 0 && LINEAGE_58_VIDEOFIGURE_ASSETS.length === 80 && metadataComplete === 80,
    missing,
    unexpected,
    holdMarker: LINEAGE_58_VIDEOFIGURE_ASSET_HOLD,
  } as const;
}
