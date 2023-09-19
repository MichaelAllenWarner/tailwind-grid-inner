import plugin from 'tailwindcss/plugin';
import * as specificity from 'specificity';
import { Specificity } from 'specificity/dist/types/types';

const BORDER_CUSTOM_VAR = '--tw-grid-inner-border-custom';
const BORDER_VAR = '--tw-grid-inner-border';

class Selector {
  selector: string;
  specificity: Specificity;

  constructor(selector: string) {
    this.selector = selector;
    this.specificity = specificity.calculate(selector);
  }
}

/** Abstracted out b/c also used to bump specificity in "legacy" mode */
const allItemsSelector = ':nth-child(n)';

/** Generates the selectors that need to have their specificity equalized. */
const getRawSelectors = (cols: `${number}`) => {
  const lastColsWorthOfItems = `:nth-last-child(-n + ${cols})` as const;

  const allItems = new Selector(allItemsSelector);
  const firstCol = new Selector(`:nth-child(${cols}n + 1)`);
  // leave no space around '+' (so that string differs from `firstCol`-string when `cols` is 1)
  const lastCol = new Selector(`:nth-child(${cols}n+${cols})`);
  const firstRow = new Selector(`:nth-child(-n + ${cols})`);
  const firstInLastRow = new Selector(
    `${firstCol.selector}${lastColsWorthOfItems}`,
  );
  const othersInLastRow = new Selector(`${firstInLastRow.selector} ~ *`);
  const lastIfNotLastCol = new Selector(`:last-child:not(${lastCol.selector})`);
  const penultimateRowOverhangs = new Selector(
    `${lastColsWorthOfItems}:not(${firstInLastRow.selector}):not(${othersInLastRow.selector})`,
  );
  const penultimateRowOverhangLastCol = new Selector(
    `${penultimateRowOverhangs.selector}${lastCol.selector}`,
  );

  return {
    allItems,
    firstCol,
    lastCol,
    firstRow,
    firstInLastRow,
    othersInLastRow,
    lastIfNotLastCol,
    penultimateRowOverhangs,
    penultimateRowOverhangLastCol,
  };
};

/** Calculate just once up front, since value will never change. */
const maxSpecificity = Object.values(getRawSelectors('1'))
  .map((selector) => selector.specificity)
  .sort(specificity.compareDesc)[0].B;

export = plugin.withOptions(
  ({ target = 'modern' }: { target?: 'modern' | 'legacy' } = {}) => {
    /** Needed to make responsive variants and `none` value work correctly. */
    const toEqualizedSpecificity =
      target === 'legacy'
        ? (selector: Selector) =>
            `${allItemsSelector.repeat(
              maxSpecificity - selector.specificity.B,
            )}${selector.selector}`
        : (selector: Selector) => `:where(${selector.selector})`;

    const getEqualizedSelectors = (cols: `${number}`) => {
      const selectors = getRawSelectors(cols);
      return Object.fromEntries(
        Object.entries(selectors).map(([key, selector]) => [
          key,
          toEqualizedSpecificity(selector),
        ]),
      ) as { [K in keyof typeof selectors]: string };
    };

    return ({ matchUtilities }) => {
      matchUtilities(
        {
          'grid-inner': (value: string) => {
            const [rawCols, rawCustomBorderWidth] = value.split(',');

            const customBorderWidth =
              rawCustomBorderWidth && parseInt(rawCustomBorderWidth);

            const colsNum = parseInt(rawCols) || 1;
            const cols = `${colsNum}` as const;

            const equalizedSelectors = getEqualizedSelectors(cols);

            if (value === 'none') {
              return {
                marginLeft: '0px',
                marginRight: '0px',

                [`& > ${equalizedSelectors.allItems}`]: {
                  margin: '0px',
                  borderWidth: '0px',
                  borderColor: 'currentcolor',
                  borderStyle: 'solid',
                  gridColumn: 'auto',
                  position: 'static',
                  '&::after': {
                    display: 'none',
                  },
                },
              };
            }

            return {
              ...(customBorderWidth
                ? {
                    [BORDER_CUSTOM_VAR]: `${Math.abs(
                      2 * Math.round(customBorderWidth / 2),
                    )}px`,
                  }
                : {}),
              [BORDER_VAR]: `var(${BORDER_CUSTOM_VAR}, 2px)`,
              display: 'grid',
              gap: '0px',
              gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
              marginLeft: `calc(var(${BORDER_VAR})/-2)`,
              marginRight: `calc(var(${BORDER_VAR})/-2)`,

              [`& > ${equalizedSelectors.allItems}`]: {
                margin: '0px',
                borderWidth: `calc(var(${BORDER_VAR}) / 2)`,
                borderColor: 'inherit',
                borderStyle: 'inherit',
                gridColumn: 'span 1 / span 1',
                position: 'static',
                '&::after': {
                  display: 'none',
                },
              },

              [`& > ${equalizedSelectors.firstRow}`]: {
                borderTopWidth: '0px',
              },

              [`& > ${equalizedSelectors.firstInLastRow}`]: {
                borderBottomWidth: '0px',
              },
              [`& > ${equalizedSelectors.othersInLastRow}`]: {
                borderBottomWidth: '0px',
              },

              [`& > ${equalizedSelectors.firstCol}`]: {
                borderLeftWidth: '0px',
                marginLeft: `calc(var(${BORDER_VAR})/2)`,
              },

              [`& > ${equalizedSelectors.lastCol}`]: {
                borderRightWidth: '0px',
                marginRight: `calc(var(${BORDER_VAR})/2)`,
              },

              [`& > ${equalizedSelectors.lastIfNotLastCol}`]: {
                position: 'relative',
                '&::after': {
                  content: "''",
                  borderLeftWidth: `calc(var(${BORDER_VAR}) / 2)`,
                  borderLeftStyle: 'inherit',
                  borderLeftColor: 'inherit',
                  display: 'block',
                  position: 'absolute',
                  left: `calc(100% + var(${BORDER_VAR}) / 2)`,
                  top: `calc(var(${BORDER_VAR}) / -2)`,
                  bottom: '0',
                },
              },

              [`& > ${equalizedSelectors.penultimateRowOverhangs}`]: {
                position: 'relative',

                '&::after': {
                  content: "''",
                  borderTopWidth: `calc(var(${BORDER_VAR}) / 2)`,
                  borderTopStyle: 'inherit',
                  borderTopColor: 'inherit',
                  display: 'block',
                  position: 'absolute',
                  left: `calc(var(${BORDER_VAR}) / -2)`,
                  right: `calc(var(${BORDER_VAR}) / -2)`,
                  top: `calc(100% + var(${BORDER_VAR}) / 2)`,
                },
              },

              [`& > ${equalizedSelectors.penultimateRowOverhangLastCol}`]: {
                '&::after': {
                  right: '0',
                },
              },
            };
          },
        },
        {
          // these are the defaults that come with w/ TW's `gridTemplateColumns` plugin
          values: Object.fromEntries([
            ...Array.from({ length: 12 }, (_, i) => [i + 1, String(i + 1)]),
            ['none', 'none'],
          ]),
        },
      );
    };
  },
);
