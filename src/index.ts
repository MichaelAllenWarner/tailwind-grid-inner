import plugin from 'tailwindcss/plugin';

// TODO: make a 1px-border version?

/*
  Note: would be nice to do an `addComponent()` for a base `grid-inner` class,
  which would apply styles that make use of CSS variables (with default values),
  and then use the `matchUtilities()` function to make the `grid-inner-${n}`
  classes simply update the variable values. However, this doesn't work because
  we need the column-count to be used inside the pseudo-classes like `:nth-child()`,
  and CSS variables don't work in selectors. We COULD still do `addComponent()`
  for some of the other base styles, but if we can't go all the way with it then
  it seems better to just do it all in `matchUtilities()`, for the sake of simplicity.
*/

const BORDER_CUSTOM_VAR = '--tw-grid-inner-border-custom';
const BORDER_VAR = '--tw-grid-inner-border';

/**
 * specificity: 1
 *
 * targets every item in the grid, and used in 'legacy' mode to bump specificity
 */
const allItems = ':nth-child(n)';

export default plugin.withOptions(
  ({ target = 'modern' }: { target?: 'modern' | 'legacy' } = {}) => {
    /**
     * If `target` is set to `'modern'` (default value), returns `selector`
     * wrapped in `:where()`.
     *
     * Else (`target` is `'legacy'`), returns `selector` appended with
     * `num` `':nth-child(n)'` pseudo-classes, which simply boosts the
     * class-specificity of `selector` by `num`.
     *
     * The point is to equalize the specificity of all the rules that
     * use tree-structural pseudo-classes (like `:nth-child()`), so
     * that responsive variants like `md:grid-inner-3` work correctly.
     *
     * In more detail, the problem is this:
     *
     * - On the one hand, we always need to apply special styles to
     * edge-case items (e.g., the items in the last row), and doing this
     * requires selectors of varying specificities, some quite high.
     *
     * - On the other hand, when the styles for a responsive variant are
     * applied, what was previously an edge-case item of some kind (say,
     * an item in the first column) may now be an edge-case item of
     * a different kind (an item in the last column, maybe), or not an
     * edge-case item at all. We therefore need to be able to override
     * every kind of edge-case style from the previous breakpoint with
     * any styles that are needed for the current breakpoint.
     *
     * The solution is to make all the item-rules have the same specificity.
     * Then within a given `grid-inner` ruleset, rule-ordering alone
     * determines rule-precedence.
     */
    const useWhereOrIncreaseSpecificity = (selector: string, num: number) =>
      target === 'legacy'
        ? selector + allItems.repeat(num)
        : `:where(${selector})`;

    return ({ matchUtilities }) => {
      matchUtilities(
        {
          'grid-inner': (value: string) => {
            /*
              If supplied value is `'none'`, we do what we can to "cancel" the margin and
              border stuff that "previous" `grid-inner` rulesets will have included:

              - for WRAPPER, set horizontal-margins to 0px (to override the negative x-margins)
                - (note: plain mx- classes on wrapper will lose specificity-battle here)
              - for ITEMS, set margin to 0px, border-width to 0px, border-color to currentcolor,
                border-style to solid, and remove the `::after` pseudo-element
                - (note: relevant TW classes will lose specificity-battle here, too)

              We do NOT change the `display` or `gridTemplateColumns` properties
              of the wrapper. So it'll still have `display: 'grid'` and however many columns
              were specified at the previous breakpoint. But either of these properties can
              be changed with a simple TW class on the wrapper.
            */
            if (value === 'none') {
              return {
                marginLeft: '0px',
                marginRight: '0px',

                [`& > ${useWhereOrIncreaseSpecificity(allItems, 4)}`]: {
                  margin: '0px',
                  borderWidth: '0px',
                  borderColor: 'currentcolor',
                  borderStyle: 'solid',
                  gridColumn: 'auto',
                  '&::after': {
                    display: 'none',
                  },
                },
              };
            }

            const [rawCols, rawCustomBorderWidth] = value.split(',');

            const customBorderWidth =
              rawCustomBorderWidth && parseInt(rawCustomBorderWidth);

            const colsNum = parseInt(rawCols) || 1;
            const cols = String(colsNum);

            /**
             * specificity: 1
             *
             * "utility" to target the last `cols`-worth of items in the grid
             */
            const lastXInGrid = `:nth-last-child(-n + ${cols})` as const;

            /** specificity: 1 */
            const firstCol = `:nth-child(${cols}n + 1)` as const;
            /**
             * specificity: 1
             *
             * lack of space around '+' is intentional (ensures this string differs
             * from `firstCol` string when `cols === 1`, to prevent duplicate keys
             * in the returned CSS-in-JS object)
             */
            const lastCol = `:nth-child(${cols}n+${cols})` as const;
            /** specificity: 1 */
            const firstRow = `:nth-child(-n + ${cols})` as const;
            /** specificity: 2 */
            const firstInLastRow = `${firstCol}${lastXInGrid}` as const;
            /** specificity: 2 */
            const othersInLastRow = `${firstInLastRow} ~ *` as const;

            /** specificity: 2 */
            const lastIfNotLastCol = `:last-child:not(${lastCol})` as const;
            /** specificity: 5 */
            const penultimateRowOverhangs =
              `${lastXInGrid}:not(${firstInLastRow}):not(${othersInLastRow})` as const;

            /** specificity: 6 */
            const penultimateRowOverhangLastCol =
              `${penultimateRowOverhangs}${lastCol}` as const;

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

              // For all items: apply 1/2-width borders, inherit border-color, and zero margins.
              [`& > ${useWhereOrIncreaseSpecificity(allItems, 5)}`]: {
                margin: '0px',
                borderWidth: `calc(var(${BORDER_VAR}) / 2)`,
                borderColor: 'inherit',
                borderStyle: 'inherit',
                gridColumn: 'span 1 / span 1',
                '&::after': {
                  display: 'none',
                },
              },

              // Remove top-borders from first row.
              [`& > ${useWhereOrIncreaseSpecificity(firstRow, 5)}`]: {
                borderTopWidth: '0px',
              },

              // Remove bottom-border from first item in last row...
              [`& > ${useWhereOrIncreaseSpecificity(firstInLastRow, 4)}`]: {
                borderBottomWidth: '0px',
              },
              // ...and then also from the rest of the last row.
              [`& > ${useWhereOrIncreaseSpecificity(othersInLastRow, 4)}`]: {
                borderBottomWidth: '0px',
              },

              // Remove left-borders from first column.
              [`& > ${useWhereOrIncreaseSpecificity(firstCol, 5)}`]: {
                borderLeftWidth: '0px',
                marginLeft: `calc(var(${BORDER_VAR})/2)`,
              },

              // Remove right-borders from last column.
              [`& > ${useWhereOrIncreaseSpecificity(lastCol, 5)}`]: {
                borderRightWidth: '0px',
                marginRight: `calc(var(${BORDER_VAR})/2)`,
              },

              /*
                For last-child (if not in last column), use an `::after`
                pseudo-element to "double" the right-border.
              */
              [`& > ${useWhereOrIncreaseSpecificity(lastIfNotLastCol, 4)}`]: {
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

              /*
                For items in second-to-last row with no item directly below,
                use an `::after` pseudo-element to "double" the bottom-border.
              */
              [`& > ${useWhereOrIncreaseSpecificity(
                penultimateRowOverhangs,
                1,
              )}`]: {
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

              /*
                For LAST in second-to-last row with no item directly below,
                correct the `right` value of the `::after` pseudo-element
              */
              [`& > ${useWhereOrIncreaseSpecificity(
                penultimateRowOverhangLastCol,
                0,
              )}`]: {
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
