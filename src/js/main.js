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
var layers = [];
var cachedColors = [];
const db = new Dexie('Cache');
db.version(1).stores({
	layers: '++id,date,layer'
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
	layers.forEach(function(layer){
		map.removeLayer(layer);
	});
	if (webGL){
		webGL.settings.data = setupGeo({
			data: [],
			lat: [],
			lng: []
		});
		webGL.setup().render();
		clearTimeout(rotate);
	}
}

function buff(){
	loading(true);
	setTimeout(function(){
		loading(false);
	},5000);
}
async function loadMap(date,type,clear){
	if (clear){
		clearMap();
	}

	if (await db.layers.where({ date: date }).count() === 0){
		await $.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
			var layer = data[0].data;
			await db.layers.add({
				layer: layer,
				date: Number(data[0].index),
				meta: data[0].meta
			});
		});
	}
}
async function loadMaps(sDate,eDate,type,clear){
	if (clear){
		clearMap();
	}
	await $.getJSON(`/api/netcdf/temperature/${sDate}/${eDate}/geojson`,async function(data){
		for (var i = 0; i <= data.length - 1; i++){
			var layer;
			if (type === 'pointsGL'){
				layer = data[i].data;
			} else {
				layer = setupGeo(data[i].data);
			}
			await db.layers.add({
				layer: layer,
				date: Number(data[i].index),
				meta: data[i].meta
			});
		}
	});
}

async function renderMap(date,type,keep = true){
	const layer = await db.layers.where({ date: date }).first();
	if (!layer){
		return false;
	} else {
		if (type === 'pointsGL'){
			if (!webGL){
				addPointGLLayer(layer.layer,keep);
			} else {
				updateGLLayer(layer.layer);
			}
		} else {
			if (!webGL){
				addPolyGLLayer(setupGeo(layer.layer),keep);
			} else {
				updateGLLayer(setupGeo(layer.layer);
			}
		}
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
		await loadMap(dEnd,type,true);
		renderMap(dEnd);
	} else if (dStart && dEnd){
		loading(true);
		loop(dStart,dStart,dEnd,type);
		await loadMaps(dStart,dEnd,type,true);
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
function addPointGLLayer(data){
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
	L.glify.points({
		map: map,
		data: layer,
		color: function(_i,point){
			var col = gradient.rgbAt(point[2]).toRgb();
			col.r = col.r / 255;
			col.g = col.g / 255;
			col.b = col.b / 255;
			return col;
		},
		size: 20,
		preserveDrawingBuffer: true
	});
}

function addPolyGLLayer(geo,keep){
	const m = Math.abs(min);
	webGL = L.glify.shapes({
		map: map,
		data: geo,
		color: function(_i,feature){
			const percent = (m + feature.properties.value) / diff;
			var col = cachedColors[percent];
			if (col){
				return col;
			} else {
				col = gradient.rgbAt(percent).toRgb();
				col.r = col.r / 255;
				col.g = col.g / 255;
				col.b = col.b / 255;
				cachedColors[percent] = col;
				return col;
			}
		},
		click: function(e,feature){
			addMeta({ 'Variance': feature.properties.value });
		},
		opacity: 0.85,
		preserveDrawingBuffer: keep
	});

	return geo;
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
