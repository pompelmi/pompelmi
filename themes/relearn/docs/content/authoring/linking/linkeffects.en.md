+++
categories = ['explanation']
description = 'How to apply effects to your links'
frontmatter = ['linkEffects']
title = 'Link Effects'
weight = 2
+++

The theme offers [effects](authoring/markdown#link-effects) for your linked links.

You can [define additional custom link effects and set defaults](configuration/customization/linkeffects) in your configuration.

The default link effects shipped with the theme are

| Name     | Description                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| download | Causes the linked resource to be downloaded instead of shown in your browser.<br><br>- `false`: a usual link sending you to the location in your browser<br>- `true`: a link to download the resource<br>- _&lt;string&gt;_: a link to download the resource with the given filename |
| target   | Whether to show the link in a separate browser tab.<br><br>- `false`: shown in the same tab<br>- _&lt;string&gt;_: [a valid `a` `target` value](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target)<br><br>If [`externalLinkTarget` is configured](authoring/frontmatter/linking#opening-links) and the URL is external, this will overwrite the link effect value of your `hugo.toml` and page's front matter but can still be overwritten in the URL query parameter. |

One way to use them is to add them as URL query parameter to each individual link.

This can become cumbersome to be done consistently for the whole site. Instead, you can [configure the defaults](configuration/customization/linkeffects) in your `hugo.toml` as well as overriding these defaults in a page's front matter.

Explicitly set URL query parameter will override the defaults set for a page or your site.

If an effect accepts boolean values, only setting the parameter name without a value in the URL will set it to `true`.

Without any settings in your `hugo.toml` `linkEffects` defaults to

{{< multiconfig >}}
linkEffects.download = false
linkEffects.target = false
{{< /multiconfig >}}

{{% badge style="green" icon="fa-fw fab fa-markdown" title=" " %}}Front Matter{{% /badge %}} This can be overridden in a pages front matter for example by

{{< multiconfig fm=true section=params >}}
linkEffects.target = '_blank'
{{< /multiconfig >}}

Or by explicitly override settings by URL query parameter

````md {title="URL"}
[Magic in new window](images/magic.gif?target=_self)
````

The settings applied to the above link would be

{{< multiconfig >}}
linkEffects.download = false
linkEffects.target = '_self'
{{< /multiconfig >}}
