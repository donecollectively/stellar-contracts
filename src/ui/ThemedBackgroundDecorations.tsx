import React from "react";

/**
 * Provides themed background decorations for a container.
 * @remarks
 * Uses radial gradients in themed colors for a background effect in a container.
 * 
 * Set the css property `--decoration-opacity` to control the opacity of the gradients en masse, 
 * and/or use the individual opacity props to control the opacity of each gradient individually.
 * 
 * See the props for more details.
 * 
 * Expects tailwind.
 * @public
 */
type ThemedBackgroundProps = {
    /** the html tag to use for the container*/
    as?: keyof JSX.IntrinsicElements;
    /** the class name to use for the container*/
    className?: string;
    /** the style to use for the container*/
    style?: React.CSSProperties;
    /** disable clipping the overflow of the container (true by default) */
    clip?: false;
    /** the color of the top left gradient; --color-decoration1 or --color-accent, with 19% opacity by default; see topLeftOpacity for opacity control */
    topLeftColor?: string;
    /**the color of the bottom right gradient; --color-decoration2 or --color-primary, with 19% opacity by default; see bottomRightOpacity for opacity control*/
    bottomRightColor?: string;
    /**the color of the top right gradient (--color-decoration3 or omitted by default) */
    topRightColor?: string;
    /**the color of the bottom left gradient (--color-decoration4 or omitted by default) */
    bottomLeftColor?: string;
    /**the color of the bottom center gradient (--color-decoration5 or omitted by default) */
    bottomCenterColor?: string;
    /**the color of the right middle gradient (--color-decoration6 or omitted by default) */
    rightMiddleColor?: string;

    /**the opacity (0.0 to 1.0) of the top left gradient (0.19 by default) */
    topLeftOpacity?: string;
    /**the opacity (0.0 to 1.0) of the bottom right gradient (0.19 by default) */
    bottomRightOpacity?: string;

    /**the opacity (0.0 to 1.0) of the top right gradient (0.19 by default) */
    topRightOpacity?: string | undefined;
    /**the opacity (0.0 to 1.0) of the bottom left gradient (0.19 by default) */
    bottomLeftOpacity?: string | undefined;
    /**the opacity (0.0 to 1.0) of the right middle gradient (0.19 by default) */
    rightMiddleOpacity?: string | undefined;
    /**the opacity (0.0 to 1.0) of the bottom center gradient (0.19 by default) */
    bottomCenterOpacity?: string | undefined;

    children: React.ReactNode;
}
export function ThemedBackgroundDecorations(props: ThemedBackgroundProps) {
    const {
        as: As = "div",
        className = "",
        style = {},
        clip: noClip = false,
        topLeftColor = "var(--color-decoration1,var(--color-accent))",
        bottomRightColor = "var(--color-decoration2,var(--color-primary))",
        topRightColor = "var(--color-decoration3,transparent)",
        bottomLeftColor = "var(--color-decoration4,transparent)",
        bottomCenterColor = "var(--color-decoration5,transparent)",
        rightMiddleColor = "var(--color-decoration6,transparent)",

        bottomCenterOpacity = "var(--decoration-opacity,0.19)",
        topLeftOpacity = "var(--decoration-opacity,0.19)",
        topRightOpacity = "var(--decoration-opacity,0.19)",
        bottomLeftOpacity = "var(--decoration-opacity,0.19)",
        bottomRightOpacity = "var(--decoration-opacity,0.19)",
        rightMiddleOpacity = "var(--decoration-opacity,0.19)",
        children,
    } = props;
    return (
        <As className={`${className} relative ${noClip ? "" : "overflow-clip"}`} style={style}>
            {children}
            <div className="display-contents pointer-events-none" data-note="------------- decorations vvvv ---------">
                {topLeftColor && <div
                    className={`absolute left-0 top-0 -translate-x-2/5 -translate-y-1/2 -z-10 w-[120%] aspect-[3/2] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${topLeftColor}, transparent 75%, transparent 100%)`, opacity: topLeftOpacity }}
                />}
                {bottomRightColor && <div
                    className={`absolute right-0 translate-x-1/4  bottom-0 translate-y-1/3 -z-10 w-[50%] aspect-[3/1] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${bottomRightColor}, transparent 75%, transparent 100%)`, opacity: bottomRightOpacity }}
                />}
                {topRightColor && <div
                    className={`absolute right-4 -translate-y-1/2 top-0 -z-10 w-[50%] aspect-[2/1] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${topRightColor}, transparent 75%, transparent 100%)`, opacity: topRightOpacity }}
                />}
                {bottomLeftColor && <div
                    className={`absolute left-0 -translate-x-1/4 bottom-0 translate-y-1/2 -z-10 w-[50%] aspect-[1/2] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${bottomLeftColor}, transparent 75%, transparent 100%)`, opacity: bottomLeftOpacity }}
                />}
                {bottomCenterColor && <div
                    className={`absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 -z-10 w-[80%] aspect-[3/1] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${bottomCenterColor}, transparent 75%, transparent 100%)`, opacity: bottomCenterOpacity }}
                />}
                {rightMiddleColor && <div
                    className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 -z-10 w-[50%] aspect-[1/2] rounded-full`}
                    style={{ background: `radial-gradient(ellipse, ${rightMiddleColor}, transparent 75%, transparent 100%)`, opacity: rightMiddleOpacity }}
                />}
            </div>
        </As>
    );
}