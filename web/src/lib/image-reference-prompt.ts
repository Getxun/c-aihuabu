import type { ReferenceImage } from "@/types/image";

export function imageReferenceLabel(index: number) {
    return `图片${index + 1}`;
}

export function buildImageReferencePromptText(prompt: string, references: ReferenceImage[]) {
    const labels = references.map((_, index) => imageReferenceLabel(index));
    const text = normalizeReferenceLabelText(prompt, labels);
    if (!references.length) return text;
    return `参考图片编号：${labels.join("、")}。请按这些编号理解提示词中的图片引用。\n\n${text}`;
}

function normalizeReferenceLabelText(prompt: string, labels: string[]) {
    let text = prompt.trim();
    for (const label of labels) {
        text = text.replace(new RegExp(`@${escapeRegExp(label)}\\b`, "g"), label);
    }
    return text;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
