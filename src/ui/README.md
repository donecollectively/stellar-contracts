## Tailwind Notes

When importing the UI support components from "@stellar-contracts/ui" to your project,
the components include tailwind-targeted element class= attributes ("className", in React).

For tailwind integration, add these lines to your `src/styles/global.css`:

```
@source "../../node_modules/@donecollectively/stellar-contracts/dist/ui.mjs";
@source "../../node_modules/stellar-tokenomics/dist/*.mjs";
```

This will instruct tailwind to locate the styling instructions from those modules.

### Theme variables

When importing the UI support components from "@stellar-contracts/ui" to a 
project with Tailwind styling, the components provide theme-matched elements,
provided you have appropriately set the following details in your `tailwind.css` file:


```
    --color-background: hsl(217 33% 17%);
    --color-foreground: hsl(210 40% 80%);
    --color-primary: hsl(217 91% 60%);
    --color-primary-foreground: hsl(210 40% 98%);
    --color-secondary: hsl(217 10% 64%);
    --color-secondary-foreground: hsl(217 33% 17%);
    --color-accent:  hsl(37, 83%, 47%);
    --color-card: hsl(217 40% 22%);
    --color-card-foreground: hsl(210 40% 98%);
    --color-border: hsl(217 60% 66%;)
    --color-ring: hsl(224 76% 65%);
```
Of course, you can choose to adjust the theme colors in a way suitable for your needs.

> NOTE: If you use an older version of tailwind, or upgraded from one, that uses different conventions, where `className="text-(--color-accent)"` is built from raw theme value `--accent-foreground` (and similarly for other attributes in the list), you may need to ugrade tailwind, or make adjustments so that your --color attributes follow these values and are hsl colors (not "217 40% 22" or "hsl(hsl(217 40% 22))")

