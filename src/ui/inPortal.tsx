import React, { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ClientSideOnly } from "./ClientSideOnly.js";

export function InPortal(props: {
    domId: string;
    fallbackLocation?: "top" | "bottom" | "none";
    fallbackHelp?: string;
    delay?: number;
    maxRetries?: number;
    children: ReactNode | typeof React.Children;
}) {
    const {
        domId,
        fallbackLocation = "none",
        fallbackHelp,
        delay = 150,
        maxRetries = 1,
        children,
    } = props;
    if ("undefined" == typeof window) return <ClientSideOnly />;
    const [renderCount, updateRenderCount] = useState(1);
    const reRender = () => updateRenderCount(renderCount + 1);

    let foundPortalTarget = document?.getElementById(domId);
    const fallbackId =
        fallbackLocation == "none" ? "" : `fallbackPortal-${domId}`;
    if (!foundPortalTarget && fallbackLocation == "none") {
        throw new Error(
            `domId not found: ${domId} ; use \`fallbackLocation="top | bottom"\` for magic portal creation if desired`
        );
    }
    let fallbackPortalHost =
        foundPortalTarget || document.getElementById(fallbackId);
    if (foundPortalTarget) {
        return createPortal(
            <ClientSideOnly>{children}</ClientSideOnly>,
            foundPortalTarget
        );
    } else if (fallbackPortalHost) {
        return createPortal(
            <ClientSideOnly>{children}</ClientSideOnly>,
            fallbackPortalHost
        );
    }

    const tryOnceOrAgain = renderCount == 1 ? true : renderCount < maxRetries;

    if (tryOnceOrAgain)
        setTimeout(() => {
            if (
                document.getElementById(domId) ||
                (fallbackId && document.getElementById(fallbackId))
            ) {
                reRender();
                return;
            }

            if (!fallbackId && renderCount > maxRetries) {
                console.log(
                    fallbackHelp ||
                        `no explicit fallbackLocation provided and the target portal-id '${domId}' is not available`
                );
                console.log(
                    "if you need more time to render the target portal, you can add a delay=‹ms› prop greater than 150 (ms) that will be tried up to 10x"
                );
                console.error(
                    `<inPortal>: max retries exceeded while waiting for explicit portal.  Can't show UI details for portal ${domId}`
                );
                return;
            }
            if (renderCount > maxRetries) {
                // shouldn't be reachable
                console.error(
                    `<inPortal>: max retries exceeded without expected fallback portal; Can't show UI details for portal ${domId}`
                );
                return;
            }
            console.warn(
                `domId not available: ${domId} ; creating ${fallbackId}\n` +
                    `if your app needs more time to render the target portal, you can add a delay=‹ms› prop` +
                    (fallbackHelp ? `\n  ${fallbackHelp}` : "")
            );
            const someDiv = document.createElement("div");
            someDiv.id = fallbackId;
            someDiv.style.width = "100%";
            someDiv.style.border = "2px dashed purple";
            if (fallbackLocation == "top") {
                document.body.prepend(someDiv);
            } else {
                document.body.appendChild(someDiv);
                someDiv.style.position = "fixed";
                someDiv.style.zIndex = "9999";
                someDiv.style[fallbackLocation] = "0";
            }
            reRender();
        }, delay);

    return <ClientSideOnly />;
}
