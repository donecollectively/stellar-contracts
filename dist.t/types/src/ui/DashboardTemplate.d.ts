import React from "react";
/**
 * A template for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export declare function DashboardTemplate(props: {
    title: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A row for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export declare function DashboardRow(props: {
    title?: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A summary area for a dashboard layout
 * @remarks
 * Children should be <li> elements or <DashSummaryItem> elements, and are displayed as a grid.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashboardSummary(props: {
    title: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A summary item for a dashboard layout
 * @remarks
 *
 * The first child becomes a low-level (h6) heading
 *
 * Other children are displayed as-is.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashSummaryItem(props: {
    title: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A highlights area for a dashboard layout
 * @remarks
 * children should be <li> elements
 *
 * Expects tailwind.
 * @public
 */
export declare function DashboardHighlights(props: {
    title?: string;
    className?: string;
    colSpan?: string;
    footer?: string | React.ReactNode;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A highlight item for a dashboard layout, using a smallish box with vertical (columnar) flex
 * @remarks
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashHighlightItem(props: {
    title?: string;
    button?: string;
    onClick?: () => void;
    titleClassName?: string;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    footer?: string | React.ReactNode;
}): React.JSX.Element;
/**
 * A button that is styled to look like a primary action button
 * @remarks
 * Choose a size= or use "md" as the default.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function ActionButton(props: {
    className?: string;
    onClick?: () => void;
    size?: "xs" | "sm" | "md" | "lg";
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * A column for the dashboard layout
 * @remarks
 * Expects tailwind.
 *
 * @public
 */
export declare function Column(props: {
    widthPercent: number;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * shows its content in the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <p> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function Highlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * shows its content in a softened version of the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <p> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function Lowlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * shows its content in a softened version of the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <span> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function Softlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=DashboardTemplate.d.ts.map