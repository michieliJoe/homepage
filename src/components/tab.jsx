import classNames from "classnames";
import { useContext } from "react";

import ResolvedIcon from "components/resolvedicon";
import { TabContext } from "utils/contexts/tab";

function tabColorStyle(color) {
  if (typeof color !== "string" || !/^#[\da-f]{6}$/i.test(color)) return undefined;
  const channels = color
    .slice(1)
    .match(/../g)
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return { "--tab-button-color": color, "--tab-button-text": luminance > 0.179 ? "#000000" : "#ffffff" };
}

function slugify(tabName) {
  return tabName.toString().replace(/\s+/g, "-").toLowerCase();
}

export function slugifyAndEncode(tabName) {
  return tabName !== undefined ? encodeURIComponent(slugify(tabName)) : "";
}

export default function Tab({ tab, icon, color }) {
  const { activeTab, setActiveTab } = useContext(TabContext);

  const matchesTab = decodeURIComponent(activeTab) === slugify(tab);

  return (
    <li
      key={tab}
      role="presentation"
      className={classNames("text-theme-700 dark:text-theme-200 relative h-10 w-full rounded-md flex")}
    >
      <button
        id={`${tab}-tab`}
        type="button"
        role="tab"
        aria-controls={`#${tab}`}
        aria-selected={matchesTab ? "true" : "false"}
        style={matchesTab ? tabColorStyle(color) : undefined}
        className={classNames(
          "w-full rounded-md m-1 flex items-center justify-center gap-2 px-2 min-w-0 cursor-pointer tab-button",
          matchesTab ? "bg-theme-300/20 dark:bg-white/10" : "hover:bg-theme-100/20 dark:hover:bg-white/5",
        )}
        onClick={() => {
          setActiveTab(slugifyAndEncode(tab));
          window.location.hash = `#${slugifyAndEncode(tab)}`;
        }}
      >
        {icon && (
          <span className="shrink-0 w-6 h-6" aria-hidden="true">
            <ResolvedIcon icon={icon} width={24} height={24} alt="" />
          </span>
        )}
        <span className="min-w-0 break-words">{tab}</span>
      </button>
    </li>
  );
}
