<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Flexom plugin

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Downloads](https://img.shields.io/npm/dt/@rsauget/homebridge-flexom)](https://www.npmjs.com/package/@rsauget/homebridge-flexom)
[![Version](https://img.shields.io/npm/v/@rsauget/homebridge-flexom)](https://www.npmjs.com/package/@rsauget/homebridge-flexom)
[![GitHub issues](https://img.shields.io/github/issues/rsauget/homebridge-flexom)](https://github.com/rsauget/homebridge-flexom/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/rsauget/homebridge-flexom)](https://github.com/rsauget/homebridge-flexom/pulls)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/rsauget/homebridge-flexom/Build%20and%20Lint)](https://github.com/rsauget/homebridge-flexom)

This Homebridge plugin exposes Flexom smart homes to Apple HomeKit.

## Status

Currently, this plugin supports mapping Flexom Zones (i.e. rooms) as Homekit accessories, with light and window covering controls.

This plugin relies on [@rsauget/flexom-lib](https://github.com/rsauget/flexom-lib) to interact with Flexom APIs.

## Install

The recommended way to install this plugin is through [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x).  
You will find it easily by searching `@rsauget/homebridge-flexom`.  
For other installation methods, please refer to the [Homebridge documentation](https://github.com/homebridge/homebridge/wiki).

## Setup Development Environment

To develop Homebridge plugins you must have Node.js 14 or later installed, and a modern code editor such as [VS Code](https://code.visualstudio.com/). This plugin uses [TypeScript](https://www.typescriptlang.org/) to make development easier and comes with pre-configured settings for [VS Code](https://code.visualstudio.com/) and ESLint. If you are using VS Code install these extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```
npm install
```

## Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```
npm run build
```

## Link To Homebridge

Run this command so your global install of Homebridge can discover the plugin in your development environment:

```
npm link
```

You can now start Homebridge, use the `-D` flag so you can see debug log messages in your plugin:

```
homebridge -D
```

## Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes you can run:

```
npm run watch
```

This will launch an instance of Homebridge in debug mode which will restart every time you make a change to the source code. It will load the config stored in the default location under `~/.homebridge`. You may need to stop other running instances of Homebridge while using this command to prevent conflicts. You can adjust the Homebridge startup command in the [`nodemon.json`](./nodemon.json) file.
