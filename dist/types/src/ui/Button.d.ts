import React from "react";
type SpecialButtonProps = (React.ComponentPropsWithoutRef<"button"> | React.ComponentPropsWithoutRef<"a">) & {
    variant?: "primary" | "secondary" | "secondary-sm";
    href?: string;
};
/**
 * A button component
 * @remarks
 * Expects tailwind.
 *
 * @public
 */
export declare const Button: (props: SpecialButtonProps) => React.JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map