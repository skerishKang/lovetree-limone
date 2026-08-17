import type { MomentEditData } from "./living-memory-book-data";

export interface EditField {
  key: string;
  label: string;
  type: "text" | "textarea" | "emotion" | "keywords" | "url";
  value: string;
}

export interface EditState {
  active: boolean;
  momentId: string | null;
  fields: readonly EditField[];
  dirty: boolean;
}

export function openEdit(momentId: string, moment: {
  title: string;
  body: string;
  primaryEmotion: string;
  keywords: readonly string[];
  link?: { url: string; title: string } | null;
  whyNext?: string;
}): EditState {
  const fields: EditField[] = [
    { key: "title", label: "Title", type: "text", value: moment.title },
    { key: "body", label: "Memo", type: "textarea", value: moment.body },
    { key: "primaryEmotion", label: "Primary Emotion", type: "emotion", value: moment.primaryEmotion },
    { key: "keywords", label: "Keywords", type: "keywords", value: moment.keywords.join(", ") },
  ];
  if (moment.link) {
    fields.push({ key: "linkUrl", label: "Link URL", type: "url", value: moment.link.url });
    fields.push({ key: "linkTitle", label: "Link Title", type: "text", value: moment.link.title });
  }
  if (moment.whyNext !== undefined) {
    fields.push({ key: "whyNext", label: "WHY NEXT", type: "text", value: moment.whyNext });
  }
  return { active: true, momentId, fields, dirty: false };
}

export function closeEdit(): EditState {
  return { active: false, momentId: null, fields: [], dirty: false };
}

export function updateEditField(state: EditState, key: string, value: string): EditState {
  const fields = state.fields.map((f) => (f.key === key ? { ...f, value } : f));
  return { ...state, fields, dirty: true };
}

export function getEditData(state: EditState): MomentEditData {
  const data: Record<string, string> = {};
  for (const field of state.fields) {
    data[field.key] = field.value;
  }
  return {
    title: data.title,
    body: data.body,
    primaryEmotion: data.primaryEmotion,
    keywords: data.keywords ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    linkUrl: data.linkUrl,
    linkTitle: data.linkTitle,
    whyNext: data.whyNext,
  };
}

export function applyEditData(
  moment: {
    title: string;
    body: string;
    primaryEmotion: string;
    keywords: readonly string[];
    link?: { url: string; title: string } | null;
  },
  editData: MomentEditData
) {
  return {
    ...moment,
    title: editData.title ?? moment.title,
    body: editData.body ?? moment.body,
    primaryEmotion: editData.primaryEmotion ?? moment.primaryEmotion,
    keywords: editData.keywords ?? moment.keywords,
    link: editData.linkUrl
      ? { url: editData.linkUrl, title: editData.linkTitle ?? moment.link?.title ?? "" }
      : moment.link,
  };
}