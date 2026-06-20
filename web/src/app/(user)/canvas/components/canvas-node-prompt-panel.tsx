"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Camera, LoaderCircle, Zap } from "lucide-react";
import { Button, Tooltip, Dropdown, message } from "antd";

import { ModelPicker } from "@/components/model-picker";
import { defaultConfig, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { requestCreditCost } from "@/constant/credits";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasPromptLibrary } from "./canvas-prompt-library";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasResourceMentionTextarea } from "./canvas-resource-mention-textarea";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData } from "../types";
import type { CanvasResourceReference } from "../utils/canvas-resource-references";

export type CanvasNodeGenerationMode = CanvasGenerationMode;

type CanvasNodePromptPanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void;
    onGenerate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => void;
    onStop: (nodeId: string) => void;
    mentionReferences?: CanvasResourceReference[];
    onImageSettingsOpenChange?: (open: boolean) => void;
    onRemoveReference?: (refNodeId: string) => void;
};

export function CanvasNodePromptPanel({ node, isRunning, onPromptChange, onConfigChange, onGenerate, onStop, mentionReferences = [], onImageSettingsOpenChange, onRemoveReference }: CanvasNodePromptPanelProps) {
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = defaultMode(node.type);
    const config = buildNodeConfig(globalConfig, node, mode);
    const hasTextContent = node.type === CanvasNodeType.Text && Boolean(node.metadata?.content?.trim());
    const hasImageContent = node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
    const [prompt, setPrompt] = useState(node.metadata?.prompt || "");
    const credits = requestCreditCost({ channelMode: config.channelMode, model: config.model, count: mode === "image" ? config.count : 1 });

    const [activeVideoTab, setActiveVideoTab] = useState<string>(node.metadata?.videoMode || "text-to-video");
    const [cameraMovement, setCameraMovement] = useState<string>(node.metadata?.cameraMovement || "自适应");

    const imageRefs = mentionReferences.filter((r) => r.kind === "image");
    const videoRefs = mentionReferences.filter((r) => r.kind === "video");
    const totalRefs = imageRefs.length + videoRefs.length;
    const activeRefs = mentionReferences.filter((r) => r.active);

    const videoTabs = [
        { id: "text-to-video", label: "文生视频", enabled: true, tooltip: "" },
        { id: "all-around", label: "全能参考", enabled: totalRefs >= 1, tooltip: "需要连接图片/视频节点 (1~15个)" },
        { id: "image-to-video", label: "图生视频", enabled: imageRefs.length >= 1, tooltip: "需要连接图片节点 (1~15个)" },
        { id: "first-last", label: "首尾帧", enabled: imageRefs.length >= 2, tooltip: "需要连接2个图片节点" },
        { id: "image-ref", label: "图片参考", enabled: imageRefs.length >= 1, tooltip: "需要连接图片节点 (1~15个)" },
    ];

    const updateVideoMode = (value: string) => {
        setActiveVideoTab(value);
        if (node.metadata?.videoMode !== value) onConfigChange(node.id, { videoMode: value });
    };

    useEffect(() => {
        if (mode !== "video") return;
        if (activeVideoTab === "text-to-video") {
            if (videoRefs.length > 0) updateVideoMode("all-around");
            else if (imageRefs.length >= 2) updateVideoMode("first-last");
            else if (imageRefs.length >= 1) updateVideoMode("image-to-video");
        } else if (!videoTabs.find((tab) => tab.id === activeVideoTab)?.enabled) {
            updateVideoMode("text-to-video");
        }
    }, [activeVideoTab, imageRefs.length, mode, videoRefs.length]);

    useEffect(() => {
        if (mode !== "video") return;
        setActiveVideoTab(node.metadata?.videoMode || "text-to-video");
    }, [mode, node.id, node.metadata?.videoMode]);

    useEffect(() => {
        if (mode !== "video") return;
        const nextMovement = prompt.match(/\[运镜：([^\]]+)\]/)?.[1] || "自适应";
        setCameraMovement(nextMovement);
        if (node.metadata?.cameraMovement !== nextMovement) onConfigChange(node.id, { cameraMovement: nextMovement });
    }, [mode, node.id, node.metadata?.cameraMovement, prompt]);

    const handleCameraSelect = (movement: string) => {
        setCameraMovement(movement);
        let newPrompt = prompt;
        newPrompt = newPrompt.replace(/\s*\[运镜：[^\]]+\]/g, "");
        if (movement !== "自适应") {
            newPrompt = `${newPrompt.trim()} [运镜：${movement}]`;
        }
        onConfigChange(node.id, { cameraMovement: movement });
        updatePrompt(newPrompt);
    };

    const cameraMovements = ["自适应", "推", "拉", "左移", "右移", "向上", "向下", "旋转", "环绕"];
    const cameraMenu = {
        items: cameraMovements.map((movement) => ({
            key: movement,
            label: movement,
            onClick: () => handleCameraSelect(movement),
        })),
    };

    const pills = [
        { label: "标记", tooltip: "即将推出：精细化区域和运动轨迹标记功能" },
        { label: "特效", tooltip: "即将推出：自定义画面特效与粒子效果功能" },
        { label: "角色库", tooltip: "即将推出：基于角色节点锁定视频人物形象" },
        { label: "+ 参考", isRef: true, tooltip: "提示：在画布上将图片/视频节点连线至本视频节点，即可自动添加为参考素材！" },
    ];

    const handlePillClick = (pill: typeof pills[0]) => {
        if (pill.isRef) {
            message.info("在画布上拉出连线，将任何图片或视频节点连接到本视频节点上，它们就会自动作为生成参考素材。您也可以在输入框中输入 @ 来引用素材。");
        } else {
            message.info(pill.tooltip);
        }
    };

    useEffect(() => {
        setPrompt(node.metadata?.prompt || "");
    }, [node.id, node.metadata?.prompt]);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        onPromptChange(node.id, value);
    };

    const submit = () => {
        const text = prompt.trim();
        if (!text || isRunning) return;
        onGenerate(node.id, mode, text);
    };

    return (
        <div
            data-canvas-no-pan
            className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            {mode === "video" && (
                <div className="no-scrollbar mb-3 flex items-center gap-1.5 overflow-x-auto border-b pb-2" style={{ borderColor: theme.toolbar.border }}>
                    {videoTabs.map((tab) => {
                        const isActive = activeVideoTab === tab.id;
                        const btn = (
                            <button
                                key={tab.id}
                                type="button"
                                disabled={!tab.enabled}
                                onClick={() => updateVideoMode(tab.id)}
                                className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-normal transition-all disabled:cursor-not-allowed"
                                style={{
                                    background: isActive ? theme.toolbar.activeBg : "transparent",
                                    color: isActive ? theme.toolbar.activeText : tab.enabled ? theme.node.text : theme.node.placeholder,
                                    opacity: isActive ? 1 : tab.enabled ? 0.68 : 0.35,
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                        return tab.enabled ? (
                            btn
                        ) : (
                            <Tooltip key={tab.id} title={tab.tooltip} placement="top" overlayClassName="z-[1300]">
                                <span>{btn}</span>
                            </Tooltip>
                        );
                    })}
                </div>
            )}

            <div
                className="relative flex flex-col overflow-hidden rounded-xl border transition-all focus-within:border-[#2f80ff] focus-within:ring-1 focus-within:ring-[#2f80ff]/30"
                style={{ background: theme.node.fill, borderColor: theme.node.stroke }}
            >
                {mode === "video" && (
                    <div className="z-10 flex select-none flex-wrap items-center gap-1.5 px-3 pb-1 pt-2.5">
                        {pills.map((pill) => (
                            <button
                                key={pill.label}
                                type="button"
                                onClick={() => handlePillClick(pill)}
                                className="mr-1 rounded-md border px-2 py-0.5 text-[11px] font-normal transition hover:opacity-100"
                                style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.muted, opacity: 0.78 }}
                            >
                                {pill.label}
                            </button>
                        ))}
                        {activeRefs.map((ref, idx) => {
                            const isImage = ref.kind === "image";
                            const isVideo = ref.kind === "video";
                            return (
                                <Tooltip key={ref.id} title={`${ref.title} (点击断开连接)`} placement="top" overlayClassName="z-[1300]">
                                    <div
                                        onClick={() => onRemoveReference?.(ref.nodeId)}
                                        className="group/thumb relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded border shadow-md transition-all hover:scale-105 hover:border-red-500/50"
                                        style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border }}
                                    >
                                        {isImage && ref.previewUrl ? (
                                            <img src={ref.previewUrl} className="w-full h-full object-cover" alt="" />
                                        ) : isVideo && ref.previewUrl ? (
                                            <video src={ref.previewUrl} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <div className="text-[8px] font-bold text-white/60 select-none">
                                                {ref.kind === "text" ? "TXT" : "AUD"}
                                            </div>
                                        )}
                                        <span className="absolute right-0.5 top-0.5 flex size-3 select-none items-center justify-center rounded-full border border-black/20 bg-[#2f80ff] text-[7px] font-bold text-white group-hover/thumb:hidden">
                                            {idx + 1}
                                        </span>
                                        <div className="absolute inset-0 hidden items-center justify-center bg-red-600/80 group-hover/thumb:flex">
                                            <span className="text-[10px] text-white font-bold">×</span>
                                        </div>
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
                <CanvasResourceMentionTextarea
                    value={prompt}
                    references={mentionReferences}
                    onChange={updatePrompt}
                    onSubmit={submit}
                    className="thin-scrollbar h-20 w-full resize-none bg-transparent border-0 px-3 py-2 text-sm leading-5 outline-none focus:ring-0"
                    style={{ color: theme.node.text }}
                    placeholder={promptPlaceholder(mode, hasImageContent, hasTextContent, mentionReferences.length > 0)}
                />
            </div>

            <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2.5">
                <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
                    <CanvasPromptLibrary onSelect={updatePrompt} />
                    {mode === "image" ? (
                        <>
                            <ModelPicker
                                config={config}
                                value={config.model}
                                onChange={(model) => onConfigChange(node.id, { model })}
                                capability="image"
                                className="!h-10 !min-w-[80px] !max-w-[140px] flex-1"
                                fullWidth
                                onMissingConfig={() => openConfigDialog(true)}
                            />
                            <CanvasImageSettingsPopover
                                config={config}
                                placement="topLeft"
                                buttonClassName="!h-10 !max-w-[140px] !justify-start !rounded-full !px-3 flex-1 min-w-0 w-full"
                                onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })}
                                onMissingConfig={() => openConfigDialog(true)}
                                onOpenChange={onImageSettingsOpenChange}
                            />
                        </>
                    ) : mode === "video" ? (
                        <>
                            <div className="relative max-w-[125px] min-w-[80px] flex-1">
                                <ModelPicker
                                    config={config}
                                    value={config.model}
                                    onChange={(model) => onConfigChange(node.id, { model })}
                                    capability="video"
                                    className="!h-10 w-full"
                                    fullWidth
                                    onMissingConfig={() => openConfigDialog(true)}
                                />
                                <span className="pointer-events-none absolute right-1.5 -top-2 scale-90 select-none rounded-full border border-black/20 bg-gradient-to-r from-amber-400 to-yellow-500 px-1 text-[9px] font-bold text-black shadow-sm">
                                    PRO
                                </span>
                            </div>
                            <CanvasVideoSettingsPopover
                                config={config}
                                buttonClassName="!h-10 !max-w-[125px] !justify-start !rounded-full !px-3 flex-1 min-w-0 w-full"
                                onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))}
                            />
                            <Dropdown menu={cameraMenu} placement="topLeft" trigger={["click"]} overlayClassName="z-[1300]">
                                <Button
                                    className="!h-10 !max-w-[95px] !justify-start !rounded-full !px-3 flex-1 min-w-0"
                                    style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}
                                    icon={<Camera className="size-3.5 opacity-70" />}
                                >
                                    <span className="truncate text-xs font-normal">
                                        运镜: {cameraMovement}
                                    </span>
                                </Button>
                            </Dropdown>
                        </>
                    ) : mode === "audio" ? (
                        <>
                            <ModelPicker 
                                config={config} 
                                value={config.model} 
                                onChange={(model) => onConfigChange(node.id, { model })} 
                                capability="audio" 
                                className="!h-10 !min-w-[80px] !max-w-[140px] flex-1"
                                fullWidth
                                onMissingConfig={() => openConfigDialog(true)} 
                            />
                            <CanvasAudioSettingsPopover 
                                config={config} 
                                buttonClassName="!h-10 !max-w-[140px] !justify-start !rounded-full !px-3 flex-1 min-w-0 w-full" 
                                onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))} 
                            />
                        </>
                    ) : (
                        <ModelPicker 
                            config={config} 
                            value={config.model} 
                            onChange={(model) => onConfigChange(node.id, { model })} 
                            capability="text" 
                            className="!h-10 !min-w-[80px] !max-w-[140px] flex-1"
                            fullWidth
                            onMissingConfig={() => openConfigDialog(true)} 
                        />
                    )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums" style={{ color: theme.node.muted }}>
                        <Zap className="size-3.5 text-amber-400 fill-amber-400" />
                        {credits.toLocaleString()}
                    </span>
                    <Button
                        type="primary"
                        className="!h-10 !w-10 shrink-0 !rounded-full !p-0 flex items-center justify-center"
                        danger={isRunning}
                        disabled={!isRunning && !prompt.trim()}
                        onClick={() => (isRunning ? onStop(node.id) : submit())}
                        aria-label={isRunning ? "停止生成" : "生成"}
                        style={{ background: isRunning ? undefined : "#2f80ff", borderColor: isRunning ? undefined : "#2f80ff" }}
                    >
                        {isRunning ? (
                            <LoaderCircle className="size-5 animate-spin" />
                        ) : (
                            <ArrowUp className="size-5 text-white" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function defaultMode(type: CanvasNodeData["type"]): CanvasNodeGenerationMode {
    return type === CanvasNodeType.Text ? "text" : type === CanvasNodeType.Video ? "video" : type === CanvasNodeType.Audio ? "audio" : "image";
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasNodeGenerationMode): AiConfig {
    const defaultModel = mode === "image" ? globalConfig.imageModel : mode === "video" ? globalConfig.videoModel : mode === "audio" ? globalConfig.audioModel : globalConfig.textModel;
    return {
        ...globalConfig,
        model: node.metadata?.model || defaultModel || (mode === "audio" ? defaultConfig.audioModel : globalConfig.model || defaultConfig.model),
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function promptPlaceholder(mode: CanvasNodeGenerationMode, hasImageContent: boolean, hasTextContent: boolean, hasReferences = false) {
    const hint = hasReferences ? "，按 @ 引用连接的图片或视频" : "";
    if (mode === "video") return `描述要生成的视频内容${hint}`;
    if (mode === "audio") return `描述要生成的音频内容${hint}`;
    if (mode === "image") return hasImageContent ? `请输入你想要把这张图修改成什么${hint}` : `描述要生成的图片内容${hint}`;
    return hasTextContent ? `请输入你想要将本段文本修改成什么${hint}` : `请输入你想要生成的文本内容${hint}`;
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    return { audioInstructions: value };
}
