function zip(arrs) {
    let shortest = arrs.reduce((acc, p) => acc.length < p.length ? acc : p)
    return shortest.map(function(_, i){
        return arrs.map(function(array){ return array[i]})
    })
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const compose = (...fns) =>
  fns.reduceRight((prevFn, nextFn) =>
    (...args) => nextFn(prevFn(...args)),
    value => value
  );

let hex = (h) => hexToRgb(h)
let rgb = (r, g, b) => ({ r: r, g: g, b: b })

const visuals = (c) => ({
    ain: (g) => c.chope("audiodevicein")
        .connect(c.chop("select", {channames: c.sp("chan1")}))
        .connect(c.chop("resample", {"timeslice": c.tp(false), "method": c.mp(0), "relative": c.mp(0), "end": c.fp(0.03)}))
        .connect(c.chop("math", {"gain": g === undefined ? c.fp(1) : g})),
    aine: (v) => visuals(c).ain(v == undefined ? c.fp(1) : v),
    atex: (v) => c.top("chopto", {"chop": c.chopp([visuals(c).ain(v)])}),
    aspect: () => c.chope('audiodevicein').connect(c.chope('audiospectrum', {})),
    aspecttex: () => c.top("chopto", {"chop": c.chopp([visuals(c).aspect().out()])}),
    analyze: (i) => c.chop('analyze', {"function": c.mp(i)}),
    vol: (v) => visuals(c).ain(v).connect(visuals(c).analyze(6)),
    vols: (v) => visuals(c).vol(v).connect(c.chop("speed")),
    volc: (v) => c.chan(c.ip(0), visuals(c).vol(v)),
    volsc: (v) => c.chan(c.ip(0), visuals(c).vols(v)),
    lowPass: () => c.chop("audiofilter", {"filter": c.mp(0)}),
    lowv: (v) => visuals(c).ain(v).connect(visuals(c).lowPass()).connect(visuals(c).analyze(6)),
    lowvs: (v) => visuals(c).lowv(v).connect(c.chop("speed")),
    lowvc: (v) => c.chan(c.ip(0), visuals(c).lowv(v)),
    lowvsc: (v) => c.chan(c.ip(0), visuals(c).lowvs(v)),
    highPass: () => c.chop("audiofilter", {"filter": c.mp(1)}),
    highv: (v) => visuals(c).ain().connect(visuals(c).highPass()).connect(visuals(c).analyze(6)),
    highvc: (v) => c.chan(c.ip(0), visuals(c).highv()),
    bandPass: (b) => c.chop("audiofilter", {"filter": c.mp(2), "cutofflog": c.multp(b, c.fp(4.5))}),
    bandv: (b, v) => visuals(c).ain(v).connect(visuals(c).bandPass(b)).connect(visuals(c).analyze(6)),
    bandvc: (b, v) => c.chan(c.ip(0), visuals(c).bandv(b)),
    mchan: (chan) => c.chan(c.sp(chan), c.chope("midiinmap")),
    mchop: (chan) => c.chope("midiinmap").connect(c.chop("select", {"channames": c.sp(chan)})),
    cxyzp: (val) => c.xyzp(val, val, val),
    lagdown: (val) => c.chop("lag", {lag2: val}),
    lagup: (val) => c.chop("lag", {lag1: val}),
    lagboth: (val) => c.chop("lag", {lag1: val, lag2: val}),
    frag: (fragname, uniforms) => c.top("glslmulti", Object.assign({
            "resolutionw": c.ip(1920), 
            "resolutionh": c.ip(1080),
            "pixeldat": c.datp([c.dat("text", {"file" : c.sp("scripts/Visuals/" + fragname)})]),
            "outputresolution": c.mp(9),
            "format": c.mp(4) 
        }, zip([Array(8).fill("uniname"), Array.from(Array(8).keys()), Object.keys(uniforms)]).reduce((acc, v) => { acc[v[0]+v[1]] = c.sp(v[2]); return acc; }, {})
        , zip([Array(8).fill("value"), Array.from(Array(8).keys()), Object.values(uniforms)]).reduce((acc, v) => { acc[v[0]+v[1]] = v[2]; return acc; }, {}))),
    sidebyside: (inputs) => 
        c.top("glslmulti", {
            pixeldat: c.datp([
                c.dat("text", {
                    "file" : c.sp("scripts/sidebyside.frag")
                })]),
            resolutionw: c.ip(inputs.length * 1920),
            resolutionh: c.ip(1080),
            outputresolution: c.mp(9)
        }).run(inputs),
    verticalstack: (inputs) => 
        c.top("glslmulti", {
            pixeldat: c.datp([
                c.dat("text", {
                    "file" : c.sp("scripts/verticalstack.frag")
                })]),
            resolutionw: { type: "number", value0: [ "max(map(lambda n: n.width, me.inputs))" ] },
            resolutionh: { type: "number", value0: [ "sum(map(lambda n: n.height, me.inputs))" ] },
            outputresolution: c.mp(9)
        }).run(inputs),
    adata: (v) => visuals(c).atex(v).connect(visuals(c).frag('audio_data.frag', {'i_volume': c.x4p(c.fp(1))})),
    noiset: (t) => c.top("noise", {"t": c.xyzp(c.fp(0), c.fp(0), t)}),
    noisecc: (t, amp, channames) => c.chan(c.ip(0), visuals(c).noisec(t, amp, channames)),
    speed: (val) => c.chop("speed"),
    timeslice: (off) => c.chop("trim", {
        relative: c.mp(0), 
        startunit: c.mp(2),
        endunit: c.mp(2),
        start: off,
        end: off
    }),
    noisec: (t, amp, channames, seed = c.fp(0)) => c.chop("noise", {
        type: c.mp(3), 
        amp: amp,
        left: c.mp(2),
        right: c.mp(2),
        channelname: c.sp(channames),
        seed: seed,
        }),
    sparsenoisec: (t, g) => c.chan0(c.chop("noise", {
            seed: c.fp(new Date().getMilliseconds()),
            t: c.xyzp(t, c.fp(0), c.fp(0)) ,
        })
        .c(c.cc((inputs) => c.chop("math", { gain: g }).run(inputs)))
        .c(c.chop("function", { func: c.mp(1),}))
        .c(c.chop("speed"))),
    noisects: (t, amp, channames, seed = c.fp(0)) => 
        visuals(c).noisec(t, amp, channames, seed)
            .c(visuals(c).timeslice(t)),
    lines: (spacing, width) => visuals(c).frag("lines.frag", {"i_spacing": c.x4p(spacing), "i_width": c.x4p(width)}),
    shapes: (sides, size, width) => visuals(c).frag("shapes.frag", {"i_size": c.x4p(size), "i_width": c.x4p(width), "i_sides": c.x4p(sides)}),
    stringtheory: (time, angle, angle_delta, xoffset) =>
        visuals(c).frag("string_theory.frag", 
            { 
                "i_time": c.x4p(time), 
                "i_angle": c.x4p(angle), 
                "i_angle_delta": c.x4p(angle_delta === undefined ? c.fp(0.4) : angle_delta), 
                "i_xoff": c.x4p(xoffset === undefined ? c.fp(0) : xoffset)
            }),
    crosshatch: () => visuals(c).frag("crosshatch.frag", {}),
    commandcode: (text) => c.top("text", {
        "resolutionw": c.ip(1920), 
        "resolutionh": c.ip(1080), 
        "fontsizey": c.fp(16), 
        "alignx": c.mp(0),
        "aligny": c.mp(0),
        "text": c.sp(text),
        "dispmethod": c.mp(3),
        "fontautosize": c.mp(1)
    }),
    flowermod: (s) => visuals(c).frag("flower_mod.frag", {"uSeconds": c.x4p(s)}),
    lumidots: () => visuals(c).frag("lumidots.frag", {}),
    mosaic: (t, s) => visuals(c).frag("mosaic.frag", {"uTime" : c.x4p(t), "uScale" : c.x4p(s)}),
    noisedisplace: (t, d) => visuals(c).frag("noise_displace.frag", {"uTime": c.x4p(t), "uDisplacement": c.x4p(d)}),
    transform: (extra) => c.top("transform", extra),
    rotate: (r) => visuals(c).transform({"rotate": r}),
    translate: (x, y) => visuals(c).transform({"t": c.xyp(x, y), "extend": c.mp(3)}),
    translatee: (x, y, e) => visuals(c).transform({"t": c.xyp(x, y), "extend": c.mp(e)}),
    translatex: (x) => visuals(c).translate(x, c.fp(0)),
    translatexclamp: (t, clamp) => c.top("transform", {
        t: c.xyp(c.multp(visuals(c).floor(c.divp(c.modp(t, c.fp(1)), clamp)), clamp), c.fp(0)),
        extend: c.mp(2),
    }),
    translatey: (y) => visuals(c).translate(c.fp(0), y),
    val: (v) => c.top("hsvadjust", {"valuemult": v}),
    transformscale: (f, x, y, e) => visuals(c).transform(Object.assign({
        "extend": c.mp(e),
        "s": c.xyp(c.powp(x, c.fp(-1)), c.powp(y, c.fp(-1)))
    }, f)),
    scale: (xy) => visuals(c).transformscale({}, xy, xy, 1),
    rgbsplit: (s) => visuals(c).frag("rgbsplit.frag", {"uFrames": c.x4p(s)}),
    repeatT: (x, y) => visuals(c).transformscale({}, x, y, 3),
    repeatTxy: (xy)=> visuals(c).transformscale({}, xy, xy, 3),
    strobe: (s) => visuals(c).frag("strobe.frag", {"uSpeed": c.x4p(s), "uTime": c.x4p(c.seconds)}),
    mirrorx: () => c.cc((inputs) => visuals(c).addops([inputs[0].c(c.top("flip", {flipx: c.tp(true)}))].concat(inputs))),
    mirrory: () => c.cc((inputs) => visuals(c).addops([inputs[0].c(c.top("flip", {flipy: c.tp(true)}))].concat(inputs))),
    const1: (v) => c.chop("constant", {"name0": c.sp("const"), "value0": v}),
    constc: (namevals) => c.chop("constant", Object.entries(namevals).reduce(function(map, val, idx) {
        map["name" + idx] = c.sp(val[0])
        map["value" + idx] = val[1]
        return map
    }, {})),

    rgbc: (r, g, b) => visuals(c).constc({ r: r, g: g, b: b }),
    palettergbc: (color) => visuals(c).rgbc(c.fp(color.r / 255), c.fp(color.g / 255), c.fp(color.b / 255)),
    rgbt: (color) => c.top("chopto", {"chop": c.chopp([visuals(c).palettergbc(color).runT()]), "dataformat": c.mp(2) }),
    palette: (colors) => 
        c.top("chopto", {
            "chop":
                c.chopp([
                    c.chope("merge")
                        .run(colors.map((col) => visuals(c).palettergbc(col).runT()))
                        .connect(c.chop("shuffle", {"method": c.mp(2), "nval": c.ip(3)}))
                ]),
            "dataformat": c.mp(2)
        }),

    palettemap: (p, o) => 
        c.insertconn(
            visuals(c).frag("palette_map.frag", {"uOffset": c.x4p(o), "uSamples": c.x4p(c.fp(16))}), 
            [], 
            [visuals(c).palette(p).runT()]),
    palettecycle: (palette, s) => {
        let palettechop = c.chop("cross", {"cross": c.modp(s, c.fp(palette.length))}).run(palette.map((col) => visuals(c).palettergbc(col).runT()))
        let palettet = c.top("chopto", {"chop": c.chopp([palettechop]), "dataformat": c.mp(2)})
        return c.cc((inputs) => 
            c.top("composite", {"operand": c.mp(27)}).run([palettet.runT()].concat(inputs))
        )
    },

    tealcontrast:[rgb(188, 242, 246), rgb(50, 107, 113), rgb(211, 90, 30), rgb(209, 122, 43), rgb(188, 242, 246)],
    purplish:[rgb(150, 110, 100), rgb(223, 143, 67), rgb(76, 73, 100, ), rgb(146, 118, 133), rgb(165, 148, 180)],
    bnw:[rgb(255, 255, 255), rgb(0, 0, 0)],
    sunset:[rgb(185, 117, 19), rgb(228, 187, 108), rgb(251, 162, 1), rgb(255, 243, 201)],
    coolpink:[rgb(215, 40, 26), rgb(157, 60, 121), rgb(179, 83, 154), rgb(187, 59, 98)],
    darkestred:[rgb(153, 7, 17), rgb(97, 6, 11), rgb(49, 7, 8), rgb(13, 7, 7), rgb(189, 5, 13)],
    nature:[rgb(63, 124, 7), rgb(201, 121, 66), rgb(213, 101, 23), rgb(177, 201, 80), rgb(180, 207, 127)],
    greenpurple:[rgb(42, 4, 74), rgb(11, 46, 89), rgb(13, 103, 89), rgb(122, 179, 23), rgb(160, 197, 95)],
    tealblue:[rgb(188, 242, 246), rgb(50, 107, 113), rgb(188, 242, 246), rgb(165, 148, 180)],
    neon: ["A9336B", "5F2F88", "CB673D", "87BB38"].map(hexToRgb),
    fire: ["F07F13", "800909", "F27D0C", "FDCF58"].map(hexToRgb),
    buddhist: ["0000FF", "FFFF00", "FF0000", "FFFFFF", "FF9800"].map(hexToRgb),
    flower: ["000E00", "003D00", "E4A900", "FEDEEF", "C99CB8"].map(hexToRgb),
    bluepink: ["F2C6F2", "F8F0F0", "A6D1FF", "3988E1", "4C8600"].map(hexToRgb),
    lime: ["FF4274", "DCD549", "ABDFAB", "437432", "033B45"].map(hexToRgb),

    sat: (s) => c.top("hsvadjust", {"saturationmult": s}),
    edgesc: (original) => c.cc((inputs) => 
        c.top("composite", {"operand": c.mp(0)})
            .run([
                inputs[0].connect(c.tope("edge")), 
                inputs[0].connect(c.top("level", {"opacity": original}))
            ])),
    addops: (nodes) => c.top("composite", { "operand":c.mp(0)}).run(nodes.map((n) => n.runT())),
    multops: (nodes) => c.top("composite", { "operand":c.mp(27)}).run(nodes.map((n) => n.runT())),
    overops: (nodes) => c.top("composite", { "operand":c.mp(31)}).run(nodes.map((n) => n.runT())),
    fadeops: (idx, ops) => c.top("switch", { "blend": c.tp(true), "index": visuals(c).bounce(idx, 0.4)}).run(ops.map(o => o.runT())),
    bounce: (fp, i) => c.absp(c.subp(c.modp(fp, c.fp(i * 2)), c.fp(1))),

    fadeops: (idx, ops) => c.top("switch", { "blend": c.tp(true), "index": visuals(c).bounce(idx, 0.4)}).run(ops.map(o => o.runT())),

    triggercount: (l, f) => f.connect(c.chop("count", {
        "threshold": c.tp(true),
        "threshup": c.fp(0.5),
        "limitmax": c.fp(l),
        "output": c.mp(1)
    })),

    littleplanet: () => visuals(c).frag("little_planet.frag", {}),

    triggerops: (f, inputs) => c.top("switch", {
        "index": c.chan(c.ip(0), visuals(c).triggercount(inputs.length - 1, f))
    }).run(inputs.map((i) => i.runT())),

    triggerchops: (f, inputs) => c.chop("switch", {
        "index": c.chan(c.ip(0), visuals(c).triggercount(inputs.length - 1, f))
    }).run(inputs.map((i) => i.runT())),

    fade: (opacity, midops = c.cc((inputs) => inputs[0])) => c.cc((inputs) => 
        c.feedbackChain(c.cc((fbinputs) => 
            c.top("composite", {"operand": c.mp(0)})
                .run(inputs.concat([
                    c.top("level", {"opacity": opacity})
                    .c(midops)
                    .run(fbinputs)
                ])))).run(inputs)),
    secs: (m) => c.multp(c.seconds, m),
    floor: (f) => c.funcp("math.floor")(f),

    geo: (params) => c.comp("geometry", Object.assign({externaltox: c.sp("toxes/Visuals/geo.tox")}, params)),
    tox: (tox, params) => c.comp("base", Object.assign({externaltox: c.sp(tox)}, params)),
    render: (g, cam, light) => c.top("render", {
        lights: light === undefined ? c.compp([c.compe("light")]) : c.compp(light),
        geometry: c.compp(g),
        camera: cam === undefined ? c.compp([c.compe("camera")]) : c.compp(cam),
        resolutionw: c.ip(1920),
        resolutionh: c.ip(1080)
    }),
    renderEasy: (sop, instances, geoparams) => c.top("render", {
        "lights": c.compp([c.compe("light", { lighttype: c.mp(2) })]),
        "geometry": c.compp([
            sop.connect(c.comp("geometry", Object.assign({
                externaltox: c.sp("toxes/Visuals/geo.tox"),
                material: c.matp([c.mat("pbr", {
                    roughness: c.fp(0.2), 
                    metallic: c.fp(0.5),
                    rim1enable: c.tp(true),
                    rim1color: c.rgbp(c.fp(1), c.fp(0), c.fp(0.55)),
                })]),
                instanceop: c.chopp([instances]),
                instancing: c.tp(true),
                instancetx: c.sp("tx"),
                instancety: c.sp("ty"),
                instancetz: c.sp("tz"),
                instancerx: c.sp("rx"),
                instancery: c.sp("ry"),
                instancerz: c.sp("rz"),
                instancesx: c.sp("sx"),
                instancesy: c.sp("sy"),
                instancesz: c.sp("sz"),
            }, geoparams))),
        ]),
        "camera": c.compp([c.compe("camera")]),
        resolutionw: c.ip(1920),
        resolutionh: c.ip(1080)
    }),
    sinC: (i, phase, off) => 
        c.chop("wave", {
            "channelname": c.sp("rz"), 
            "end": i, 
            "endunit": c.mp(1), 
            phase: phase, 
            offset: off
    }),
    scaleC: (i, n) => c.chop("wave", {
        channelname: c.sp("sx"), 
        "end" : i, 
        "endunit": c.mp(1), 
        "wavetype": c.mp(4), 
        "period": i, 
        "amp": n
    }),
    sidesTorus: (sides, scale) => c.sop("torus", {
        orientation: c.np(2),
        rows: c.np(10),
        columns: sides,
        radius: c.xyp(scale, c.multp(scale, c.fp(0.5)))
    }),
    line: (ty, rz, sx, sy, sop, width, instances, mat) => {
        let tx = c.chop("wave", {
            channelname: c.sp("tx"), 
            end: instances,
            endunit: c.mp(1), 
            period: instances,
            amp: width,
            offset: c.fp(-0.5),
            "wavetype": c.mp(4), 
        });
        let typ = ty.connect(c.chop("resample", {
            rate: instances,
            timeslice: c.tp(false)
        })).connect(c.chop("rename", {renameto: c.sp("ty")}))
        let poses = c.chop("merge", {align: c.mp(7)}).run(
            [tx, typ, 
                rz.c(c.chop("rename", {renameto: c.sp("rz")})), 
                sx.c(c.chop("rename", {renameto: c.sp("sx")})), 
                sx.c(c.chop("rename", {renameto: c.sp("sz")})), 
                sy.c(c.chop("rename", {renameto: c.sp("sy")}))]
                .map((r) => r.runT()))
        let sgeo = sop.connect(visuals(c).geo({
            material: c.matp([mat]), 
            instanceop: c.chopp([poses]),
            instancing: c.tp(true),
            instancetx: c.sp("tx"),
            instancety: c.sp("ty"),
            instancetz: c.sp("tz"),
            instancerx: c.sp("rx"),
            instancery: c.sp("ry"),
            instancerz: c.sp("rz"),
            instancesx: c.sp("sx"),
            instancesy: c.sp("sy"),
            instancesz: c.sp("sz"),
        }))
        let centerCam = (t, r) => c.comp("camera", {
            translate: t,
            // pivot: v3mult (float (-1)) t,
            rotate: r
        })
        return visuals(c).render(sgeo)
    },
    lineLines: (width, scale, inst, sop) => {
        let instances = c.addp(inst, c.fp(2))
        return visuals(c).lineGeo(
            visuals(c).ain(scale).connect(
                c.chop("resample", {
                    method: c.mp(0), 
                    end: instances, 
                    endunit: c.mp(1),
                    timeslice: c.tp(false),
                    relative: c.mp(0),
                    method: c.mp(3),
                })),
            visuals(c).sinC(instances, c.fp(0), c.fp(0)),
            visuals(c).scaleC(instances, c.fp(10)),
            visuals(c).scaleC(instances, c.fp(10)),
            sop, width, instances, c.mate("wireframe").runT())
    },
    centerCam: (t, r) => c.comp("camera", {
        t: c.xyzp(c.fp(0), c.fp(0), t),
        p: c.xyzp(c.fp(0), c.fp(0), c.multp(c.fp(-1), t)),
        r: r === undefined ? c.xyzp(c.fp(0), c.fp(0), c.fp(0)) : r
    }),
    decaywave: (v) => 
        c.chop("wave", {
            wavetype: c.mp(1),
            end: c.fp(32), 
            endunit: c.mp(1),
            amp: c.fp(0.11),
            decay: c.fp(0.1),
            decayunit: c.mp(1),
            ramp: c.fp(0),
            rampunit: c.mp(1),
            period: c.fp(16),
            periodunit: c.mp(1),
            right: c.mp(0),
        })
        .c(c.chop("trim", { start: c.fp(2) }))
        .c(c.chop("math", { gain: c.fp(2) })),
    movecircle: (off, off2) =>
        visuals(c).constc({
            tx: c.multp(c.sinp(off), c.cosp(off2)),
            ty: c.multp(c.sinp(off), c.sinp(off2)),
            tz: c.cosp(off)
        }),
    distfun: (outerc, fun) =>
        c.chop("math", { chopop: c.mp(2) })
            .run([outerc.runT(), fun.runT()])
            .c(c.chop("function", {func: c.mp(19), expval: c.fp(2)}))
            .c(c.chop("function", {func:c.mp(1)}))
            .c(c.chop("math", {chanop: c.mp(1)})),
    geoGeo: (instancesop, parentchop, scale, cam, lightmap)=> {
        let chop = 
            c.chop("merge").run([
                parentchop.runT(),
                scale.c(c.chop("rename", {renameto: c.sp("sx")})).runT(),
                scale.c(c.chop("rename", {renameto: c.sp("sy")})).runT(),
                scale.c(c.chop("rename", {renameto: c.sp("sz")})).runT()
                ])

        let metalic = c.mat("pbr", {
            roughness: c.fp(0.2), 
            metallic: c.fp(0.5),
            // rim1enable: c.tp(true),
            // rim1color: c.rgbp(c.fp(1), c.fp(0), c.fp(0.55)),
        })

        let sgeo = instancesop.connect(visuals(c).geo({
            material: c.matp([metalic]), 
            scale: c.fp(1),
            instanceop: c.chopp([chop]),
            instancing: c.tp(true),
            instancetx: c.sp("tx"),
            instancety: c.sp("ty"),
            instancetz: c.sp("tz"),
            instancerx: c.sp("rx"),
            instancery: c.sp("ry"),
            instancerz: c.sp("rz"),
            instancesx: c.sp("sx"),
            instancesy: c.sp("sy"),
            instancesz: c.sp("sz"),
        }))

        return visuals(c).render([sgeo], 
            [cam], 
            [c.comp("environmentlight", {
                envlightmap: c.topp([lightmap.runT()]),
                envlightmapprefilter: c.mp(0)
            })]
        )
    },
    torusGeo: (sop, lightmap) => {
        let s = c.chop("wave", {
            end: c.fp(50), 
            endunit: c.mp(1),
            amp: c.fp(0.1),
            phase: visuals(c).secs(c.fp(0.3)),
            offset: c.fp(1),
        })

        let torus = c.chop("sopto", {sop: c.sopp([c.sop("torus", { rows: c.ip(5), cols:c.ip(10)}).runT()])})
        let cam = visuals(c).centerCam(c.fp(5), c.xyzp(c.fp(-30), visuals(c).secs(c.fp(30)), c.fp(0)))

        return visuals(c).geoGeo(sop, torus, s, cam, lightmap)
    },
    flocking: (cohesion, sep, sp) => 
        visuals(c).tox("toxes/Visuals/flockingGpu.tox",
            { Cohesion: cohesion
            , Separation: sep
            , Alignment: cohesion
            , Speed: sp
            }),
    sinct: (t, i, w) => c.cc((inputs) => 
        visuals(c).multops([
            c.top("chopto", {"chop": 
                c.chopp([visuals(c).sinC(i, t, w)])}).runT()
        ].concat(inputs))),
    tapbeat: (input, g, reset) => {
        let beat = input.c(c.chop("logic", {preop: c.mp(5)})).runT()
        let beathold = c.chop("hold").run([
                c.chop("speed").run([visuals(c).const1(c.fp(1)).runT(), beat])
                        .c(c.chop("delay", {delay: c.fp(1), delayunit: c.mp(1)})), 
                beat]).c(c.chop("null", {cooktype: c.mp(2)})).runT()
        let beattrail = 
                c.chop("trail", {
                        wlength: c.fp(8), 
                        wlengthunit: c.mp(1), 
                        capture: c.mp(1)}).run([beathold])
                .c(c.chop("delete", {
                        delsamples: c.tp(true),
                        condition: c.mp(5),  
                        inclvalue1:c.tp(false)})).runT()
        let bps = c.chop("math", {postop: c.mp(5), gain: g})
                .c(c.chop("analyze", {function: c.mp(1)}))
                .run([beattrail])
        let beataccum = c.chop("speed").run([bps, reset.runT()])
        let finalbeat = 
                beataccum 
                    .c(c.chop("limit", {
                    max: c.fp(1), 
                    type: c.mp(2), 
                    min: c.fp(0)})) 
                    .c(c.chop("logic", {
                    boundmax: c.fp(0.08), 
                    preop: c.mp(5), 
                    convert: c.mp(2)}))
        return {beatpulse: finalbeat, bps: bps}
        },
    tapbeatm9: () => visuals(c).tapbeat(visuals(c).mchop("b9"), (c.powp(c.fp(2), (visuals(c).floor(c.multp(c.subp(visuals(c).mchan("s1a"), c.fp(0.5)), c.fp(4)))))), visuals(c).mchop("b10")),

    beatramp: (beat) => c.chop("speed", {resetcondition: c.mp(2)}).run([beat.bps, beat.beatpulse]),
    beatxcount: (x, reset, beat) => c.chop("count", { output: c.mp(1), limitmax: c.fp(x - 1) }).run([beat.beatpulse, reset]),
    beatxpulse: (x, reset, beat) => visuals(c).beatxcount(x, reset, beat).c(c.chop("logic", { preop: c.mp(6) })),
    beatxramp: (x, reset, beat) => 
        c.chop("speed").run([
                beat.bps.c(c.chop("math", { gain: c.fp(1/x) })).runT(), 
                visuals(c).beatxpulse(x, reset, beat).runT()
        ]),
    beatseconds: (b, reset) => c.multp(c.seconds, c.chan0(b.bps)),
    tapbeatm9sec: () => visuals(c).beatseconds(visuals(c).tapbeatm9(), visuals(c).mchop("b10")),
    beatsecondschop: (b) => c.chop("speed").run([b.bps.runT()]),
    dmxtochop: (dmx) => {
        switch(dmx.type) {
            case 'GenericRGB':
                return dmx.color
            case '5Chan':
                return c.chop("merge").run([
                    dmx.dim, dmx.color,
                    visuals(c).constc({ gen1: c.fp(0), gen2: c.fp(0) })
                ])
            case 'Fill':
                return visuals(c).constc(Object.assign({}, new Array(dmx.num).fill(c.fp(0))))
            case 'FillVal':
                return visuals(c).constc(Object.assign({}, new Array(dmx.num).fill(dmx.value)))
        }
    },
    genericrgbdmx: (color) => ({type: 'GenericRGB', color}),
    fivechandmx: (dim, color) => ({type: '5Chan', dim, color}),
    filldmx: (num) => ({type: 'Fill', num}),
    fillvaldmx: (num, value) => ({type: 'FillVal', num, value}),
    multchops: (chops) => c.chop("math", {chopop: c.mp(3)}).run(chops),
    dimdmx: (gain, dmx) => {
      switch(dmx.type){
        case 'GenericRGB':
          return visuals(c).genericrgbdmx(visuals(c).multchops([dmx.color, gain]))
        case '5Chan':
          return visuals(c).fivechandmx(visuals(c).multchops([dmx.dim, gain], dmx.color))
        default:
          return dmx
      }
    },
    dmxmapcolor: (colorfunc, dmx) => {
      switch(dmx.type){
        case 'GenericRGB':
          return visuals(c).genericrgbdmx(colorfunc(dmx.color))
        case '5Chan':
          return visuals(c).fivechandmx(dmx.dim, colorfunc(dmx.color))
        default:
          return dmx
      }
    },
    palettergbcross: (palette, s) =>
        c.chop("cross", {"cross": c.modp(s, c.fp(palette.length))}).run(palette.map((col) => visuals(c).palettergbc(col).runT())),

    palettedmx: (dmx, palette, offset) => visuals(c).dmxmapcolor(color => visuals(c).palettergbcross(palette, offset), dmx),
    palettedmxlist: (dmxes, palette, offset) => dmxes.map((d, idx) => visuals(c).palettedmx(d, palette, c.addp(offset, c.fp(idx / dmxes.length)))),
    senddmx: (dmxes) => 
        c.chop("merge").run(dmxes.map(visuals(c).dmxtochop))
            .c(c.chop('math', {torange2: c.fp(255)}))
            .c(c.chop('dmxout', {
            interface: c.mp(3), 
            rate: c.ip(40),
            netaddress: c.sp("10.7.224.159"),
            localaddress: c.sp("10.7.224.158"),
            })),
    pulse: (g, usb) => c.chop("datto", {
        firstrow: c.mp(1),
        firstcolumn: c.mp(2),
        dat: c.datp([c.dat("serial", { 
            port: c.sp(usb),
            maxlines: c.ip(1)
        }).runT()])})
        .c(c.chop("math", {gain: g === undefined ? c.fp(1) : g})),

    sensel: () => c.chop("cplusplus"),
    senselchop: () => visuals(c).sensel().c(c.chop("select", {channames: c.sp("chan")})).c(c.chop("shuffle", { method: c.mp(8), nval: c.ip(185) })),
    senseltop: (f = (n) => n) =>
        c.top("chopto", { chop: c.chopp([f(visuals(c).senselchop())])})
        .c(c.top("flip", {flipy: c.tp(true)}))
        .c(c.top("resolution", {resolutionw: c.ip(1920), resolutionh: c.ip(1080), outputresolution: c.mp(9)}))
        .c(c.top("reorder", {format: c.mp(26), outputalphachan: c.mp(0)})),
    senseltouches: () => visuals(c).sensel().c(c.chop("select", {channames: c.sp("chan1")})).c(c.chop("delete", { delsamples: c.tp(true)})),
    gesture: (mchan) => c.chop("gesture").run([
            visuals(c).sensel()
                .c(c.chop("select", { channames: c.sp("chan") }))
                .c(c.chop("shuffle", { method: c.mp(1)})), 
            visuals(c).mchop(mchan)
        ]).c(c.chop("shuffle", { 
            method: c.mp(4), 
            nval: c.ip(185), 
            firstsample: c.tp(true)
        })),
    gesturetop: (chop) =>
        c.top("chopto", { chop: c.chopp([chop])})
            .c(c.top("flip", {flipy: c.tp(true)}))
            .c(c.top("resolution", {resolutionw: c.ip(1920), resolutionh: c.ip(1080), outputresolution: c.mp(9)}))
            .c(c.top("reorder", {format: c.mp(26), outputalphachan: c.mp(0)})),
    added: (changes) => c.dat("table", {}, [], null, changes)
        .c(c.dat("select", { extractrows: c.mp(5), rownames: c.sp("added"), extractcols: c.mp(2), colindexstart: c.ip(1)})),
    addedchange: (changes) => 
        c.chop("math", { gain: c.fp(0.8), chopop: c.mp(2), postop: c.mp(0) }).run([
            c.chop("info", { op: c.datp(visuals(c).added(changes)), iscope: c.sp("cook_abs_frame") }),
            c.chop("timeline", { absframe: c.tp(true), frame: c.tp(false) })
        ])
        .c(c.chop("logic", { preop: c.mp(1), convert: c.mp(0) })),
    addedtop: (changes) => 
        visuals(c).fullscreentext(
            visuals(c).added(changes).c(c.dat("convert", { how: c.mp(0) })), 
            c.chan(c.sp("num_rows"), c.chop("info", { op: c.datp(visuals(c).added(changes)) })))
            .c(c.top("level", {  opacity:  c.chan0(visuals(c).addedchange(changes).c(c.chop("trigger", { 
                attack: c.fp(0),
                peak: c.fp(1),
                sustain: c.fp(1),
                minsustain: c.fp(5),
                release: c.fp(1)
             })))})),
    removed: (changes) => c.dat("table", {}, [], null, changes)
        .c(c.dat("select", { extractrows: c.mp(5), rownames: c.sp("removed"), extractcols: c.mp(2), colindexstart: c.ip(1)})),
    removedchange: (changes) => 
        c.chop("math", { gain: c.fp(0.8), chopop: c.mp(2), postop: c.mp(0) }).run([
            c.chop("info", { op: c.datp(visuals(c).removed(changes)), iscope: c.sp("cook_abs_frame") }),
            c.chop("timeline", { absframe: c.tp(true), frame: c.tp(false) })
        ])
        .c(c.chop("logic", { preop: c.mp(1), convert: c.mp(0) })),
    removedtop: (changes) => 
        visuals(c).fullscreentext(
            visuals(c).removed(changes).c(c.dat("convert", { how: c.mp(0) })), 
            c.chan(c.sp("num_rows"), c.chop("info", { op: c.datp(visuals(c).removed(changes)) }))
            )
            .c(c.top("level", {  opacity:  c.chan0(visuals(c).addedchange(changes).c(c.chop("trigger", { 
                attack: c.fp(0),
                peak: c.fp(1),
                sustain: c.fp(1),
                minsustain: c.fp(2),
                release: c.fp(1)
             })))})),
    multops: (nodes) => c.top("composite", { "operand":c.mp(27)}).run(nodes.map((n) => n.runT())),
    changestop: (changes) => visuals(c).verticalstack([
        visuals(c).multops([c.top("constant", { color: c.rgbp(c.fp(0), c.fp(1), c.fp(0)) }), visuals(c).addedtop(changes)]),
        visuals(c).multops([c.top("constant", { color: c.rgbp(c.fp(1), c.fp(0), c.fp(0)) }), visuals(c).removedtop(changes)]),
    ]).c(c.top("fit", {  resolutionw: c.ip(1920) ,  resolutionh: c.ip(1080), outputresolution: c.mp(9), outputaspect: c.mp(1),  })),
    textdat: (text) => c.dat("text", {}, [], null, text),
    fullscreentext: (textdat, rowcount) => c.top("text", {
        dat: c.datp(textdat),
        "resolutionw": c.ip(1920), 
        "resolutionh": c.multp(c.ip(36), 
        c.casti(rowcount)), 
        "fontsizey": c.fp(18), 
        "alignx": c.mp(0),
        "aligny": c.mp(2),
        "dispmethod": c.mp(3),
        "fontautosize": c.mp(1),
        fontsizex: c.fp(16),
        text: c.sp(""),
        fontfile: c.sp("AnonymousPro-Regular.ttf") ,
        linespacing: c.fp(12) ,
        bgalpha: c.fp(1)
    }),
    runop: (op, opp) => c.cc((inputs) => op.run(inputs.concat([opp])))
})

//export const rect = (c) => c.tope("rectangle")
module.exports = visuals