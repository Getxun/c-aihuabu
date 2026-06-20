import type { ReactNode } from "react";
import { Compass, Focus, HelpCircle, FolderOpen, Magnet } from "lucide-react";
import { useState } from "react";
import { Button, Modal, Tooltip } from "antd";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

type CanvasZoomControlsProps = {
    scale: number;
    onScaleChange: (scale: number) => void;
    onReset: () => void;
    isMiniMapOpen: boolean;
    onToggleMiniMap: () => void;
    onOpenAssets?: () => void;
    onTidyUp?: () => void;
    onConfirmTidyUp?: () => void;
    onUndoTidyUp?: () => void;
    hasTidyUpBackup?: boolean;
};

export function CanvasZoomControls({
    scale,
    onScaleChange,
    onReset,
    isMiniMapOpen,
    onToggleMiniMap,
    onOpenAssets,
    onTidyUp,
    onConfirmTidyUp,
    onUndoTidyUp,
    hasTidyUpBackup,
}: CanvasZoomControlsProps) {
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const dockStyle = { background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item, boxShadow: colorTheme === "dark" ? "0 18px 45px rgba(0,0,0,.32)" : "0 16px 40px rgba(28,25,23,.12)" };
    const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText };

    return (
        <div className="absolute bottom-5 left-5 z-50 flex flex-col items-start gap-2" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {/* Tidy Up Confirm Popover Bubble */}
            {hasTidyUpBackup && (
                <div
                    className="mb-2 w-[220px] rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 flex flex-col gap-3"
                    style={{
                        background: theme.toolbar.panel,
                        borderColor: theme.toolbar.border,
                        boxShadow: colorTheme === "dark" ? "0 18px 54px rgba(0,0,0,.45)" : "0 16px 44px rgba(28,25,23,.15)"
                    }}
                >
                    <div className="text-xs font-semibold" style={{ color: theme.toolbar.item }}>
                        是否保留此次整理结果？
                    </div>
                    <div className="flex items-center justify-end gap-3.5">
                        <button
                            type="button"
                            className="text-xs font-medium cursor-pointer transition-colors duration-150"
                            style={{ color: theme.node.muted }}
                            onMouseOver={(e) => (e.currentTarget.style.color = theme.toolbar.item)}
                            onMouseOut={(e) => (e.currentTarget.style.color = theme.node.muted)}
                            onClick={onUndoTidyUp}
                        >
                            还原
                        </button>
                        <Button
                            type="primary"
                            size="small"
                            className="!px-3 !h-6 rounded-md text-[11px] font-semibold border-none"
                            style={{
                                background: colorTheme === "dark" ? "#fafaf9" : "#1c1917",
                                color: colorTheme === "dark" ? "#1c1917" : "#fafaf9"
                            }}
                            onClick={onConfirmTidyUp}
                        >
                            保留
                        </Button>
                    </div>
                </div>
            )}

            {/* Main Controller Dock Panel */}
            <div className="flex h-14 items-center gap-1 rounded-xl border px-2 shadow-lg backdrop-blur" style={dockStyle}>
                {/* Asset Library Shortcut Entry */}
                <Tooltip title="资产管理">
                    <Button
                        type="text"
                        className="!h-8 !px-2.5 flex items-center gap-1.5 hover:!bg-stone-200/20 dark:hover:!bg-stone-800/20 border-none"
                        style={{ color: theme.toolbar.item }}
                        icon={<FolderOpen className="size-4" />}
                        onClick={onOpenAssets}
                    >
                        <span className="text-xs font-semibold tracking-wide">资产管理</span>
                    </Button>
                </Tooltip>

                {/* Vertical Separator */}
                <div className="h-5 w-px mx-1" style={{ backgroundColor: theme.toolbar.border }} />

                <Tooltip title={isMiniMapOpen ? "关闭小地图" : "打开小地图"}>
                    <Button
                        type="text"
                        className="!h-8 !w-8 !min-w-8 !p-0"
                        style={isMiniMapOpen ? activeStyle : { color: theme.toolbar.item }}
                        icon={<Compass className="size-4" />}
                        onClick={onToggleMiniMap}
                        aria-label={isMiniMapOpen ? "关闭小地图" : "打开小地图"}
                    />
                </Tooltip>
                <Tooltip title="重置视图">
                    <Button type="text" className="!h-8 !w-8 !min-w-8 !p-0" style={{ color: theme.toolbar.item }} icon={<Focus className="size-4" />} onClick={onReset} aria-label="重置视图" />
                </Tooltip>

                {/* Autolayout Tidy Up Button */}
                <Tooltip title="整理画布">
                    <Button
                        type="text"
                        className="!h-8 !w-8 !min-w-8 !p-0"
                        style={hasTidyUpBackup ? activeStyle : { color: theme.toolbar.item }}
                        icon={<Magnet className="size-4" />}
                        onClick={onTidyUp}
                        aria-label="整理画布"
                    />
                </Tooltip>

                <Tooltip title="放大/缩小画布">
                    <input
                        type="range"
                        min="5"
                        max="500"
                        step="1"
                        value={Math.round(scale * 100)}
                        className="w-24 cursor-pointer"
                        style={{ accentColor: theme.node.activeStroke }}
                        onChange={(event) => onScaleChange(Number(event.target.value) / 100)}
                        aria-label="放大/缩小画布"
                    />
                </Tooltip>
                <span className="w-10 text-right text-xs tabular-nums" style={{ color: theme.node.muted }}>
                    {Math.round(scale * 100)}%
                </span>
                <Tooltip title="快捷键">
                    <Button type="text" className="!h-8 !w-8 !min-w-8 !p-0" style={shortcutsOpen ? activeStyle : { color: theme.toolbar.item }} icon={<HelpCircle className="size-4" />} onClick={() => setShortcutsOpen(true)} aria-label="快捷键" />
                </Tooltip>
            </div>

            <Modal title="快捷键" open={shortcutsOpen} onCancel={() => setShortcutsOpen(false)} footer={null} centered>
                <div className="space-y-3 border-t pt-4 text-sm" style={{ borderColor: theme.node.stroke }}>
                    <Shortcut label="拖动画布" value="平移视图" />
                    <Shortcut label="滚轮" value="缩放画布" />
                    <Shortcut label="Ctrl / Cmd + 拖动" value="框选多个节点" />
                    <Shortcut label="Shift / Ctrl / Cmd + 点击" value="追加选择节点" />
                    <Shortcut label="Ctrl / Cmd + C / V" value="复制 / 粘贴节点" />
                    <Shortcut label="Delete / Backspace" value="删除选中" />
                </div>
            </Modal>
        </div>
    );
}

function Shortcut({ label, value }: { label: ReactNode; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-base font-medium">{label}</span>
            <span className="opacity-60">{value}</span>
        </div>
    );
}
