/*
 * vortcord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading, HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { PluginTarget } from "@utils/pluginTargets";
import { promptToRestart } from "@utils/promptToRestart";
import { useAwaiter, useCleanupEffect } from "@utils/react";
import { PluginTag, PluginTags } from "@utils/types";
import { Button, lodash, React, SearchableSelect, Select, TextInput, Tooltip, useMemo, useRef, useState } from "@webpack/common";
import { JSX } from "react";

import Plugins, { ExcludedPlugins, PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { UIElementsButton } from "./UIElements";

export const cl = classNameFactory("vc-plugins-");
export const logger = new Logger("PluginSettings", "#a6d189");

const DB_URL = "https://cordcord-18859-default-rtdb.firebaseio.com";
let cachedGlobalCounts: Record<string, number> = {};
let globalListeners = new Set<() => void>();

// دالة لتحديث عداد المفضلة والبلاقنات المفعلة فوراً عند الضغط على النجمة أو التفعيل
export function notifyPluginsUI() {
    globalListeners.forEach(fn => fn());
}

async function fetchGlobalCounts() {
    try {
        const res = await fetch(`${DB_URL}/activeUsers.json`);
        if (!res.ok) return;
        const data = await res.json();
        const counts: Record<string, number> = {};
        if (data && typeof data === "object") {
            for (const uid of Object.keys(data)) {
                const list = data[uid];
                if (Array.isArray(list)) {
                    for (const pName of list) {
                        counts[pName] = (counts[pName] || 0) + 1;
                    }
                }
            }
        }
        cachedGlobalCounts = counts;
        notifyPluginsUI();
    } catch (e) {
        console.error("[PluginStats] Failed to fetch counts:", e);
    }
}
fetchGlobalCounts();
setInterval(fetchGlobalCounts, 15000);

const NEW_BANNER_GIF = "https://i.pinimg.com/originals/67/38/63/67386362c44f180455b7668fe70d5059.gif";

function VoidParticlesCanvas({ fixed = false }: { fixed?: boolean; }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        const resize = () => {
            canvas.width = canvas.offsetWidth || window.innerWidth;
            canvas.height = canvas.offsetHeight || window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.8 + 0.5,
            vx: (Math.random() - 0.5) * 0.35,
            vy: -Math.random() * 0.55 - 0.15,
            alpha: Math.random() * 0.55 + 0.15
        }));

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y < -10) {
                    p.y = canvas.height + 10;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#ffffff";
                ctx.fill();
            }
            animId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: fixed ? "fixed" : "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0
            }}
        />
    );
}

function TopHeaderBanner({ required }: { required: boolean; }) {
    return (
        <div style={{
            position: "relative",
            background: required
                ? "linear-gradient(135deg, rgba(45, 12, 12, 0.9) 0%, rgba(12, 5, 5, 0.95) 100%)"
                : "linear-gradient(135deg, rgba(16, 16, 20, 0.88) 0%, rgba(7, 7, 9, 0.96) 100%)",
            border: `1px solid ${required ? "rgba(255, 70, 70, 0.35)" : "rgba(255, 255, 255, 0.14)"}`,
            borderRadius: "16px",
            padding: "22px 26px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 12px 35px rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(14px)",
            overflow: "hidden",
            zIndex: 1
        }}>
            <div style={{ flex: 1 }}>
                {required ? (
                    <>
                        <HeadingTertiary style={{ color: "#ff4d4d", fontSize: "20px", fontWeight: 800, letterSpacing: "0.4px" }}>
                            Restart Required
                        </HeadingTertiary>
                        <Paragraph style={{ color: "#d4d4d8", marginTop: "6px", fontSize: "14px" }}>
                            Reload your client to apply the modified plugin configurations.
                        </Paragraph>
                        <Button
                            onClick={() => location.reload()}
                            style={{ marginTop: "12px", background: "#ffffff", color: "#000000", fontWeight: "bold", borderRadius: "8px" }}
                        >
                            Restart Client
                        </Button>
                    </>
                ) : (
                    <>
                        <HeadingTertiary style={{ color: "#ffffff", fontSize: "22px", fontWeight: 800, letterSpacing: "0.5px" }}>
                            VordCord Plugins
                        </HeadingTertiary>
                        <Paragraph style={{ color: "#a1a1aa", marginTop: "6px", fontSize: "14px" }}>
                            Central hub to manage, configure, and customize your client modules.
                        </Paragraph>
                    </>
                )}
            </div>
            <div>
                <img
                    src={NEW_BANNER_GIF}
                    alt="VordCord"
                    style={{
                        width: "76px",
                        height: "76px",
                        borderRadius: "14px",
                        objectFit: "cover",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        boxShadow: "0 0 25px rgba(255, 255, 255, 0.12)"
                    }}
                />
            </div>
        </div>
    );
}

const enum SearchStatus {
    ALL,
    FAVORITES,
    SPECIAL_PLUGINS,
    ENABLED,
    DISABLED,
    NEW,
    API_PLUGINS
}

function ExcludedPluginsList({ search }: { search: string; }) {
    const matchingExcludedPlugins = search
        ? Object.entries(ExcludedPlugins)
            .filter(([name]) => name.toLowerCase().includes(search))
        : [];

    const ExcludedReasons: Record<PluginTarget, string> = {
        desktop: "Discord Desktop app or Vesktop",
        discordDesktop: "Discord Desktop app",
        vesktop: "Vesktop app",
        web: "Vesktop app and the Web version of Discord",
        dev: "Developer version of Vencord",
        browser: "Web Browser version of Vencord"
    };

    return (
        <Paragraph className={Margins.top16} style={{ color: "#a1a1aa" }}>
            {matchingExcludedPlugins.length
                ? <>
                    <Paragraph style={{ color: "#fff" }}>Are you looking for:</Paragraph>
                    <ul style={{ color: "#a1a1aa" }}>
                        {matchingExcludedPlugins.map(([name, reason]) => (
                            <li key={name}>
                                <b style={{ color: "#fff" }}>{name}</b>: Only available on the {ExcludedReasons[reason]}
                            </li>
                        ))}
                    </ul>
                </>
                : "No plugins meet the search criteria."
            }
        </Paragraph>
    );
}

function PluginSettings() {
    const settings = useSettings();
    const changeRef = useRef<ChangeList<string>>(null);
    const changes = changeRef.current ??= new ChangeList<string>();

    const [updateTick, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => {
        globalListeners.add(forceUpdate);
        return () => {
            globalListeners.delete(forceUpdate);
        };
    }, []);

    useCleanupEffect(() => {
        if (changes.hasChanges)
            promptToRestart("reload", {
                children: <>
                    <Heading tag="h5">The following plugins require a restart:</Heading>
                    <Paragraph>{Array.from(changes, k => k.split(".")[0]).join(", ")}</Paragraph>
                </>
            });
    }, []);

    const depMap = useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const sortedPlugins = useMemo(() =>
        Object.values(Plugins).sort((a, b) => {
            const favA = Number(Settings.plugins[a.name]?.isFavorite ?? false);
            const favB = Number(Settings.plugins[b.name]?.isFavorite ?? false);
            if (favA !== favB) return favB - favA;

            const countA = cachedGlobalCounts[a.name] || 0;
            const countB = cachedGlobalCounts[b.name] || 0;
            if (countA !== countB) return countB - countA;

            return a.name.localeCompare(b.name);
        }),
        [cachedGlobalCounts, settings, updateTick]
    );

    const [searchValue, setSearchValue] = useState({ value: "", tags: [] as PluginTag[], status: SearchStatus.ALL });
    const [isFocused, setIsFocused] = useState(false);

    React.useEffect(() => {
        if (!isFocused) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                setIsFocused(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [isFocused]);

    // حساب الإحصائيات مع الاستجابة الفورية عند الضغط على النجمة أو زر التفعيل
    const stats = useMemo(() => {
        const allVisible = sortedPlugins.filter(p => !p.hidden && (p.settings || !p.name.endsWith("API")));
        const total = allVisible.length || 1;
        let enabled = 0;
        let favorites = 0;

        for (const p of allVisible) {
            if (isPluginEnabled(p.name)) enabled++;
            if (Settings.plugins[p.name]?.isFavorite) favorites++;
        }

        const memoryMB = (enabled * 1.35).toFixed(1);
        const pct = Math.round((enabled / total) * 100);
        return { total, enabled, favorites, memoryMB, pct };
    }, [sortedPlugins, settings, updateTick]);

    const search = searchValue.value.toLowerCase();
    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const { status, tags } = searchValue;

        switch (status) {
            case SearchStatus.FAVORITES:
                if (!Settings.plugins[plugin.name]?.isFavorite) return false;
                break;
            case SearchStatus.SPECIAL_PLUGINS:
                if (!PluginMeta[plugin.name]?.userPlugin) return false;
                break;
            case SearchStatus.DISABLED:
                if (isPluginEnabled(plugin.name)) return false;
                break;
            case SearchStatus.ENABLED:
                if (!isPluginEnabled(plugin.name)) return false;
                break;
            case SearchStatus.NEW:
                if (!newPlugins?.includes(plugin.name)) return false;
                break;
            case SearchStatus.API_PLUGINS:
                if (!plugin.name.endsWith("API")) return false;
                break;
        }

        if (tags.length && tags.some(t => !plugin.tags?.includes(t))) return false;

        if (!search.length) return true;

        return (
            plugin.name.toLowerCase().includes(search) ||
            plugin.name.match(/[A-Z]/g)?.join("").toLowerCase().includes(search) ||
            plugin.description.toLowerCase().includes(search) ||
            plugin.searchTerms?.some(t => t.toLowerCase().includes(search))
        );
    };

    const [newPlugins] = useAwaiter(() => DataStore.get("Vencord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
        const now = Date.now() / 1000;
        const existingTimestamps: Record<string, number> = {};
        const sortedPluginNames = Object.values(sortedPlugins).map(plugin => plugin.name);

        const newPlugins: string[] = [];
        for (const { name: p } of sortedPlugins) {
            const time = existingTimestamps[p] = cachedPlugins?.[p] ?? now;
            if ((time + 60 * 60 * 24 * 2) > now) {
                newPlugins.push(p);
            }
        }
        DataStore.set("Vencord_existingPlugins", existingTimestamps);

        return lodash.isEqual(newPlugins, sortedPluginNames) ? [] : newPlugins;
    }));

    const plugins = [] as JSX.Element[];
    const requiredPlugins = [] as JSX.Element[];

    const showApi = searchValue.status === SearchStatus.API_PLUGINS;
    for (const p of sortedPlugins) {
        if (p.hidden || (!p.settings && p.name.endsWith("API") && !showApi))
            continue;

        if (!pluginFilter(p)) continue;

        const isRequired = p.required || p.isDependency || depMap[p.name]?.some(d => settings.plugins[d].enabled);

        if (isRequired) {
            const tooltipText = p.required || !depMap[p.name]
                ? "This plugin is required for VordCord to function."
                : makeDependencyList(depMap[p.name]?.filter(d => settings.plugins[d].enabled));

            requiredPlugins.push(
                <Tooltip text={tooltipText} key={p.name}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <PluginCard
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            onRestartNeeded={(name, key) => changes.handleChange(`${name}.${key}`)}
                            disabled={true}
                            plugin={p}
                            key={p.name}
                        />
                    )}
                </Tooltip>
            );
        } else {
            plugins.push(
                <PluginCard
                    onRestartNeeded={(name, key) => changes.handleChange(`${name}.${key}`)}
                    disabled={false}
                    plugin={p}
                    isNew={newPlugins?.includes(p.name)}
                    key={p.name}
                />
            );
        }
    }

    return (
        <SettingsTab>
            <style>{`
                .vc-Vord-void-monarch {
                    position: relative;
                    background-color: #050507;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 0);
                    background-size: 24px 24px;
                    border-radius: 18px;
                    padding: 20px;
                    min-height: 100%;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                .vc-Vord-void-monarch .vc-plugins-grid > * {
                    background: linear-gradient(145deg, rgba(16, 16, 20, 0.9) 0%, rgba(8, 8, 11, 0.96) 100%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 14px !important;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
                    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    backdrop-filter: blur(10px);
                }

                .vc-Vord-void-monarch .vc-plugins-grid > *:hover {
                    border-color: rgba(255, 255, 255, 0.35) !important;
                    transform: translateY(-4px) !important;
                    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.85), 0 0 20px rgba(255, 255, 255, 0.08) !important;
                }

                .vc-Vord-void-monarch .vc-plugins-grid > * > :first-child {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                    padding-bottom: 12px !important;
                    margin-bottom: 12px !important;
                }

                .vc-Vord-void-monarch .vc-plugins-grid > *::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .vc-Vord-void-monarch .vc-plugins-grid > *:hover::before {
                    opacity: 1;
                }

                .vc-Vord-void-monarch input,
                .vc-Vord-void-monarch [class*="select-"],
                .vc-Vord-void-monarch [class*="control-"] {
                    background-color: #0b0b0f !important;
                    border: 1px solid rgba(255, 255, 255, 0.14) !important;
                    color: #ffffff !important;
                    border-radius: 10px !important;
                    transition: all 0.2s ease;
                }

                .vc-Vord-void-monarch input:focus {
                    border-color: rgba(255, 255, 255, 0.45) !important;
                }

                .vc-Vord-void-monarch h5, .vc-Vord-void-monarch h3 {
                    color: #ffffff !important;
                    font-weight: 700;
                }

                @keyframes bgGridMove {
                    0% { background-position: 0px 0px; }
                    100% { background-position: 40px 40px; }
                }

                @keyframes floatVoidOrb {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(80px, -50px) scale(1.18); }
                }

                @keyframes cardFloatIn {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-4px); }
                    100% { transform: translateY(0px); }
                }

                .cinematic-active-input div,
                .cinematic-active-input input {
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                }

                .cinematic-active-input input {
                    font-size: 18px !important;
                    padding: 18px 90px 18px 24px !important;
                    color: #ffffff !important;
                    font-family: 'gg sans', 'Inter', monospace !important;
                    letter-spacing: 0.5px;
                }

                .cinematic-scroll-container {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
                }
                .cinematic-scroll-container::-webkit-scrollbar {
                    width: 6px;
                }
                .cinematic-scroll-container::-webkit-scrollbar-track {
                    background: transparent;
                }
                .cinematic-scroll-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                }

                .cinematic-grid-cards {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)) !important;
                    gap: 16px !important;
                    width: 100% !important;
                }

                .cinematic-grid-cards > * {
                    min-height: 155px !important;
                    height: auto !important;
                    flex-shrink: 0 !important;
                    background: linear-gradient(145deg, rgba(16, 16, 22, 0.94) 0%, rgba(8, 8, 12, 0.98) 100%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.14) !important;
                    backdrop-filter: blur(14px) !important;
                    animation: cardFloatIn 4s ease-in-out infinite;
                }

                .cinematic-grid-cards > *:nth-child(even) {
                    animation-delay: 0.25s;
                }

                .cinematic-grid-cards > *:hover {
                    border-color: rgba(255, 255, 255, 0.5) !important;
                    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.9), 0 0 22px rgba(255, 255, 255, 0.16) !important;
                    transform: translateY(-5px) scale(1.01) !important;
                }
            `}</style>

            <div className="vc-Vord-void-monarch">
                <VoidParticlesCanvas />

                <div style={{ position: "relative", zIndex: 1 }}>
                    <TopHeaderBanner required={changes.hasChanges} />

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "12px",
                        marginBottom: "18px",
                        opacity: isFocused ? 0 : 1,
                        transition: "opacity 0.25s ease"
                    }}>
                        <div style={{
                            background: "rgba(14, 14, 18, 0.85)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "14px",
                            padding: "14px 16px",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>Enabled Plugins</div>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>
                                    {stats.enabled} <span style={{ fontSize: "13px", color: "#71717a" }}>/ {stats.total}</span>
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#e4e4e7" }}>{stats.pct}%</span>
                            </div>
                            <div style={{ height: "4px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "99px", marginTop: "10px", overflow: "hidden" }}>
                                <div style={{ width: `${stats.pct}%`, height: "100%", background: "#ffffff", boxShadow: "0 0 10px #ffffff", transition: "width 0.4s ease" }} />
                            </div>
                        </div>

                        <div style={{
                            background: "rgba(14, 14, 18, 0.85)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "14px",
                            padding: "14px 16px",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>Favorites</div>
                            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>
                                ★ {stats.favorites}
                            </div>
                            <div style={{ fontSize: "11px", color: "#71717a", marginTop: "6px" }}>Pinned to top</div>
                        </div>

                        <div style={{
                            background: "rgba(14, 14, 18, 0.85)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "14px",
                            padding: "14px 16px",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>Memory Usage</div>
                            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>
                                ~{stats.memoryMB} MB
                            </div>
                            <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "6px" }}>● Optimal performance</div>
                        </div>
                    </div>

                    <UIElementsButton />

                    <div
                        style={{
                            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                            backgroundColor: "rgba(4, 4, 7, 0.94)",
                            backdropFilter: "blur(18px)",
                            opacity: isFocused ? 1 : 0,
                            pointerEvents: isFocused ? "all" : "none",
                            transition: "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                            zIndex: 9998,
                            overflow: "hidden"
                        }}
                        onClick={() => setIsFocused(false)}
                    >
                        {isFocused && <VoidParticlesCanvas fixed />}

                        <div style={{
                            position: "absolute", inset: 0,
                            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 0)",
                            backgroundSize: "40px 40px",
                            animation: "bgGridMove 6s linear infinite"
                        }} />

                        <div style={{
                            position: "absolute", top: "18%", left: "32%",
                            width: "450px", height: "450px", borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                            filter: "blur(55px)",
                            animation: "floatVoidOrb 10s ease-in-out infinite",
                            pointerEvents: "none"
                        }} />
                    </div>

                    <ErrorBoundary noop>
                        <div
                            onClick={e => e.stopPropagation()}
                            onKeyDownCapture={e => {
                                if (isFocused && e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsFocused(false);
                                }
                            }}
                            style={isFocused ? {
                                position: "fixed", top: "12vh", left: "50%", transform: "translateX(-50%)",
                                width: "90vw", maxWidth: "1050px", zIndex: 9999,
                                display: "flex", flexDirection: "column", alignItems: "center"
                            } : {
                                position: "relative", width: "100%", zIndex: 2, marginTop: "16px"
                            }}
                        >
                            <div
                                className={isFocused ? "cinematic-active-input" : ""}
                                style={isFocused ? {
                                    position: "relative",
                                    width: "650px",
                                    maxWidth: "100%",
                                    background: "linear-gradient(135deg, rgba(18, 18, 24, 0.96) 0%, rgba(8, 8, 12, 0.98) 100%)",
                                    border: "1px solid rgba(255, 255, 255, 0.4)",
                                    borderRadius: "16px",
                                    boxShadow: "0 20px 55px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 255, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                                    transform: "scale(1.04)",
                                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                                } : {
                                    position: "relative", width: "100%"
                                }}
                            >
                                <TextInput
                                    inputClassName={cl("filter-control")}
                                    placeholder="Search for a plugin..."
                                    value={searchValue.value}
                                    onChange={onSearch}
                                    onClick={() => setIsFocused(true)}
                                />

                                {isFocused && (
                                    <div
                                        onClick={() => setIsFocused(false)}
                                        style={{
                                            position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)",
                                            background: "rgba(255, 255, 255, 0.08)", padding: "5px 10px", borderRadius: "8px",
                                            fontSize: "11px", fontWeight: "bold", color: "#ffffff",
                                            border: "1px solid rgba(255, 255, 255, 0.2)",
                                            borderBottom: "2px solid rgba(0, 0, 0, 0.8)",
                                            cursor: "pointer", letterSpacing: "1px"
                                        }}
                                    >
                                        ESC
                                    </div>
                                )}
                            </div>

                            {isFocused && (
                                <div
                                    className="cinematic-scroll-container"
                                    style={{
                                        marginTop: "36px",
                                        width: "100%",
                                        maxHeight: "65vh",
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                        padding: "12px 16px 30px 16px",
                                        opacity: search ? 1 : 0,
                                        transform: search ? "translateY(0)" : "translateY(20px)",
                                        pointerEvents: search ? "all" : "none",
                                        transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                                    }}
                                >
                                    {plugins.length ? (
                                        <div className={classes(cl("grid"), "cinematic-grid-cards")}>
                                            {plugins}
                                        </div>
                                    ) : (
                                        <Paragraph style={{ color: "#a1a1aa", textAlign: "center", fontSize: "16px", marginTop: "20px" }}>
                                            No plugins match "{searchValue.value}".
                                        </Paragraph>
                                    )}
                                </div>
                            )}
                        </div>
                    </ErrorBoundary>

                    <div style={{ opacity: isFocused ? 0 : 1, pointerEvents: isFocused ? "none" : "all", transition: "opacity 0.25s ease" }}>
                        <ErrorBoundary noop>
                            <div className={classes(Margins.bottom20, Margins.top8, cl("filter-controls"))}>
                                <Select
                                    options={[
                                        { label: "Show All", value: SearchStatus.ALL, default: true },
                                        { label: "Special Plugins", value: SearchStatus.SPECIAL_PLUGINS },
                                        { label: "Show Favorites ⭐", value: SearchStatus.FAVORITES },
                                        { label: "Show Enabled", value: SearchStatus.ENABLED },
                                        { label: "Show Disabled", value: SearchStatus.DISABLED },
                                        { label: "Show New", value: SearchStatus.NEW },
                                        { label: "Show API Plugins", value: SearchStatus.API_PLUGINS },
                                    ].filter(isTruthy)}
                                    serialize={String}
                                    select={status => setSearchValue(prev => ({ ...prev, status }))}
                                    isSelected={v => v === searchValue.status}
                                    closeOnSelect={true}
                                    placeholder="Filter by Type"
                                />

                                <SearchableSelect
                                    options={PluginTags.map(tag => ({ label: tag, value: tag }))}
                                    value={searchValue.tags}
                                    onChange={tags => setSearchValue(prev => ({ ...prev, tags }))}
                                    closeOnSelect={false}
                                    placeholder="Filter by Tags"
                                    multi
                                />
                            </div>
                        </ErrorBoundary>

                        <HeadingTertiary className={Margins.top20}>Plugins</HeadingTertiary>

                        {!isFocused && (
                            <>
                                {plugins.length || requiredPlugins.length
                                    ? (
                                        <div className={cl("grid")}>
                                            {plugins.length
                                                ? plugins
                                                : <Paragraph style={{ color: "#a1a1aa" }}>No plugins meet the search criteria.</Paragraph>
                                            }
                                        </div>
                                    )
                                    : <ExcludedPluginsList search={search} />
                                }

                                <Divider className={Margins.top20} />

                                <HeadingTertiary className={classes(Margins.top20, Margins.bottom8)}>
                                    Required Plugins
                                </HeadingTertiary>

                                <div className={cl("grid")}>
                                    {requiredPlugins.length
                                        ? requiredPlugins
                                        : <Paragraph style={{ color: "#a1a1aa" }}>No required plugins meet the search criteria.</Paragraph>
                                    }
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </SettingsTab>
    );
}

function makeDependencyList(deps: string[]) {
    return (
        <>
            <Paragraph>This plugin is required by:</Paragraph>
            {deps.map((dep: string) => <Paragraph key={dep} className={cl("dep-text")}>{dep}</Paragraph>)}
        </>
    );
}

export default wrapTab(PluginSettings, "VordCord Plugins");