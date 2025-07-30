+++
categories = ['howto']
description = 'What options are available for links and images'
frontmatter = ['errorignore', 'externalLinkTarget', 'image.errorlevel', 'link.errorlevel']
options = ['errorignore', 'externalLinkTarget', 'image.errorlevel', 'link.errorlevel']
title = 'Linking'
weight = 3
+++

## Opening Links

{{% badge style="cyan" icon="gears" title=" " %}}Option{{% /badge %}} {{% badge style="green" icon="fa-fw fab fa-markdown" title=" " %}}Front Matter{{% /badge %}} By default, external links open in a new tab. To change this, use the `externalLinkTarget` setting with a proper [link target](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target).

To set default values for all links, use [link effects](authoring/linking/linkeffects).

For example, this will open links in the same tab

{{< multiconfig section=params >}}
externalLinkTarget = '_self'
{{< /multiconfig >}}

## Enabling Link and Image Link Warnings

{{% badge style="cyan" icon="gears" title=" " %}}Option{{% /badge %}} {{% badge style="green" icon="fa-fw fab fa-markdown" title=" " %}}Front Matter{{% /badge %}} You can use `link.errorlevel` and `image.errorlevel` to control what should happen if a local link can not be resolved to a page and/or a resource.

If not set or empty, any unresolved link is written as given into the resulting output. If set to `warning` the same happens and an additional warning is printed in the built console. If set to `error` an error message is printed and the build is aborted.

Please note that this can not resolve files inside of your `static` directory. The file must be a resource of the page or the site.

Link warnings are also available for the [include](shortcodes/include#enabling-link-warnings) and [openapi](shortcodes/openapi#enabling-link-warnings) shortcodes.

{{< multiconfig section=params >}}
link.errorlevel = 'warning'
image.errorlevel = 'warning'
{{< /multiconfig >}}

### Ignoring False Negatives

{{% badge style="cyan" icon="gears" title=" " %}}Option{{% /badge %}} {{% badge style="green" icon="fa-fw fab fa-markdown" title=" " %}}Front Matter{{% /badge %}} In case you want to use link warnings but are bothered by false negatives, you can configure an ignore list of regular expressions. The referenced address will be checked against all regexes of this list. If the address matches at least one regex, no output will be written to the console. The check uses [Hugo's `findRE` function](https://gohugo.io/functions/strings/findre/).

{{< multiconfig section=params >}}
errorignore = [ '^/authoring/', '^/configuration/' ]
{{< /multiconfig >}}
