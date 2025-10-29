import React from "react";
import ellipse from "./assets/ellipse.svg";

/**
 * A template for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export function DashboardTemplate(props: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="relative my-2 flex w-full flex-col gap-4">
            <img
                alt="blurred background"
                height={260}
                width={260}
                src={ellipse}
                className="size-40 absolute -left-44 top-20 -z-10 h-96 w-96 overflow-hidden bg-black/20 opacity-50 blur-[344px]"
            />
            <img
                alt="blurred background"
                height={260}
                width={260}
                src={ellipse}
                className="size-40 absolute -right-44 top-20 -z-10 h-96 w-96 overflow-hidden bg-black/20 opacity-50 blur-[344px]"
            />
            <div className="self-start text-2xl font-semibold">
                <h3>{props.title}</h3>
            </div>
            {props.children}
        </div>
    );
}

/**
 * A row for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export function DashboardRow(props: {
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            {props.title && (
                <h4 className="text-lg font-semibold">{props.title}</h4>
            )}
            <div className="grid grid-cols-3 gap-x-4 rounded-3xl">
                {props.children}
            </div>
        </div>
    );
}

/**
 * A summary area for a dashboard layout
 * @remarks
 * Children should be <li> elements or <DashSummaryItem> elements, and are displayed as a grid.
 * 
 * Expects tailwind.
 * @public
 */
export function DashboardSummary(props: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background/20 col-span-1 flex h-full flex-col items-start justify-between rounded-3xl border border-white/10 p-6">
            <h5 className="text-lg">{props.title}</h5>
            <ul className="grid w-full grid-cols-2 grid-rows-3 gap-4">
                {props.children}
            </ul>
        </div>
    );
}

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
export function DashSummaryItem(props: {
    title: string;
    children: React.ReactNode;
}) {
    const firstChild = Array.isArray(props.children)
        ? props.children[0]
        : props.children;
    const otherChildren = Array.isArray(props.children)
        ? props.children.slice(1)
        : [];
    return (
        <li>
            <span className="inline-flex items-baseline gap-x-1">
                <h6 className="text-2xl leading-[30px]">{firstChild}</h6>
                {otherChildren}
            </span>
            <p className="text-sm font-light leading-[17px] opacity-90">
                {props.title}
            </p>
        </li>
    );
}

/**
 * A highlights area for a dashboard layout
 * @remarks
 * children should be <li> elements
 * 
 * Expects tailwind.
 * @public
 */
export function DashboardHighlights(props: {
    title?: string;
    className?: string;
    colSpan?: string;
    footer?: string | React.ReactNode;
    children: React.ReactNode;
}) {
    const { title, className = "", colSpan = "2", footer, children } = props;
    const colSpanClasses = [
        undefined,
        undefined,
        "col-span-2",
        "col-span-3",
        "col-span-4",
        "col-span-5",
        "col-span-6",
        "col-span-7",
        "col-span-8",
        "col-span-9",
        "col-span-10",
    ];
    const normalClasses =
        "flex flex-col justify-between p-3 px-4 bg-background/20 h-full " +
        "rounded-2xl border border-white/10";
    const titleMarkup = title ? <h5 className="text-lg">{title}</h5> : null;
    const footerContent = footer ? (
        <div className="flex flex-row w-full justify-between mt-auto">
            <div className="text-sm text-gray-500 flex-1 text-right">
                {footer}
            </div>
        </div>
    ) : null;
    return (
        <div
            key="dash-highlight-box"
            className={`${className} ${colSpanClasses[colSpan]} ${normalClasses}`}
        >
            {titleMarkup}
            <ul className="grid w-full grid-cols-3 gap-4">{children}</ul>
            {footerContent}
        </div>
    );
}

/**
 * A highlight item for a dashboard layout, using a smallish box with vertical (columnar) flex
 * @remarks
 * 
 * Add a className to provide additional style.
 * 
 * Expects tailwind.
 * @public
 */
export function DashHighlightItem(props: {
    title?: string;
    button?: string;
    onClick?: () => void;
    titleClassName?: string;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    footer?: string | React.ReactNode;
}) {
    const {
        title,
        button,
        onClick,
        titleClassName = "text-lg",
        children,
        className = `rounded-lg border border-(--color-border)/20 bg-(--color-card)/50 text-(--color-card-foreground) p-2`,
        style = {},
        footer,
    } = props;
    const firstChild = Array.isArray(children) ? children[0] : children;
    const otherChildren = Array.isArray(children) ? children.slice(1) : [];
    return (
        <li className={`flex flex-col h-full ${className}`} style={style}>
            <div className="flex-none">
                <h6 className="text-md leading-[15px]">{firstChild}</h6>
                <div className="text-sm">{otherChildren}</div>
            </div>
            <div
                id="labelAndButton"
                className={`${titleClassName} mt-auto gap-y-1 text-right justify-end`}
            >
                {title}
                {button && (
                    <ActionButton {...{ onClick }}>{button}</ActionButton>
                )}
            </div>
            {footer && (
                <Softlight className="text-right text-sm italic text-gray-400">
                    {footer}
                </Softlight>
            )}
        </li>
    );
}

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
export function ActionButton(props: {
    className?: string;
    onClick?: () => void;
    size?: "xs" | "sm" | "md" | "lg";
    children: React.ReactNode;
}) {
    const { children, onClick, className = "", size = "md" } = props;
    return (
        <button
            onClick={onClick}
            className={`${
                className
            } font-bold bg-(--color-primary) text-[color-mix(in srgb, var(--color-foreground) 50%, white 50%)] ${
                " hi-there "
            } text-${size} border-2 border-(--color-border) rounded-${size} cursor-pointer px-2 py-1`}
        >
            {children}
        </button>
    );
}

/**
 * A column for the dashboard layout
 * @remarks
 * Expects tailwind.
 * 
 * @public
 */
export function Column(props: {
    widthPercent: number;
    children: React.ReactNode;
}) {
    const { widthPercent, children } = props;
    return (
        <div
            className={`flex flex-col ${
                widthPercent ? "w-" + widthPercent.toString() : ""
            } p-8`}
        >
            {children}
        </div>
    );
}

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
export function Highlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}) {
    const { as: As = "p", className = "", children } = props;
    return (
        <As
            className={`${className} text-(--color-accent-foreground) text-[13px] font-normal`}
        >
            {children}
        </As>
    );
}

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
export function Lowlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}) {
    const { as: As = "div", className = "", children } = props;
    return (
        <As
            className={`${className} text-(--color-accent-foreground) font-normal opacity-50`}
        >
            {children}
        </As>
    );
}

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
export function Softlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React.ReactNode;
}) {
    const { as = "span", children, className = "" } = props;
    const As = as as keyof JSX.IntrinsicElements;

    return (
        <As className={`${className} font-normal opacity-50`}>{children}</As>
    );
}
