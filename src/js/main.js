import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';
import grid2geojson from 'grid2geojson';
import L from 'leaflet';
import '../../node_modules/leaflet-providers/leaflet-providers.js';
import 'leaflet.vectorgrid';
import './leafletExport.js';

var map,min,max,rotate;
var layers = [];
$(async function(){
	var options = {
		min: '1/1/1750',
		max: '11/30/2018',
		format: function(date){
			return `${date.getFullYear()}/${date.getMonth() + 1}`;
		}
	}
	TinyDatePicker('input.date-first',options);
	TinyDatePicker('input.date-last',options);
	initMap();
	max = await $.getJSON('/api/netcdf/temperature/max');
	min = await $.getJSON('/api/netcdf/temperature/min');
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
	clearInterval(rotate);
}
async function loadMap(date,clear){
	const gradient = tinygradient(['rgb(0,255,0','rgb(255,0,0)']);

	if (layers.length > 0 && clear){
		clearMap();
	}

	$.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
		var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);
		const diff = max + Math.abs(min);

		geo.features = _.filter(geo.features,function(o){
			return o.properties.value;
		});

		layers.push(new L.vectorGrid.slicer(geo,{ //eslint-disable-line new-cap
			rendererFactory: L.canvas.tile,
			vectorTileLayerStyles: {
				sliced: function(feature){
					const percent = (Math.abs(min) + feature.value) / diff;
					var col = gradient.rgbAt(percent).toHexString();
					return {
						fillColor: col,
						fill: true,
						stroke: true,
						color: col,
						fillOpacity: 0.5,
						weight: 0
					};
				}
			}
		}));
		layers[layers.length - 1].addTo(map);
	});
}

$('button.download').on('click',function(e){
	download();
});
$('button.load').on('click',async function(){
	var start = $('.date-first').val();
	var end = $('.date-last').val();
	var dStart = start ? await $.getJSON(`/api/netcdf/time/${start}`) : null;
	var dEnd = await $.getJSON(`/api/netcdf/time/${end}`);
	if (dEnd >= 0 && !dStart){
		loadMap(dEnd,true);
	} else if (dStart >= 0 && dEnd >= 0){
		for (var i = dStart; i <= dEnd; i++){
			loading(true);
			loadMap(i);
		}
		rotate = setInterval(function(){
			var layers = $('#map .leaflet-layer');
			var curr = $('#map .leaflet-layer.active').length ? $('#map .leaflet-layer.active') : layers.first();
			if (curr.next()){
				curr.next().addClass('active');
			} else {
				layers.first().addClass('active');
			}
			curr.removeClass('active');			
		},1000);
	} else {
		err('Sorry, date was out of range.');
	}
});
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
