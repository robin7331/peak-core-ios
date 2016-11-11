# '_static' Folder

Every asset in this folder will be copied during build.
They will be located in `peak-components/static/**/*.*`

Use this for assets that are used in multiple peak components.
F.ex. If you have a global font that is used in every UI component put it in `_static/fonts/your-font.otf`. You can use them in code via `../static/fonts/your-font.otf`

It is also used for images that are used multiple times.
F.ex. a close button image or the product logo.
Place them in `_static/img/my-logo.png`. Acces it through `../static/img/my-logo.png`
