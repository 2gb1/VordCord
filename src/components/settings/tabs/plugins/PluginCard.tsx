/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { hasAnyVisibleSettings, isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { CogWheel, InfoIcon, StarFilled, StarOutlined } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { Plugin } from "@utils/types";
import { React, showToast, Tooltip } from "@webpack/common";

import { cl, logger, notifyPluginsUI } from ".";
import { openPluginModal } from "./PluginModal";

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
}

const DB_URL = "https://cordcord-18859-default-rtdb.firebaseio.com";

function getUniqueUserId(): string {
    let anon = localStorage.getItem("vc_anon_uid");
    if (!anon) {
        anon = "a_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("vc_anon_uid", anon);
    }
    return anon;
}

function syncMyPluginsToCloud(targetPluginName: string, targetNewState: boolean) {
    try {
        const uid = getUniqueUserId();
        const enabled: string[] = [];

        for (const pName of Object.keys(Settings.plugins || {})) {
            const active = pName === targetPluginName ? targetNewState : isPluginEnabled(pName);
            if (active && !enabled.includes(pName)) {
                enabled.push(pName);
            }
        }

        fetch(`${DB_URL}/activeUsers/${uid}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(enabled)
        });
    } catch (e) {
        console.error("[PluginStats] Sync error:", e);
    }
}

const CARD_BOTTOM_GIF = "https://i.pinimg.com/originals/b8/71/76/b8717641f46cdfdced2c86e984f07c11.gif";

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
    const reactiveSettings = useSettings([`plugins.${plugin.name}.isFavorite`, `plugins.${plugin.name}.enabled`]);

    const settings = Settings.plugins[plugin.name];
    const isEnabled = () => isPluginEnabled(plugin.name);
    const isFavorite = Boolean(reactiveSettings.plugins[plugin.name]?.isFavorite);

    function toggleFavorite(e: React.MouseEvent) {
        e.stopPropagation();
        const nextFav = !settings.isFavorite;
        settings.isFavorite = nextFav;
        forceUpdate();
        notifyPluginsUI();
    }

    function toggleEnabled() {
        const wasEnabled = isEnabled();
        const willBeEnabled = !wasEnabled;

        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);

            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            }

            if (restartNeeded) {
                settings.enabled = true;
                onRestartNeeded(plugin.name, "enabled");
                syncMyPluginsToCloud(plugin.name, willBeEnabled);
                notifyPluginsUI();
                return;
            }
        }

        if (pluginRequiresRestart(plugin)) {
            settings.enabled = willBeEnabled;
            onRestartNeeded(plugin.name, "enabled");
            syncMyPluginsToCloud(plugin.name, willBeEnabled);
            notifyPluginsUI();
            return;
        }

        if (wasEnabled && !plugin.started) {
            settings.enabled = willBeEnabled;
            syncMyPluginsToCloud(plugin.name, willBeEnabled);
            notifyPluginsUI();
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;
            const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
            showToast({ text: msg, variant: "critical", position: "bottom" });
            return;
        }

        settings.enabled = willBeEnabled;
        syncMyPluginsToCloud(plugin.name, willBeEnabled);
        notifyPluginsUI();
    }

    const StarIcon = isFavorite ? StarFilled : StarOutlined;

    return (
        <AddonCard
            name={
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", width: "100%" }}>
                    {plugin.name}
                </span>
            }
            description={
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <span style={{ color: "#a1a1aa", lineHeight: "1.4" }}>
                        {plugin.description}
                    </span>
                    <div
                        style={{
                            marginTop: "6px",
                            paddingTop: "12px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            overflow: "hidden",
                            borderRadius: "6px"
                        }}
                    >
                        <img
                            src={CARD_BOTTOM_GIF}
                            alt="VordCord Line"
                            style={{
                                width: "100%",
                                height: "22px",
                                objectFit: "cover",
                                opacity: 0.6,
                                filter: "contrast(1.2)",
                                transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
                                transform: "scale(1)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "1";
                                e.currentTarget.style.transform = "scale(1.03)";
                                e.currentTarget.style.filter = "contrast(1.5) drop-shadow(0 0 8px rgba(255,255,255,0.3))";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.6";
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.filter = "contrast(1.2)";
                            }}
                        />
                    </div>
                </div>
            }
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={toggleEnabled}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <Tooltip text={isFavorite ? "Unfavorite plugin" : "Favorite plugin"}>
                        {tooltipProps => (
                            <button
                                {...tooltipProps}
                                type="button"
                                onClick={toggleFavorite}
                                className={cl("info-button")}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    transition: "all 0.25s ease",
                                    color: isFavorite ? "#facc15" : "#a1a1aa",
                                    filter: isFavorite ? "drop-shadow(0 0 6px rgba(250, 204, 21, 0.6))" : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px",
                                    transform: "scale(1)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.2)";
                                    e.currentTarget.style.color = "#facc15";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.color = isFavorite ? "#facc15" : "#a1a1aa";
                                }}
                            >
                                <StarIcon className={cl("info-icon")} />
                            </button>
                        )}
                    </Tooltip>

                    <button
                        role="switch"
                        onClick={() => openPluginModal(plugin, onRestartNeeded)}
                        className={cl("info-button")}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            transform: "rotate(0deg) scale(1)",
                            color: "#a1a1aa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "4px"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "rotate(90deg) scale(1.15)";
                            e.currentTarget.style.color = "#ffffff";
                            e.currentTarget.style.filter = "drop-shadow(0 0 5px rgba(255,255,255,0.5))";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "rotate(0deg) scale(1)";
                            e.currentTarget.style.color = "#a1a1aa";
                            e.currentTarget.style.filter = "none";
                        }}
                    >
                        {hasAnyVisibleSettings(plugin)
                            ? <CogWheel className={cl("info-icon")} />
                            : <InfoIcon className={cl("info-icon")} />
                        }
                    </button>
                </div>
            }
        />
    );
}

export default PluginCard;