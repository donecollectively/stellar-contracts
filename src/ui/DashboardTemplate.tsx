import React from "react"
import ellipse from './assets/ellipse.svg'

export function DashboardTemplate(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col my-4 mx-8 gap-10 relative">
      <img
        alt="blurred background"
        height={260}
        width={260}
        src={ellipse}
        className="size-40 absolute -z-10 -left-44 top-20 opacity-50 w-96 h-96 overflow-hidden bg-[#cb157c] blur-[344px]"
      />
      <img
        alt="blurred background"
        height={260}
        width={260}
        src={ellipse}
        className="size-40 absolute -z-10 -right-44 top-20 opacity-50 w-96 h-96 overflow-hidden bg-[#cb157c] blur-[344px]"
      />
      <div className="self-start font-semibold text-2xl">
        <h3>{props.title}</h3>
      </div>
      {props.children}
    </div>
  )
}

export function DashboardRow(props: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="grid gap-4">
        {props.title && <h4 className="text-lg font-semibold">{props.title}</h4>}
        <div className="grid grid-cols-3 gap-x-4 rounded-3xl h-88">{props.children}</div>
      </div>
    </div>
  )
}

/**
 * children should be <li> elements or <DashSummaryItem> elements
 */
export function DashboardSummary(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between col-span-1 bg-background h-full p-6 rounded-3xl border border-white/10">
      <h5 className="text-lg">{props.title}</h5>
      <ul className="grid grid-cols-2 grid-rows-3 w-full gap-4">{props.children}</ul>
    </div>
  )
}

export function DashSummaryItem(props: { title: string; children: React.ReactNode }) {
  const firstChild = Array.isArray(props.children) ? props.children[0] : props.children
  const otherChildren = Array.isArray(props.children) ? props.children.slice(1) : []
  return (
    <li>
      <span className="inline-flex items-baseline gap-x-1">
        <h6 className="text-2xl leading-[30px]">{firstChild}</h6>
        {otherChildren}
      </span>
      <p className="font-light text-sm leading-[17px] opacity-90">{props.title}</p>
    </li>
  )
}

/**
 * children should be <li> elements
 */
export function DashboardHighlights(props: {
  title?: string
  className?: string
  colSpan?: string
  children: React.ReactNode
}) {
  const { title, className = "", colSpan = "2", children } = props
  const normalClasses =
    "justify-between p-3 px-4 bg-background h-full " +
    "rounded-2xl border border-white/10"
  return (
    <div className={`${className} col-span-${colSpan} ${normalClasses}`}>
      {title && <h5 className="text-lg">{title}</h5>}
      <ul className="grid grid-cols-3 w-full gap-4">{children}</ul>
    </div>
  )
}

export function DashHighlightItem(props: {
  title?: string
  button?: string
  onClick?: () => void
  titleClassName?: string
  children: React.ReactNode
}) {
  const { title, button, onClick, titleClassName = "text-lg", children } = props
  const firstChild = Array.isArray(children) ? children[0] : children
  const otherChildren = Array.isArray(children) ? children.slice(1) : []
  return (
    <li className="flex flex-col content-end rounded-xl border border-white/10 p-2">
      <span className="flex flex-col items-baseline gap-x-1">
        <h6 className="text-md leading-[30px]">{firstChild}</h6>
        <div className="text-sm">{otherChildren}</div>
      </span>
      <p className={`${titleClassName} font-light gap-y-1 opacity-90 text-right`}>
        {title}
        {button && <ActionButton {...{ onClick }}>{button}</ActionButton>}
      </p>
    </li>
  )
}

export function ActionButton(props: {
  className?: string
  onClick?: () => void
  size?: "xs" | "sm" | "md" | "lg"
  children: React.ReactNode
}) {
  const { children, onClick, className = "", size="lg" } = props
  return (
    <button      
      onClick={onClick}
      className={`${className} bg-brand-orange/50 text-${size} text-white rounded-${size} px-2 py-1 cursor-pointer`}
    >
      {children}
    </button>
  )
}

export function Column(props: { widthPercent: number; children: React.ReactNode }) {
  const { widthPercent, children } = props
  return (
    <div
      className={`flex flex-col ${
        widthPercent ? "w-" + widthPercent.toString() : ""
      } p-8`}
    >
      {children}
    </div>
  )
}

export function Highlight(props: {
  as?: keyof JSX.IntrinsicElements
  className?: string
  children: React.ReactNode
}) {
  const { as: As = "p", className = "", children } = props
  return (
    <As className={`${className} text-brand-orange font-normal text-[13px]`}>
      {children}
    </As>
  )
}

export function Lowlight(props: {
  as?: keyof JSX.IntrinsicElements
  className?: string
  children: React.ReactNode
}) {
  const { as: As = "div", className = "", children } = props
  return (
    <As className={`${className} text-brand-orange font-normal text-[13px] opacity-50`}>
      {children}
    </As>
  )
}

export function Softlight(props: {
  as?: keyof JSX.IntrinsicElements
  className?: string
  children: React.ReactNode
}) {
  const { as = "p", children, className = "" } = props
  const As = as as keyof JSX.IntrinsicElements

  return <As className={`${className} font-normal text-[13px] opacity-50`}>{children}</As>
}
