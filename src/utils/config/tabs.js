import { existsSync, readdirSync, readFileSync } from "fs";
import { basename, dirname, join } from "path";

import { loadYaml } from "utils/config/yaml";

const tabFiles = ["settings.yaml", "services.yaml", "bookmarks.yaml"];

export function getTabConfigFiles(configDir) {
  const tabsDir = join(configDir, "tabs");
  if (!existsSync(tabsDir)) return [];
  return readdirSync(tabsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((directory) => tabFiles.map((file) => join(tabsDir, directory, file)))
    .filter((file) => existsSync(file));
}

function layoutObject(layout) {
  return Array.isArray(layout) ? Object.assign({}, ...layout) : (layout ?? {});
}

function qualifyGroups(groups, localLayout, namespace, tab, nestedGroups = true) {
  const layout = {};
  const qualified = groups.map((group) => {
    const [name, entries] = Object.entries(group)[0];
    const key = `${namespace}/${encodeURIComponent(name)}`;
    const options = localLayout[name] ?? {};
    layout[key] = { ...options, tab, displayName: options.displayName ?? name };
    const children = entries.map((entry) => {
      const value = Object.values(entry)[0];
      if (!nestedGroups || !Array.isArray(value)) return entry;
      const nested = qualifyGroups([entry], layoutObject(options), key, tab);
      Object.assign(layout[key], nested.layout);
      return nested.groups[0];
    });
    return { [key]: children };
  });
  return { groups: qualified, layout };
}

export function loadTabConfigs(configDir, substitute = (contents) => contents) {
  const files = getTabConfigFiles(configDir);
  const directories = [...new Set(files.map((file) => dirname(file)))];
  const tabs = directories.map((directory) => {
    const read = (file, fallback) => {
      const filename = join(directory, file);
      return existsSync(filename) ? (loadYaml(substitute(readFileSync(filename, "utf8"))) ?? fallback) : fallback;
    };
    const settings = read("settings.yaml", {});
    if (
      settings.abbreviation !== undefined &&
      (typeof settings.abbreviation !== "string" || !settings.abbreviation.trim())
    ) {
      throw new Error(`Invalid abbreviation in ${directory}: expected non-empty text`);
    }
    if (settings.tabColor !== undefined && !/^#[\da-f]{6}$/i.test(String(settings.tabColor))) {
      throw new Error(`Invalid tabColor in ${directory}: expected a quoted six-digit hex color`);
    }
    if (
      settings.cardColor !== undefined &&
      !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(String(settings.cardColor))
    ) {
      throw new Error(`Invalid cardColor in ${directory}: expected a quoted hex color`);
    }
    const directoryName = basename(directory);
    const name = settings.name ?? directoryName;
    if (typeof name !== "string" || !name.trim()) throw new Error(`Invalid tab name in ${directory}`);
    if (settings.icon !== undefined && (typeof settings.icon !== "string" || !settings.icon.trim())) {
      throw new Error(`Invalid tab icon in ${directory}`);
    }
    const localLayout = layoutObject(settings.layout);
    const namespace = `tab/${encodeURIComponent(directoryName)}`;
    const services = qualifyGroups(read("services.yaml", []), localLayout, namespace, name);
    const bookmarks = qualifyGroups(read("bookmarks.yaml", []), localLayout, namespace, name, false);
    const combinedLayout = { ...services.layout, ...bookmarks.layout };
    const orderedLayout = {};
    for (const groupName of Object.keys(localLayout)) {
      const key = `${namespace}/${encodeURIComponent(groupName)}`;
      if (combinedLayout[key]) orderedLayout[key] = combinedLayout[key];
    }
    Object.assign(orderedLayout, combinedLayout);
    if (settings.cardColor !== undefined) {
      Object.values(orderedLayout).forEach((section) => {
        section.cardColor = settings.cardColor;
      });
    }
    return {
      name,
      abbreviation: settings.abbreviation?.trim(),
      icon: settings.icon,
      tabColor: settings.tabColor,
      order: settings.order ?? 0,
      layout: orderedLayout,
      services: services.groups,
      bookmarks: bookmarks.groups,
    };
  });
  tabs.sort((first, second) => first.order - second.order || first.name.localeCompare(second.name));
  const names = tabs.map((tab) => tab.name.toLowerCase().replace(/\s+/g, "-"));
  if (new Set(names).size !== names.length) throw new Error("Tab names must be unique after URL normalization");
  return tabs;
}
