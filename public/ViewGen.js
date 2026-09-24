/* LogicSim workbench. Source diagrams keep the original nodeArray/linkArray format. */
var app = {};
var origin = { nodeArray: [], linkArray: [] };
var graph = new joint.dia.Graph();
var mainContainer = document.querySelector(".main-container");
var paperContainer = document.getElementById("paper-container");
var miniMap = document.querySelector(".mini-map");
var miniView = document.getElementById("mini-view");
var statusBar = document.querySelector(".statusbar");
var statusText = document.getElementById("status");
var selectedId = null;
var zoom = 1;
var baseWidth = 800;
var baseHeight = 600;
var graphBounds = { x: 0, y: 0, width: 800, height: 600 };
var miniTransform = { scale: 1, x: 0, y: 0 };
var miniWidth = 190;
var miniHeight = 124;

var paper = new joint.dia.Paper({
    el: document.getElementById("paper"),
    model: graph,
    width: baseWidth,
    height: baseHeight,
    gridSize: 10,
    drawGrid: false,
    background: { color: "transparent" }
});
var miniPaper = new joint.dia.Paper({
    el: document.getElementById("mini-paper"),
    model: graph,
    width: miniWidth,
    height: miniHeight,
    interactive: false,
    background: { color: "transparent" }
});

function setStatus(message, isError) {
    statusText.textContent = message;
    statusBar.classList.toggle("is-error", Boolean(isError));
}

function nodePorts(type) {
    var input = function (id) {
        return { group: "in", id: id, attrs: { portLabel: { text: id } } };
    };
    var output = function (id) {
        return { group: "out", id: id, attrs: { portLabel: { text: id } } };
    };
    if (type === "Export") return [input("OUT")];
    if (type === "SEL") return [
        input("SI"), input("0"), input("1"),
        output("SO"), output("N"), output("P")
    ];
    return [output("OUT")];
}

function makeNode(node) {
    var colors = {
        "0": "#f1a05b",
        "1": "#34b9a8",
        Import: "#5f8fe5",
        Export: "#a67be3",
        SEL: "#d98094"
    };
    var images = {
        "0": "assets/zero.svg",
        "1": "assets/one.svg",
        Import: "assets/input.svg",
        Export: "assets/output.svg",
        SEL: "assets/SEL.svg"
    };
    var width = 108;
    var height = 104;
    return new joint.shapes.standard.Rectangle({
        id: String(node.key),
        nodeType: node.type,
        memo: node.memo || "",
        size: { width: width, height: height },
        attrs: {
            label: {
                text: node.type,
                fontSize: 11,
                fontFamily: "Arial, sans-serif",
                fill: "#fff",
                fontWeight: "bold"
            },
            body: {
                fill: colors[node.type],
                width: "100%",
                height: "100%",
                rx: 10,
                ry: 10,
                stroke: "none"
            },
            image: {
                "xlink:href": images[node.type],
                width: 48,
                height: 48,
                x: 30,
                y: 22
            },
            name: {
                text: node.name || "",
                fontSize: 11,
                fontFamily: "Arial, sans-serif",
                fill: "#fff",
                fontWeight: "bold"
            }
        },
        markup: [
            { tagName: "rect", selector: "body" },
            { tagName: "text", selector: "label", attributes: { x: 54, y: 12, "text-anchor": "middle" } },
            { tagName: "image", selector: "image" },
            { tagName: "text", selector: "name", attributes: { x: 54, y: 92, "text-anchor": "middle" } }
        ],
        ports: {
            groups: {
                in: {
                    attrs: {
                        portBody: { magnet: true, fill: "#24456b", stroke: "#fff", strokeWidth: 1 },
                        portLabel: { fill: "#425b7b", fontSize: 11, fontWeight: "bold" }
                    },
                    markup: [
                        { tagName: "circle", selector: "portBody", attributes: { r: 5 } },
                        { tagName: "text", selector: "portLabel", attributes: { x: 9, y: 4 } }
                    ],
                    position: { name: "left" }
                },
                out: {
                    attrs: {
                        portBody: { magnet: true, fill: "#24456b", stroke: "#fff", strokeWidth: 1 },
                        portLabel: { fill: "#425b7b", fontSize: 11, fontWeight: "bold" }
                    },
                    markup: [
                        { tagName: "circle", selector: "portBody", attributes: { r: 5 } },
                        { tagName: "text", selector: "portLabel", attributes: { x: -9, y: 4, "text-anchor": "end" } }
                    ],
                    position: { name: "right" }
                }
            },
            items: nodePorts(node.type)
        }
    });
}

function makeLink(link) {
    return new joint.shapes.standard.Link({
        source: { id: String(link.from), port: link.frompid },
        target: { id: String(link.to), port: link.topid },
        attrs: {
            line: {
                stroke: "#7b94bb",
                strokeWidth: 2,
                targetMarker: { type: "path", d: "M 10 -5 0 0 10 5 z", fill: "#7b94bb" }
            }
        },
        connector: { name: "jumpover", args: { size: 5 } },
        router: {
            name: "metro",
            args: { step: 10, startDirections: ["right"], endDirections: ["left"] }
        }
    });
}

function validateModel(model) {
    if (!model || typeof model !== "object" || Array.isArray(model) ||
        !Array.isArray(model.nodeArray) || !Array.isArray(model.linkArray)) {
        return "JSON 必须包含 nodeArray 和 linkArray 两个数组。";
    }
    var allowed = { "0": true, "1": true, Import: true, Export: true, SEL: true };
    var ports = {
        "0": ["OUT"], "1": ["OUT"], Import: ["OUT"],
        Export: ["OUT"], SEL: ["SI", "0", "1", "SO", "N", "P"]
    };
    var nodes = {};
    for (var i = 0; i < model.nodeArray.length; i++) {
        var node = model.nodeArray[i];
        if (!node || typeof node !== "object" ||
            (typeof node.key !== "string" && typeof node.key !== "number") ||
            String(node.key) === "" || !allowed[node.type]) {
            return "第 " + (i + 1) + " 个节点的 key 或 type 无效。";
        }
        if ((node.name !== undefined && typeof node.name !== "string") ||
            (node.memo !== undefined && typeof node.memo !== "string")) {
            return "第 " + (i + 1) + " 个节点的 name 或 memo 必须是文本。";
        }
        if (nodes[String(node.key)]) return "节点 key 重复：" + node.key + "。";
        nodes[String(node.key)] = node.type;
    }
    for (var j = 0; j < model.linkArray.length; j++) {
        var link = model.linkArray[j];
        if (!link || typeof link !== "object" ||
            !nodes[String(link.from)] || !nodes[String(link.to)] ||
            !ports[nodes[String(link.from)]].includes(String(link.frompid)) ||
            !ports[nodes[String(link.to)]].includes(String(link.topid))) {
            return "第 " + (j + 1) + " 条连线的节点或端口无效。";
        }
    }
    return "";
}

function dumpModel() {
    return {
        nodeArray: graph.getElements().map(function (cell) {
            var item = {
                key: cell.id,
                type: cell.get("nodeType"),
                name: cell.attr("name/text") || ""
            };
            if (cell.get("memo")) item.memo = cell.get("memo");
            return item;
        }),
        linkArray: graph.getLinks().map(function (cell) {
            return {
                from: cell.get("source").id,
                frompid: cell.get("source").port,
                to: cell.get("target").id,
                topid: cell.get("target").port
            };
        })
    };
}

function updateEmptyState() {
    var empty = graph.getElements().length === 0;
    document.getElementById("canvasEmpty").hidden = !empty;
    miniMap.hidden = empty;
}

function updateMiniMap() {
    if (!graph.getElements().length) return;
    miniWidth = miniMap.clientWidth;
    miniHeight = miniMap.clientHeight;
    miniPaper.setDimensions(miniWidth, miniHeight);
    var width = Math.max(graphBounds.width, 1);
    var height = Math.max(graphBounds.height, 1);
    var scale = Math.min((miniWidth - 20) / width, (miniHeight - 20) / height);
    miniTransform.scale = scale;
    miniTransform.x = (miniWidth - width * scale) / 2 - graphBounds.x * scale;
    miniTransform.y = (miniHeight - height * scale) / 2 - graphBounds.y * scale;
    miniPaper.scale(scale, scale);
    miniPaper.translate(miniTransform.x, miniTransform.y);
    updateMiniView();
}

function updateMiniView() {
    if (!graph.getElements().length) return;
    var left = parseFloat(paperContainer.style.left) || 0;
    var top = parseFloat(paperContainer.style.top) || 0;
    var graphLeft = -left / zoom - (50 - graphBounds.x);
    var graphTop = -top / zoom - (50 - graphBounds.y);
    miniView.style.left = (graphLeft * miniTransform.scale + miniTransform.x) + "px";
    miniView.style.top = (graphTop * miniTransform.scale + miniTransform.y) + "px";
    miniView.style.width = (mainContainer.clientWidth / zoom * miniTransform.scale) + "px";
    miniView.style.height = (mainContainer.clientHeight / zoom * miniTransform.scale) + "px";
}

function renderScale() {
    var width = baseWidth * zoom;
    var height = baseHeight * zoom;
    paper.setDimensions(width, height);
    paper.scale(zoom, zoom);
    paper.translate((50 - graphBounds.x) * zoom, (50 - graphBounds.y) * zoom);
    paperContainer.style.width = width + "px";
    paperContainer.style.height = height + "px";
    paperContainer.style.left = Math.round((mainContainer.clientWidth - width) / 2) + "px";
    paperContainer.style.top = Math.round((mainContainer.clientHeight - height) / 2) + "px";
    document.getElementById("zoomLabel").textContent = Math.round(zoom * 100) + "%";
    updateMiniMap();
}

function fitGraph() {
    graphBounds = graph.getElements().length
        ? graph.getBBox()
        : { x: 0, y: 0, width: 700, height: 500 };
    baseWidth = Math.max(700, graphBounds.width + 100);
    baseHeight = Math.max(500, graphBounds.height + 100);
    zoom = Math.min(
        1,
        Math.max(.2, (mainContainer.clientWidth - 28) / baseWidth),
        Math.max(.2, (mainContainer.clientHeight - 28) / baseHeight)
    );
    renderScale();
}

function changeZoom(factor) {
    zoom = Math.max(.2, Math.min(3, zoom * factor));
    renderScale();
}

function clearSelection() {
    selectedId = null;
    document.getElementById("inspectorEmpty").hidden = false;
    document.getElementById("inspectorForm").hidden = true;
}

function drawModel(model) {
    var previous = graph.toJSON();
    try {
        var cells = model.nodeArray.map(makeNode).concat(model.linkArray.map(makeLink));
        graph.resetCells(cells);
        if (cells.length) {
            joint.layout.DirectedGraph.layout(graph, {
                setLinkVertices: false,
                nodeSep: 80,
                edgeSep: 45,
                rankSep: 95,
                rankDir: "LR"
            });
        }
        origin = model;
        clearSelection();
        updateEmptyState();
        fitGraph();
        return true;
    } catch (error) {
        graph.fromJSON(previous);
        updateEmptyState();
        fitGraph();
        setStatus("绘图失败：" + error.message, true);
        return false;
    }
}

app.parseLogic = function () {
    var parsed = ParseExpression(document.getElementById("ReversePol").value);
    if (parsed.error) return setStatus(parsed.error, true);
    try {
        var model = ViewGen(ModelGen(parsed.value));
        var error = validateModel(model);
        if (error) return setStatus(error, true);
        if (drawModel(model)) {
            document.getElementById("myModel").value = JSON.stringify(dumpModel(), null, 2);
            setStatus("已生成结构图：" + model.nodeArray.length + " 个节点，" +
                model.linkArray.length + " 条连线。");
        }
    } catch (error) {
        setStatus("表达式无法转换为图：" + error.message, true);
    }
};

app.load = function (text) {
    var source = text === undefined ? document.getElementById("myModel").value : text;
    var model;
    try {
        model = JSON.parse(source);
    } catch (error) {
        var location = /position (\d+)/.exec(error.message);
        setStatus("JSON 语法错误：请检查引号、逗号和括号" +
            (location ? "（约第 " + (Number(location[1]) + 1) + " 个字符）" : "") + "。", true);
        return false;
    }
    var error = validateModel(model);
    if (error) {
        setStatus(error, true);
        return false;
    }
    if (!drawModel(model)) return false;
    if (text !== undefined) document.getElementById("myModel").value = text;
    setStatus("已从 JSON 绘图：" + model.nodeArray.length + " 个节点。");
    return true;
};

app.save = function () {
    origin = dumpModel();
    document.getElementById("myModel").value = JSON.stringify(origin, null, 2);
    setStatus("已将当前图写入 JSON 编辑器。");
};

app.saveTextAsFile = function () {
    var model = dumpModel();
    var blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "logic-diagram.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setStatus("已下载 logic-diagram.json。");
};

app.ChangeName = function () {
    if (selectedId === null) return setStatus("请先选择一个节点。", true);
    var cell = graph.getCell(selectedId);
    if (!cell) return setStatus("所选节点已不存在，请重新选择。", true);
    var name = document.getElementById("ERName").value.trim();
    var memo = document.getElementById("ERMemo").value.trim();
    cell.attr("name/text", name);
    cell.set("memo", memo);
    origin = dumpModel();
    document.getElementById("myModel").value = JSON.stringify(origin, null, 2);
    setStatus("节点信息已保存。");
};

paper.on("element:pointerclick", function (elementView) {
    var cell = elementView.model;
    selectedId = cell.id;
    document.getElementById("inspectorEmpty").hidden = true;
    document.getElementById("inspectorForm").hidden = false;
    document.getElementById("nodeType").textContent = cell.get("nodeType");
    document.getElementById("nodeKey").textContent = String(cell.id);
    document.getElementById("ERName").value = cell.attr("name/text") || "";
    document.getElementById("ERMemo").value = cell.get("memo") || "";
});

paper.on("blank:pointerclick", clearSelection);
paper.on("blank:pointerdown", function (event) {
    if (event.pointerType === "touch") return;
    var startX = event.clientX;
    var startY = event.clientY;
    var initialLeft = parseFloat(paperContainer.style.left) || 0;
    var initialTop = parseFloat(paperContainer.style.top) || 0;
    function move(moveEvent) {
        paperContainer.style.left = (initialLeft + moveEvent.clientX - startX) + "px";
        paperContainer.style.top = (initialTop + moveEvent.clientY - startY) + "px";
        updateMiniView();
    }
    function stop() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
});

mainContainer.addEventListener("wheel", function (event) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
}, { passive: false });

miniMap.addEventListener("click", function (event) {
    if (!graph.getElements().length) return;
    var rect = miniMap.getBoundingClientRect();
    var graphX = (event.clientX - rect.left - miniTransform.x) / miniTransform.scale;
    var graphY = (event.clientY - rect.top - miniTransform.y) / miniTransform.scale;
    paperContainer.style.left =
        (mainContainer.clientWidth / 2 - (graphX + 50 - graphBounds.x) * zoom) + "px";
    paperContainer.style.top =
        (mainContainer.clientHeight / 2 - (graphY + 50 - graphBounds.y) * zoom) + "px";
    updateMiniView();
});

document.getElementById("generateButton").addEventListener("click", app.parseLogic);
document.getElementById("importButton").addEventListener("click", function () {
    document.getElementById("fileToLoad").click();
});
document.getElementById("loadButton").addEventListener("click", function () { app.load(); });
document.getElementById("syncButton").addEventListener("click", app.save);
document.getElementById("downloadButton").addEventListener("click", app.saveTextAsFile);
document.getElementById("ERSetName").addEventListener("click", app.ChangeName);
document.getElementById("zoomInButton").addEventListener("click", function () { changeZoom(1.2); });
document.getElementById("zoomOutButton").addEventListener("click", function () { changeZoom(1 / 1.2); });
document.getElementById("fitButton").addEventListener("click", fitGraph);

document.querySelectorAll(".example").forEach(function (button) {
    button.addEventListener("click", function () {
        document.getElementById("ReversePol").value = button.dataset.expression;
        document.getElementById("ReversePol").focus();
    });
});
document.getElementById("ReversePol").addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") app.parseLogic();
});
document.getElementById("fileToLoad").addEventListener("change", function (event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { app.load(String(reader.result)); };
    reader.onerror = function () { setStatus("文件读取失败，请重试。", true); };
    reader.readAsText(file, "UTF-8");
    event.target.value = "";
});

if (typeof ResizeObserver !== "undefined") {
    var observedWidth = mainContainer.clientWidth;
    var observedHeight = mainContainer.clientHeight;
    new ResizeObserver(function () {
        if (mainContainer.clientWidth !== observedWidth || mainContainer.clientHeight !== observedHeight) {
            observedWidth = mainContainer.clientWidth;
            observedHeight = mainContainer.clientHeight;
            renderScale();
        }
    }).observe(mainContainer);
}
clearSelection();
updateEmptyState();
renderScale();
