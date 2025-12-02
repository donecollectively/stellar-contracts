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
};
export declare function ThemedBackgroundDecorations(props: ThemedBackgroundProps): React.JSX.Element;
export {};
//# sourceMappingURL=ThemedBackgroundDecorations.d.ts.map