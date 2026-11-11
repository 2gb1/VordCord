/*
 * Vencord, a modification for Discord's desktop app
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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { FormSwitch } from "@components/FormSwitch";
import { FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/Icons";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import NoTrack from "@plugins/_core/noTrack";
import SettingsPlugin from "@plugins/_core/settings";
import { IS_WINDOWS } from "@utils/constants";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { promptToRestart } from "@utils/promptToRestart";
import { Forms, React, useMemo, useRef } from "@webpack/common";

import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";

const SERVER_INVITE = "https://discord.gg/C3C7av8S9E";
const BANNER_GIF = "https://i.pinimg.com/originals/22/c1/d7/22c1d7be4f7985fedc437fe58a578ceb.gif";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

// خلفية الجزيئات المتحركة
function ApexVoidCanvas() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        const resize = () => {
            canvas.width = canvas.offsetWidth || 900;
            canvas.height = canvas.offsetHeight || 900;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles = Array.from({ length: 42 }, () => ({
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
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0
            }}
        />
    );
}

// الهيدر المحدث: البانر الكبير كامل بالعرض، وتحته مربعات الإحصائيات جنباً إلى جنب
function ApexBentoHeader({ activeCount, totalCount }: { activeCount: number; totalCount: number; }) {
    const fullText = "Welcome to VordCord! If you want to support us or stay updated, join our Discord server.";
    const [typedText, setTypedText] = React.useState("");

    React.useEffect(() => {
        let index = 0;
        setTypedText("");
        const timer = setInterval(() => {
            if (index < fullText.length) {
                setTypedText(prev => prev + fullText.charAt(index));
                index++;
            } else {
                clearInterval(timer);
            }
        }, 38);

        return () => clearInterval(timer);
    }, []);

    const pct = Math.round((activeCount / (totalCount || 1)) * 100);

    return (
        <div className="vc-Vord-bento-top">
            {/* بطاقة البانر الأساسية بعرض الصفحة كاملاً */}
            <div className="vc-Vord-bento-hero">
                <div style={{ zIndex: 2, flex: 1, paddingRight: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <span style={{
                            color: "#ffffff",
                            fontSize: "21px",
                            fontWeight: 800,
                            letterSpacing: "0.4px"
                        }}>
                            Support the Project
                        </span>
                        <span style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            border: "1px solid rgba(255, 255, 255, 0.28)",
                            letterSpacing: "0.5px"
                        }}>
                            VordCord
                        </span>
                    </div>

                    <p style={{
                        color: "#d4d4d8",
                        margin: "0 0 18px 0",
                        fontSize: "13.5px",
                        lineHeight: "1.55",
                        minHeight: "42px",
                        fontFamily: "'JetBrains Mono', monospace"
                    }}>
                        {typedText}
                        <span className="vc-Vord-cursor">|</span>
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                            onClick={() => VencordNative.native.openExternal(SERVER_INVITE)}
                            className="vc-Vord-primary-btn"
                        >
                            Join Server ↗
                        </button>
                        {!IS_WEB && (
                            <button
                                onClick={relaunch}
                                className="vc-Vord-secondary-btn"
                            >
                                Relaunch Client
                            </button>
                        )}
                    </div>
                </div>

                {/* الـ GIF الأصلي */}
                <div style={{ zIndex: 2, flexShrink: 0 }}>
                    <div className="vc-Vord-avatar-ring">
                        <img
                            src={BANNER_GIF}
                            alt="VordCord"
                            style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                display: "block"
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* مربعات الإحصائيات تحت البانر بجانب بعضهما */}
            <div className="vc-Vord-bento-telemetry">
                <div className="vc-Vord-stat-box">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 800, color: "#a1a1aa", letterSpacing: "1px" }}>
                            ACTIVE FLAGS
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                            {pct}%
                        </span>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
                        {activeCount} <span style={{ fontSize: "13px", color: "#71717a", fontWeight: 600 }}>/ {totalCount}</span>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "99px", marginTop: "10px", overflow: "hidden" }}>
                        <div style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "#ffffff",
                            boxShadow: "0 0 10px #ffffff",
                            transition: "width 0.35s ease"
                        }} />
                    </div>
                </div>

                <div className="vc-Vord-stat-box">
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#a1a1aa", letterSpacing: "1px", marginBottom: "6px" }}>
                        CLIENT ENGINE
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>
                            VordCord Core
                        </span>
                        <span style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#4ade80",
                            background: "rgba(74, 222, 128, 0.12)",
                            border: "1px solid rgba(74, 222, 128, 0.3)",
                            padding: "2px 8px",
                            borderRadius: "999px"
                        }}>
                            ● ONLINE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function useSwitchesList() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "frameless", "nativeTitleBar", "transparent", "winCtrlQ", "disableMinSize"]);
    const { disableAnalytics } = NoTrack.settings.use(["disableAnalytics"]);

    const list = [
        {
            key: "useQuickCss",
            title: "Enable Custom CSS",
            description: "Apply your configured QuickCSS"
        },
        {
            value: disableAnalytics,
            updateSetting(newValue: boolean) {
                NoTrack.settings.store.disableAnalytics = newValue;
            },
            reactKey: "NoTrack::disableAnalytics",
            key: null!,
            title: "Block Discord Analytics",
            description: NoTrack.settings.def.disableAnalytics.description,
            restartRequired: NoTrack.settings.def.disableAnalytics.restartNeeded,
        },
        IS_DISCORD_DESKTOP && {
            key: "nativeTitleBar",
            title: "Enable the system's title bar in addition to Discord's custom one",
            description: "Restores the native OS window frame alongside Discord's header",
            restartRequired: true
        },
        !IS_WEB && {
            key: "transparent",
            title: "Enable window transparency",
            description: "A theme that supports transparency is required or this will do nothing. Stops the window from being resizable as a side effect",
            restartRequired: true
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: "Disable minimum window size",
            description: "Allows you to resize the window to any size, even smaller than Discord's minimum size",
            restartRequired: true
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
            description: "Quickly terminate the desktop client using Ctrl+Q",
            restartRequired: true
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: "Enable React Developer Tools",
            description: "Mainly useful for plugin developers. Ignore this if you don't know what it is",
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        reactKey?: string;
        title: string;
        description?: string;
        restartRequired?: boolean;
        updateSetting?(newValue: boolean): void;
        value?: boolean;
    }>;

    return { settings, list };
}

function Switches() {
    const { settings, list } = useSwitchesList();

    return (
        <div className="vc-Vord-switches-grid">
            {list.map(setting => {
                if (!setting) return null;

                const { reactKey, key, value, title, description, restartRequired, updateSetting = v => (settings[key] = v) } = setting;
                const isChecked = Boolean(value ?? settings[key]);

                return (
                    <div
                        key={reactKey ?? key}
                        className={`vc-Vord-switch-card ${isChecked ? "vc-Vord-switch-active" : ""}`}
                    >
                        {restartRequired && (
                            <span className="vc-Vord-restart-badge">RESTART REQ</span>
                        )}
                        <FormSwitch
                            title={title}
                            description={description}
                            value={isChecked}
                            hideBorder
                            onChange={v => {
                                updateSetting(v);
                                if (restartRequired) {
                                    promptToRestart("relaunch");
                                }
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

function VencordSettings() {
    const { settings, list } = useSwitchesList();

    const { activeCount, totalCount } = useMemo(() => {
        const valid = list.filter(Boolean) as Array<{ key: KeysOfType<typeof settings, boolean>; value?: boolean; }>;
        let active = 0;
        for (const item of valid) {
            const val = item.value ?? settings[item.key];
            if (val) active++;
        }
        return { activeCount: active, totalCount: valid.length };
    }, [settings, list]);

    return (
        <SettingsTab>
            <style>{`
                .vc-Vord-apex-container {
                    position: relative;
                    background-color: #040406;
                    background-image:
                        radial-gradient(circle at 15% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 45%),
                        radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0);
                    background-size: 100% 100%, 24px 24px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 20px;
                    padding: 22px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
                }

                .vc-Vord-bento-top {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 18px;
                    position: relative;
                    z-index: 2;
                }

                .vc-Vord-bento-hero {
                    background: linear-gradient(145deg, rgba(16, 16, 22, 0.92) 0%, rgba(6, 6, 9, 0.98) 100%);
                    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0);
                    background-size: 22px 22px;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 16px;
                    padding: 22px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(14px);
                    width: 100%;
                }

                .vc-Vord-bento-hero::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
                }

                .vc-Vord-avatar-ring {
                    padding: 4px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.05));
                    box-shadow: 0 0 28px rgba(255, 255, 255, 0.18);
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .vc-Vord-avatar-ring:hover {
                    transform: scale(1.06) rotate(3deg);
                }

                /* مربعات الإحصائيات تصبح تحت البانر بجانب بعضها */
                .vc-Vord-bento-telemetry {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    width: 100%;
                }

                @media (max-width: 650px) {
                    .vc-Vord-bento-telemetry {
                        grid-template-columns: 1fr;
                    }
                }

                .vc-Vord-stat-box {
                    background: linear-gradient(145deg, rgba(15, 15, 20, 0.9) 0%, rgba(8, 8, 12, 0.96) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 14px;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(12px);
                    transition: border-color 0.25s ease, transform 0.25s ease;
                }

                .vc-Vord-stat-box:hover {
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }

                .vc-Vord-primary-btn {
                    background: #ffffff !important;
                    color: #000000 !important;
                    padding: 9px 18px;
                    border-radius: 10px;
                    border: none;
                    font-weight: 800;
                    font-size: 13px;
                    cursor: pointer;
                    box-shadow: 0 4px 18px rgba(255, 255, 255, 0.25);
                    transition: all 0.25s ease;
                }

                .vc-Vord-primary-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 22px rgba(255, 255, 255, 0.4);
                    background: #f4f4f5 !important;
                }

                .vc-Vord-secondary-btn {
                    background: rgba(255, 255, 255, 0.06);
                    color: #ffffff;
                    padding: 9px 16px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }

                .vc-Vord-secondary-btn:hover {
                    background: rgba(255, 255, 255, 0.14);
                    border-color: rgba(255, 255, 255, 0.35);
                    transform: translateY(-2px);
                }

                .vc-Vord-section-card {
                    position: relative;
                    z-index: 2;
                    background: linear-gradient(145deg, rgba(12, 12, 16, 0.9) 0%, rgba(6, 6, 9, 0.96) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.11);
                    border-radius: 16px;
                    padding: 20px 22px;
                    margin-bottom: 18px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(12px);
                }

                .vc-Vord-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
                }

                /* تصميم أزرار QuickActionCard */
                .vc-Vord-apex-container [class*="quickActions"] > *,
                .vc-Vord-quick-actions-wrap button,
                .vc-Vord-quick-actions-wrap > div > * {
                    background: linear-gradient(145deg, #111116 0%, #09090c 100%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    border-radius: 12px !important;
                    color: #ffffff !important;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5) !important;
                }

                .vc-Vord-quick-actions-wrap button:hover,
                .vc-Vord-quick-actions-wrap > div > *:hover {
                    border-color: rgba(255, 255, 255, 0.38) !important;
                    transform: translateY(-3px) !important;
                    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 255, 255, 0.08) !important;
                }

                /* كبسولات الإعدادات Bento Switches */
                .vc-Vord-switches-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .vc-Vord-switch-card {
                    position: relative;
                    background: rgba(16, 16, 22, 0.72);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 13px;
                    padding: 12px 16px;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .vc-Vord-switch-card:hover {
                    background: rgba(22, 22, 30, 0.9);
                    border-color: rgba(255, 255, 255, 0.24);
                    transform: translateX(3px);
                }

                .vc-Vord-switch-active {
                    border-color: rgba(255, 255, 255, 0.22);
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(16, 16, 22, 0.8) 100%);
                }

                .vc-Vord-Switch-card div[class*="container"] {
                    margin-bottom: 0 !important;
                }

                .vc-Vord-restart-badge {
                    position: absolute;
                    top: 10px;
                    right: 68px;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 7px;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.07);
                    color: #a1a1aa;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    letter-spacing: 0.6px;
                    pointer-events: none;
                }

                @keyframes blinkCursor {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                .vc-Vord-cursor {
                    display: inline-block;
                    margin-left: 2px;
                    color: #ffffff;
                    animation: blinkCursor 1s infinite;
                }
            `}</style>

            <div className="vc-Vord-apex-container">
                {/* خلفية الجزيئات البيضاء المتحركة */}
                <ApexVoidCanvas />

                {/* الهيدر المحدث: البانر الكبير كامل بالعرض وتحته الإحصائيات */}
                <ApexBentoHeader activeCount={activeCount} totalCount={totalCount} />

                {/* قسم الإجراءات السريعة Quick Actions */}
                <section className="vc-Vord-section-card">
                    <div className="vc-Vord-section-header">
                        <Forms.FormTitle tag="h5" style={{ color: "#ffffff", margin: 0, fontSize: "14px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase" }}>
                            ⚡ Quick Actions
                        </Forms.FormTitle>
                        <span style={{ fontSize: "11px", color: "#71717a", fontFamily: "monospace" }}>
                            SYSTEM SHORTCUTS
                        </span>
                    </div>

                    <div className="vc-Vord-quick-actions-wrap">
                        <QuickActionCard>
                            <QuickAction
                                Icon={LogIcon}
                                text="Notification Log"
                                action={openNotificationLogModal}
                            />
                            <QuickAction
                                Icon={PaintbrushIcon}
                                text="Edit QuickCSS"
                                action={() => VencordNative.quickCss.openEditor()}
                            />
                            {!IS_WEB && (
                                <>
                                    <QuickAction
                                        Icon={RestartIcon}
                                        text="Relaunch Discord"
                                        action={relaunch}
                                    />
                                    <QuickAction
                                        Icon={FolderIcon}
                                        text="Open Settings Folder"
                                        action={() => VencordNative.settings.openFolder()}
                                    />
                                </>
                            )}
                            <QuickAction
                                Icon={GithubIcon}
                                text="Join VordCord Server"
                                action={() => VencordNative.native.openExternal(SERVER_INVITE)}
                            />
                        </QuickActionCard>
                    </div>
                </section>

                {/* قسم الإعدادات والمفاتيح */}
                <section className="vc-Vord-section-card">
                    <div className="vc-Vord-section-header">
                        <div>
                            <Forms.FormTitle tag="h5" style={{ color: "#ffffff", margin: 0, fontSize: "15px", fontWeight: 800, letterSpacing: "0.5px" }}>
                                VordCord Settings
                            </Forms.FormTitle>
                            <Forms.FormText style={{ color: "#a1a1aa", fontSize: "12.5px", marginTop: "4px" }}>
                                Hint: You can change the position of this settings section in the{" "}
                                <a
                                    style={{ color: "#ffffff", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                                    onClick={() => openPluginModal(SettingsPlugin)}
                                >
                                    settings of the Settings plugin
                                </a>!
                            </Forms.FormText>
                        </div>
                    </div>

                    <Switches />
                </section>

                {/* قسم المظهر والإشعارات */}
                <section className="vc-Vord-section-card" style={{ marginBottom: 0 }}>
                    <MacOSVibrancySettings />
                    <WindowsMaterialSettings />
                    <NotificationSection />
                </section>
            </div>
        </SettingsTab>
    );
}

export default wrapTab(VencordSettings, "VordCord Settings");