import React from "react";
/**
 * Props for the progress bar
 * @public
 */
interface ProgressProps {
    /**
     * The percentage of progress (0-100)
     */
    progressPercent: number;
    children: React.ReactNode;
}
/**
 * A progress bar
 * @public
 */
export declare const Progress: ({ children, progressPercent }: ProgressProps) => React.JSX.Element | null;
export {};
//# sourceMappingURL=Progress.d.ts.map