import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';
import grid2geojson from 'grid2geojson';
import Dexie from 'dexie';
import L from 'leaflet';
import '../../node_modules/leaflet-providers/leaflet-providers.js';
import '../../../Leaflet.glify/glify.js';
import './leafletExport.js';

var map,min,max,rotate,diff,webGL;
var cachedColors = [];
const db = new Dexie('Cache');
db.version(1).stores({
	layers: '&index'
});
const gradient = tinygradient(['rgb(0,0,255)','rgb(200,200,200)','rgb(255,0,0)']);
$(async function(){
	var options = {
		min: '1/1/1750',
		max: '11/30/2018',
		format: function(date){
			return `${date.getFullYear()}/${date.getMonth() + 1}`;
		}
	};
	TinyDatePicker('input.date-first',options);
	TinyDatePicker('input.date-last',options);
	initMap();
	max = await $.getJSON('/api/netcdf/temperature/max');
	min = await $.getJSON('/api/netcdf/temperature/min');
	diff = max + Math.abs(min);
});

async function initMap(){
	map = L.map('map',{
		center: [20,0],
		zoom: 2.5,
		minZoom: 2.5,
		zoomSnap: 0.25,
		attributionControl: false
	});
	L.control.scale().addTo(map);
	L.tileLayer.provider('CartoDB.Positron').addTo(map);

	map.on('layeradd',function(){
		loading(false);
	});
}

function clearMap(){
	const blank = {
		data: [],
		lat: [],
		lng: []
	};
	if (webGL && webGL.type === 'pointsGL'){
		webGL.settings.data = setupPoints(blank);
	} else if (webGL){
		webGL.settings.data = setupGeo(blank);
	}
	if (webGL){
		webGL.setup().render();
	}
	if (rotate){
		clearTimeout(rotate);
	}
}

function buff(){
	loading(true);
	setTimeout(function(){
		loading(false);
	},5000);
}
async function loadMaps(sDate,eDate,clear){
	if (clear){
		clearMap();
	}
	if (await db.layers.where('index').between(sDate,eDate,true,true).count() !== eDate - sDate + 1){
		await $.getJSON(`/api/netcdf/temperature/${sDate}/${eDate}/geojson`,async function(data){
			await db.layers.bulkPut(data);
		});
	}
}

async function renderMap(date,type,keep = true){
	const layer = await db.layers.where({ index: date }).first();
	if (!layer){
		return false;
	} else {
		if (type === 'pointsGL'){
			var points = setupPoints(layer);
			if (!webGL || webGL.type !== type){
				addPointGLLayer(points,keep);
			} else {
				updateGLLayer(points);
			}
		} else {
			var shapes = setupGeo(layer);
			if (!webGL || webGL.type !== type){
				addPolyGLLayer(shapes,keep);
			} else {
				updateGLLayer(shapes);
			}
		}
		webGL.type = type;
		addMeta(layer.meta);
		return true;
	}
}

$('button.download').on('click',function(_e){
	download();
});
$('.load').on('click',function(e){
	load($(e.target).data('type'));
});

function addMeta(meta){
	Object.keys(meta).forEach(function(el){
		var metaEl = $('#meta');
		metaEl.find(`.${el}`).remove();
		metaEl.append(`<div class='${el}'><strong>${el}:</strong> ${meta[el]}</div>`);
	});
}
async function load(type){
	loading(true);
	var start = $('.date-first').val();
	var end = $('.date-last').val();
	var dStart = start ? await $.getJSON(`/api/netcdf/time/${start}`) : null;
	var dEnd = await $.getJSON(`/api/netcdf/time/${end}`);

	if (dEnd && !dStart){
		buff();
		await loadMaps(dEnd,dEnd,true);
		renderMap(dEnd,type);
	} else if (dStart && dEnd){
		loading(true);
		await loadMaps(dStart,dEnd,true);
		loop(dStart,dStart,dEnd,type);
	} else {
		err('Sorry, date was out of range.');
	}
}

function loop(current,start,end,type){
	var i = current;
	rotate = setTimeout(async function(){
		var t0 = performance.now();
		var rendered = await renderMap(i,type,false);
		if (rendered){ //only increment if we successfully rendered updated map
			i++;
		} else {
			buff();
		}
		if (i > end){
			i = start;
		}
		var t1 = performance.now();
		addMeta({ 'Redraw': Math.round(t1 - t0) });
		loop(i,start,end,type);
	},$('#speed').val());
}
function addPointGLLayer(data,keep){
	webGL = L.glify.points({
		map,
		data,
		color: function(_i,point){
			var col = colorRatios(gradient.rgbAt(point[2]).toRgb());
			return col;
		},
		size: 20,
		preserveDrawingBuffer: keep
	});
}

function addPolyGLLayer(data,keep){
	const m = Math.abs(min);
	webGL = L.glify.shapes({
		map,
		data,
		color: function(_i,feature){
			const percent = (m + feature.properties.value) / diff;
			var col = cachedColors[percent];
			if (col){
				return col;
			} else {
				col = colorRatios(gradient.rgbAt(percent).toRgb());
				return col;
			}
		},
		click: function(e,feature){
			addMeta({ 'Variance': feature.properties.value });
		},
		opacity: 0.85,
		preserveDrawingBuffer: keep
	});
	return data;
}

function colorRatios(col){
	col.r = col.r / 255;
	col.g = col.g / 255;
	col.b = col.b / 255;
	return col;
}
function updateGLLayer(geo){
	webGL.settings.data = geo;
	webGL.render();
	return geo;
}

function setupGeo(data){
	var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);

	geo.features = _.filter(geo.features,function(o){
		return o.properties.value !== 0 && o.properties.value !== null;
	});

	return geo;
}

function setupPoints(data){
	var layer = [];
	for (var lat = 0; lat < data.lat.length - 1; lat++){
		for (var lng = 0; lng < data.lng.length - 1; lng++){
			const val = data.data[lat][lng];
			if (val !== null && val !== 0){
				var percent = (Math.abs(min) + val) / diff;
				layer.push([data.lat[lat],data.lng[lng],percent]);
			}
		}
	}
	return layer;
}
function download(){
	var downloadOptions = {
		container: map._container,
		exclude: ['.leaflet-control-zoom','.leaflet-control-attribution'],
		format: 'image/png',
		fileName: 'Map.png'
	};
	var promise = map.downloadExport(downloadOptions);
	promise.then(function(result){
		return result;
	});
}
function loading(yes = true){
	$('body').toggleClass('loading',yes);
}

function err(msg){
	var al = $('.alert');
	al.find('.text').text(msg);
	al.addClass('show');
	setTimeout(function(){
		al.removeClass('show');
	},3000);
}
