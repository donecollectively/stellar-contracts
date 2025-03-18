import React, { type MouseEventHandler } from "react";
import clsx from "clsx";

const styles = {
    primary: {
        className:
            "not-prose rounded-md bg-blue-700 py-2 px-4 " +
            "text-sm font-semibold text-slate-900 " +
            "border border-solid border-blue-600/50 " +
            "text-neutral-200 " +
            "hover:bg-blue-500 " +
            "focus:outline-none focus-visible:outline-2 " +
            "focus-visible:outline-offset-2 focus-visible:outline-blue-500 " +
            "active:bg-blue-500",
    },
    secondary: {
        className:
            "not-prose rounded-md bg-blue-900 py-2 px-4 text-sm font-medium " +
            "border border-solid border-blue-700/50 " +
            "text-neutral-400 hover:bg-slate-700 " +
            "disabled:bg-slate-700 disabled:border-blue-900 " +
            "focus:outline-none focus-visible:outline-2 " +
            "focus-visible:outline-offset-2 focus-visible:outline-white/50 " +
            "active:text-slate-400",
    },
    "secondary-sm": {
        className:
            "not-prose rounded-md bg-blue-900 px-2 text-sm " +
            "border border-solid border-blue-700/50 " +
            "text-neutral-400 hover:bg-slate-700 " +
            "disabled:bg-slate-700 disabled:border-blue-900 " +
            "focus:outline-none focus-visible:outline-2 " +
            "focus-visible:outline-offset-2 focus-visible:outline-white/50 " +
            "active:text-slate-400",
    },
};

type SpecialButtonProps = (
    | React.ComponentPropsWithoutRef<"button">
    | React.ComponentPropsWithoutRef<"a">
) & {
    variant?: "primary" | "secondary" | "secondary-sm";
    href?: string;
};

interface propsType {
    children: any;
    style?: Record<string, any>;
    variant?: "primary" | "secondary" | "secondary-sm";
    onClick: MouseEventHandler<any>;
    className?: string;
    href?: string;
}

export const Button = function (props: SpecialButtonProps) {
    let {
        variant = "primary",
        style = {},
        children,
        className,
        href,
        ...moreProps
    } = props;

    const s = styles[variant];
    className = clsx(s.className, className);
    
    if (href) {
        const aprops = {
            children,
            href,
            className,
            style,
            ...moreProps,
        } as React.ComponentPropsWithoutRef<"a">;
        return <a {...aprops} />;
    }
    
    const bprops = {
        children,
        className,
        style,
        ...moreProps,
    } as React.ComponentPropsWithoutRef<"button">;
    return <button {...bprops} />;
};
