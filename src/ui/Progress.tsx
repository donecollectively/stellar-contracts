"use client";
import React from "react";


interface ProgressProps {
    progressPercent: number
    children: React.ReactNode;
}

export const Progress = ({ children, progressPercent }: ProgressProps ) => {
    // a random but persistent number for element id, called only once.
    const [myId] = React.useState(() => {
        return (42424242 * Math.random()).toString(36).substring(7)
    });
    const concreteIndicatorProps = progressPercent ? {
        value: progressPercent,
        max: 100,
    } : {}

    return (
        <div>
            {/* <div aria-busy="true" aria-describedby="progress-bar"></div> */}
            <label htmlFor={`progress-bar-${myId}`}>{children}</label>
            <div className="progress progress-striped h-3">
                <progress
                    className="progress-bar"
                    {...concreteIndicatorProps}
                    id={`progress-bar-${myId}`}
                    aria-label="Content loading…"
                >...busy... /* only for lame old browsers */</progress>
            </div>
        </div>
    );
};
