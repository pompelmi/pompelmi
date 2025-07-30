window.relearn = window.relearn || {};

// we need to load this script in the html head to avoid flickering
// on page load if the user has selected a non default variant

function ready(fn) {
  if (document.readyState == 'complete') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

var variants = {
  variants: window.relearn.themevariants,
  customvariantname: window.relearn.customvariantname,
  isstylesheetloaded: true,

  setup: function () {
    this.addCustomVariantStyles();

    var customvariantstylesheet = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariantstylesheet');
    var customvariant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
    if (!customvariantstylesheet || !customvariant) {
      customvariantstylesheet = '';
      window.relearn.removeItem(window.localStorage, window.relearn.absBaseUri + '/customvariantstylesheet');
      customvariant = '';
      window.relearn.removeItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
    } else if (customvariant && !window.relearn.themevariants.includes(customvariant)) {
      // this can only happen on initial load, if a previously selected variant is not available anymore
      customvariant = window.relearn.themevariants[0];
      window.relearn.setItem( window.localStorage, window.relearn.absBaseUri + '/customvariant', customvariant);
    }
    this.updateCustomVariantStyles(customvariantstylesheet);

    this.init();
    ready(this.init.bind(this));
  },

  init: function (variant, old_path) {
    this.addCustomVariantOption();
    window.relearn.markVariant();
    window.relearn.changeVariant(window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/variant'));
  },

  addCustomVariantOption: function () {
    var customvariant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
    if (!customvariant ) {
      return;
    }
    document.querySelectorAll('.R-variantswitcher select').forEach((select) => {
      var option = select.options[`R-select-variant-${this.customvariantname}`];
      if (!option) {
        option = document.createElement('option');
        option.id = `R-select-variant-${this.customvariantname}`;
        option.value = this.customvariantname;
        option.text = this.customvariantname.replace(/-/g, ' ').replace(/\w\S*/g, function (w) {
          return w.replace(/^\w/g, function (c) {
            return c.toUpperCase();
          });
        });
        select.appendChild(option);
      }
    });
  },

  removeCustomVariantOption: function () {
    document.querySelectorAll(`.R-variantswitcher option[value="${this.customvariantname}"]`).forEach((option) => {
      option.remove();
    });
  },

  addCustomVariantStyles: function () {
    var head = document.querySelector('head');
    var style = document.createElement('style');
    style.id = 'R-variant-styles-' + this.customvariantname;
    head.appendChild(style);
  },

  updateCustomVariantStyles: function (stylesheet) {
    stylesheet = ":root:not([data-r-output-format='print'])[data-r-theme-variant='" + this.customvariantname + "']  {" + '\n&' + stylesheet + '\n}';
    var style = document.querySelector('#R-variant-styles-' + this.customvariantname);
    if (style) {
      style.textContent = stylesheet;
    }
  },

  saveCustomVariant: function () {
    var variant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/variant');
    if (variant != this.customvariantname) {
      window.relearn.setItem( window.localStorage, window.relearn.absBaseUri + '/customvariant', variant);
    }
    var stylesheet = this.generateStylesheet(this.customvariantname);
    window.relearn.setItem( window.localStorage, window.relearn.absBaseUri + '/variant', this.customvariantname);
    window.relearn.setItem( window.localStorage, window.relearn.absBaseUri + '/customvariantstylesheet', stylesheet);
    this.updateCustomVariantStyles(stylesheet);

    this.addCustomVariantOption();
    window.relearn.markVariant();
    window.relearn.changeVariant(this.customvariantname);
  },

  normalizeColor: function (c) {
    if (!c || !c.trim) {
      return c;
    }
    c = c.trim();
    c = c.replace(/\s*\(\s*/g, '( ');
    c = c.replace(/\s*\)\s*/g, ' )');
    c = c.replace(/\s*,\s*/g, ', ');
    c = c.replace(/0*\./g, '.');
    c = c.replace(/ +/g, ' ');
    return c;
  },

  getColorValue: function (c) {
    return this.normalizeColor(getComputedStyle(document.documentElement).getPropertyValue('--INTERNAL-' + c));
  },

  getColorProperty: function (c, read_style) {
    var e = this.findColor(c);
    var p = this.normalizeColor(read_style.getPropertyValue('--' + c)).replace('--INTERNAL-', '--');
    return p;
  },

  findRootRule: function (rules, parentSelectors) {
    for (let rule of rules ?? []) {
      if ((rule.conditionText && rule.conditionText != 'screen') || (rule.selectorText && !rule.selectorText.startsWith(':root:not'))) {
        return null;
      }
      if (parentSelectors.some((selector) => rule.selectorText === selector)) {
        // Search nested rules for &:root
        for (let nestedRule of rule.cssRules ?? []) {
          if (nestedRule.selectorText === '&:root') {
            return nestedRule.style;
          }
        }
        return null;
      }
      let result = this.findRootRule(rule.cssRules, parentSelectors);
      if (result) {
        return result;
      }
    }
    return null;
  },

  findLoadedStylesheet: function (id, parentSelectors) {
    for (let sheet of document.styleSheets) {
      if (sheet.ownerNode.id === id) {
        return this.findRootRule(sheet.cssRules, parentSelectors);
      }
    }
    return null;
  },

  findColor: function (name) {
    var f = this.variantvariables.find(function (x) {
      return x.name == name;
    });
    return f;
  },

  generateColorVariable: function (e, read_style) {
    var v = '';
    var gen = this.getColorProperty(e.name, read_style);
    if (gen) {
      v += '  --' + e.name + ': ' + gen + '; /* ' + e.tooltip + ' */\n';
    }
    return v;
  },

  // ------------------------------------------------------------------------
  // CSS download
  // ------------------------------------------------------------------------

  generateStylesheet: function (variant) {
    var style = null;
    if (variant != this.customvariantname) {
      style = this.findLoadedStylesheet('R-format-style', [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + variant + '"]']);
      if (!style) {
        alert('There is nothing to be generated as auto mode variants will be generated by Hugo');
        return;
      }
    } else {
      style = this.findLoadedStylesheet('R-variant-styles-' + variant, [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + variant + '"]']);
      if (!style) {
        var customvariantbase = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
        style = this.findLoadedStylesheet('R-format-style', [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + customvariantbase + '"]']);
        if (!style) {
          alert('There is nothing to be generated as auto mode variants will be generated by Hugo');
          return;
        }
      }
    }

    var style =
      ':root {\n' +
      '  /* ' +
      variant +
      ' */\n' +
      this.variantvariables.reduce(
        function (a, e) {
          return a + this.generateColorVariable(e, style);
        }.bind(this),
        ''
      ) +
      '}\n';
    return style;
  },

  download: function (data, mimetype, filename) {
    var blob = new Blob([data], { type: mimetype });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
  },

  // ------------------------------------------------------------------------
  // external API
  // ------------------------------------------------------------------------

  changeColor: function (c) {
    var variant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/variant');
    var customvariantbase = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');

    if (customvariantbase && this.customvariantname != variant) {
      alert('You already have changes based on the "' + customvariantbase + '" variant. Please proceed editing the custom variant, reset your changes or ignore this message.');
      return;
    }
    customvariantbase = customvariantbase ?? variant;

    var base_style = this.findLoadedStylesheet('R-format-style', [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + customvariantbase + '"]']);
    if (!base_style) {
      alert('An auto mode variant can not be changed. Please select its light/dark variant directly to make changes');
      return;
    }

    var custom_style = this.findLoadedStylesheet('R-variant-styles-' + this.customvariantname, [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + this.customvariantname + '"]']);
    if (!custom_style) {
      this.saveCustomVariant();
      custom_style = this.findLoadedStylesheet('R-variant-styles-' + this.customvariantname, [':root:not([data-r-output-format="print"])[data-r-theme-variant="' + this.customvariantname + '"]']);
    }

    var e = this.findColor(c);
    var v = this.getColorProperty(c, custom_style);
    var t = c + '\n\n' + e.tooltip + '\n';
    if (e.fallback) {
      t += '\nInherits value "' + this.getColorValue(e.fallback) + '" from ' + e.fallback + ' if not set\n';
    } else if (e.default) {
      t += '\nDefaults to value "' + this.normalizeColor(e.default) + '" if not set\n';
    }
    var n = prompt(t, v);
    if (n === null) {
      // user canceld operation
      return;
    }

    if (n) {
      // value set to specific value
      n = this.normalizeColor(n).replace('--INTERNAL-', '--').replace('--', '--INTERNAL-');
      if (n != v) {
        custom_style.setProperty('--' + c, n);
      }
    } else {
      // value emptied, so delete it
      custom_style.removeProperty('--' + c);
    }

    this.saveCustomVariant();
  },

  resetVariant: function () {
    var customvariant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
    if (customvariant && confirm('You have made changes to your custom variant. Are you sure you want to reset all changes?')) {
      var variant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/variant');
      if (variant != this.customvariantname) {
        customvariant = variant;
      }
      window.relearn.removeItem(window.localStorage, window.relearn.absBaseUri + '/customvariant');
      window.relearn.removeItem(window.localStorage, window.relearn.absBaseUri + '/customvariantstylesheet');
      window.relearn.setItem( window.localStorage, window.relearn.absBaseUri + '/variant', customvariant);
      this.updateCustomVariantStyles('');

      this.removeCustomVariantOption();
      window.relearn.markVariant();
      window.relearn.changeVariant(customvariant);
    }
  },

  getStylesheet: function () {
    var variant = window.relearn.getItem(window.localStorage, window.relearn.absBaseUri + '/variant');
    var style = this.generateStylesheet(variant);
    if (style) {
      console.log(style);
      this.download(style, 'text/css', 'theme-' + variant + '.css');
    }
  },

  generator: function (vargenerator) {
    var graphDefinition = this.generateGraph();
    var graphs = document.querySelectorAll(vargenerator);
    graphs.forEach(function (e) {
      e.innerHTML = graphDefinition;
    });

    var interval_id = setInterval(
      function () {
        if (document.querySelectorAll(vargenerator + ' .mermaid > svg').length) {
          clearInterval(interval_id);
          this.styleGraph();
        }
      }.bind(this),
      25
    );
  },

  // ------------------------------------------------------------------------
  // Mermaid graph stuff
  // ------------------------------------------------------------------------

  adjustCSSRules: function (selector, props, sheets) {
    // get stylesheet(s)
    if (!sheets) sheets = [...document.styleSheets];
    else if (sheets.sup) {
      // sheets is a string
      let absoluteURL = new URL(sheets, document.baseURI).href;
      sheets = [...document.styleSheets].filter((i) => i.href == absoluteURL);
    } else sheets = [sheets]; // sheets is a stylesheet

    // CSS (& HTML) reduce spaces in selector to one.
    selector = selector.replace(/\s+/g, ' ');
    const findRule = (s) => [...s.cssRules].reverse().find((i) => i.selectorText == selector);
    let rule = sheets
      .map(findRule)
      .filter((i) => i)
      .pop();

    const propsArr = props.sup
      ? props.split(/\s*;\s*/).map((i) => i.split(/\s*:\s*/)) // from string
      : Object.entries(props); // from Object

    if (rule)
      for (let [prop, val] of propsArr) {
        // rule.style[prop] = val; is against the spec, and does not support !important.
        rule.style.setProperty(prop, ...val.split(/ *!(?=important)/));
      }
    else {
      sheet = sheets.pop();
      if (!props.sup) props = propsArr.reduce((str, [k, v]) => `${str}; ${k}: ${v}`, '');
      sheet.insertRule(`${selector} { ${props} }`, sheet.cssRules.length);
    }
  },

  styleGraphGroup: function (selector, colorvar) {
    this.adjustCSSRules('#R-body svg ' + selector + ' > rect', 'color: var(--INTERNAL-' + colorvar + '); fill: var(--INTERNAL-' + colorvar + '); stroke: #80808080;');
    this.adjustCSSRules('#R-body svg ' + selector + ' > .label .nodeLabel', 'color: var(--INTERNAL-' + colorvar + '); fill: var(--INTERNAL-' + colorvar + '); stroke: #80808080;');
    this.adjustCSSRules('#R-body svg ' + selector + ' > .cluster-label .nodeLabel', 'color: var(--INTERNAL-' + colorvar + '); fill: var(--INTERNAL-' + colorvar + '); stroke: #80808080;');
    this.adjustCSSRules('#R-body svg ' + selector + ' .nodeLabel', 'filter: grayscale(1) invert(1) contrast(10000);');
  },

  styleGraph: function () {
    this.variantvariables.forEach(
      function (e) {
        this.styleGraphGroup('.' + e.name, e.name);
      }.bind(this)
    );
    this.styleGraphGroup('#maincontent', 'MAIN-BG-color');
    this.styleGraphGroup('#mainheadings', 'MAIN-BG-color');
    this.styleGraphGroup('#code', 'CODE-BLOCK-BG-color');
    this.styleGraphGroup('#inlinecode', 'CODE-INLINE-BG-color');
    this.styleGraphGroup('#blockcode', 'CODE-BLOCK-BG-color');
    this.styleGraphGroup('#thirdparty', 'MAIN-BG-color');
    this.styleGraphGroup('#coloredboxes', 'BOX-BG-color');
    this.styleGraphGroup('#menu', 'MENU-SECTIONS-BG-color');
    this.styleGraphGroup('#menuheader', 'MENU-HEADER-BG-color');
    this.styleGraphGroup('#menuhome', 'MENU-HEADER-BORDER-color');
    this.styleGraphGroup('#menusections', 'MENU-SECTIONS-ACTIVE-BG-color');
  },

  generateGraphGroupedEdge: function (e) {
    var edge = '';
    if (e.fallback && e.group == this.findColor(e.fallback).group) {
      edge += e.fallback + ':::' + e.fallback + ' --> ' + e.name + ':::' + e.name;
    } else {
      edge += e.name + ':::' + e.name;
    }
    return edge;
  },

  generateGraphVarGroupedEdge: function (e) {
    var edge = '';
    if (e.fallback && e.group != this.findColor(e.fallback).group) {
      edge += '  ' + e.fallback + ':::' + e.fallback + ' --> ' + e.name + ':::' + e.name + '\n';
    }
    return edge;
  },

  generateGraph: function () {
    var g_groups = {};
    var g_handler = '';

    this.variantvariables.forEach(function (e) {
      var group = e.group || ' ';
      g_groups[group] = (g_groups[group] || []).concat(e);
      g_handler += '  click ' + e.name + ' variants.changeColor\n';
    });

    var graph =
      'flowchart LR\n' +
      '  subgraph menu["menu"]\n' +
      '    direction TB\n' +
      '    subgraph menuheader["header"]\n' +
      '      direction LR\n' +
      g_groups['header'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '    subgraph menuhome["home"]\n' +
      '      direction LR\n' +
      g_groups['home'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '    subgraph menusections["sections"]\n' +
      '      direction LR\n' +
      g_groups['sections'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '  end\n' +
      '  subgraph maincontent["content"]\n' +
      '    direction TB\n' +
      g_groups['content'].reduce(
        function (a, e) {
          return a + '    ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    subgraph mainheadings["headings"]\n' +
      '      direction LR\n' +
      g_groups['headings'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '    subgraph code["code"]\n' +
      '      direction TB\n' +
      g_groups['code'].reduce(
        function (a, e) {
          return a + '    ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '      subgraph inlinecode["inline code"]\n' +
      '        direction LR\n' +
      g_groups['inline code'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '      end\n' +
      '      subgraph blockcode["code blocks"]\n' +
      '        direction LR\n' +
      g_groups['code blocks'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '      end\n' +
      '    end\n' +
      '    subgraph thirdparty["3rd party"]\n' +
      '      direction LR\n' +
      g_groups['3rd party'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '    subgraph coloredboxes["colored boxes"]\n' +
      '      direction LR\n' +
      g_groups['colored boxes'].reduce(
        function (a, e) {
          return a + '      ' + this.generateGraphGroupedEdge(e) + '\n';
        }.bind(this),
        ''
      ) +
      '    end\n' +
      '  end\n' +
      this.variantvariables.reduce(
        function (a, e) {
          return a + this.generateGraphVarGroupedEdge(e);
        }.bind(this),
        ''
      ) +
      g_handler;

    console.log(graph);
    return graph;
  },

  variantvariables: [
    { name: 'PRIMARY-color', group: 'content', fallback: 'MENU-HEADER-BG-color', tooltip: 'brand primary color' },
    { name: 'SECONDARY-color', group: 'content', fallback: 'MAIN-LINK-color', tooltip: 'brand secondary color' },
    { name: 'ACCENT-color', group: 'content', default: '#ffd700', tooltip: 'brand accent color, used for search highlights' },

    { name: 'MAIN-TOPBAR-BORDER-color', group: 'content', default: 'transparent', tooltip: 'border color between topbar and content' },
    { name: 'MAIN-LINK-color', group: 'content', fallback: 'SECONDARY-color', tooltip: 'link color of content' },
    { name: 'MAIN-LINK-HOVER-color', group: 'content', fallback: 'MAIN-LINK-color', tooltip: 'hoverd link color of content' },
    { name: 'MAIN-BG-color', group: 'content', default: '#ffffff', tooltip: 'background color of content' },
    { name: 'TAG-BG-color', group: 'content', fallback: 'PRIMARY-color', tooltip: 'tag color' },

    { name: 'MAIN-TEXT-color', group: 'content', default: '#101010', tooltip: 'text color of content and titles' },

    { name: 'MAIN-TITLES-TEXT-color', group: 'headings', fallback: 'MAIN-TEXT-color', tooltip: 'text color of titles and transparent box titles' },
    { name: 'MAIN-TITLES-H1-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-TEXT-color', tooltip: 'text color of h1 titles' },
    { name: 'MAIN-TITLES-H2-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-TEXT-color', tooltip: 'text color of h2-h6 titles' },
    { name: 'MAIN-TITLES-H3-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-H2-TEXT-color', tooltip: 'text color of h3-h6 titles' },
    { name: 'MAIN-TITLES-H4-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-H3-TEXT-color', tooltip: 'text color of h4-h6 titles' },
    { name: 'MAIN-TITLES-H5-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-H4-TEXT-color', tooltip: 'text color of h5-h6 titles' },
    { name: 'MAIN-TITLES-H6-TEXT-color', group: 'headings', fallback: 'MAIN-TITLES-H5-TEXT-color', tooltip: 'text color of h6 titles' },

    { name: 'MAIN-font', group: 'content', default: '"Roboto Flex", "Helvetica", "Tahoma", "Geneva", "Arial", sans-serif', tooltip: 'text font of content and titles' },

    { name: 'MAIN-TITLES-font', group: 'headings', fallback: 'MAIN-font', tooltip: 'text font of titles' },
    { name: 'MAIN-TITLES-H1-font', group: 'headings', fallback: 'MAIN-TITLES-font', tooltip: 'text font of h1 titles' },
    { name: 'MAIN-TITLES-H2-font', group: 'headings', fallback: 'MAIN-TITLES-font', tooltip: 'text font of h2-h6 titles' },
    { name: 'MAIN-TITLES-H3-font', group: 'headings', fallback: 'MAIN-TITLES-H2-font', tooltip: 'text font of h3-h6 titles' },
    { name: 'MAIN-TITLES-H4-font', group: 'headings', fallback: 'MAIN-TITLES-H3-font', tooltip: 'text font of h4-h6 titles' },
    { name: 'MAIN-TITLES-H5-font', group: 'headings', fallback: 'MAIN-TITLES-H4-font', tooltip: 'text font of h5-h6 titles' },
    { name: 'MAIN-TITLES-H6-font', group: 'headings', fallback: 'MAIN-TITLES-H5-font', tooltip: 'text font of h6 titles' },

    { name: 'CODE-theme', group: 'code', default: 'relearn-light', tooltip: 'name of the chroma stylesheet file' },
    { name: 'CODE-font', group: 'code', default: '"Consolas", menlo, monospace', tooltip: 'text font of code' },
    { name: 'CODE-BLOCK-color', group: 'code blocks', default: '#000000', tooltip: 'fallback text color of block code; should be adjusted to your selected chroma style' },
    { name: 'CODE-BLOCK-BG-color', group: 'code blocks', default: '#f8f8f8', tooltip: 'fallback background color of block code; should be adjusted to your selected chroma style' },
    { name: 'CODE-BLOCK-BORDER-color', group: 'code blocks', fallback: 'CODE-BLOCK-BG-color', tooltip: 'border color of block code' },
    { name: 'CODE-INLINE-color', group: 'inline code', default: '#5e5e5e', tooltip: 'text color of inline code' },
    { name: 'CODE-INLINE-BG-color', group: 'inline code', default: '#fffae9', tooltip: 'background color of inline code' },
    { name: 'CODE-INLINE-BORDER-color', group: 'inline code', default: '#fbf0cb', tooltip: 'border color of inline code' },

    { name: 'BROWSER-theme', group: '3rd party', default: 'light', tooltip: 'name of the theme for browser scrollbars of the main section' },
    { name: 'MERMAID-theme', group: '3rd party', default: 'default', tooltip: 'name of the default Mermaid theme for this variant, can be overridden in hugo.toml' },
    { name: 'OPENAPI-theme', group: '3rd party', default: 'light', tooltip: 'name of the default OpenAPI theme for this variant, can be overridden in hugo.toml' },
    { name: 'OPENAPI-CODE-theme', group: '3rd party', default: 'obsidian', tooltip: 'name of the default OpenAPI code theme for this variant, can be overridden in hugo.toml' },

    { name: 'MENU-BORDER-color', group: 'header', default: 'transparent', tooltip: 'border color between menu and content' },
    { name: 'MENU-TOPBAR-BORDER-color', group: 'header', fallback: 'MENU-HEADER-BG-color', tooltip: 'border color of vertical line between menu and topbar' },
    { name: 'MENU-TOPBAR-SEPARATOR-color', group: 'header', default: 'transparent', tooltip: 'separator color of vertical line between menu and topbar' },
    { name: 'MENU-HEADER-color', group: 'header', fallback: 'MENU-SECTIONS-LINK-color', tooltip: 'color of menu header' },
    { name: 'MENU-HEADER-BG-color', group: 'header', fallback: 'PRIMARY-color', tooltip: 'background color of menu header' },
    { name: 'MENU-HEADER-BORDER-color', group: 'header', fallback: 'MENU-HEADER-BG-color', tooltip: 'border color between menu header and menu' },
    { name: 'MENU-SEARCH-color', group: 'header', default: '#e0e0e0', tooltip: 'text and icon color of search box' },
    { name: 'MENU-SEARCH-BG-color', group: 'header', default: '#323232', tooltip: 'background color of search box' },
    { name: 'MENU-SEARCH-BORDER-color', group: 'header', fallback: 'MENU-SEARCH-BG-color', tooltip: 'border color of search box' },

    { name: 'MENU-HOME-LINK-color', group: 'home', default: '#323232', tooltip: 'home button color if configured' },
    { name: 'MENU-HOME-LINK-HOVER-color', group: 'home', default: '#808080', tooltip: 'hoverd home button color if configured' },
    { name: 'MENU-HOME-TOP-SEPARATOR-color', group: 'home', fallback: 'MENU-HOME-LINK-color', tooltip: 'separator color between menu search box and home menu' },
    { name: 'MENU-HOME-SEPARATOR-color', group: 'home', fallback: 'MENU-HOME-LINK-color', tooltip: 'separator color between home menus' },
    { name: 'MENU-HOME-BOTTOM-SEPARATOR-color', group: 'home', fallback: 'MENU-HEADER-BORDER-color', tooltip: 'separator color between home menu and menu' },

    { name: 'MENU-SECTIONS-BG-color', group: 'sections', default: '#282828', tooltip: 'background of the menu; this is NOT just a color value but can be a complete CSS background definition including gradients, etc.' },
    { name: 'MENU-SECTIONS-ACTIVE-BG-color', group: 'sections', default: 'rgba( 0, 0, 0, .166 )', tooltip: 'background color of the active menu section' },
    { name: 'MENU-SECTIONS-LINK-color', group: 'sections', default: '#bababa', tooltip: 'link color of menu topics' },
    { name: 'MENU-SECTIONS-LINK-HOVER-color', group: 'sections', fallback: 'MENU-SECTIONS-LINK-color', tooltip: 'hoverd link color of menu topics' },
    { name: 'MENU-SECTION-ACTIVE-CATEGORY-color', group: 'sections', default: '#444444', tooltip: 'text color of the displayed menu topic' },
    { name: 'MENU-SECTION-ACTIVE-CATEGORY-BG-color', group: 'sections', fallback: 'MAIN-BG-color', tooltip: 'background color of the displayed menu topic' },
    { name: 'MENU-SECTION-ACTIVE-CATEGORY-BORDER-color', group: 'sections', default: 'transparent', tooltip: 'border color between the displayed menu topic and the content' },
    { name: 'MENU-SECTION-SEPARATOR-color', group: 'sections', default: '#606060', tooltip: 'separator color between menus' },
    { name: 'MENU-VISITED-color', group: 'sections', fallback: 'SECONDARY-color', tooltip: 'icon color of visited menu topics if configured' },

    { name: 'BOX-CAPTION-color', group: 'colored boxes', default: 'rgba( 255, 255, 255, 1 )', tooltip: 'text color of colored box titles' },
    { name: 'BOX-BG-color', group: 'colored boxes', default: 'rgba( 255, 255, 255, .833 )', tooltip: 'background color of colored boxes' },
    { name: 'BOX-TEXT-color', group: 'colored boxes', fallback: 'MAIN-TEXT-color', tooltip: 'text color of colored box content' },

    { name: 'BOX-BLUE-color', group: 'colored boxes', default: 'rgba( 48, 117, 229, 1 )', tooltip: 'background color of blue boxes' },
    { name: 'BOX-INFO-color', group: 'colored boxes', fallback: 'BOX-BLUE-color', tooltip: 'background color of info boxes' },
    { name: 'BOX-BLUE-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of blue boxes' },
    { name: 'BOX-INFO-TEXT-color', group: 'colored boxes', fallback: 'BOX-BLUE-TEXT-color', tooltip: 'text color of info boxes' },

    { name: 'BOX-CYAN-color', group: 'colored boxes', default: 'rgba( 45, 190, 200, 1 )', tooltip: 'background color of cyan boxes' },
    { name: 'BOX-IMPORTANT-color', group: 'colored boxes', fallback: 'BOX-CYAN-color', tooltip: 'background color of info boxes' },
    { name: 'BOX-CYAN-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of cyan boxes' },
    { name: 'BOX-IMPORTANT-TEXT-color', group: 'colored boxes', fallback: 'BOX-CYAN-TEXT-color', tooltip: 'text color of info boxes' },

    { name: 'BOX-GREEN-color', group: 'colored boxes', default: 'rgba( 42, 178, 24, 1 )', tooltip: 'background color of green boxes' },
    { name: 'BOX-TIP-color', group: 'colored boxes', fallback: 'BOX-GREEN-color', tooltip: 'background color of tip boxes' },
    { name: 'BOX-GREEN-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of green boxes' },
    { name: 'BOX-TIP-TEXT-color', group: 'colored boxes', fallback: 'BOX-GREEN-TEXT-color', tooltip: 'text color of tip boxes' },

    { name: 'BOX-GREY-color', group: 'colored boxes', default: 'rgba( 128, 128, 128, 1 )', tooltip: 'background color of grey boxes' },
    { name: 'BOX-NEUTRAL-color', group: 'colored boxes', fallback: 'BOX-GREY-color', tooltip: 'background color of neutral boxes' },
    { name: 'BOX-GREY-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of grey boxes' },
    { name: 'BOX-NEUTRAL-TEXT-color', group: 'colored boxes', fallback: 'BOX-GREY-TEXT-color', tooltip: 'text color of neutral boxes' },

    { name: 'BOX-MAGENTA-color', group: 'colored boxes', default: 'rgba( 229, 50, 210, 1 )', tooltip: 'background color of magenta boxes' },
    { name: 'BOX-CAUTION-color', group: 'colored boxes', fallback: 'BOX-MAGENTA-color', tooltip: 'background color of info boxes' },
    { name: 'BOX-MAGENTA-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of magenta boxes' },
    { name: 'BOX-CAUTION-TEXT-color', group: 'colored boxes', fallback: 'BOX-MAGENTA-TEXT-color', tooltip: 'text color of info boxes' },

    { name: 'BOX-ORANGE-color', group: 'colored boxes', default: 'rgba( 237, 153, 9, 1 )', tooltip: 'background color of orange boxes' },
    { name: 'BOX-NOTE-color', group: 'colored boxes', fallback: 'BOX-ORANGE-color', tooltip: 'background color of note boxes' },
    { name: 'BOX-ORANGE-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of orange boxes' },
    { name: 'BOX-NOTE-TEXT-color', group: 'colored boxes', fallback: 'BOX-ORANGE-TEXT-color', tooltip: 'text color of note boxes' },

    { name: 'BOX-RED-color', group: 'colored boxes', default: 'rgba( 224, 62, 62, 1 )', tooltip: 'background color of red boxes' },
    { name: 'BOX-WARNING-color', group: 'colored boxes', fallback: 'BOX-RED-color', tooltip: 'background color of warning boxes' },
    { name: 'BOX-RED-TEXT-color', group: 'colored boxes', fallback: 'BOX-TEXT-color', tooltip: 'text color of red boxes' },
    { name: 'BOX-WARNING-TEXT-color', group: 'colored boxes', fallback: 'BOX-RED-TEXT-color', tooltip: 'text color of warning boxes' },
  ],
};

variants.setup();
