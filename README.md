# vscode-ldjs 

An extension to easily use the lambda-designer-js library with TouchDesigner.

## Features

Create TouchDesigner networks using only code. This extension compiles the code using lambda-designer-js and sends it as a JSON object to TouchDesigner.

There are two modes: ondemand, and automatic. 

While in a *.ldjs.js file:
cmd/ctrl+enter - ondemand mode where cmd/ctrl+enter updates TouchDesigner with the current code
LDJS: Start Server vscode command - automatic mode where every time text is changed TouchDesigner is updated 

## Setup

Marketplace:

1. Install vscode-ldjs
2. Create a new directory and create scratch.ldjs.js with the following content:
```
let n = c.top("rectangle")
return [n.c(c.top("out")).out()]
```
3. In terminal, run (replacing 0.0.1 with ldjs version)
```
$ open ~/.vscode/extensions/ulyssesp.ldjs-0.0.1/TD/FunctionalDesigner.toe
```
4. Press ctrl/cmd + enter to start the extension
5. Add a line somewhere and press ctrl/cmd + again

Local:

1. Clone this repo 
2. Add it as a local extension - you can use a symlink - with [these instructions](https://vscode-docs.readthedocs.io/en/stable/extensions/install-extension/)
3. Open TD/FunctionalDesigner.toe

## Examples 

In the samples folder, [oscillare.ldjs.js](https://github.com/ulyssesp/vscode-ldjs/blob/master/samples/libs/oscillare.ldjs.js) had a bunch of premade functions, and [scratch.ldjs.js](https://github.com/ulyssesp/vscode-ldjs/blob/master/samples/oscillare.ldjs.js) has the latest that I've been working on.

## Tutorial

[YouTube tutorial](https://youtu.be/zcXJwsCvUyU) (requires a local version of [oscillare.ldjs.js](https://github.com/ulyssesp/vscode-ldjs/blob/master/samples/libs/oscillare.ldjs.js))

Using `c` (short for chain) gets you all of the needed operators.

Op syntax is `c.opfamily("opname", { parameters })`

For example: `c.top("rectangle", { rotate: c.fp(45) })`

Parameter syntax is `c.paramtype(value)`

For example `c.fp(45)`

`fp: float`
`ip: integer`
`sp: string`
`tp: toggle (bool)`
`mp: menu (integer)`


Multi-value parameter syntax is `c.paramtype(paramvalue1, paramvalue2, ...)`

For example `c.xyp(c.fp(0.3), c.fp(0.6))`

`xyp: float, float`
`xyzp: float, float, float`
`xyzwp: float, float, float, float`
`rgbp: float, float, float`
`whp: integer, integer`

Some are not implemented yet.


If your code errors or the nodes or parameters don't typecheck, check for messages in the ldjs output.


## Release Notes

### 1.0.0

First release!