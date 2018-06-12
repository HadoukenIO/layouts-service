Openfin Application Launcher
=============

# Overview

The Openfin Application Launcher provides a central and customizable launcher experience to execute all of your Openfin Applications.  


## Features
* Customizable Look and Feel
* Supports Custom Application Manifests from local and remote environments.
* Searchable Application Directory
* ...

# Launch

## Run Locally

```
npm install
npm start
```

This will place the built files into the `./dist/` directory.  You can then copy these files to your web server to serve.  Be sure to update the app.json accordingly.

# Getting Started

Setting up and customizing the Openfin Application is easy.

## Settings Manifest

The settings manifest can be found under `./src/config/settings.json`.  Here you can customize the images and colors found in the launcher.  This manifest takes the following shape:

```
{
    "style": {
        "windowTitle": string - The title of the window.
        "icon": string - Image Url or path for the Icon found prominently on the launcher hotbar.
        "iconHover": string - Hover color of the expand tray and close buttons.  Can be hex color string or url/path.  See CSS notes below.
        "iconBackgroundImage": string - Background for the hotbar icon. Can be hex color string or url/path.  See CSS notes below.
        "systemTrayIcon": string - Icon to be used in the system tray menu.
        "hotbarBackground": string - Background for the hotbar icon. Can be hex color string or url/path.  See CSS notes below.
        "listBackground": string -Background for the app list. Can be hex color string or url/path.  See CSS notes below.
        "listAppHoverBackground": string - Color of when an app is hovered. Can be hex color string or url/path.  See CSS notes below.
        "listAppTextColor": string - Color of the text under an application. Can be hex color string or url/path.  See CSS notes below.
        "searchBarBackground": string - Background for search. Can be hex color string or url/path.  See CSS notes below.
        "searchBarTextColor": string - Search bar text color. Can be hex color string or url/path.  See CSS notes below.
        "toolTipBackground": string - Background for the tooltip. Can be hex color string or url/path.  See CSS notes below.
        "toolTipTextColor": string - Color of the text within the tooltip.
    },
    "applicationManifests": string[] - An array of urls pointing to your application manifests.
}
```

### CSS Notes:

Anything denoted with a CSS Note can have a valid CSS property:

```
url('someimage.png') | "blue" | "#FFFFFF"
```

# Application Manifest

The application manifest contains an array of various settings about your applications.  The application manifest can be found under `./src/config/application-manifest/`.  The manifest takes the following shape:

```
[
    {
    "name": string - Name of your application.
    "title": string - Title of your application.  Used in the app list.
    "manifest_url": string - Url to the applications manifest file.
    "description": string - A brief description of your application.
    "icon": string - Url to your applications icon.
    "images": [{"url": string - Url to screenshots of your application. }].
    }
]
```

# Disclaimers

This is an open source project and all are encouraged to contribute.

# License

This project has an XXX license.

# Support

Please enter an issue in the repo for any questions or problems

# Project Structure

All code lives under the src directory.


# Build

The project is built and staged to the ./dist directory.  This directory is exactly what would be deployed to the production CDN.

* dist
  * index.html - the primary index html.
  * tray.html - the tray window html.
  * dist/ - the built typescript files.
  * config/ - contains default settings.json
  * css/ - contains the project css and font.
  * image/ contains project images.