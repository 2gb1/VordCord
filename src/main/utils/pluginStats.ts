// @ts-nocheck
import { Settings } from "@api/Settings";
import { React, UserStore } from "@webpack/common";
import Plugins from "~plugins";

const DB_URL = "https://cordcord-18859-default-rtdb.firebaseio.com";
let cachedCounts: Record<string, number> = {};
let listeners = new Set<() => void>();
let syncTimeout: any = null;

function getUniqueUserId(): string {
    try {
        const me = UserStore?.getCurrentUser?.();
        if (me?.id) return "u_" + me.id;
    } catch { }

    let anon = localStorage.getItem("vc_anon_uid");
    if (!anon) {
        anon = "a_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("vc_anon_uid", anon);
    }
    return anon;
}

function getMyEnabledPlugins(): string[] {
    const enabled: string[] = [];
    const pluginSettings = Settings.plugins || {};
    for (const name of Object.keys(Plugins)) {
        const p = Plugins[name];
        if (!p || p.required || p.hidden) continue;
        if (pluginSettings[name]?.enabled) {
            enabled.push(name);
        }
    }
    return enabled;
}

export async function fetchGlobalPluginCounts() {
    try {
        const res = await fetch(`${DB_URL}/activeUsers.json`);
        if (!res.ok) return;
        const data = await res.json();
        const nextCounts: Record<string, number> = {};

        if (data && typeof data === "object") {
            for (const uid of Object.keys(data)) {
                const list = data[uid];
                if (Array.isArray(list)) {
                    for (const pName of list) {
                        nextCounts[pName] = (nextCounts[pName] || 0) + 1;
                    }
                }
            }
        }

        cachedCounts = nextCounts;
        listeners.forEach(fn => fn());
    } catch (e) {
        console.error("[PluginStats] Failed to fetch counts:", e);
    }
}

export function syncMyPluginsToCloud() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const uid = getUniqueUserId();
            const myList = getMyEnabledPlugins();

            await fetch(`${DB_URL}/activeUsers/${uid}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(myList)
            });

            await fetchGlobalPluginCounts();
        } catch (e) {
            console.error("[PluginStats] Sync error:", e);
        }
    }, 600);
}

export function getPluginUserCount(pluginName: string): number {
    return cachedCounts[pluginName] || 0;
}

export function usePluginPopularity() {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
        listeners.add(forceUpdate);
        syncMyPluginsToCloud();
        return () => {
            listeners.delete(forceUpdate);
        };
    }, []);

    return cachedCounts;
}