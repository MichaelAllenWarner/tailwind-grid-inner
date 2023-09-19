# tailwind-grid-inner

This Tailwind plugin is for creating CSS grids with "inner" borders only, meaning that each item in the grid gets a border on every side that doesn't touch one of the four sides of the grid-container. If that's confusing, think of a tic-tac-toe board. The plugin results in grid-items of equal width (border-exclusive), and it supports "unbalanced" grids (where there aren't enough items to fill the last row).

- [tailwind-grid-inner](#tailwind-grid-inner)
  - [Installation](#installation)
  - [Requirements](#requirements)
  - [Usage](#usage)
    - [Important Notes (Read This!)](#important-notes-read-this)
    - [The `none` value](#the-none-value)

## Installation

First install the plugin from npm:

```bash
npm install @michaelallenwarner/tailwind-grid-inner
```

Then add it to your `tailwind.config.js` file. By default, this plugin uses the `:where()` pseudo-class, which [isn't supported](https://caniuse.com/mdn-css_selectors_where) in Safari 13 and some other older browsers. If that's fine for your use-case, then just do:

```js
// tailwind.config.js
module.exports = {
  theme: {
    // ...
  },
  plugins: [
    require('@michaelallenwarner/tailwind-grid-inner'),
    // ...
  ],
}
```

But if you have to support browsers that don't support `:where()`, then you can pass the plugin a `{ target: 'legacy' }` object like this:

```js
// tailwind.config.js
module.exports = {
  theme: {
    // ...
  },
  plugins: [
    require('@michaelallenwarner/tailwind-grid-inner')({ target: 'legacy' }),
    // ...
  ],
}
```

(The `target: 'legacy'` option works just as well, but it generates more CSS and makes use of some selectors that have higher specificity.)

## Requirements

- Tailwind 2.2.0 or higher (but only with [JIT-mode enabled](https://v2.tailwindcss.com/docs/just-in-time-mode#enabling-jit-mode) if using Tailwind 2)

## Usage

Use the `` `grid-inner-${n}` `` utilities to create inner-border-only grids with `n` equally sized columns. Supported values for `n` are the numbers 1–12, but you can also supply arbitrary values like `grid-inner-[n]` or `grid-inner-[n,m]`, where `n` is still the number of columns and where `m` is the desired border-width in pixels. Finally, there's `grid-inner-none`, which is for "canceling" the inner-grid layout altogether and is meant to be used with responsive variants (more on this [below](#the-none-value)).

```html
<div class="overflow-hidden"><!-- (if overflow is a problem; see notes below) -->
  <!-- grid-wrapper --> 
  <div class="grid-inner-1 sm:grid-inner-[2,4] md:grid-inner-3 lg:grid-inner-none border-red-500 border-solid">
    <!-- grid-items -->
    <div></div>
    <div></div>
    <div></div>
    <!-- etc. -->
  </div>
</div>
```

### Important Notes (Read This!)

- The grid-wrapper gets a bit of negative horizontal `margin`. This should never result in _visible_ overflow, but in rare cases it may result in scrollbars. To guard against this (or to fix it when it happens), you can just put the grid-wrapper in a `<div>` that has `overflow: hidden`, as in the example above.
- To control space around the grid-wrapper, do so on a separate outer wrapping `<div>`.
- To space the grid-items, give them (or elements in them) `padding`.
- Don't:
  - set `gap` on the grid-wrapper;
  - set `margin` or `border-width` on either the grid-wrapper or the grid-items;
  - set `grid-column` on the grid-items (the Tailwind `col-span-` utilities);
  - set `position` on the grid-items;
  - create `::after` pseudo-elements on the grid-items.
- To control the color and style of the borders, put your `border-color` and `border-style` utility classes on the grid-wrapper rather than on its grid-item children. (The plugin gives the grid-items `border-color: inherit` and `border-style: inherit`.)
- The border-width `m` you supply with `grid-inner-[n,m]` syntax should be an even integer. If it isn't then it will be rounded up to one before it's used. The reason for this has to do with how the borders are applied. Because there's no border-collapse mechanism for CSS Grid, each grid-item's border will actually be _half_ the width of the configured value, so that when two borders meet the result will _look like_ a border of the correct width. Since 1/2-pixel values don't render reliably across devices, the plugin enforces integer-pixel values for these "half"-borders. The default and minimum-allowed value of `m` is 2.
- Because each border is technically two separate "half"-borders that touch, some border-styles might not look how you'd expect them to, and this will be more noticeable with thicker borders. For this reason, I recommend sticking with solid borders, but feel free to experiment!

### The `none` value

Since this plugin relies on some gnarly CSS under the hood (including some negative margins, pseudo-elements, and lots of `:nth-child()`/`:nth-last-child()` pseudo-classes), it comes with a `grid-inner-none` utility that "cancels" some of that CSS, in case you have to switch to another kind of layout at some breakpoint. Here is what it does:

- On the grid-container, it sets `marginLeft: 0px` and `marginRight: 0px`. If you have need to override these margins, you'll find that a simple Tailwind class won't suffice, and you may need to bump the specificity (e.g., `lg:grid-inner-none lg:mx-4` won't work, but `lg:grid-inner-none lg:!mx-4` will).
- On the grid-items, it sets `margin: 0px`, `border-width: 0px`, `border-color: currentcolor`, `border-style: solid`, `grid-column: auto`, and `position: static`. Here too you'll find that simple Tailwind classes on the grid-items will lack the specificity to override these properties, and you may need to bump the specificity (like `lg:!m-4`).
- It sets the `::after` pseudo-element on the grid-items to `display: none`, and the same specificity-bump caveat applies here. What's more: if you try to _use_ the `::after` pseudo-element on a grid-item (at a breakpoint where `grid-inner-none` is in effect), you'll sometimes find that some CSS properties are already set on it, and that overriding them requires more specificity-bumps. So if the need arises, reach for `::before` instead.

Note that the grid-container will still have `display: grid`, `gap: 0px`, and whatever `grid-template-columns` value is currently active. But _these_ properties can be overridden with simple Tailwind classes (like `lg:grid-inner-none lg:block` or `lg:grid-inner-none lg:grid-cols-4 lg:gap-4`).

Finally, note that the specificity required to override the `grid-inner-none` styles on the grid-items will depend on whether you've configured the plugin with the `target: 'legacy'` option.
