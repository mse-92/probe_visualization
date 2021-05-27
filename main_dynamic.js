/* import koeln01 from './data/koelnMesse_01.js';
import koeln02 from './data/koelnMesse_02.js';
import koeln03 from './data/koelnMesse_03.js'; */
//import corridor from './data/Ramsch/corridors_agritechnica_cars.js'
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhcGhtYXN0ZXJzIiwiYSI6ImNqeTQ0Ymo5eTEyODgzbGxoNnE3NzJ4OWsifQ.4gPPyY0vp0m2r44A-t5RvQ';


let path = "./data/IAA/IAA_2019-09-21.json";
let iterationCount = 0;
let repeater;
let layerList = document.getElementById('menuu');
let inputs = layerList.getElementsByTagName('input');

const circleSize = 3;
let startmintimestamp;
let m_minTimestamp;
let myEventArray = [];
let myRegularArray = [];
let addToTimestamp = 10;
let myJsonData = {};
let range = 30;
let hold;
let space = false;
let mousedown = false;
let countMouseDown = 0;
let countMouseUp = 0;
let box;
let inBox = false;
let start;
let current;
let canvas;
let map;
let boundingBox = {
    obenLinks_x: 0,
    obenLinks_y: 0,
    untenRechts_x: 0,
    untenRechts_y: 0,
    eventIds: [],
    regularIds: []
}
const myObj = {
    speedUp: "speedUp",
    speedDown: "speedDown",
    wurmlengthDown: "wurmlengthDown",
    wurmlengthUp: "wurmlengthUp"
}
let plusPerStep;
var slider = document.getElementById("myRange");

slider.oninput = function () {
    let repeatAnimation = false;
    m_minTimestamp = getGlobalMin() + (plusPerStep * slider.value)
    animate(repeatAnimation);
}

//Array of Promises for more than 1 JSON -> Concat arrays and overlay the hours (TBD)
const promises = [
    new Promise((resolve, reject) => {
        fetch(path)
            .then(response => response.json())
            .then(data => resolve(data))
    })
]

Promise.all(promises)
    .then(data => {
        setGlobalJson(data[0]);
        setVariables();
        setLabels();
        loadMap("streets-v10");
    })

const setGlobalJson = (a) => {
    myJsonData = a;
}
const jsonJoin = (arrJoin) => {

    let a = arrJoin[0].concat(arrJoin[1]);
    let b = a.concat(arrJoin[2]);

    for (let i = 0; i < arrJoin; i++)
        b.probes.sort(function (a, b) {
            return a.timestampSeconds - b.timestampSeconds
        })
    return b;
}
const setVariables = () => {
    startmintimestamp = getGlobalMin();
    m_minTimestamp = startmintimestamp;
    plusPerStep = (getGlobalMax() - getGlobalMin()) / 1000;
}
const setLabels = () => {
    document.getElementById('calender').innerText = getEventDate();
    document.getElementById('totalcars').innerText = myJsonData.length;
    document.getElementById('speed').innerText = addToTimestamp;
    document.getElementById('range').innerText = range;
}
const loadMap = (maplayer) => {
    if (maplayer === "dark-v10" || maplayer === "satellite-v9") {
        console.log("changed to Dark")
        changeColor("white")
    } else {
        changeColor("black");
    }

    let newStyle = "mapbox://sprites/mapbox/" + maplayer;

    map = new mapboxgl.Map({
        container: "map",
        style: newStyle,// https://api.mapbox.com/mapbox.js/v3.0.1/mapbox.css
        center: [myJsonData[0].probes[0].longitude, myJsonData[0].probes[0].latitude], //9.900370444637284, 53.56508960795988],
        zoom: 10,
        dragOn: false
    })

    map.on("load", function () {
        canvas = map.getCanvasContainer();
        var layers = map.getStyle().layers;

        // Find the index of the first symbol layer in the map style
        var firstSymbolId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'line') {
                firstSymbolId = layers[i].id;
            }
        }

        map.addSource("eventSource", {
            "type": "geojson",
            "data": {
                "type": "FeatureCollection",
                "features": myEventArray
            }
        });

/*        map.addSource("corridor", {
            "type": "geojson",
            "data": corridor
        });*/

        map.addSource("regularSource", {
            "type": "geojson",
            "data": {
                "type": "FeatureCollection",
                "features": myRegularArray
            }
        });


        /*map.addLayer({
            "id": "route",
            "type": "line",
            "source": "corridor",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#A8A8A8",
                "line-width": 4,
                "line-opacity": 0.8
            }
        }, firstSymbolId);*/

        map.addLayer({
            "id": "event",
            "type": "circle",
            "source": "eventSource",
            "paint": {
                "circle-radius": circleSize,
                "circle-color": ["get", "color"]
            },
            "filter": ["==", "$type", "Point"],
        });

        map.addLayer({
            "id": "no event",
            "type": "circle",
            "source": "regularSource",
            "paint": {
                "circle-radius": circleSize,
                "circle-color": "#B03"
            },
            "filter": ["==", "$type", "Point"],
        });

        map.on('mousedown', function (e) {
            if (countMouseDown === 0 && space === true) {
                boundingBox.obenLinks_x = e.lngLat.lng;
                boundingBox.obenLinks_y = e.lngLat.lat;
                countMouseUp = 0;
                countMouseDown++;
                boundingBox.eventIds = [];
            }
        });
        map.on('mouseup', function (e) {
            if (countMouseUp === 0 && space === true) {
                boundingBox.untenRechts_x = e.lngLat.lng;
                boundingBox.untenRechts_y = e.lngLat.lat;
                countMouseUp++;
                countMouseDown--;
                //console.log(boundingBox)
                alert('Bounding Box erfolgreich gesetzt. Bereich wird neu berechnet');
                space = false;
                document.getElementById('carsBounding').innerHTML = boundingBox.eventIds.length;
            }
        });

        canvas.addEventListener('mousedown', mouseDown, true);
    })
}

document.addEventListener('DOMContentLoaded', function () {
    var tglEvent = document.getElementById('tglEvent');
    var tglNoEvent = document.getElementById('tglNoEvent');

    tglEvent.addEventListener('change', function () {
        if (tglEvent.checked) {
            //console.log("Event Aktiv");
            map.setLayoutProperty("event", 'visibility', 'visible');
        } else {
            //console.log("Event Inaktiv");
            map.setLayoutProperty("event", 'visibility', 'none');
        }
    });

    tglNoEvent.addEventListener('change', function () {
        if (tglNoEvent.checked) {
            //console.log("No Event Aktiv");
            map.setLayoutProperty("no event", 'visibility', 'visible');
        } else {
            //console.log("No Event Inaktiv");
            map.setLayoutProperty("no event", 'visibility', 'none');
        }
    });

});
document.addEventListener("keydown", event => {
    if (event.keyCode === 32) {
        space = true
        map.dragPan.disable()
    }
});
document.addEventListener("keyup", event => {
    space = false
    map.dragPan.enable()
});
document.getElementById('btnStart').addEventListener('click', function () {
    let repeatAnimation = true;
    animate(repeatAnimation);
})
document.getElementById('btnPause').addEventListener('click', function () {
    cancelAnimationFrame(repeater);
})
document.getElementById('btnSpeedDown').addEventListener('mousedown', e => {
    holdBtn(myObj.speedDown)
})
document.getElementById('btnSpeedDown').addEventListener('mouseup', e => {
    clearInterval(hold);
})
document.getElementById('btnSpeedUp').addEventListener('mousedown', e => {
    holdBtn(myObj.speedUp);
})
document.getElementById('btnSpeedUp').addEventListener('mouseup', e => {
    clearInterval(hold);
})
document.getElementById('btnWurmlengthDown').addEventListener('mousedown', e => {
    holdBtn(myObj.wurmlengthDown);
})
document.getElementById('btnWurmlengthDown').addEventListener('mouseup', e => {
    clearInterval(hold);
})
document.getElementById('btnWurmlengthUp').addEventListener('mousedown', e => {
    holdBtn(myObj.wurmlengthUp);
})
document.getElementById('btnWurmlengthUp').addEventListener('mouseup', e => {
    clearInterval(hold);
})
document.getElementById('btnFile').addEventListener('click', e => {
    readFile();
})
document.getElementById('btnSpeedDown').addEventListener('click', e => {
    if (addToTimestamp > 0) addToTimestamp--;
    document.getElementById('speed').innerText = addToTimestamp;
})
document.getElementById('btnSpeedUp').addEventListener('click', e => {
    if (addToTimestamp < 100) addToTimestamp++;
    document.getElementById('speed').innerText = addToTimestamp;
})
document.getElementById('btnWurmlengthDown').addEventListener('click', e => {
    if (range > 19) range--;
    document.getElementById('range').innerText = range;
})
document.getElementById('btnWurmlengthUp').addEventListener('click', e => {
    if (range < 80) range++;
    document.getElementById('range').innerText = range;
})
document.getElementById('btnHideMenue').addEventListener('click', e => {

    if (document.getElementById('labels').style.visibility === 'hidden') {
        document.getElementById('labels').style.visibility = 'visible'
    } else if (document.getElementById('labels').style.visibility === 'visible') {
        document.getElementById('labels').style.visibility = 'hidden'
    }
})
document.getElementById('btnRefresh').addEventListener('click', e => {
    cancelAnimationFrame(repeater)
    setVariables()
    setLabels()
    animate()
})

function readFile(){
    var input = document.createElement('input');
    input.type = 'file';

    input.onchange = e => {// getting a hold of the file reference
        var file = e.target.files[0];

        // setting up the reader
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');

        // here we tell the reader what to do when it's done reading...
        reader.onload = readerEvent => {
            var content = readerEvent.target.result // this is the content!
            var doener = JSON.parse(content)
            setGlobalJson(doener)
            setVariables();
            setLabels();
            loadMap("streets-v10");
        }
    }
    input.click();
}

function holdBtn(option) {
    switch (option) {

        case "wurmlengthUp":
            hold = setInterval(function () {
                if (range > 98) clearInterval(hold);
                range++, document.getElementById('range').innerText = range;
            }, 100);
            break;

        case "wurmlengthDown":
            hold = setInterval(function () {
                if (range < 22) clearInterval(hold);
                range--, document.getElementById('range').innerText = range;
            }, 100);
            break;

        case "speedDown":
            hold = setInterval(function () {
                if (addToTimestamp < 3) clearInterval(hold);
                addToTimestamp--, document.getElementById('speed').innerText = addToTimestamp;
            }, 100);
            break;

        case "speedUp":
            hold = setInterval(function () {
                if (addToTimestamp > 58) clearInterval(hold);
                addToTimestamp++, document.getElementById('speed').innerText = addToTimestamp;
            }, 100);
            break;
    }
}

function switchLayer(layer) {
    loadMap(layer.target.id);
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
}

function changeColor(color) {
    var cols = document.getElementsByClassName('grouplbl');

    if (color === 'white') {
        for (i = 0; i < cols.length; i++) {
            cols[i].style.color = '#FFFFFF';
        }
    } else if (color === 'black') {
        for (i = 0; i < cols.length; i++) {
            cols[i].style.color = '#000000';
        }
    }
}

function checkBoundingBox(longitude, latitude) {

    if (boundingBox.obenLinks_x <= longitude && longitude <= boundingBox.untenRechts_x && boundingBox.obenLinks_y >= latitude && latitude >= boundingBox.untenRechts_y) return true;

    return false;

}

function animate(repeatAnimation) {
    myEventArray = [];
    myRegularArray = [];
    m_minTimestamp += addToTimestamp;
    let m_minMaxTimestamp = m_minTimestamp + range;
    inBox = false;

    for (let j = 0; j < myJsonData.length; j++) {
       //if(myJsonData[j].id == "2dc6ab7b-0bbf-42ad-b96e-7fdaec381a01"){
            console.log(myJsonData[j].id)
            for (let k = 0; k < myJsonData[j].probes.length - 1; k++) {
                let minInterval = m_minTimestamp <= myJsonData[j].probes[k].timestampSeconds;
                let maxInterval = m_minMaxTimestamp > myJsonData[j].probes[k].timestampSeconds;

                if (minInterval && maxInterval && myJsonData[j].event && tglEvent.checked == true) {

                    if (!boundingBox.eventIds.includes(myJsonData[j].id)) {
                        if (checkBoundingBox(myJsonData[j].probes[k].longitude, myJsonData[j].probes[k].latitude)) {
                            boundingBox.eventIds.push(myJsonData[j].id)
                            document.getElementById('eventCarsBounding').innerText = boundingBox.eventIds.length;
                        }
                    }

                    if (myJsonData[j].event) {
                        myEventArray.push(
                            {
                                type: "Feature",
                                sid: myJsonData[j].id,
                                speed: myJsonData[j].probes[k].speed,
                                guid: myJsonData[j].probes[k].guid,
                                timestampSeconds: myJsonData[j].probes[k].timestampSeconds,
                                properties: {
                                    color: "#40F" //Blau
                                },
                                geometry: {
                                    type: "Point",
                                    coordinates: [myJsonData[j].probes[k].longitude, myJsonData[j].probes[k].latitude]
                                }
                            }
                        )
                    }
                } else if (minInterval && maxInterval && !myJsonData[j].event && tglNoEvent.checked == true) {

                    if (!boundingBox.regularIds.includes(myJsonData[j].id)) {
                        if (checkBoundingBox(myJsonData[j].probes[k].longitude, myJsonData[j].probes[k].latitude)) {
                            boundingBox.regularIds.push(myJsonData[j].id)
                            document.getElementById('regularCarsBounding').innerText = boundingBox.regularIds.length;
                        }
                    }


                    myRegularArray.push(
                        {
                            type: "Feature",
                            sid: myJsonData[j].id,
                            speed: myJsonData[j].probes[k].speed,
                            guid: myJsonData[j].probes[k].guid,

                            timestampSeconds: myJsonData[j].probes[k].timestampSeconds,
                            geometry: {
                                type: "Point",
                                coordinates: [myJsonData[j].probes[k].longitude, myJsonData[j].probes[k].latitude]
                            }
                        }
                    )

                }
            }
       //} End Filter ID's
    }

    map.getSource('eventSource').setData({
        "type": "FeatureCollection",
        "features": myEventArray
    })
    map.getSource('regularSource').setData({
        "type": "FeatureCollection",
        "features": myRegularArray
    })

    if (m_minTimestamp + 60 <= getGlobalMax() && repeatAnimation != false) {
        document.getElementById('time').innerText = Unix_timestamp(m_minTimestamp);
        repeater = requestAnimationFrame(animate);

    } else {
        document.getElementById('time').innerText = Unix_timestamp(m_minTimestamp);
        cancelAnimationFrame(repeater);
    }

}

function Unix_timestamp(t) {
    var dt = new Date(t * 1000);
    var hr = dt.getHours();
    var m = "0" + dt.getMinutes();
    var s = "0" + dt.getSeconds();
    return hr + ':' + m.substr(-2)// + ':' + s.substr(-2);
}

function getEventDate() {
    let t = myJsonData[0].probes[0].timestampSeconds;
    var dt = new Date(t * 1000);
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    return day + '.' + month + '.' + year
}

function getGlobalMin() {
    var localTs = 9999999999999999999999999.9;
    for (let j = 0; j < myJsonData.length; j++) {
        for (let i = 0; i < myJsonData[j].probes.length - 1; i++) {
            if (localTs > myJsonData[j].probes[i].timestampSeconds) {
                localTs = myJsonData[j].probes[i].timestampSeconds
            }
        }
    }
    return localTs;
}

function getGlobalMax() {
    let m_maxTimestamp = 0.0;
    for (let j = 0; j < myJsonData.length; j++) {
        for (let i = 0; i < myJsonData[j].probes.length - 1; i++) {
            if (m_maxTimestamp < myJsonData[j].probes[i].timestampSeconds) {
                m_maxTimestamp = myJsonData[j].probes[i].timestampSeconds;
            }
        }
    }
    return m_maxTimestamp;
}

function mousePos(e) {
    var rect = canvas.getBoundingClientRect();
    return new mapboxgl.Point(
        e.clientX - rect.left - canvas.clientLeft,
        e.clientY - rect.top - canvas.clientTop
    );
}

function mouseDown(e) {
    if (box) {
        box.parentNode.removeChild(box);
        box = null;
    }
    // Continue the rest of the function if the shiftkey is pressed.
    if (!space) return;

    // Disable default drag zooming when the shift key is held down.
    map.dragPan.disable();

    // Call functions for the following events
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    // Capture the first xy coordinates
    start = mousePos(e);
}

function onMouseMove(e) {
    // Capture the ongoing xy coordinates
    current = mousePos(e);

    // Append the box element if it doesnt exist
    if (!box) {
        box = document.createElement('div');
        box.classList.add('boxdraw');
        canvas.appendChild(box);
    }

    var minX = Math.min(start.x, current.x),
        maxX = Math.max(start.x, current.x),
        minY = Math.min(start.y, current.y),
        maxY = Math.max(start.y, current.y);

// Adjust width and xy position of the box element ongoing
    var pos = 'translate(' + minX + 'px,' + minY + 'px)';
    box.style.transform = pos;
    box.style.WebkitTransform = pos;
    box.style.width = maxX - minX + 'px';
    box.style.height = maxY - minY + 'px';
}

function onMouseUp(e) {
    // Capture xy coordinates
    finish();
}

function onKeyDown(e) {
    // If the ESC key is pressed
    if (e.keyCode === 27) box.parentNode.removeChild(box);
}

function finish() {
    // Remove these events now that finish has been called.
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('mouseup', onMouseUp);

    map.dragPan.enable();
}
