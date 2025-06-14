import * as React from 'react';
import React__default, { useState, Component, Fragment } from 'react';
import clsx from 'clsx';
import { makeBlockfrostV0Client, makeRandomRootPrivateKey, makeRootPrivateKey, makeHydraClient, makeSimpleWallet, makeCip30Wallet, makeWalletHelper } from '@helios-lang/tx-utils';
import '@cardano-ogmios/client';
import { dumpAny, OgmiosTxSubmitter, GenericSigner, TxBatcher, uplcDataSerializer, bytesToText, abbrevAddress } from '@donecollectively/stellar-contracts';
import { createPortal } from 'react-dom';
import { decodeTx, makeShelleyAddress } from '@helios-lang/ledger';
import { e as environment } from './environment.mjs';
import { bytesToHex, hexToBytes } from '@helios-lang/codec-utils';

const styles = {
  primary: {
    className: "not-prose rounded-md bg-blue-700 py-2 px-4 text-sm font-semibold text-slate-900 border border-solid border-blue-600/50 text-neutral-200 hover:bg-blue-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-500"
  },
  secondary: {
    className: "not-prose rounded-md bg-blue-900 py-2 px-4 text-sm font-medium border border-solid border-blue-700/50 text-neutral-400 hover:bg-slate-700 disabled:bg-slate-700 disabled:border-blue-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400"
  },
  "secondary-sm": {
    className: "not-prose rounded-md bg-blue-900 px-2 text-sm border border-solid border-blue-700/50 text-neutral-400 hover:bg-slate-700 disabled:bg-slate-700 disabled:border-blue-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400"
  }
};
const Button = function(props) {
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
      ...moreProps
    };
    return /* @__PURE__ */ React__default.createElement("a", { ...aprops });
  }
  const bprops = {
    children,
    className,
    style,
    ...moreProps
  };
  return /* @__PURE__ */ React__default.createElement("button", { ...bprops });
};

class ClientSideOnly extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isClient: false };
  }
  componentDidMount() {
    this.setState({ isClient: true });
  }
  render() {
    if (!this.state.isClient) {
      return React.createElement("div", { suppressHydrationWarning: true });
    }
    return React.createElement(
      "div",
      { suppressHydrationWarning: true },
      this.props.children
    );
  }
}

function InPortal(props) {
  const {
    domId,
    fallbackLocation = "none",
    fallbackHelp,
    delay = 150,
    maxRetries = 1,
    children,
    fallbackComponent: FallbackComponent
  } = props;
  const childrenAsNode = children;
  if ("undefined" == typeof window) return /* @__PURE__ */ React__default.createElement(ClientSideOnly, { children: childrenAsNode });
  const [renderCount, updateRenderCount] = useState(1);
  const reRender = () => updateRenderCount(renderCount + 1);
  let foundPortalTarget = document?.getElementById(domId);
  const fallbackId = fallbackLocation == "none" ? "" : `fallbackPortal-${domId}`;
  if (!foundPortalTarget && fallbackLocation == "none") {
    throw new Error(
      `domId not found: ${domId} ; use \`fallbackLocation="top | bottom"\` for magic portal creation if desired`
    );
  }
  let fallbackPortalHost = foundPortalTarget || document.getElementById(fallbackId);
  if (foundPortalTarget) {
    return createPortal(
      /* @__PURE__ */ React__default.createElement(ClientSideOnly, { children: childrenAsNode }),
      foundPortalTarget
    );
  } else if (fallbackPortalHost) {
    if (FallbackComponent) {
      return createPortal(
        /* @__PURE__ */ React__default.createElement(ClientSideOnly, { children: /* @__PURE__ */ React__default.createElement(FallbackComponent, null, childrenAsNode) }),
        fallbackPortalHost
      );
    }
    return createPortal(
      /* @__PURE__ */ React__default.createElement(ClientSideOnly, { children: childrenAsNode }),
      fallbackPortalHost
    );
  }
  const tryOnceOrAgain = renderCount == 1 ? true : renderCount < maxRetries;
  if (tryOnceOrAgain)
    setTimeout(() => {
      if (document.getElementById(domId) || fallbackId && document.getElementById(fallbackId)) {
        reRender();
        return;
      }
      if (!fallbackId && renderCount > maxRetries) {
        console.log(
          fallbackHelp || `no explicit fallbackLocation provided and the target portal-id '${domId}' is not available`
        );
        console.log(
          "if you need more time to render the target portal, you can add a delay=\u2039ms\u203A prop greater than 150 (ms) that will be tried up to 10x"
        );
        console.error(
          `<inPortal>: max retries exceeded while waiting for explicit portal.  Can't show UI details for portal ${domId}`
        );
        return;
      }
      if (renderCount > maxRetries) {
        console.error(
          `<inPortal>: max retries exceeded without expected fallback portal; Can't show UI details for portal ${domId}`
        );
        return;
      }
      console.warn(
        `domId not available: ${domId} ; creating ${fallbackId}
if your app needs more time to render the target portal, you can add a delay=\u2039ms\u203A prop` + (fallbackHelp ? `
  ${fallbackHelp}` : "")
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
  return /* @__PURE__ */ React__default.createElement(ClientSideOnly, { children: null });
}

const Progress = ({ children, progressPercent }) => {
  const [myId] = React__default.useState(() => {
    return (42424242 * Math.random()).toString(36).substring(7);
  });
  const concreteIndicatorProps = progressPercent ? {
    value: progressPercent,
    max: 100
  } : {};
  return /* @__PURE__ */ React__default.createElement("div", null, /* @__PURE__ */ React__default.createElement("label", { htmlFor: `progress-bar-${myId}` }, children), /* @__PURE__ */ React__default.createElement("div", { className: "progress progress-striped h-3" }, /* @__PURE__ */ React__default.createElement(
    "progress",
    {
      className: "progress-bar",
      ...concreteIndicatorProps,
      id: `progress-bar-${myId}`,
      "aria-label": "Content loading\u2026"
    },
    "...busy... /* only for lame old browsers */"
  )));
};

var img = "data:image/svg+xml,%3c%3fxml version='1.0' encoding='UTF-8'%3f%3e%3csvg width='693' height='1115' viewBox='0 0 693 1115' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cg opacity='0.1' filter='url(%23filter0_f_2041_227)'%3e%3ccircle cx='82' cy='504' r='267' fill='%23B44795'/%3e%3c/g%3e%3cdefs%3e%3cfilter id='filter0_f_2041_227' x='-529' y='-107' width='1222' height='1222' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3e%3cfeFlood flood-opacity='0' result='BackgroundImageFix'/%3e%3cfeBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape'/%3e%3cfeGaussianBlur stdDeviation='172' result='effect1_foregroundBlur_2041_227'/%3e%3c/filter%3e%3c/defs%3e%3c/svg%3e";

function DashboardTemplate(props) {
  return /* @__PURE__ */ React__default.createElement("div", { className: "relative my-4 mx-8 flex w-full flex-col gap-10" }, /* @__PURE__ */ React__default.createElement(
    "img",
    {
      alt: "blurred background",
      height: 260,
      width: 260,
      src: img,
      className: "size-40 absolute -left-44 top-20 -z-10 h-96 w-96 overflow-hidden bg-black/20 opacity-50 blur-[344px]"
    }
  ), /* @__PURE__ */ React__default.createElement(
    "img",
    {
      alt: "blurred background",
      height: 260,
      width: 260,
      src: img,
      className: "size-40 absolute -right-44 top-20 -z-10 h-96 w-96 overflow-hidden bg-black/20 opacity-50 blur-[344px]"
    }
  ), /* @__PURE__ */ React__default.createElement("div", { className: "self-start text-2xl font-semibold" }, /* @__PURE__ */ React__default.createElement("h3", null, props.title)), props.children);
}
function DashboardRow(props) {
  return /* @__PURE__ */ React__default.createElement("div", null, props.title && /* @__PURE__ */ React__default.createElement("h4", { className: "text-lg font-semibold" }, props.title), /* @__PURE__ */ React__default.createElement("div", { className: "grid grid-cols-3 gap-x-4 rounded-3xl" }, props.children));
}
function DashboardSummary(props) {
  return /* @__PURE__ */ React__default.createElement("div", { className: "bg-background/20 col-span-1 flex h-full flex-col items-start justify-between rounded-3xl border border-white/10 p-6" }, /* @__PURE__ */ React__default.createElement("h5", { className: "text-lg" }, props.title), /* @__PURE__ */ React__default.createElement("ul", { className: "grid w-full grid-cols-2 grid-rows-3 gap-4" }, props.children));
}
function DashSummaryItem(props) {
  const firstChild = Array.isArray(props.children) ? props.children[0] : props.children;
  const otherChildren = Array.isArray(props.children) ? props.children.slice(1) : [];
  return /* @__PURE__ */ React__default.createElement("li", null, /* @__PURE__ */ React__default.createElement("span", { className: "inline-flex items-baseline gap-x-1" }, /* @__PURE__ */ React__default.createElement("h6", { className: "text-2xl leading-[30px]" }, firstChild), otherChildren), /* @__PURE__ */ React__default.createElement("p", { className: "text-sm font-light leading-[17px] opacity-90" }, props.title));
}
function DashboardHighlights(props) {
  const { title, className = "", colSpan = "2", footer, children } = props;
  const colSpanClasses = [
    void 0,
    void 0,
    "col-span-2",
    "col-span-3",
    "col-span-4",
    "col-span-5",
    "col-span-6",
    "col-span-7",
    "col-span-8",
    "col-span-9",
    "col-span-10"
  ];
  const normalClasses = "flex flex-col justify-between p-3 px-4 bg-background/20 h-full rounded-2xl border border-white/10";
  const titleMarkup = title ? /* @__PURE__ */ React__default.createElement("h5", { className: "text-lg" }, title) : null;
  const footerContent = footer ? /* @__PURE__ */ React__default.createElement("div", { className: "flex flex-row w-full justify-between mt-auto" }, /* @__PURE__ */ React__default.createElement("div", { className: "text-sm text-gray-500 flex-1 text-right" }, footer)) : null;
  return /* @__PURE__ */ React__default.createElement(
    "div",
    {
      key: "dash-highlight-box",
      className: `${className} ${colSpanClasses[colSpan]} ${normalClasses}`
    },
    titleMarkup,
    /* @__PURE__ */ React__default.createElement("ul", { className: "grid w-full grid-cols-3 gap-4" }, children),
    footerContent
  );
}
function DashHighlightItem(props) {
  const {
    title,
    button,
    onClick,
    titleClassName = "text-lg",
    children,
    className = `rounded-lg border border-(--color-border)/20 bg-(--color-card)/50 text-(--color-card-foreground) p-2`,
    style = {},
    footer
  } = props;
  const firstChild = Array.isArray(children) ? children[0] : children;
  const otherChildren = Array.isArray(children) ? children.slice(1) : [];
  return /* @__PURE__ */ React__default.createElement("li", { className: `flex flex-col h-full ${className}`, style }, /* @__PURE__ */ React__default.createElement("div", { className: "flex-none" }, /* @__PURE__ */ React__default.createElement("h6", { className: "text-md leading-[15px]" }, firstChild), /* @__PURE__ */ React__default.createElement("div", { className: "text-sm" }, otherChildren)), /* @__PURE__ */ React__default.createElement(
    "div",
    {
      id: "labelAndButton",
      className: `${titleClassName} mt-auto gap-y-1 text-right justify-end`
    },
    title,
    button && /* @__PURE__ */ React__default.createElement(ActionButton, { ...{ onClick } }, button)
  ), footer && /* @__PURE__ */ React__default.createElement(Softlight, { className: "text-right text-sm italic text-gray-400" }, footer));
}
function ActionButton(props) {
  const { children, onClick, className = "", size = "md" } = props;
  return /* @__PURE__ */ React__default.createElement(
    "button",
    {
      onClick,
      className: `${className} bg-(--color-primary) text-(--color-primary-foreground) text-${size} rounded-${size} cursor-pointer px-2 py-1`
    },
    children
  );
}
function Column(props) {
  const { widthPercent, children } = props;
  return /* @__PURE__ */ React__default.createElement(
    "div",
    {
      className: `flex flex-col ${widthPercent ? "w-" + widthPercent.toString() : ""} p-8`
    },
    children
  );
}
function Highlight(props) {
  const { as: As = "p", className = "", children } = props;
  return /* @__PURE__ */ React__default.createElement(
    As,
    {
      className: `${className} text-(--color-accent-foreground) text-[13px] font-normal`
    },
    children
  );
}
function Lowlight(props) {
  const { as: As = "div", className = "", children } = props;
  return /* @__PURE__ */ React__default.createElement(
    As,
    {
      className: `${className} text-(--color-accent-foreground) font-normal opacity-50`
    },
    children
  );
}
function Softlight(props) {
  const { as = "span", children, className = "" } = props;
  const As = as;
  return /* @__PURE__ */ React__default.createElement(As, { className: `${className} font-normal opacity-50` }, children);
}

function TxBatchViewer({
  batch,
  initialId
}) {
  const [selectedId, setSelectedId] = React.useState(
    initialId
  );
  const [selectedTx, setSelectedTx] = React.useState();
  const [txMgr, setTxMgr] = React.useState();
  const [gen, setGen] = React.useState(0);
  const renderNow = React.useMemo(() => () => setGen((g) => g + 1), []);
  React.useEffect(() => {
    if (!selectedId) return;
    const tx = batch.$txStates[selectedId];
    if (!tx) return;
    setTxMgr(tx);
  }, [selectedId, batch]);
  React.useEffect(() => {
    if (!txMgr?.txd.tx) return;
    const tx = txMgr.txd.tx;
    if (typeof tx === "string") {
      setSelectedTx(decodeTx(tx));
    } else {
      setSelectedTx(tx);
    }
  }, [txMgr]);
  React.useEffect(() => {
    batch.$txChanges.on("txAdded", renderNow);
    batch.$txChanges.on("statusUpdate", renderNow);
    return () => {
      batch.$txChanges.off("txAdded", renderNow);
      batch.$txChanges.off("statusUpdate", renderNow);
    };
  }, [batch, renderNow]);
  return /* @__PURE__ */ React.createElement("div", { className: "border-1 border-(--color-card) flex w-full flex-row gap-2 rounded-md drop-shadow-md" }, /* @__PURE__ */ React.createElement(
    ShowTxList,
    {
      batch,
      initialId,
      renderNow,
      selectedId,
      setSelectedId
    }
  ), (() => {
    const indicateSelectedTx = selectedId ? "border-s-4 border-s-brand-orange/20" : "";
    const cardStyle = "bg-(--color-card) text-(--color-card-foreground)";
    if (!selectedId) {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `${indicateSelectedTx} ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`
        },
        /* @__PURE__ */ React.createElement(Softlight, null, "Select a transaction to view details")
      );
    }
    if (!txMgr) {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `${indicateSelectedTx} ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`
        },
        /* @__PURE__ */ React.createElement(Softlight, null, "Loading transaction details...")
      );
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `${indicateSelectedTx} z-3 ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`
      },
      /* @__PURE__ */ React.createElement(ShowTxDescription, { txTracker: txMgr, tx: selectedTx })
    );
  })());
}
function ShowTxList({
  batch,
  initialId,
  renderNow,
  selectedId,
  setSelectedId
}) {
  const { $allTxns } = batch;
  return /* @__PURE__ */ React.createElement("div", { className: "z-4 flex w-3/12 flex-col gap-0" }, batch.$allTxns.map((txTracker) => {
    return /* @__PURE__ */ React.createElement(
      ShowSingleTx,
      {
        key: txTracker.txd.id,
        ...{ txTracker, selectedId, setSelectedId }
      }
    );
  }));
}
const ShowSingleTx = (props) => {
  const { txTracker, selectedId, setSelectedId } = props;
  const { $state, txSubmitters, txd } = txTracker;
  let {
    id,
    txName,
    description,
    tcx,
    tx,
    moreInfo,
    depth = 0,
    parentId
  } = txd;
  if (!txName) {
    txName = description;
    description = "";
  }
  const submitterStates = Object.values(txSubmitters).map((s) => s.$$statusSummary).join(", ");
  const isCurrent = id == selectedId;
  const countNested = txd.tcx?.addlTxns ? Object.keys(txd.tcx.addlTxns).length : 0;
  const indentClass = [
    "border-s-0",
    "border-s-6",
    "border-s-12",
    "border-s-18",
    "border-s-24"
  ][depth];
  const innerMarginClass = ["ml-0", "ml-1", "ml-3", "ml-5", "ml-7", "ml-9"][depth];
  const outerMarginClass = depth ? "ml-2" : "ml-0";
  const nestedIndicator = depth ? `${indentClass} border-(--color-accent-foreground)/30` : "";
  const indicateSelectedTx = isCurrent ? "text-bold rounded-md border-e-0 -mr-5 pe-6 z-3" : "cursor-pointer opacity-55";
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      key: id,
      onClick: isCurrent ? void 0 : () => setSelectedId(id),
      className: `${outerMarginClass}`
    },
    /* @__PURE__ */ React.createElement("div", { className: `${nestedIndicator} pl-2` }, /* @__PURE__ */ React.createElement(
      "div",
      {
        key: id,
        title: txd.txName || txd.description,
        className: `${innerMarginClass} bg-(--color-card) text-(--color-card-foreground) flex min-h-[0.66in] flex-row rounded-md border border-white/10 p-2 text-sm ${indicateSelectedTx}`
      },
      /* @__PURE__ */ React.createElement("div", { className: `w-8/12` }, txName ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("b", null, txName), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("div", { className: "ml-2 opacity-50" }, description), /* @__PURE__ */ React.createElement("div", { className: "ml-2 opacity-50" }, submitterStates)) : description),
      /* @__PURE__ */ React.createElement("div", { className: `w-1/12 text-right` }, $state == "building" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "svg",
        {
          "aria-hidden": "true",
          className: "h-5 w-5 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600",
          viewBox: "0 0 100 101",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg"
        },
        /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z",
            fill: "currentFill"
          }
        )
      ), /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Loading..."))),
      /* @__PURE__ */ React.createElement("div", { className: `w-3/12 text-right` }, $state, /* @__PURE__ */ React.createElement("br", null), !!countNested ? /* @__PURE__ */ React.createElement(React.Fragment, null, "+", countNested, " nested") : "")
    ))
  );
};
function ShowTxDescription({
  txTracker,
  tx
}) {
  const { $state, txSubmitters, id, txd } = txTracker;
  const { tcx, txCborHex, signedTxCborHex } = txd;
  const availableTabs = {
    transcript: true,
    structure: true,
    diagnostics: true
  };
  const [tab, setTab] = React.useState("transcript");
  const [signedTx, setSignedTx] = React.useState();
  React.useEffect(() => {
    if (!signedTxCborHex) return;
    try {
      const decodedTx = decodeTx(signedTxCborHex);
      setSignedTx(decodedTx);
    } catch (e) {
      console.error("Failed to decode signed transaction:", e);
    }
  }, [signedTxCborHex]);
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 " }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-row justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "basis-1/9" }, tx && txTracker && tcx && !tcx.isFacade && /* @__PURE__ */ React.createElement(
    ActionButton,
    {
      className: "mt-2 self-start",
      onClick: () => txTracker.$signAndSubmit?.()
    },
    "Sign\xA0&\xA0Submit"
  )), /* @__PURE__ */ React.createElement("div", { className: "ml-4 flex-grow self-start" }, /* @__PURE__ */ React.createElement(Highlight, { className: "text-xl" }, txd.txName || txd.description), txd.txName && txd.description && /* @__PURE__ */ React.createElement("div", { className: "text-md display-inline ml-4 opacity-50" }, txd.description), txd.moreInfo && /* @__PURE__ */ React.createElement("div", { className: "text-brand-orange/66 ml-8 text-sm italic" }, txd.moreInfo)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Lowlight, { className: "float-right" }, $state), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("div", { id: "tab-selector" }, Object.keys(availableTabs).map((key) => {
    const isSelected = key === tab;
    const selectedTabClass = isSelected ? "rounded-t-md bg-(--color-card) text-(--color-card-foreground) border-x-1 border-t-3 border-(--color-border)/50" : " rounded-t-md bg-(--color-secondary)/70 text-(--color-secondary-foreground)";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        className: `${selectedTabClass} ml-1 px-2 py-1 text-sm`,
        onClick: () => setTab(
          key
        )
      },
      key
    );
  })))), /* @__PURE__ */ React.createElement("div", { className: "-mt-2 border-t border-white/10 pt-1" }, tab === "transcript" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, Object.entries(txSubmitters).map(
    ([key, submitter]) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key,
        className: "flex flex-row justify-between rounded-md border border-white/10 p-2"
      },
      /* @__PURE__ */ React.createElement("div", { className: "w-1/3" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold" }, key)),
      /* @__PURE__ */ React.createElement("div", { className: "w-2/3" }, /* @__PURE__ */ React.createElement(Lowlight, null, `${submitter.$$statusSummary.status} - ${submitter.$$statusSummary.currentActivity}`), /* @__PURE__ */ React.createElement("div", { className: "text-xs" }, /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(
        submitter.$$statusSummary,
        null,
        2
      ))))
    )
  )), tcx?.logger?.formattedHistory && /* @__PURE__ */ React.createElement("code", null, /* @__PURE__ */ React.createElement("pre", { className: "mt-4 max-h-[90vh] overflow-auto bg-neutral-200 text-xs text-black" }, tcx.logger.formattedHistory?.map(
    (line1) => line1?.split("\n").map((line2) => {
      let prefix = /* @__PURE__ */ React.createElement(React.Fragment, null), rest = /* @__PURE__ */ React.createElement(React.Fragment, null);
      [prefix, rest] = line2.split(
        "\u2757",
        2
      );
      if (rest) {
        let size = "";
        if (rest.match(
          /^\s+\.\.\./
        )) {
          rest = rest.replace(
            /^\s+\.\.\.\s+/,
            "\u2026"
          );
          size = "text-[1.35em] -ml-2";
        }
        rest = /* @__PURE__ */ React.createElement(
          "span",
          {
            className: `text-[1.6em] font-formal -ml-5 font-bold`
          },
          "\u2757",
          /* @__PURE__ */ React.createElement(
            "span",
            {
              className: `${size}`
            },
            rest
          )
        );
      } else {
        prefix = /* @__PURE__ */ React.createElement("span", { className: "text-gray-600" }, prefix);
      }
      return /* @__PURE__ */ React.createElement(React.Fragment, null, prefix, " ", rest, /* @__PURE__ */ React.createElement("br", null), " ");
    })
  )))), tab === "structure" && tx && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm" }, "Unsigned Tx:", " ", tx.id?.()?.toString?.() || "Unknown ID"), /* @__PURE__ */ React.createElement("code", { className: "text-sm" }, /* @__PURE__ */ React.createElement("pre", { className: "font-formal text-[1.30em]/4.5 tracking-wide max-h-[80vh] overflow-auto" }, dumpAny(tx, txTracker.setup.networkParams)), txCborHex && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs" }, "CBOR Hex:", " ", /* @__PURE__ */ React.createElement("span", { className: "break-all" }, txCborHex)))), tab === "diagnostics" && /* @__PURE__ */ React.createElement(React.Fragment, null, signedTx ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", null, "Signed Tx"), /* @__PURE__ */ React.createElement("h4", null, signedTx.id?.()?.toString?.() || "Unknown ID"), /* @__PURE__ */ React.createElement("code", { className: "text-xs" }, /* @__PURE__ */ React.createElement("pre", { className: "max-h-64 overflow-auto" }, dumpAny(
    signedTx,
    txTracker.setup.networkParams
  )), signedTxCborHex ? /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, "CBOR Hex:", " ", /* @__PURE__ */ React.createElement("span", { className: "break-all" }, signedTxCborHex.length / 2, " ", "bytes: ", /* @__PURE__ */ React.createElement("br", null), signedTxCborHex)) : /* @__PURE__ */ React.createElement("div", null, "\u2039not yet signed\u203A"))) : /* @__PURE__ */ React.createElement("div", null, "Not yet signed"))), txd.tcx?.addlTxns && Object.keys(txd.tcx.addlTxns).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-col gap-1 border-t border-white/10 pt-4" }, /* @__PURE__ */ React.createElement(Softlight, null, "Nested Transactions:"), Object.entries(txd.tcx.addlTxns).map(([key, tx2]) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key,
      className: "flex flex-row justify-between"
    },
    /* @__PURE__ */ React.createElement(Lowlight, null, key),
    /* @__PURE__ */ React.createElement(Lowlight, null, tx2.id)
  ))));
}

function TxBatchUI() {
  const provider = useCapoDappProvider();
  const capo = provider?.capo;
  const [currentBatch, setTxBatch] = React__default.useState();
  const [initialId, setInitialId] = React__default.useState(
    void 0
  );
  React__default.useEffect(
    function monitorTxBatcher() {
      if (!capo) return;
      const { txBatcher } = capo.setup;
      txBatcher.$notifier.on("rotated", (batch) => {
        console.log("batch rotated", batch);
        const txns = batch.$allTxns;
        if (txns.length) {
          setInitialId(txns[0].id);
        } else {
          batch.$txChanges.once("txAdded", (txTracker) => {
            console.log("tx added", txTracker);
            const { id } = txTracker;
            setInitialId(id);
          });
        }
        setTxBatch(batch);
      });
    },
    [capo, capo?.setup.txBatcher]
  );
  const hasBatch = !!currentBatch && !!currentBatch?.$allTxns.length;
  if (!hasBatch) return null;
  return /* @__PURE__ */ React__default.createElement("div", { className: "z-100 bg-background/66 absolute top-10 right-4 w-[80vw] rounded-lg border border-white/10 backdrop-blur-md" }, /* @__PURE__ */ React__default.createElement(TxBatchViewer, { batch: currentBatch, ...{ initialId } }));
}

//!!! comment out the following block while using the "null" config.
const networkNames = {
  0: "preprod",
  1: "mainnet",
  2: "preview"
};
let mountCount = 0;
class CapoDAppProvider extends Component {
  bf;
  // bfFast: TxChainBuilder & BlockfrostV0Client;
  capoClass;
  static notProse = true;
  i = 0;
  didWarnDappName = false;
  get dAppName() {
    if (!this.props.dAppName && !this.didWarnDappName) {
      console.warn(
        "using generic dAppName.  Override it in props `dAppName=`, if you wish"
      );
      this.didWarnDappName = true;
      return "dApp contract";
    }
    return this.props.dAppName;
  }
  constructor(props) {
    super(props);
    this.capoClass = props.capoClass;
    this.i = mountCount += 1;
    this.bootstrapCapo = this.bootstrapCapo.bind(this);
    this.connectCapo = this.connectCapo.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.reportError = this.reportError.bind(this);
    this.renderRoleInfo = this.renderRoleInfo.bind(this);
    this.renderActionButton = this.renderActionButton.bind(this);
    this.renderWalletInfo = this.renderWalletInfo.bind(this);
    this.renderProgressBar = this.renderProgressBar.bind(this);
    this.renderPersistentMessage = this.renderPersistentMessage.bind(this);
    this.renderNotification = this.renderNotification.bind(this);
    this.renderErrorStatus = this.renderErrorStatus.bind(this);
    this.connectWallet = this.connectWallet.bind(this);
    this.bf = makeBlockfrostV0Client(
      props.targetNetwork,
      props.blockfrostKey
    );
    this.state = {
      status: {
        message: `... connecting to ${this.dAppName} ...`,
        keepOnscreen: true,
        developerGuidance: "... discovering the on-chain status e.g. from blockfrost"
      },
      userInfo: {
        roles: [],
        foundNetworkName: "",
        connectingWallet: false
      },
      txBatcher: void 0,
      bf: this.bf,
      dAppName: this.dAppName
    };
  }
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.dAppName !== this.props.dAppName) {
      this.setState({ dAppName: this.dAppName });
    }
    const { capo, userInfo, status } = this.state;
    if (this.props.onUserInfo && userInfo !== prevState.userInfo) {
      this.props.onUserInfo(userInfo);
    }
    if (this.props.onStatusChange && status !== prevState.status) {
      this.props.onStatusChange(status);
    }
    if (this.props.onContextChange && capo !== prevState.capo) {
      this.props.onContextChange(this);
    }
    if (this.props.onWalletChange && userInfo.wallet !== prevState.userInfo.wallet) {
      this.props.onWalletChange(userInfo.wallet);
    }
  }
  supportedWallets() {
    return ["eternl", "zwallet"];
  }
  isWalletSupported(wallet) {
    const supported = this.props.supportedWallets ?? this.supportedWallets();
    return supported.includes(wallet);
  }
  walletIsAvailable(wallet) {
    if (wallet === "zwallet") {
      return true;
    }
    return !!window.cardano?.[wallet];
  }
  render() {
    let {
      tcx,
      capo,
      walletUtxos,
      walletHelper,
      userInfo: { wallet, connectingWallet, roles, memberUut: collabUut },
      status: {
        moreInstructions,
        message,
        progressBar,
        progressPercent,
        keepOnscreen,
        clearAfter,
        isError
      }
    } = this.state;
    const { children = /* @__PURE__ */ React__default.createElement(React__default.Fragment, null), uiPortals, portalDelay } = this.props;
    if ("headless" == uiPortals) {
      return /* @__PURE__ */ React__default.createElement(CapoDappProviderContext.Provider, { value: this }, children);
    }
    let results = children;
    const walletInfo = this.renderWalletInfo();
    const showProgressBar = !!progressBar;
    const roleInfo = this.renderRoleInfo();
    const capoInfo = "development" == process.env.NODE_ENV && capo?._compiledScript ? /* @__PURE__ */ React__default.createElement("div", { className: "inline-block flex flex-row" }, /* @__PURE__ */ React__default.createElement(
      "span",
      {
        className: "mb-0 pl-2 text-black overflow-hidden max-w-48 hover:max-w-full inline-block rounded border border-slate-500 bg-blue-500 px-2 py-0 text-sm shadow-none outline-none hover:cursor-text"
      },
      "Capo\xA0",
      capo.address.toString()
    ), "\xA0", roleInfo) : "";
    const portalFallbackMessage = {
      fallbackHelp: "CapoDAppProvider: set the uiPortals= prop and/or provide the expected portal elements in the DOM"
    };
    const userDetails = /* @__PURE__ */ React__default.createElement(
      InPortal,
      {
        key: "capoUserDetails",
        domId: uiPortals?.capoUserDetails ?? "capoUserDetails",
        maxRetries: uiPortals ? 10 : 1,
        fallbackLocation: "top",
        ...{ delay: portalDelay, portalFallbackMessage }
      },
      capoInfo,
      walletInfo
    );
    const txBatchUI = /* @__PURE__ */ React__default.createElement(
      InPortal,
      {
        key: "txBatchUI",
        domId: uiPortals?.txBatchUI ?? "txBatchUI",
        fallbackLocation: "top"
      },
      /* @__PURE__ */ React__default.createElement(TxBatchUI, null)
    );
    const progressLabel = "string" == typeof progressBar ? progressBar : "";
    const renderedStatus = message && /* @__PURE__ */ React__default.createElement(
      InPortal,
      {
        key: "capoStatus",
        domId: uiPortals?.capoStatus ?? "capoStatus",
        fallbackLocation: "bottom",
        ...{ delay: portalDelay, portalFallbackMessage }
      },
      /* @__PURE__ */ React__default.createElement("div", { className: "z-40 opacity-60" }, showProgressBar ? this.renderProgressBar(
        progressLabel,
        progressPercent
      ) : "", isError ? this.renderErrorStatus() : keepOnscreen ? this.renderPersistentMessage() : this.renderNotification())
    ) || "";
    return /* @__PURE__ */ React__default.createElement(
      ClientSideOnly,
      {
        children: /* @__PURE__ */ React__default.createElement(CapoDappProviderContext.Provider, { value: this }, /* @__PURE__ */ React__default.createElement("div", null, renderedStatus, userDetails, txBatchUI, results))
      }
    );
  }
  /**
   * Renders a progress bar with a label and optional percentage
   * @remarks
   * The progress bar will be indeterminate if no percentage is provided,
   * showing an indicator of activity without a specific completion percentage.
   */
  renderProgressBar(progressLabel, progressPercent) {
    const pp = progressPercent ? { progressPercent } : {};
    return /* @__PURE__ */ React__default.createElement(Progress, { key: "capoProgress", ...pp }, progressLabel);
  }
  /**
   * Renders a message when the current status indicates that the
   * user should take some action before continuing, or that the material
   * should persist onscreen.
   * @remarks
   *
   * Customizers may override this method to provide a different presentation
   * than the default.
   *
   * The resulting React elements will be rendered using the InPortal component
   * to direct the presentation into the right area of your application layout.
   *
   * The `message` and `moreInstructions` fields SHOULD normally be displayed
   * for the user.
   *
   * Customizers SHOULD always call \{this._renderNextAction\(\)\}, which will render
   * a button for any next recommended action (if applicable) for the user to take.
   * To customize the action button, override `renderActionButton()`.
   *
   * ### More about message notifications
   *
   * Depending on the details of the current status (the `keepOnscreen` flag),
   * either this method or renderNotification() will be called to display the status
   * message. Developers may override one, the other, or both to customize the
   * presentation of the messages.
   *
   * If the `developerGuidance` field is present for any given message, it SHOULD NOT
   * be displayed in the UI, but can help developers determine how they may guide the
   * user.  In a `development` environment, you MAY wish to show the `developerGuidance`
   * onscreen as well.
   *
   */
  renderPersistentMessage() {
    const {
      status: { moreInstructions, message, isError }
    } = this.state;
    const statusClass = (
      //  !isError
      //     ? "font-bold bg-red-800 text-orange-200" :
      "bg-blue-300 border-blue-500 text-black font-bold dark:bg-blue-900 dark:text-blue-300"
    );
    return /* @__PURE__ */ React__default.createElement(
      "div",
      {
        className: `flex flex-row w-full status min-h-10 relative left-0 top-0 mb-4 rounded border p-1 ${statusClass}`,
        key: "persistentMessage",
        role: "banner"
      },
      /* @__PURE__ */ React__default.createElement("div", { className: "" }, /* @__PURE__ */ React__default.createElement("span", { key: "status", className: "block sm:inline" }, message), /* @__PURE__ */ React__default.createElement("div", { className: "text-sm text-gray-700 dark:text-gray-300 italic" }, moreInstructions)),
      /* @__PURE__ */ React__default.createElement("div", { className: "mr-2 flex-grow" }, this.renderNextAction())
    );
  }
  /**
   * Renders a message when the current status indicates that the
   * the message is transient and should be cleared after a short time.
   * @remarks
   *
   * By default, this method presents using the renderPersistentMessage() method,
   * though customizers may override this method to provide a different presentation.
   *
   * The provider will automatically update the state to clear the status message
   * after this indicated `clearAfter` time has elapsed.  Customizers using tools
   * that spawn their own notification elements (such as "toast" notifications)
   * should feed the `clearAfter` value into their notification system, and may
   * need to ensure a correct response the message-clearing update (if you get
   * empty toast, you didn't do it right : ).
   *
   * Overriding only renderPersistentMessage() will affect both transient and persistent
   * messages.  Overriding only renderNotification() will affect only transient messages.
   *
   * ### More about message notifications
   *
   * Depending on the details of the current status (the `keepOnscreen` flag),
   * either this method or renderPersistentMessage() will be called to display
   * the status message.  Developers may override one, the other, or both to
   * customize the presentation of the messages.
   *
   * The resulting React elements will be rendered using the InPortal component
   * to direct the presentation into the 'capoStatus' portal element in your application layout.
   */
  renderNotification() {
    return this.renderPersistentMessage();
  }
  /**
   * Renders a message when the current status indicates that an error has occurred
   * @remarks
   * Customizers may override this method to provide a different presentation for this case.
   *
   * This method SHOULD present the `message` and `moreInstructions` fields to the
   * user, indicate a clear error status for visual purposes, and include `{this._renderNextAction()}`
   * to display any recommended next action for the user to take (customize the button by overriding
   * `renderActionButton()`).
   *
   * Customizers SHOULD also provide a role="alert" attribute for accessibility purposes.
   *
   * The resulting React elements will be rendered using the InPortal component
   * to the 'capoStatus' portal element in your application layout.
   */
  renderErrorStatus() {
    const {
      status: { moreInstructions, message }
    } = this.state;
    return /* @__PURE__ */ React__default.createElement(
      "div",
      {
        className: "flex flex-row w-full error min-h-10 relative left-0 top-0 mb-4 rounded border p-1 font-bold bg-[#e7560a] text-black",
        role: "alert",
        key: "errorStatus"
      },
      /* @__PURE__ */ React__default.createElement("div", { className: "" }, /* @__PURE__ */ React__default.createElement("strong", { className: "font-bold" }, "Whoops! \xA0\xA0"), /* @__PURE__ */ React__default.createElement("span", { key: "status-err", className: "block sm:inline" }, message.split("\n").map((line, i) => /* @__PURE__ */ React__default.createElement(React__default.Fragment, { key: `line-${i}` }, line, /* @__PURE__ */ React__default.createElement("br", null)))), /* @__PURE__ */ React__default.createElement("div", { className: "text-sm italic" }, moreInstructions)),
      /* @__PURE__ */ React__default.createElement("div", { className: "mr-2 flex-grow text-nowrap" }, this.renderNextAction())
    );
  }
  renderNextAction() {
    const {
      status: {
        nextAction: {
          key: actionKey,
          label: actionMessage,
          trigger: actionTrigger
        } = {}
      }
    } = this.state;
    if (!actionKey) return;
    if (!actionTrigger) {
      console.error("no action trigger for next action", actionKey);
      return;
    }
    return this.renderActionButton(actionKey, actionTrigger, actionMessage);
  }
  renderActionButton(actionKey, actionTrigger, actionMessage) {
    return /* @__PURE__ */ React__default.createElement(
      "button",
      {
        className: "btn float-right ml-1 rounded-md border-2 border-amber-800 bg-blue-900 p-2 text-white hover:bg-blue-600 dark:border-amber-700 dark:bg-blue-200 dark:text-black dark:hover:bg-blue-50",
        onClick: actionTrigger
      },
      actionMessage || this.userActions[actionKey].label
    );
  }
  /**
   * displays a list of detected user roles
   * @remarks
   * This method is called by the default render() method to display the user's roles.
   *
   * Customizers may override this method to provide a different presentation for the user's roles.
   * The default implementation simply emits a list of role tags using react fragments,
   * with no additional envelope or decoration.  If you do this, you SHOULD call
   * renderRoleTag() to display each individual role tag.
   *
   * To customize individual role tags, override `renderRoleTag()` instead.
   *
   * The resulting React elements are normally included in the capoUserInfo portal element.
   * Customizers may use this method directly if using the "headless" uiPortals option.
   */
  renderRoleInfo() {
    const {
      userInfo: { roles }
    } = this.state;
    if (!roles) return;
    return /* @__PURE__ */ React__default.createElement(React__default.Fragment, null, roles.map((r) => {
      return /* @__PURE__ */ React__default.createElement(Fragment, { key: `role-${r}` }, this.renderRoleTag(r));
    }));
  }
  /**
   * displays a single role tag detected for the current user
   * @remarks
   * This method is called by the default renderRoleInfo() method to display a single role tag.
   */
  renderRoleTag(role) {
    return /* @__PURE__ */ React__default.createElement("span", { className: "ml-1 mb-0 inline-block rounded border border-slate-500 bg-emerald-800 px-2 py-0 text-sm text-slate-400 shadow-none outline-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:cursor-text" }, role);
  }
  // doAction(action) {
  //     const actions = {
  //         initializeCapo: this.bootstrapCapo,
  //         retryCreation: this.connectCapo,
  //     };
  //     const thisAction = actions[action];
  //     thisAction.call(this);
  // }
  /**
   * renders a lightweight wallet connection button.
   * @remarks
   * It's recommended to override this method to present your preferred
   * wallet connection button.
   *
   * When you detect a wallet change, call the `setWallet()` method to
   * notify the dApp.
   */
  renderWalletInfo() {
    const {
      userInfo: {
        wallet,
        walletAddress,
        connectingWallet,
        foundNetworkName,
        selectedWallet
      }
    } = this.state;
    let autoWallet = selectedWallet;
    if ("undefined" !== typeof window && typeof selectedWallet === "undefined") {
      autoWallet = window.localStorage.getItem("capoAutoConnectWalletName") || "";
    }
    if (wallet) {
      return /* @__PURE__ */ React__default.createElement("div", { className: "flex flex-row" }, walletAddress && /* @__PURE__ */ React__default.createElement(
        "span",
        {
          key: "chip-walletAddr",
          className: "mb-0 text-black text-nowrap overflow-hidden max-w-24 hover:max-w-full inline-block rounded border border-slate-500 bg-blue-500 px-2 py-0 text-sm shadow-none outline-none hover:cursor-text"
        },
        walletAddress,
        " ",
        selectedWallet,
        /* @__PURE__ */ React__default.createElement("a", { href: "#", onClick: () => this.newWalletSelected("") }, "\u2716\uFE0F")
      ), "\xA0", /* @__PURE__ */ React__default.createElement(
        "span",
        {
          key: "chip-networkName",
          className: "mb-0 inline-block rounded border border-slate-500 bg-blue-900 px-2 py-0 text-sm text-slate-400 shadow-none outline-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:cursor-text"
        },
        foundNetworkName
      ));
    } else if (connectingWallet) {
      return /* @__PURE__ */ React__default.createElement("div", null, /* @__PURE__ */ React__default.createElement(Button, { variant: "secondary", disabled: true, className: "-mt-3" }, "... connecting ..."));
    } else {
      return /* @__PURE__ */ React__default.createElement("div", null, /* @__PURE__ */ React__default.createElement("select", { value: autoWallet, onChange: this.onWalletChange }, /* @__PURE__ */ React__default.createElement("option", { value: "" }, " -- choose wallet -- "), /* @__PURE__ */ React__default.createElement("option", { value: "zwallet" }, "Zero Wallet"), /* @__PURE__ */ React__default.createElement("option", { value: "eternl" }, "Eternl")), /* @__PURE__ */ React__default.createElement(
        Button,
        {
          variant: "secondary",
          className: "-mt-3",
          onClick: this.onConnectButton
        },
        "Connect Wallet"
      ));
    }
  }
  onWalletChange = (event) => {
    this.newWalletSelected(event.target.value);
    event.preventDefault();
  };
  onConnectButton = async (event) => {
    this.connectWallet();
  };
  // txnDump() {
  //     const { tcx } = this.state;
  //     if (!tcx) return;
  //     const built = await tcx.build();
  //     const txnDump = tcx.dump();
  //     {
  //         txnDump && (
  //             <pre
  //                 style={{
  //                     color: "#999",
  //                     border: "1px dashed #505",
  //                     borderRadius: "0.5em",
  //                 }}
  //             >
  //                 {txnDump}
  //                 {tcx.state.bsc &&
  //                     JSON.stringify(tcx.state.bootstrappedConfig, null, 2)}
  //             </pre>
  //         );
  //     }
  // }
  //  ---- Component setup sequence starts here
  //  -- step 1: get blockfrost's network params
  async componentDidMount() {
    if (this._unmounted) this._unmounted = false;
    if (this._unmounted) {
      return;
    }
    this._isInitializing = this._isInitializing || this.doInitialize();
  }
  _isInitializing = void 0;
  async doInitialize() {
    const networkParams = await this.bf.parameters;
    if ("undefined" != typeof window) {
      const autoWallet = window.localStorage.getItem(
        "capoAutoConnectWalletName"
      );
      if (autoWallet) {
        await this.newWalletSelected(autoWallet, false);
      }
    }
    await this.updateStatus(
      "initializing on-chain contracts",
      {
        developerGuidance: "status message for the user"
      },
      "//component did mount",
      {
        networkParams
      }
    );
    if (this.props.onNetwork) this.props.onNetwork(this.bf);
    if (this.props.onStatusChange)
      this.props.onStatusChange(this.state.status);
    if (this.props.onUserInfo) this.props.onUserInfo(this.state.userInfo);
    if (this.props.onContextChange) this.props.onContextChange(this);
    await this.updateStatus(
      "setting up tx submitters",
      {
        developerGuidance: "just show the message to the user"
      },
      "//setupSubmitters"
    );
    await this.setupSubmitters();
    this.connectCapo();
  }
  submitters = {};
  async setupSubmitters() {
    this.submitters = {
      blockfrost: this.bf,
      ...this.props.otherSubmitters || {}
    };
    for (const [name, conn] of Object.entries(
      this.props.ogmiosConnections || {}
    )) {
      if (name in this.submitters) {
        throw new Error(
          `ogmios submitter ${name} conflicts with other implied or provided submitter`
        );
      }
      this.submitters[name] = await OgmiosTxSubmitter.withOgmiosConn(
        this.isMainnet(),
        conn
      );
    }
    const { promise, resolve } = Promise.withResolvers();
    const { networkParams, userInfo: { wallet } = {} } = this.state;
    if (!networkParams) {
      throw new Error("network params not available");
    }
    const txBatcherOptions = {
      submitters: this.submitters
    };
    if (wallet) {
      txBatcherOptions.signingStrategy = new GenericSigner(wallet);
    }
    this.setState(
      {
        txBatcher: new TxBatcher(txBatcherOptions)
        // , {
        //     network: this.bf,
        //     networkParams,
        // }),
      },
      () => resolve("")
    );
    return promise;
  }
  _unmounted = false;
  async componentWillUnmount() {
    this._unmounted = true;
    console.error("capo dApp provider unmounted");
  }
  /**
   * @internal
   */
  newWalletSelected(selectedWallet = "eternl", autoNext = true) {
    if (selectedWallet === "") {
      return this.updateStatus("disconnecting from wallet", {
        developerGuidance: "just a status message for the user"
      }, "//disconnecting wallet", {
        userInfo: {
          ...this.state.userInfo,
          selectedWallet: "",
          wallet: void 0,
          walletAddress: void 0,
          walletHandle: void 0
        }
      });
    }
    if (!this.isWalletSupported(selectedWallet)) {
      debugger;
      this.reportError(
        new Error("wallet not supported"),
        `selected wallet '${selectedWallet}' not supported`,
        {
          developerGuidance: "let the user know to install the wallet plugin"
        }
      );
      return;
    }
    if (!this.walletIsAvailable(selectedWallet)) {
      this.reportError(
        new Error(`wallet '${selectedWallet}' not available`),
        `selected wallet '${selectedWallet}' isn't activated - enable the browser extension to continue`,
        {
          developerGuidance: "let the user know to install the wallet plugin"
        }
      );
      return;
    }
    return new Promise((resolve) => {
      this.setState(
        {
          userInfo: {
            ...this.state.userInfo,
            selectedWallet
          }
        },
        () => resolve()
      );
    }).then(() => {
      return this.connectWallet(autoNext);
    });
  }
  get userInfo() {
    return this.state.userInfo;
  }
  //  -- step 2: connect to Cardano wallet
  walletConnectPromise;
  async connectWallet(autoNext = true, retries = 5) {
    const {
      userInfo,
      userInfo: { wallet: alreadyConnected, selectedWallet = "eternl" },
      capo
    } = this.state;
    if (this._unmounted) {
      debugger;
      return true;
    }
    if (alreadyConnected) return true;
    if (!this.isWalletSupported(selectedWallet)) {
      this.reportError(
        new Error(`wallet '${selectedWallet}' not supported`),
        `selected wallet '${selectedWallet}' isn't supported`,
        {
          developerGuidance: "let the user know to install the wallet plugin"
        }
      );
      return;
    }
    if (!this.walletIsAvailable(selectedWallet)) {
      this.reportError(
        new Error(`wallet '${selectedWallet}' not available`),
        `selected wallet '${selectedWallet}' isn't activated - enable the browser extension to continue`,
        {
          developerGuidance: "let the user know to install the wallet plugin"
        }
      );
      return;
    }
    //! it suppresses lame nextjs/react-sourced double-trigger of mount sequence
    if (this.walletConnectPromise) {
      console.warn(
        "suppressing redundant wallet connect, already pending"
      );
      return this.walletConnectPromise;
    }
    await this.updateStatus(
      "connecting to Cardano wallet",
      {
        progressBar: true,
        developerGuidance: "just a status message for the user"
      },
      "//connecting wallet",
      {
        userInfo: { ...userInfo, connectingWallet: true }
      }
    );
    let simpleWallet;
    let walletHandle;
    if (selectedWallet === "zwallet") {
      let privKeyHex = window.localStorage.getItem("zwk");
      if (!privKeyHex) {
        const entropy = makeRandomRootPrivateKey().entropy;
        privKeyHex = bytesToHex(entropy);
        window.localStorage.setItem("zwk", privKeyHex);
      }
      const privKey = makeRootPrivateKey(hexToBytes(privKeyHex));
      const isMainnet = this.props.targetNetwork === "mainnet";
      const useHydra = !!this.props.hydra;
      const hydraOptions = useHydra ? {
        ...this.props.hydra === true ? {} : this.props.hydra,
        isForMainnet: isMainnet
      } : void 0;
      let networkClient = useHydra ? makeHydraClient(WebSocket, {
        onReceive(message) {
          console.log("onReceive", message);
        },
        isForMainnet: isMainnet,
        // l1client: this.bf,
        ...hydraOptions
      }) : this.bf;
      simpleWallet = makeSimpleWallet(privKey, networkClient);
      debugger;
      if (this.capo) {
        this.capo.setup.network = networkClient;
        debugger;
      }
    } else {
      if (!!this.props.hydra) {
        throw new Error("hydra not supported for this wallet");
      }
      const connecting = this.walletConnectPromise = //@ts-expect-error on Cardano
      window.cardano[selectedWallet]?.enable();
      walletHandle = await connecting.catch((e) => {
        simpleWallet = void 0;
        if (!!retries && e.message.match(/no account set/)) {
          const delay = Math.pow(1.6, 5 - retries) * 200;
          return new Promise((res) => setTimeout(res, delay)).then(
            () => {
              return this.connectWallet(autoNext, retries - 1);
            }
          );
        }
        this.reportError(e, "wallet connect", {
          developerGuidance: "guide the user to get connected to a supported wallet plugin"
        });
      });
      if (!walletHandle) return;
    }
    return this.setWallet({
      cip30WalletHandle: walletHandle,
      simpleWallet,
      walletName: selectedWallet,
      autoNext
    });
  }
  /**
   * allows setting the wallet for the dApp from a CIP-30 wallet handle
   * @remarks
   * if your application has its own UI for the user to choose their wallet and connect or disconnect,
   * call this method any time a new wallet is selected.
   * @public
   */
  async setWallet(details) {
    let {
      walletName,
      simpleWallet,
      cip30WalletHandle: walletHandle,
      autoNext = true
    } = details;
    if (!simpleWallet && !walletHandle) {
      debugger;
      throw new Error("wallet or walletHandle is required");
    }
    let wallet = simpleWallet;
    let addrString;
    console.warn("CIP-30 Wallet Handle", walletHandle);
    let foundNetworkName;
    if (walletHandle) {
      const netId = await walletHandle.getNetworkId();
      const addr = (await walletHandle.getUsedAddresses())[0];
      addrString = addr;
      foundNetworkName = networkNames[netId];
      if (foundNetworkName !== this.props.targetNetwork) {
        return this.updateStatus(
          `This application is only available on the ${this.props.targetNetwork} network.  Your wallet is connected to network ${netId} (${foundNetworkName})`,
          {
            isError: true,
            developerGuidance: "when the user switches networks, the dApp should automatically(?) reconnect"
          },
          "//wallet not on expected network",
          {
            userInfo: {
              ...this.userInfo,
              connectingWallet: false,
              walletAddress: addrString,
              foundNetworkName: foundNetworkName || "\u2039unknown\u203A"
            }
          }
        );
      }
      if (this.bf.networkName !== foundNetworkName) {
        //! checks that wallet network matches network params / bf
        this.updateStatus(
          `wallet network mismatch; expected ${this.bf.networkName}, wallet ${foundNetworkName}`,
          {
            isError: true,
            developerGuidance: "the dApp should automatically(?) reconnect when the user switches networks"
          },
          "//wallet network doesn't match bf network",
          {
            userInfo: {
              ...this.userInfo,
              connectingWallet: false,
              walletAddress: addrString,
              foundNetworkName
            }
          }
        );
        return;
      }
      wallet = makeCip30Wallet(walletHandle);
    } else {
      if (!simpleWallet) {
        throw new Error("wallet not found");
      }
      wallet = simpleWallet;
      foundNetworkName = this.props.targetNetwork;
      if (this.capo) {
        this.capo.setup.network = simpleWallet.cardanoClient;
        this.capo.setup.actorContext.wallet = wallet;
      }
      const networkParams = await simpleWallet.cardanoClient.parameters;
      const addr = (await wallet.usedAddresses)[0];
      addrString = addr.toString();
      await this.updateStatus(
        "connected with zero-wallet",
        {
          developerGuidance: "status message for the user"
        },
        "// zero-wallet connected",
        {
          networkParams,
          userInfo: {
            ...this.userInfo,
            connectingWallet: false,
            wallet,
            walletAddress: addrString
          }
        }
      );
    }
    if (!wallet) {
      throw new Error("wallet not found");
    }
    const { txBatcher } = this.state;
    if (txBatcher) {
      txBatcher.signingStrategy = new GenericSigner(wallet);
    }
    const walletHelper = makeWalletHelper(wallet);
    if ("undefined" !== typeof window) {
      if (window.localStorage.getItem("capoAutoConnectWalletName") !== walletName) {
        window.localStorage.setItem(
          "capoAutoConnectWalletName",
          walletName
        );
      }
    }
    const newState = {
      userInfo: {
        ...this.userInfo,
        wallet,
        walletHandle,
        selectedWallet: walletName,
        connectingWallet: false,
        foundNetworkName
      },
      walletHelper
    };
    await this.updateStatus(
      "finding collateral and other wallet utxos",
      {
        developerGuidance: "show status message onscreen",
        clearAfter: 5e3,
        progressBar: true
      },
      "//finding wallet utxos & collateral",
      newState
    );
    if (this.capo) this.capo.actorContext.wallet = wallet;
    await walletHelper.utxos.then((walletUtxos) => {
      return this.updateStatus(
        void 0,
        {
          developerGuidance: "nothing to do here but clear an existing status message (if needed)"
        },
        "//found wallet utxos",
        {
          walletUtxos
        }
      );
    });
    if (this.state.networkParams && autoNext && !this.state.capo || !await this.state.capo?.isConfigured) {
      await this.updateStatus(
        `reconnecting to ${this.dAppName} with connected wallet`,
        {
          developerGuidance: "status message for the user"
        },
        "//reinit after wallet"
      );
      return this.connectCapo(autoNext);
    }
  }
  async checkWalletTokens() {
    const { capo } = this.state;
    if (!capo?.actorContext.wallet) {
      await this.updateStatus(
        "no capo yet, or not connected to wallet",
        {
          developerGuidance: "wait for the wallet to be connected before calling checkWalletTokens"
        },
        "/// no capo or wallet; skipping scan for authority tokens"
      );
      return;
    }
    await this.updateStatus(
      "checking wallet for authority tokens ",
      {
        progressBar: true,
        developerGuidance: "status message for the user"
      },
      "/// looking for authority tokens  from policy " + capo.mph.toHex()
    );
    const roles = [];
    const member = await capo.findMemberInfo?.();
    const isAdmin = await capo.findActorUut("capoGov");
    let memberUut;
    if (!!member) {
      memberUut = member.uut;
      roles.push("collaborator");
    }
    if (!!isAdmin) roles.push("admin");
    const message = roles.includes("member") ? (
      // || roles.includes("admin")
      ""
    ) : this.getStartedMessage();
    this.updateStatus(
      message,
      {
        progressPercent: 100,
        developerGuidance: "display the indicated roles in the UI and/or show/hide app features based on the roles"
      },
      `/// found ${roles.length} roles: ${roles.join(", ")}}`,
      {
        userInfo: {
          ...this.userInfo,
          //@ts-expect-error on strict types
          roles,
          memberUut
        }
      }
    );
  }
  getStartedMessage() {
    return `Hurray!  Users can now start doing their thing. Customize this content in your CapoDappProvider's getStartedMessage() method.`;
  }
  // -- step 3 - check if the Capo is configured and ready for use
  async connectCapo(autoNext = true, reset) {
    if (this._unmounted) return;
    let {
      networkParams,
      capo,
      userInfo: { wallet }
    } = this.state;
    let config = { partialConfig: {} };
    if (!wallet) console.warn("connecting to capo with no wallet");
    if (!networkParams) {
      console.warn("no network params");
      return;
    }
    let { txBatcher } = this.state;
    if (!txBatcher) {
      const batcherOptions = {
        submitters: this.submitters,
        ...wallet ? {
          signingStrategy: new GenericSigner(wallet)
        } : {}
      };
      txBatcher = new TxBatcher(batcherOptions);
    }
    let network = this.bf;
    if (this.state.userInfo.wallet?.cardanoClient) {
      network = this.state.userInfo.wallet.cardanoClient;
      networkParams = await network.parameters;
    }
    const setup = {
      network,
      networkParams,
      txBatcher,
      actorContext: {
        wallet
      },
      isMainnet: this.isMainnet(),
      optimize: true
    };
    txBatcher.setup = setup;
    let cfg = {
      setup,
      // partialConfig: {},
      ...config
    };
    try {
      console.log("init with cfg", cfg);
      await this.updateStatus(
        `connecting: ${this.dAppName}`,
        {
          developerGuidance: "wait for connection; possibly show a spinner"
        },
        "//init",
        {
          txBatcher
        }
      );
      const capo2 = await this.capoClass.createWith(
        //@ts-expect-error - sorry, typescript : /
        cfg
      );
      const capoBundle = capo2.getBundle();
      const configured = capoBundle.configuredParams;
      const { isChartered } = capo2;
      if (!configured || !isChartered) {
        const problem = configured ? isChartered ? "impossible" : "is preconfigured and ready to be chartered!" : isChartered ? "impossible" : "needs to be configured and chartered.   Add a configuration if you have it, or create the Capo charter now.";
        const message = autoNext ? `The Capo contract ${problem} ` : "";
        await this.updateStatus(
          message,
          {
            nextAction: "initializeCapo",
            developerGuidance: "likely administrative moment for dev-time creation of the capo"
          },
          "//bootstrap needed",
          {
            capo: capo2
          }
        );
        return;
      }
      capo2.actorContext.wallet = wallet;
      if (!autoNext)
        return this.updateStatus(
          "",
          {
            developerGuidance: "capture this capo object for use in transaction-building.  See also the dataDelegates..."
          },
          "// Capo is connected to wallet, ready to do an on-chain activity",
          { capo: capo2 }
        );
      await this.updateStatus(
        "... searching ...",
        {
          busy: true,
          developerGuidance: "display a spinner or other indicator that the dApp is doing something"
        },
        "//searching (or freshening search after wallet connection)",
        {
          capo: capo2
        }
      );
      this.checkWalletTokens();
    } catch (error) {
      this.reportError(error, `checking ${this.dAppName} configuration`, {
        nextAction: "initializeCapo",
        moreInstructions: "Developer error: Some error has occurred during initialization of on-chain Capo.development" == process.env.NODE_ENV ? "You can try again, or check the console for more information." : `You might need to contact ${this.dAppName}'s support channels for assistance.`,
        developerGuidance: "Check the logs for more information about the error"
      });
    }
  }
  isMainnet() {
    const isMainnet = !("development" == environment.NODE_ENV || "test" == environment.NODE_ENV || "preview" == environment.CARDANO_NETWORK || "preprod" == environment.CARDANO_NETWORK);
    console.log(
      "isMainnet",
      isMainnet,
      environment.NODE_ENV,
      environment.CARDANO_NETWORK
    );
    return isMainnet;
  }
  async mkDefaultCharterArgs() {
    const { walletHelper } = this.state;
    if (!walletHelper) {
      debugger;
      throw new Error("no wallet helper");
    }
    const addr = await walletHelper.baseAddress;
    return {
      govAuthorityLink: {
        config: {
          //this.capo.stringifyDgtConfig({
          addrHint: [addr]
        }
      },
      mintDelegateLink: {
        config: {}
      },
      spendDelegateLink: {
        config: {}
      },
      mintInvariants: [],
      spendInvariants: [],
      otherNamedDelegates: /* @__PURE__ */ new Map(),
      manifest: /* @__PURE__ */ new Map(),
      rev: 1n
    };
  }
  //  -- step 3a - initialize the Capo if needed
  async bootstrapCapo() {
    if (!this.userInfo?.wallet) await this.connectWallet(false);
    await this.connectCapo(false, "reset");
    const {
      capo,
      userInfo: { wallet }
    } = this.state;
    if (!wallet) {
      debugger;
      throw new Error("no wallet");
    }
    if (!capo) {
      debugger;
      throw new Error("no capo");
    }
    if (await capo.isConfigured) {
      return this.reportError(
        new Error(`Capo already has a deployed configuration`),
        "bootstrap",
        {
          moreInstructions: "This is a developer error that should be unreachable",
          developerGuidance: "Figure out how this could have happened, and fix the first root cause"
        }
      );
    }
    await this.updateStatus(
      "creating the Capo charter transaction ...",
      {
        progressBar: true,
        moreInstructions: "This could take 60-90 seconds while the contracts are compiled",
        developerGuidance: "status indicator while the transaction is build.  this might take a second or three."
      },
      "//creating charter txn"
    );
    let tcx;
    try {
      const addresses = await wallet.unusedAddresses;
      tcx = await capo.mkTxnMintCharterToken(
        await this.mkDefaultCharterArgs()
      );
    } catch (e) {
      console.error(e);
      this.reportError(e, "creating charter", {
        nextAction: "retryCreation",
        developerGuidance: "Make sure you're approving the setup transactions in the wallet, and check the logs to investigate possible other causes of error"
      });
      return;
    }
    await this.updateStatus(
      "Bootstrap transaction loading into your wallet...",
      {
        progressBar: true,
        moreInstructions: `If it looks right, sign the transaction to finish chartering the ${this.dAppName}`,
        developerGuidance: "the dApp is waiting for the wallet to sign the bootstrap txn"
      },
      "/// push bootstrap txn to wallet",
      {
        tcx
      }
    );
    try {
      await tcx.submitAll({
        // paramsOverride,
        onSubmitError: (details) => {
          this.props.onSubmitError?.(details);
        },
        addlTxInfo: {
          txName: `${this.dAppName} Charter`,
          description: `Bootstrap on-chain contracts for ${this.dAppName}`,
          moreInfo: `If this looks right, sign the transaction to finish chartering the ${this.dAppName}`
        },
        fixupBeforeSubmit: ({
          tcx: tcx2,
          description,
          moreInfo,
          optional,
          txName
        }) => {
          return this.updateStatus(
            "creating addl Txn: " + description,
            {
              moreInstructions: moreInfo,
              progressBar: "waiting for wallet signature",
              developerGuidance: "to user: get this thing deployed, yo"
            },
            `/// push ${description} txn to wallet`
          );
        },
        onSubmitted: ({ description, tcx: tcx2 }) => {
          return this.updateStatus(
            "submitted txn: " + description,
            {
              moreInstructions: "the txn will take a few moments to be confirmed",
              developerGuidance: "it's just a user confirmation"
            },
            "/// txn submitted ok to network"
          );
        }
      });
      console.warn(
        "------------------- Boostrapped Config -----------------------\n",
        tcx.state.bootstrappedConfig,
        "\n------------------- deploy this! -----------------------\n",
        "... by pasting this into your dAPI repo's capo.config.json"
      );
      if ("development" == process.env.NODE_ENV) {
        window.localStorage.setItem(
          "capoConfig",
          JSON.stringify(tcx.state.bootstrappedConfig)
        );
        await this.updateStatus(
          "Okay: self-deployed dev-time config.  It might take 10-20s for the charter to be found on-chain",
          {
            keepOnscreen: true,
            moreInstructions: "Bootstrap config saved to localStorage.  It will be used on next load.",
            developerGuidance: "dev-time 'deployment' to localStorage ready!"
          },
          "//stored bootstrapped config in localStorage"
        );
        await new Promise((res) => setTimeout(res, 5e3));
      } else {
        await this.updateStatus(
          `Capo contract creation submitted.  Use the details from the console to deploy this configuration.`,
          {
            keepOnscreen: true,
            moreInstructions: "The charter transaction is submitted to the network.  It may take a few minutes to be confirmed.",
            developerGuidance: "Deploy the capo configuration by pasting these details into your dApp code, the build and deploy the dApp."
          },
          "//ok: charter txn submitted to network"
        );
      }
    } catch (e) {
      console.error(e);
      this.updateStatus(
        `while building bootstrap txn: "${e.message}"`,
        {
          isError: true,
          nextAction: "retryCreation",
          developerGuidance: "creating the capo didn't work for some reason.  Let the user try again."
        },
        "//wallet error during charter",
        {
          capo: void 0
        }
      );
    }
  }
  /**
   * sets the state to indicate an error condition and possible next steps
   * @remarks
   */
  reportError(e, prefix, addlAttrs) {
    console.error(e.stack || e.message);
    debugger;
    return this.updateStatus(
      `${prefix}: "${e.message}"`,
      {
        isError: true,
        keepOnscreen: true,
        ...addlAttrs
      },
      "//error msg to user"
    );
  }
  /**
   * Promise-based wrapper for setState, with status message implicit
   * @remarks
   *
   * sets the status message in state.status, along with any other state props
   *
   * automatically clears nextAction, error, and actionLabels if they aren't
   * explicitly set.
   *
   * returns an await-able promise for setting the indicated state
   *
   * TODO: Notifies state-change through the hooks inidicated in props
   *
   * @public
   **/
  updateStatus(message, statusProps, extraComment, extraState = {}) {
    const {
      nextAction = void 0,
      // moreInstructions = undefined,
      // progressBar = undefined,
      isError = void 0,
      clearAfter = 0,
      ...otherStatusProps
    } = statusProps;
    if (!clearAfter) {
      otherStatusProps.keepOnscreen = true;
    }
    console.log(`instance ${this.i}`, { status: message });
    const status = "undefined" === typeof message ? {
      message: void 0,
      developerGuidance: "the current state was cleared, indicating no pending actions.  You MAY clear the most recent message."
    } : {
      ...otherStatusProps,
      message,
      isError,
      clearAfter,
      ...nextAction ? {
        nextAction: {
          key: nextAction,
          label: this.userActions[nextAction]?.label,
          trigger: this.userActions[nextAction]?.trigger
        }
      } : {}
    };
    const newState = {
      ...this.state,
      status,
      ...extraState
    };
    const doneWith = "" == message && this.state.status.message && `(done: ${this.state.status.message})` || "";
    console.warn(extraComment || "" + doneWith || "", {
      newState
    });
    return new Promise((resolve) => {
      this.setState(newState, resolve);
      if (clearAfter) {
        setTimeout(() => {
          if (this.state.status.message == message)
            this.updateStatus(
              "",
              {
                clearAfter: 0,
                developerGuidance: "clearing the message after the indicated time; if you have already used the previous clearAfter signal for a temporary message, it's ok to ignore this"
              },
              "//clear previous message"
            );
        }, clearAfter);
      }
    });
  }
  /**
   * Defines activities that can be specified as nextAction: ‹key›,
   * and offered to the user as a button to trigger the activity.
   * @remarks
   * Subclasses MAY override this method to provide additional actions
   * and SHOULD include `{ ... super.userActions }`
   */
  get userActions() {
    return {
      initializeCapo: {
        label: "Setup Capo",
        trigger: this.bootstrapCapo
      },
      retryCreation: {
        label: "Retry",
        trigger: this.connectCapo
      }
    };
  }
  /**
   * emits an object allowing clients to access the provider's capabilities
   * including including status updates, error-reporting and default UI
   * elements
   */
  get capo() {
    return this.state.capo;
  }
}
const CapoDappProviderContext = React__default.createContext(null);
function useCapoDappProvider() {
  const provider = React__default.useContext(CapoDappProviderContext);
  if (!provider) {
    throw new Error(
      "useCapoDappProvider must be used within a CapoDappProvider"
    );
  }
  const [capo, setCapo] = React__default.useState();
  const [checking, keepChecking] = React__default.useState(1);
  React__default.useEffect(() => {
    setTimeout(() => {
      if (capo !== provider?.capo) {
        setCapo(provider?.capo);
      }
      keepChecking(1 + checking);
    }, 2e3);
  }, [checking, provider, provider?.userInfo.wallet, capo]);
  return { capo, provider };
}

function CharterStatus() {
  const { capo, provider } = useCapoDappProvider();
  provider?.bf;
  const [charterData, setCharterData] = React.useState();
  const [statusMessage, setStatusMessage] = React.useState("");
  React.useEffect(() => {
    if (!provider?.userInfo?.wallet) {
      setStatusMessage("no user info");
      return;
    }
    if (!provider) {
      setStatusMessage("no provider");
      return;
    }
    globalThis.capo = capo;
    setStatusMessage("finding charter data...");
    if (!capo) return;
    const bundle = capo.getBundle();
    if (!bundle) {
      setStatusMessage("no bundle");
      return;
    }
    if (!bundle._progIsPrecompiled) {
      setStatusMessage("Capo bundle not configured");
      return;
    }
    capo?.findCharterData(void 0, { optional: true }).then((cd) => {
      if (!cd) {
        setStatusMessage("no charter data found");
        return;
      }
      setStatusMessage("charter data found");
      globalThis.charter = cd;
      setCharterData(cd);
    });
  }, [provider, provider?.userInfo.wallet, capo]);
  const [upgradeTxn, setUpgradeTxn] = React.useState();
  React.useEffect(
    function checkForNeededUpgrades() {
      if (!capo) return;
      if (!charterData) return;
      capo.mkTxnUpgradeIfNeeded().catch((e) => {
        setStatusMessage("error: " + e.message);
        debugger;
      }).then((tcx) => {
        if (!tcx) {
          setStatusMessage("no upgrade needed");
          return;
        }
        if (Object.keys(tcx.addlTxns).length) {
          setUpgradeTxn(tcx);
        } else {
          setUpgradeTxn("ok");
          setStatusMessage("no upgrade needed");
        }
      });
    },
    [charterData]
  );
  const loadUpgrades = React.useMemo(() => {
    return async function loadUpgradeTxns() {
      if (!capo) return;
      if (!upgradeTxn) return;
      if ("ok" === upgradeTxn) return;
      const { txBatcher } = capo.setup;
      txBatcher.current.$addTxns([
        {
          description: "Upgrade Charter",
          tcx: upgradeTxn,
          id: upgradeTxn.id,
          depth: 0,
          moreInfo: "Applies needed updates to on-chain deployment details"
        }
      ]);
      upgradeTxn.buildAndQueueAll({});
    };
  }, [capo, capo?.setup.txBatcher, upgradeTxn]);
  let upgradeInfo = /* @__PURE__ */ React.createElement(React.Fragment, null);
  if (upgradeTxn === "ok") {
    upgradeInfo = /* @__PURE__ */ React.createElement(DashHighlightItem, { title: "Deployment" }, /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement(Lowlight, null, "Everything is up to date"));
  } else if (upgradeTxn) {
    const txnCount = Object.keys(upgradeTxn.addlTxns).length;
    const txns = txnCount === 1 ? "tx" : "txns";
    upgradeInfo = /* @__PURE__ */ React.createElement(DashHighlightItem, { button: "Review & Submit", onClick: loadUpgrades }, /* @__PURE__ */ React.createElement(Highlight, null, txnCount, " ", /* @__PURE__ */ React.createElement(Lowlight, { as: "span", className: "text-lg" }, txns, " needed")), /* @__PURE__ */ React.createElement(Softlight, { className: "italic" }, "To bring the on-chain deployment up to date"));
  }
  let highlights = null;
  if (capo && !capo.isChartered) {
    highlights = /* @__PURE__ */ React.createElement(DashboardHighlights, { title: "Highlights" }, /* @__PURE__ */ React.createElement(
      DashHighlightItem,
      {
        title: "Needs Charter",
        footer: "The Capo has not been created yet"
      },
      /* @__PURE__ */ React.createElement(Highlight, null, "Setup the Capo to resolve")
    ));
  } else if (charterData) {
    highlights = /* @__PURE__ */ React.createElement(
      DashboardHighlights,
      {
        title: "Highlights",
        footer: /* @__PURE__ */ React.createElement(React.Fragment, null, "Capo:", " ", /* @__PURE__ */ React.createElement(Softlight, { as: "span" }, capo?.address?.toString()), /* @__PURE__ */ React.createElement("div", null, "Minting policy:", " ", /* @__PURE__ */ React.createElement(Softlight, { as: "span" }, capo?.mintingPolicyHash?.toString())))
      },
      capo && charterData && /* @__PURE__ */ React.createElement(CharterHighlights, { capo, charterData }),
      upgradeInfo
    );
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(DashboardTemplate, { title: "Charter" }, /* @__PURE__ */ React.createElement("div", null, provider?.dAppName, ": ", statusMessage), /* @__PURE__ */ React.createElement(DashboardRow, null, /* @__PURE__ */ React.createElement(DashboardSummary, { title: "Stats" }, /* @__PURE__ */ React.createElement(DashSummaryItem, { title: "Node Operators" }, "42"), /* @__PURE__ */ React.createElement(DashSummaryItem, { title: "Active Stake" }, "14,200", /* @__PURE__ */ React.createElement(Highlight, null, "ADA")), /* @__PURE__ */ React.createElement(DashSummaryItem, { title: "Great Things" }, "1042")), highlights)), charterData && /* @__PURE__ */ React.createElement("code", { className: "text-sm" }, /* @__PURE__ */ React.createElement("pre", null, uplcDataSerializer("", charterData))) || /* @__PURE__ */ React.createElement("pre", null, "loading charter data..."));
}
function CharterHighlights({
  capo,
  charterData
}) {
  const isMainnet = capo.setup.isMainnet;
  const [{ mintDgt, spendDgt }, setDelegates] = React.useState({
    mintDgt: void 0,
    spendDgt: void 0
  });
  const [dataControllers, setDataControllers] = React.useState({});
  React.useEffect(() => {
    async function loadDelegates() {
      const mintDgt2 = await capo.getMintDelegate(charterData) || null;
      const spendDgt2 = await capo.getSpendDelegate(charterData) || null;
      setDelegates({ mintDgt: mintDgt2, spendDgt: spendDgt2 });
      const dataControllers2 = {};
      for (const [entryName, entryInfo] of [
        ...charterData.manifest.entries()
      ]) {
        if (entryInfo.entryType.DgDataPolicy) {
          const dgt = await capo.getDgDataController(entryName, {
            charterData
          });
          dataControllers2[entryName] = dgt;
        }
      }
      setDataControllers(dataControllers2);
    }
    loadDelegates();
  }, [capo, charterData]);
  const { mintDelegateLink } = charterData;
  const { spendDelegateLink } = charterData;
  if (!charterData) return null;
  const manifestNamedEntries = [...charterData.manifest.entries()].filter(([_, foundRole]) => !foundRole.entryType.DgDataPolicy).map(([roleName, foundRole]) => {
    const entryType = Object.keys(foundRole.entryType)[0];
    return /* @__PURE__ */ React.createElement(
      DashHighlightItem,
      {
        key: `role-${roleName}`,
        title: roleName,
        footer: `manifest '${entryType}' entry`
      },
      /* @__PURE__ */ React.createElement(Softlight, null, bytesToText(foundRole.tokenName))
    );
  });
  const coreDelegates = (() => {
    if (!mintDgt) return null;
    if (!spendDgt) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      CoreDelegateHighlightItem,
      {
        title: "Mint Delegate",
        delegate: mintDgt,
        delegateLink: mintDelegateLink,
        isMainnet,
        footer: "governs all token minting"
      }
    ), /* @__PURE__ */ React.createElement(
      CoreDelegateHighlightItem,
      {
        title: "Spend Delegate",
        delegate: spendDgt,
        delegateLink: spendDelegateLink,
        isMainnet,
        footer: "controls admin & redelegation"
      }
    ));
  })();
  return /* @__PURE__ */ React.createElement(React.Fragment, null, coreDelegates, manifestNamedEntries, ...Object.entries(capo.delegateRoles).flatMap(
    ([roleName, roleInfo]) => {
      if (roleName == "govAuthority") return null;
      if (roleName == "mintDelegate") return null;
      if (roleName == "spendDelegate") return null;
      const foundRole = charterData.manifest.get(roleName);
      if (!foundRole)
        return /* @__PURE__ */ React.createElement(
          DashHighlightItem,
          {
            title: roleName,
            key: `mftRole-${roleName}`
          },
          /* @__PURE__ */ React.createElement(Softlight, null, "Delegated data policy"),
          /* @__PURE__ */ React.createElement(Highlight, null, "needs deployment")
        );
      return /* @__PURE__ */ React.createElement(
        DelegatedDataPolicyItem,
        {
          roleName,
          delegate: dataControllers[roleName],
          mainnet: isMainnet,
          foundRole
        }
      );
    }
  ));
}
function DelegatedDataPolicyItem({
  roleName,
  delegate,
  mainnet,
  foundRole
}) {
  return /* @__PURE__ */ React.createElement(
    DashHighlightItem,
    {
      title: roleName,
      footer: /* @__PURE__ */ React.createElement(React.Fragment, null, "Governs all", " ", /* @__PURE__ */ React.createElement(Lowlight, { as: "span" }, /* @__PURE__ */ React.createElement("b", null, delegate?.recordTypeName)), " ", "records")
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-row justify-between w-full" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Softlight, null, "Delegated data policy", /* @__PURE__ */ React.createElement("div", { className: "text-xs" }, "\xA0\xA0\xA0", bytesToText(foundRole.tokenName)))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end" }, /* @__PURE__ */ React.createElement(Lowlight, { className: "text-xs" }, "for type"), /* @__PURE__ */ React.createElement(Highlight, { as: "span", className: "whitespace-nowrap" }, foundRole.entryType.DgDataPolicy?.idPrefix, "-*"))),
    delegate?.getBundle().previousOnchainScript ? /* @__PURE__ */ React.createElement("div", { className: "text-xs mt-2 w-full text-right" }, /* @__PURE__ */ React.createElement(Highlight, { as: "span" }, "update needed "), /* @__PURE__ */ React.createElement(Softlight, { className: "italic" }, "to apply pending code changes to on-chain policy")) : ""
  );
}
function CoreDelegateHighlightItem({
  title,
  delegate,
  delegateLink,
  isMainnet,
  footer
}) {
  if (!delegateLink) {
    return /* @__PURE__ */ React.createElement(DashHighlightItem, { title }, /* @__PURE__ */ React.createElement(Highlight, null, "needs deployment"));
  }
  const dvh = delegateLink.delegateValidatorHash;
  const addr = dvh ? abbrevAddress(makeShelleyAddress(isMainnet, dvh)) : "";
  return /* @__PURE__ */ React.createElement(DashHighlightItem, { title, footer }, /* @__PURE__ */ React.createElement(Softlight, null, delegateLink?.uutName), /* @__PURE__ */ React.createElement(Lowlight, { className: "text-right" }, addr), delegate?.getBundle().previousOnchainScript ? /* @__PURE__ */ React.createElement(Highlight, { className: "text-right" }, "update needed", " ", /* @__PURE__ */ React.createElement(Softlight, null, "to apply changes to on-chain policy")) : null);
}

function ShowPendingTxns({
  pendingTxns
}) {
  return /* @__PURE__ */ React.createElement(DashboardRow, null, /* @__PURE__ */ React.createElement(DashboardHighlights, { title: "Pending Txns" }, ...Array.from(pendingTxns.values()).map(({ mgr, statusSummary, txd }) => /* @__PURE__ */ React.createElement(DashHighlightItem, { key: txd.id, title: txd.txName || txd.description }, statusSummary, mgr?.pending?.activity))));
}

function ShowFailedActivity({
  failed,
  failure: { message, code, data, ...otherFailInfo } = {},
  ...results
} = {}) {
  if (Object.keys(otherFailInfo).length === 0) {
    otherFailInfo = void 0;
  }
  if (!failed || !message) {
    return /* @__PURE__ */ React.createElement("code", null, /* @__PURE__ */ React.createElement("pre", null, failed && /* @__PURE__ */ React.createElement(React.Fragment, null, "failed: ", failed, /* @__PURE__ */ React.createElement("br", null)), message && /* @__PURE__ */ React.createElement(React.Fragment, null, "message: ", message, /* @__PURE__ */ React.createElement("br", null)), JSON.stringify({ otherFailInfo, ...results }, null, 2), /* @__PURE__ */ React.createElement("br", null)));
  }
  const moreDetail = Array.isArray(data) && !!data[0].validator ? /* @__PURE__ */ React.createElement("div", null, data.map(({ validator, error, ...others }) => {
    const { index, purpose } = validator;
    const {
      code: errorCode,
      message: errorMessage,
      data: { validationError, traces = [], ...otherData } = {}
    } = error;
    return /* @__PURE__ */ React.createElement("div", { key: index }, /* @__PURE__ */ React.createElement("h4", null, "Validator ", index, " (", purpose, "): ", errorMessage, /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(others, null, 2))), /* @__PURE__ */ React.createElement("hr", null), /* @__PURE__ */ React.createElement("div", { className: "ml-8 bl-2 b-slate bl-2" }, /* @__PURE__ */ React.createElement("code", null, /* @__PURE__ */ React.createElement("pre", null, traces.join("\n"))), /* @__PURE__ */ React.createElement("hr", null), /* @__PURE__ */ React.createElement("pre", null, "otherData: ", JSON.stringify(otherData, null, 2))));
  })) : /* @__PURE__ */ React.createElement("code", null, /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(data, null, 2)));
  return /* @__PURE__ */ React.createElement("div", null, "Activity failed: ", failed, " ", /* @__PURE__ */ React.createElement("br", null), "Message: ", message, " ", /* @__PURE__ */ React.createElement("br", null), moreDetail);
}

export { ActionButton, Button, CapoDAppProvider, CapoDappProviderContext, CharterHighlights, CharterStatus, ClientSideOnly, Column, DashHighlightItem, DashSummaryItem, DashboardHighlights, DashboardRow, DashboardSummary, DashboardTemplate, Highlight, InPortal, Lowlight, Progress, ShowFailedActivity, ShowPendingTxns, Softlight, TxBatchViewer, useCapoDappProvider };
//# sourceMappingURL=ui.mjs.map
