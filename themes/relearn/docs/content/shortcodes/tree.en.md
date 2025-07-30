+++
categories = ['howto', 'reference']
description = 'Display a list as a tree'
title = 'Tree'
+++

The `tree` shortcode displays a list as a tree with configurable icons and colors.

````tree
- home | folder
  - [.config](http://example.com) | folder
  - My Documents | folder | magic
    - home.php | fa-fw fab fa-php | #888cc4
````

## Usage

{{< tabs groupid="shortcode-parameter">}}
{{% tab title="codefence" %}}

````md
```tree
- home | folder
  - [.config](http://example.com) | folder
  - My Documents | folder | magic
    - home.php | fa-fw fab fa-php | #888cc4
```
````

{{% /tab %}}
{{% tab title="shortcode" %}}

````go
{{%/* tree */%}}
- home | folder
  - [.config](http://example.com) | folder
  - My Documents | folder | magic
    - home.php | fa-fw fab fa-php | #888cc4
{{%/* /tree */%}}
````

{{% /tab %}}
{{% tab title="partial" %}}

````go
{{ partial "shortcodes/tree.html" (dict
  "page" .
  "content" `- home | folder
  - [.config](http://example.com) | folder
  - My Documents | folder | magic
    - home.php | fa-fw fab fa-php | #888cc4`
)}}
````

{{% /tab %}}
{{< /tabs >}}

Codefence syntax is widely available in other Markdown parsers like GitHub and therefore is the recommend syntax for generating portable Markdown.

### Parameter

| Name                  | Default          | Notes       |
|-----------------------|------------------|-------------|
| _**&lt;content&gt;**_ | _&lt;empty&gt;_  | Your list as Markdown. |

### Item Syntax

`<NAME>` [ `|` `<ICON>` [ `|` `<COLOR>` ] ]

The **NAME** can be followed by an optional pipe (`|`) to define an **ICON** and further optional pipe to define the icon's **COLOR**.

- **ICON**: [Font Awesome icon name](shortcodes/icon#finding-an-icon) set to the left of the **NAME**. If you give a single string, it is selected from Font Awesome's [solid](https://fontawesome.com/icons?d=gallery&s=solid&m=free) icons. If you want to use a different set, you have to give the complete styles after the double colons. See above example for the `home.php`.

- **COLOR**: The [CSS color value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value) to be used. If not set, the primary color will be used.

  You can also set a **style** value known from other shortcodes.

  - by severity: `caution`, `important`, `info`, `note`, `tip`, `warning`
  - by brand color: `primary`, `secondary`, `accent`
  - by color: `blue`, `cyan`, `green`, `grey`, `magenta`, `orange`, `red`
  - by special color: `default`, `transparent`, `code`
  - you can also [define your own styles](shortcodes/notice#defining-own-styles).

  If a **style** and a named HTML color have the same name, the **style** color will be used.

## Examples

### Bigger example

Every possible combination

````md
```tree
- [just name](http://example.com) | folder
  - Documents
  - My Documents
- simple icons | folder
  - Documents | folder
  - My Documents | folder
- not so simple icons | file-alt | secondary
  - a.png | file-alt
  - a with border.png | file-alt
- mindblowing icons | fa-fw fab fa-markdown | accent
  - text.md | fa-fw fab fa-markdown
  - alternative text.md | fa-fw fab fa-markdown
- and now with color | fa-fw fab fa-php
  - script.php | fa-fw fab fa-markdown | purple
  - alt script.php | fa-fw fab fa-markdown | #888cc4
  - magic.php | fa-fw fab fa-markdown | magic
```
````

````tree
- [just name](http://example.com) | folder
  - Documents
  - My Documents
- simple icons | folder
  - Documents | folder
  - My Documents | folder
- not so simple icons | file-alt | secondary
  - a.png | file-alt
  - a with border.png | file-alt
- mindblowing icons | fa-fw fab fa-markdown | accent
  - text.md | fa-fw fab fa-markdown
  - alternative text.md | fa-fw fab fa-markdown
- and now with color | fa-fw fab fa-php
  - script.php | fa-fw fab fa-php | purple
  - alt script.php | fa-fw fab fa-php | #888cc4
  - magic.php | fa-fw fab fa-php | magic
````
