import { compactApiParams, serializeApiParams } from "@/services/api/request";

export type Prompt = {
    id: string;
    title: string;
    coverUrl: string;
    prompt: string;
    tags: string[];
    category: string;
    githubUrl: string;
    preview: string;
    createdAt: string;
    updatedAt: string;
};

export const ALL_PROMPTS_OPTION = "全部";

export const CATEGORY_MAP: Record<string, string> = {
    "gpt-image-2-prompts": "EvoLink 创意",
    "awesome-gpt-image": "Awesome 图像",
    "awesome-gpt4o-image-prompts": "GPT-4o 精选",
    "youmind-gpt-image-2": "YouMind 图像",
    "youmind-nano-banana-pro": "Nano Banana",
    "davidwu-gpt-image2-prompts": "DavidWu 精选",
};

export const TAG_MAP: Record<string, string> = {
    "portrait": "肖像",
    "portraits": "肖像",
    "character": "角色",
    "character design": "角色设计",
    "illustration": "插画",
    "illustrations": "插画",
    "drawing": "绘画",
    "painting": "油画",
    "sketch": "素描",
    "watercolor": "水彩",
    "poster": "海报",
    "poster design": "海报设计",
    "ad-creative": "广告创意",
    "ad creative": "广告创意",
    "advertising": "广告创意",
    "ecommerce": "电商",
    "e-commerce": "电商",
    "product": "产品",
    "ui": "UI设计",
    "ui design": "UI设计",
    "comparison": "对比",
    "photography": "摄影",
    "realism": "写实",
    "realistic": "写实",
    "nature": "自然",
    "landscape": "风景",
    "scenery": "风景",
    "architecture": "建筑",
    "space": "空间",
    "tech": "科技",
    "sci-fi": "科幻",
    "cyberpunk": "赛博朋克",
    "game": "游戏",
    "game ui": "游戏UI",
    "game_ui": "游戏UI",
    "3d": "3D",
    "3d render": "3D渲染",
    "3d_render": "3D渲染",
    "anime": "动漫",
    "anime_illustration": "动漫插画",
    "cartoon": "卡通",
    "comic": "漫画",
    "animation": "动画",
    "gpt4o": "GPT-4o",
    "gpt-image-2": "GPT Image 2",
    "nano-banana-pro": "Nano Banana",
};

export function cleanTag(tag: string): string | null {
    if (!tag) return null;
    
    // Remove tags starting with @ or containing typical author names
    if (tag.startsWith("@") || tag.includes("_ai") || tag.includes("sora")) {
        return null;
    }
    
    // Filter out common repo name or junk tags
    const lower = tag.toLowerCase().trim();
    if (
        lower.startsWith("awesome-") ||
        lower.startsWith("youmind-") ||
        lower.includes("github") ||
        lower.includes("raw") ||
        lower === "other" ||
        lower === "others" ||
        lower === "etc" ||
        lower.length <= 1 ||
        lower.length > 15
    ) {
        return null;
    }
    
    // Check normalization map
    if (TAG_MAP[lower]) {
        return TAG_MAP[lower];
    }
    
    // Clean up heading tags with numbers, like "1 概念" or "1. 概念"
    const cleanStr = tag.replace(/^\d+[\s.、]*/, "").trim();
    if (!cleanStr) return null;
    
    // Capitalize acronyms
    if (["ui", "ux", "3d", "api", "gpt"].includes(cleanStr.toLowerCase())) {
        return cleanStr.toUpperCase();
    }
    
    // Keep it if it doesn't look like garbage (e.g. contains special symbols)
    if (/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/.test(cleanStr)) {
        return cleanStr;
    }
    
    return null;
}

export type PromptListResponse = {
    items: Prompt[];
    tags: string[];
    categories: string[];
    total: number;
};

export async function fetchPrompts({ keyword = "", tag = [], category = ALL_PROMPTS_OPTION, page, pageSize }: { keyword?: string; tag?: string[]; category?: string; page?: number; pageSize?: number } = {}) {
    const params = serializeApiParams(
        compactApiParams({
            ...(keyword ? { keyword } : {}),
            ...(tag.length ? { tag } : {}),
            ...(category !== ALL_PROMPTS_OPTION ? { category } : {}),
            ...(page ? { page } : {}),
            ...(pageSize ? { pageSize } : {}),
        }),
    );
    const response = await fetch(`/api/prompts${params.size ? `?${params}` : ""}`);
    if (!response.ok) throw new Error("获取提示词失败");
    return (await response.json()) as PromptListResponse;
}

export function formatPromptDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
